from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .chat_runtime import run_analysis
from .exporter import export_markdown, export_pdf
from .settings import settings
from .storage import (
    FILES_ROOT,
    create_file_record,
    delete_file_record,
    ensure_roots,
    get_file_record,
    list_file_records,
    load_session_state,
    save_session_state,
    workspace_dir,
)
from .workspace import (
    build_tree,
    clear_workspace,
    delete_path,
    download_file,
    list_workspace_files,
    preview_file,
    profile_file,
    upload_files,
    workspace_data_overview,
)


def create_app() -> FastAPI:
    ensure_roots()
    app = FastAPI(title="Analysis Service", version="1.0.0")
    cors_origins = os.environ.get("CORS_ORIGIN", "http://localhost:5173").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cors_origins],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/v1/models")
    async def models():
        return {
            "object": "list",
            "data": [{"id": settings.default_model, "created": 0, "owned_by": "analysis-service"}],
        }

    @app.post("/v1/files")
    async def create_file(
        file: UploadFile = File(...),
        purpose: str = Form("assistants"),
    ):
        filename = Path(file.filename or "upload.bin").name
        stored_path = FILES_ROOT / f"{uuid4().hex[:8]}-{filename}"
        stored_path.write_bytes(await file.read())
        return create_file_record(filename, stored_path, purpose=purpose)

    @app.get("/v1/files")
    async def list_files():
        return {"object": "list", "data": list_file_records()}

    @app.get("/v1/files/{file_id}")
    async def get_file(file_id: str):
        record = get_file_record(file_id)
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        return record

    @app.delete("/v1/files/{file_id}")
    async def delete_file(file_id: str):
        deleted = delete_file_record(file_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="File not found")
        return {"id": file_id, "object": "file", "deleted": True}

    @app.post("/v1/chat/completions")
    async def chat_completions(body: dict[str, Any]):
        session_id = str(body.get("session_id") or body.get("thread_id") or f"analysis-{uuid4().hex[:8]}")
        messages = body.get("messages") or []
        if not isinstance(messages, list) or not messages:
            raise HTTPException(status_code=400, detail="messages is required")
        runtime = {
            "model": body.get("model"),
            "temperature": body.get("temperature", 0.3),
            "api_base": body.get("api_base"),
            "api_key": body.get("api_key"),
            "max_rounds": body.get("max_rounds", 8),
            "selected_file": body.get("selected_file"),
            "selected_file_profile": body.get("selected_file_profile"),
        }
        if body.get("stream", True):
            return StreamingResponse(run_analysis(messages, runtime, session_id), media_type="text/event-stream")

        chunks: list[str] = []
        async for chunk in run_analysis(messages, runtime, session_id):
            chunks.append(chunk)
        return {"chunks": chunks, "session_id": session_id}

    @app.get("/workspace/state")
    async def workspace_state(session_id: str = Query(...)):
        return load_session_state(session_id)

    @app.get("/workspace/files")
    async def workspace_files(session_id: str = Query(...)):
        return {"files": list_workspace_files(session_id)}

    @app.get("/workspace/tree")
    async def workspace_tree(session_id: str = Query(...)):
        return build_tree(session_id)

    @app.get("/workspace/preview")
    async def workspace_preview(
        session_id: str = Query(...),
        path: str = Query(...),
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=200),
        table_name: str = Query(""),
        sheet_name: str = Query(""),
    ):
        return preview_file(session_id, path, page=page, page_size=page_size, table_name=table_name, sheet_name=sheet_name)

    @app.get("/workspace/profile")
    async def workspace_profile(
        session_id: str = Query(...),
        path: str = Query(...),
        table_name: str = Query(""),
        sheet_name: str = Query(""),
    ):
        return profile_file(session_id, path, table_name=table_name, sheet_name=sheet_name)

    @app.get("/workspace/overview")
    async def workspace_overview(session_id: str = Query(...)):
        return workspace_data_overview(session_id)

    @app.get("/workspace/download")
    async def workspace_download(session_id: str = Query(...), path: str = Query(...)):
        return download_file(session_id, path)

    @app.post("/workspace/upload")
    async def workspace_upload(session_id: str = Query(...), files: list[UploadFile] = File(...)):
        return {"files": await upload_files(session_id, files)}

    @app.post("/workspace/upload-to")
    async def workspace_upload_to(
        session_id: str = Query(...),
        dir: str = Query(""),
        files: list[UploadFile] = File(...),
    ):
        return {"files": await upload_files(session_id, files, directory=dir)}

    @app.delete("/workspace/file")
    async def workspace_delete_file(session_id: str = Query(...), path: str = Query(...)):
        delete_path(session_id, path)
        return {"success": True}

    @app.post("/workspace/clear")
    async def workspace_clear_post(session_id: str = Query(...)):
        clear_workspace(session_id)
        state = load_session_state(session_id)
        state["messages"] = []
        state["generated_files"] = []
        save_session_state(session_id, state)
        return {"success": True}

    @app.delete("/workspace/clear")
    async def workspace_clear_delete(session_id: str = Query(...)):
        clear_workspace(session_id)
        state = load_session_state(session_id)
        state["messages"] = []
        state["generated_files"] = []
        save_session_state(session_id, state)
        return {"success": True}

    @app.post("/export/report")
    async def export_report(body: dict[str, Any]):
        session_id = str(body.get("session_id") or "")
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        export_format = str(body.get("format") or "md").lower()
        export_options = {
            "report_type": body.get("report_type") or "full",
            "include_code": body.get("include_code", True),
            "include_charts": body.get("include_charts", True),
            "include_samples": body.get("include_samples", False),
        }
        state = load_session_state(session_id)
        messages = state.get("messages") or []
        markdown_path = export_markdown(messages, workspace_dir(session_id), export_options)
        if export_format == "md":
            return {
                "success": True,
                "format": "md",
                "file": {
                    "name": markdown_path.name,
                    "path": markdown_path.relative_to(workspace_dir(session_id)).as_posix(),
                    "download_url": f"/workspace/download?session_id={session_id}&path={markdown_path.relative_to(workspace_dir(session_id)).as_posix()}",
                },
            }
        try:
            pdf_path = export_pdf(markdown_path)
            return {
                "success": True,
                "format": "pdf",
                "file": {
                    "name": pdf_path.name,
                    "path": pdf_path.relative_to(workspace_dir(session_id)).as_posix(),
                    "download_url": f"/workspace/download?session_id={session_id}&path={pdf_path.relative_to(workspace_dir(session_id)).as_posix()}",
                },
            }
        except Exception as exc:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": str(exc),
                    "fallback": {
                        "format": "md",
                        "file": {
                            "name": markdown_path.name,
                            "path": markdown_path.relative_to(workspace_dir(session_id)).as_posix(),
                            "download_url": f"/workspace/download?session_id={session_id}&path={markdown_path.relative_to(workspace_dir(session_id)).as_posix()}",
                        },
                    },
                },
            )

    return app


app = create_app()


def run() -> None:
    uvicorn.run(app, host=settings.host, port=settings.port)
