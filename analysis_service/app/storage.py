from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path
from typing import Any

from .settings import settings


WORKSPACE_ROOT = Path(settings.workspace_root).resolve()
FILES_ROOT = WORKSPACE_ROOT / "_files"
REGISTRY_ROOT = WORKSPACE_ROOT / "_registry"
FILES_REGISTRY = REGISTRY_ROOT / "files.json"

_SESSION_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$")


def ensure_roots() -> None:
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
    FILES_ROOT.mkdir(parents=True, exist_ok=True)
    REGISTRY_ROOT.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def create_file_record(filename: str, stored_path: Path, purpose: str = "assistants") -> dict[str, Any]:
    ensure_roots()
    file_id = f"file-{uuid.uuid4().hex[:24]}"
    registry = _read_json(FILES_REGISTRY, [])
    record = {
      "id": file_id,
      "object": "file",
      "bytes": stored_path.stat().st_size,
      "created_at": int(time.time()),
      "filename": filename,
      "purpose": purpose,
      "filepath": str(stored_path.resolve()),
    }
    registry.append(record)
    _write_json(FILES_REGISTRY, registry)
    return record


def list_file_records() -> list[dict[str, Any]]:
    ensure_roots()
    return _read_json(FILES_REGISTRY, [])


def get_file_record(file_id: str) -> dict[str, Any] | None:
    for record in list_file_records():
        if record.get("id") == file_id:
            return record
    return None


def delete_file_record(file_id: str) -> bool:
    registry = list_file_records()
    next_registry: list[dict[str, Any]] = []
    deleted = False
    for record in registry:
        if record.get("id") != file_id:
            next_registry.append(record)
            continue
        deleted = True
        filepath = Path(record.get("filepath", ""))
        try:
            if filepath.exists():
                filepath.unlink()
        except Exception:
            pass
    if deleted:
        _write_json(FILES_REGISTRY, next_registry)
    return deleted


def workspace_dir(session_id: str) -> Path:
    safe = (session_id or "default").strip() or "default"
    if not _SESSION_ID_RE.match(safe):
        raise ValueError(f"Invalid session_id: must match [a-zA-Z0-9_-], got: {safe!r}")
    target = WORKSPACE_ROOT / safe
    if not target.resolve().is_relative_to(WORKSPACE_ROOT):
        raise ValueError(f"session_id resolves outside workspace root")
    target.mkdir(parents=True, exist_ok=True)
    (target / "generated").mkdir(parents=True, exist_ok=True)
    return target


def session_state_path(session_id: str) -> Path:
    return workspace_dir(session_id) / ".session.json"


def load_session_state(session_id: str) -> dict[str, Any]:
    path = session_state_path(session_id)
    return _read_json(
        path,
        {
            "session_id": session_id,
            "messages": [],
            "generated_files": [],
            "updated_at": int(time.time()),
        },
    )


def save_session_state(session_id: str, payload: dict[str, Any]) -> None:
    payload["session_id"] = session_id
    payload["updated_at"] = int(time.time())
    _write_json(session_state_path(session_id), payload)
