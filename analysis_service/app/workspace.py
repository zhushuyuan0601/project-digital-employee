from __future__ import annotations

import csv
import io
import json
import os
import shutil
import sqlite3
import xml.dom.minidom
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse

from .storage import WORKSPACE_ROOT, workspace_dir

try:
    import openpyxl  # type: ignore
except Exception:
    openpyxl = None

try:
    import yaml  # type: ignore
except Exception:
    yaml = None


TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".log", ".json", ".py", ".sql", ".xml", ".yaml", ".yml"}
TABLE_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
SQLITE_EXTENSIONS = {".sqlite", ".db"}
BLOCKED_UPLOAD_EXTENSIONS = {".py"}


def is_within_workspace(path: Path, session_id: str) -> bool:
    root = workspace_dir(session_id).resolve()
    try:
        resolved = path.resolve()
    except Exception:
        return False
    return resolved == root or root in resolved.parents


def resolve_session_path(session_id: str, rel_path: str) -> Path:
    root = workspace_dir(session_id)
    candidate = (root / rel_path).resolve()
    if not is_within_workspace(candidate, session_id):
        raise HTTPException(status_code=400, detail="Invalid workspace path")
    return candidate


def classify_file(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in TABLE_EXTENSIONS or ext in SQLITE_EXTENSIONS:
        return "table"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    return "other"


def build_download_url(session_id: str, rel_path: str) -> str:
    return f"/workspace/download?session_id={session_id}&path={rel_path}"


def build_preview_url(session_id: str, rel_path: str) -> str:
    return f"/workspace/preview?session_id={session_id}&path={rel_path}"


def list_workspace_files(session_id: str) -> list[dict[str, Any]]:
    root = workspace_dir(session_id)
    files: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        rel = path.relative_to(root).as_posix()
        files.append({
            "name": path.name,
            "path": rel,
            "size": path.stat().st_size,
            "category": classify_file(path),
            "is_generated": rel.startswith("generated/"),
            "download_url": build_download_url(session_id, rel),
            "preview_url": build_preview_url(session_id, rel),
        })
    return files


def _tree_node(path: Path, root: Path, session_id: str) -> dict[str, Any]:
    rel = "." if path == root else path.relative_to(root).as_posix()
    if path.is_dir():
        return {
            "name": path.name if path != root else session_id,
            "path": "" if rel == "." else rel,
            "type": "directory",
            "children": [
                _tree_node(child, root, session_id)
                for child in sorted(path.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
                if not child.name.startswith(".")
            ],
        }
    return {
        "name": path.name,
        "path": rel,
        "type": "file",
        "category": classify_file(path),
        "download_url": build_download_url(session_id, rel),
        "preview_url": build_preview_url(session_id, rel),
        "is_generated": rel.startswith("generated/"),
    }


def build_tree(session_id: str) -> dict[str, Any]:
    root = workspace_dir(session_id)
    return _tree_node(root, root, session_id)


async def upload_files(session_id: str, files: list[UploadFile], directory: str = "") -> list[dict[str, Any]]:
    target_dir = resolve_session_path(session_id, directory) if directory else workspace_dir(session_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    uploaded: list[dict[str, Any]] = []
    for upload in files:
        filename = Path(upload.filename or "upload.bin").name
        if Path(filename).suffix.lower() in BLOCKED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Blocked upload type: {filename}")
        target = target_dir / filename
        counter = 1
        while target.exists():
            target = target_dir / f"{target.stem}_{counter}{target.suffix}"
            counter += 1
        content = await upload.read()
        target.write_bytes(content)
        uploaded.append({
            "name": target.name,
            "path": target.relative_to(workspace_dir(session_id)).as_posix(),
            "size": target.stat().st_size,
        })
    return uploaded


def delete_path(session_id: str, rel_path: str) -> None:
    target = resolve_session_path(session_id, rel_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Workspace file not found")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()


def clear_workspace(session_id: str) -> None:
    root = workspace_dir(session_id)
    for child in root.iterdir():
        if child.name.startswith("."):
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def download_file(session_id: str, rel_path: str) -> FileResponse:
    target = resolve_session_path(session_id, rel_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Workspace file not found")
    return FileResponse(target, filename=target.name)


def _preview_text(path: Path) -> dict[str, Any]:
    content = path.read_text(encoding="utf-8", errors="replace")
    return {"kind": "text", "content": content}


def _preview_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {"kind": "text", "content": json.dumps(payload, ensure_ascii=False, indent=2)}


def _preview_yaml(path: Path) -> dict[str, Any]:
    if yaml is None:
        return _preview_text(path)
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {"kind": "text", "content": json.dumps(payload, ensure_ascii=False, indent=2)}


def _preview_xml(path: Path) -> dict[str, Any]:
    xml_str = path.read_text(encoding="utf-8", errors="replace")
    try:
        pretty = xml.dom.minidom.parseString(xml_str.encode("utf-8")).toprettyxml(indent="  ")
    except Exception:
        pretty = xml_str
    return {"kind": "text", "content": pretty}


def _table_payload(headers: list[str], rows: list[list[Any]], total_rows: int) -> dict[str, Any]:
    return {
        "kind": "table",
        "columns": headers,
        "rows": rows,
        "row_count": total_rows,
        "truncated": total_rows > len(rows),
    }


def _preview_csv(path: Path, page: int, page_size: int) -> dict[str, Any]:
    with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        all_rows = list(reader)
    headers = all_rows[0] if all_rows else []
    records = all_rows[1:] if len(all_rows) > 1 else []
    start = max(page - 1, 0) * page_size
    end = start + page_size
    return _table_payload(headers, records[start:end], len(records))


def _preview_excel(path: Path, page: int, page_size: int, sheet_name: str = "") -> dict[str, Any]:
    if openpyxl is None:
        return {
            "kind": "unsupported",
            "content": "openpyxl is not installed; Excel preview is unavailable.",
        }
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    target_name = sheet_name if sheet_name and sheet_name in workbook.sheetnames else workbook.sheetnames[0]
    sheet = workbook[target_name]
    rows = list(sheet.iter_rows(values_only=True))
    headers = [str(item) if item is not None else "" for item in rows[0]] if rows else []
    records = [
        ["" if value is None else str(value) for value in row]
        for row in rows[1:]
    ]
    start = max(page - 1, 0) * page_size
    end = start + page_size
    payload = _table_payload(headers, records[start:end], len(records))
    payload["sheet_name"] = target_name
    payload["sheet_names"] = workbook.sheetnames
    workbook.close()
    return payload


def _preview_sqlite(path: Path, page: int, page_size: int, table_name: str = "") -> dict[str, Any]:
    connection = sqlite3.connect(path)
    try:
        tables = [
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
            ).fetchall()
        ]
        if not tables:
            return {"kind": "database", "view": "tables", "tables": []}
        target = table_name if table_name and table_name in tables else tables[0]
        cursor = connection.execute(f'SELECT * FROM "{target}" LIMIT ? OFFSET ?', (page_size, (page - 1) * page_size))
        rows = cursor.fetchall()
        headers = [desc[0] for desc in cursor.description or []]
        total = connection.execute(f'SELECT COUNT(*) FROM "{target}"').fetchone()[0]
        return {
            "kind": "database",
            "view": "table",
            "table_name": target,
            "tables": tables,
            "columns": headers,
            "rows": rows,
            "row_count": total,
            "truncated": total > len(rows),
        }
    finally:
        connection.close()


def preview_file(session_id: str, rel_path: str, page: int = 1, page_size: int = 50, table_name: str = "", sheet_name: str = "") -> dict[str, Any]:
    path = resolve_session_path(session_id, rel_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Workspace file not found")
    ext = path.suffix.lower()
    if ext in {".json"}:
        return _preview_json(path)
    if ext in {".yaml", ".yml"}:
        return _preview_yaml(path)
    if ext in {".xml"}:
        return _preview_xml(path)
    if ext in TEXT_EXTENSIONS:
        return _preview_text(path)
    if ext in {".csv", ".tsv"}:
        return _preview_csv(path, page, page_size)
    if ext in {".xlsx", ".xls"}:
        return _preview_excel(path, page, page_size, sheet_name=sheet_name)
    if ext in SQLITE_EXTENSIONS:
        return _preview_sqlite(path, page, page_size, table_name=table_name)
    if ext in IMAGE_EXTENSIONS:
        return {"kind": "image", "url": build_download_url(session_id, rel_path)}
    return {"kind": "unsupported", "content": f"Preview is not available for {path.name}"}


def collect_file_info(session_id: str) -> str:
    items: list[str] = []
    root = workspace_dir(session_id)
    files = [path for path in sorted(root.iterdir()) if path.is_file() and not path.name.startswith(".")]
    for index, path in enumerate(files, start=1):
        size_kb = path.stat().st_size / 1024
        items.append(f"File {index}:\n{json.dumps({'name': path.name, 'size': f'{size_kb:.1f}KB'}, ensure_ascii=False, indent=2)}")
    return "\n\n".join(items)
