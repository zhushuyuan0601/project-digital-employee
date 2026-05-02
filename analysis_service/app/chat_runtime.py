from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path
from typing import Any, Iterable

from openai import AsyncOpenAI

from .execution import collect_artifacts, execute_python, snapshot_workspace
from .settings import settings
from .storage import load_session_state, save_session_state, workspace_dir
from .workspace import IMAGE_EXTENSIONS, build_download_url, classify_artifact, classify_file, collect_file_info, workspace_data_overview


SYSTEM_PROMPT = """You are a structured data analysis assistant.
You must work in explicit tags and only use these tags:
<Analyze>, <Understand>, <Code>, <Execute>, <Ask>, <Answer>, <File>.

Rules:
1. Prefer this flow: Analyze -> Understand -> Code -> Execute -> Answer.
2. If key business definitions are ambiguous, use <Ask>.
3. When you output <Code>, make it the actionable next step.
4. After receiving <Execute>, continue reasoning from real execution output only.
5. Every final result must be wrapped in <Answer>.
"""


CODE_RE = re.compile(r"<Code>([\s\S]*?)</Code>", re.DOTALL)
SECTION_RE = re.compile(r"<(Analyze|Understand|Code|Execute|Ask|Answer|File)>([\s\S]*?)</\1>", re.DOTALL)


def normalize_content(raw: Any) -> str:
    if isinstance(raw, list):
        parts: list[str] = []
        for item in raw:
            if isinstance(item, dict) and item.get("type") == "text":
                text_payload = item.get("text") or {}
                parts.append(str(text_payload.get("value") or ""))
        return "".join(parts)
    return str(raw or "")


def format_selected_file_context(selected_file: Any) -> str:
    if not isinstance(selected_file, dict):
        return ""
    name = str(selected_file.get("name") or "").strip()
    path = str(selected_file.get("path") or "").strip()
    if not name and not path:
        return ""
    context = {
        "name": name or Path(path).name,
        "path": path,
        "category": str(selected_file.get("category") or "unknown"),
        "size": selected_file.get("size"),
        "is_generated": bool(selected_file.get("is_generated")),
    }
    return (
        "The user currently has this file selected in the right-side file panel. "
        "When multiple files exist, treat it as the primary analysis target unless the user explicitly names another file.\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}"
    )


def format_selected_file_profile(profile: Any) -> str:
    if not isinstance(profile, dict):
        return ""
    fields = profile.get("fields") if isinstance(profile.get("fields"), list) else []
    compact_fields = []
    for field in fields[:40]:
        item = {
            "name": field.get("name"),
            "type": field.get("type"),
            "missing_rate": field.get("missing_rate"),
            "unique_count": field.get("unique_count"),
            "samples": field.get("samples", [])[:5] if isinstance(field.get("samples"), list) else [],
        }
        if field.get("stats"):
            item["stats"] = field.get("stats")
        compact_fields.append(item)
    payload = {
        "kind": profile.get("kind"),
        "source_path": profile.get("source_path"),
        "sheet_name": profile.get("sheet_name"),
        "table_name": profile.get("table_name"),
        "row_count": profile.get("row_count"),
        "column_count": profile.get("column_count"),
        "missing_rate": profile.get("missing_rate"),
        "sampled_rows": profile.get("sampled_rows"),
        "fields": compact_fields,
    }
    payload = {key: value for key, value in payload.items() if value not in (None, "", [])}
    return json.dumps(payload, ensure_ascii=False, indent=2)


def format_workspace_overview(session_id: str) -> str:
    try:
        overview = workspace_data_overview(session_id)
    except Exception:
        return ""
    datasets = overview.get("datasets") if isinstance(overview.get("datasets"), list) else []
    compact = {
        "datasets": datasets[:12],
        "relations": (overview.get("relations") or [])[:12],
    }
    return json.dumps(compact, ensure_ascii=False, indent=2)


def prepare_messages(
    messages: list[dict[str, Any]],
    session_id: str,
    selected_file: Any = None,
    selected_file_profile: Any = None,
) -> list[dict[str, str]]:
    prepared: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for message in messages:
        role = str(message.get("role") or "user")
        prepared.append({"role": role, "content": normalize_content(message.get("content"))})
    file_info = collect_file_info(session_id)
    selected_file_context = format_selected_file_context(selected_file)
    selected_profile_context = format_selected_file_profile(selected_file_profile)
    workspace_overview = format_workspace_overview(session_id)
    injected_sections: list[str] = []
    if selected_file_context:
        injected_sections.append(f"# Current Selected File\n{selected_file_context}")
    if selected_profile_context:
        injected_sections.append(f"# Current Selected File Profile\n{selected_profile_context}")
    if workspace_overview:
        injected_sections.append(f"# Workspace Data Overview\n{workspace_overview}")
    if file_info:
        injected_sections.append(f"# Data\n{file_info}")
    if injected_sections:
        for idx in range(len(prepared) - 1, -1, -1):
            if prepared[idx]["role"] == "user":
                prepared[idx]["content"] = f"# Instruction\n{prepared[idx]['content']}\n\n" + "\n\n".join(injected_sections)
                break
    return prepared


def create_client(runtime: dict[str, Any]) -> AsyncOpenAI:
    api_base = str(runtime.get("api_base") or settings.default_api_base).strip()
    api_key = str(runtime.get("api_key") or settings.default_api_key).strip() or "dummy"
    if not api_base:
        raise ValueError("A model API base URL is required")
    return AsyncOpenAI(base_url=api_base.rstrip("/"), api_key=api_key)


def chunk_payload(delta: str | None = None, *, finish_reason: str | None = None, extra_delta: dict[str, Any] | None = None) -> str:
    delta_payload: dict[str, Any] = {}
    if delta is not None:
        delta_payload["content"] = delta
    if extra_delta:
        delta_payload.update(extra_delta)
    payload = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:24]}",
        "object": "chat.completion.chunk",
        "created": 0,
        "model": "analysis",
        "choices": [{"index": 0, "delta": delta_payload, "finish_reason": finish_reason}],
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def final_chunk(session_id: str, files: list[dict[str, str]], summary: dict[str, Any] | None = None) -> str:
    return chunk_payload(
        None,
        finish_reason="stop",
        extra_delta={"session_id": session_id, "files": files, "summary": summary or {}},
    ) + "data: [DONE]\n\n"


def extract_code(content: str) -> str | None:
    matches = CODE_RE.findall(content)
    if not matches:
        return None
    code = matches[-1].strip()
    fenced = re.search(r"```(?:python)?([\s\S]*?)```", code, re.DOTALL)
    return fenced.group(1).strip() if fenced else code


def build_inline_image_url(session_id: str, rel_path: str) -> str:
    return f"/api/analysis/workspace/download?session_id={session_id}&path={rel_path}"


def render_file_block(session_id: str, artifacts: list[Path], workspace: Path, files_sink: list[dict[str, str]]) -> str:
    if not artifacts:
        return ""
    lines = ["<File>"]
    for artifact in artifacts:
        try:
            rel = artifact.resolve().relative_to(workspace.resolve()).as_posix()
        except Exception:
            rel = artifact.name
        url = build_download_url(session_id, rel)
        entry = {
            "name": artifact.name,
            "url": url,
            "path": rel,
            "category": classify_file(artifact),
            "artifact_type": classify_artifact(artifact),
            "size": artifact.stat().st_size if artifact.exists() else 0,
        }
        if entry not in files_sink:
            files_sink.append(entry)
        ext = artifact.suffix.lower()
        if ext in IMAGE_EXTENSIONS:
            inline_url = build_inline_image_url(session_id, rel)
            lines.append(f"![{artifact.name}]({inline_url})")
        else:
            lines.append(f"- [{artifact.name}]({url})")
    lines.append("</File>")
    return "\n" + "\n".join(lines) + "\n"


def render_artifact_metadata(artifacts: list[Path], workspace: Path) -> list[dict[str, Any]]:
    metadata: list[dict[str, Any]] = []
    for artifact in artifacts:
        try:
            rel = artifact.resolve().relative_to(workspace.resolve()).as_posix()
        except Exception:
            rel = artifact.name
        metadata.append({
            "name": artifact.name,
            "path": rel,
            "category": classify_file(artifact),
            "artifact_type": classify_artifact(artifact),
            "size": artifact.stat().st_size if artifact.exists() else 0,
        })
    return metadata


def extract_last_section(content: str, section_type: str) -> str:
    matches = [body.strip() for tag, body in SECTION_RE.findall(content) if tag == section_type]
    return matches[-1] if matches else ""


def compact_text(content: str, limit: int = 180) -> str:
    plain = re.sub(r"```[\s\S]*?```", " ", content)
    plain = re.sub(r"!\[[^\]]*]\([^)]+\)", " ", plain)
    plain = re.sub(r"\[[^\]]+]\([^)]+\)", " ", plain)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain[:limit] + ("..." if len(plain) > limit else "")


def normalize_persisted_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for msg in messages:
        item: dict[str, Any] = {
            "role": msg.get("role", "user"),
            "content": normalize_content(msg.get("content")),
        }
        context = msg.get("context")
        if isinstance(context, dict):
            item["context"] = context
        normalized.append(item)
    return normalized


def build_session_summary(
    messages: list[dict[str, Any]],
    assistant_content: str,
    generated_files: list[dict[str, str]],
    selected_file: Any = None,
    selected_file_profile: Any = None,
) -> dict[str, Any]:
    user_messages = [normalize_content(msg.get("content")) for msg in messages if msg.get("role") == "user"]
    selected_payload = selected_file if isinstance(selected_file, dict) else None
    fields: list[str] = []
    if isinstance(selected_file_profile, dict) and isinstance(selected_file_profile.get("fields"), list):
        fields = [
            str(field.get("name"))
            for field in selected_file_profile.get("fields", [])[:12]
            if isinstance(field, dict) and field.get("name")
        ]
    return {
        "goal": compact_text(user_messages[-1] if user_messages else "", 120),
        "selected_file": {
            "name": selected_payload.get("name"),
            "path": selected_payload.get("path"),
            "sheet_name": selected_payload.get("sheet_name"),
            "table_name": selected_payload.get("table_name"),
        } if selected_payload else None,
        "fields_used": fields,
        "artifacts": generated_files,
        "final_answer_excerpt": compact_text(extract_last_section(assistant_content, "Answer"), 180),
        "updated_at": int(time.time() * 1000),
    }


def persist_session_messages(
    session_id: str,
    messages: list[dict[str, Any]],
    assistant_content: str,
    generated_files: list[dict[str, str]],
    selected_file: Any = None,
    selected_file_profile: Any = None,
) -> None:
    state = load_session_state(session_id)
    normalized_messages = normalize_persisted_messages(messages)
    normalized_messages.append({"role": "assistant", "content": assistant_content})
    summary = build_session_summary(messages, assistant_content, generated_files, selected_file, selected_file_profile)
    state["messages"] = normalized_messages
    state["generated_files"] = generated_files
    state["last_analysis_summary"] = summary
    save_session_state(session_id, state)


async def run_analysis(messages: list[dict[str, Any]], runtime: dict[str, Any], session_id: str):
    generated_files: list[dict[str, str]] = []
    accumulated = ""
    try:
        client = create_client(runtime)
    except Exception as exc:
        accumulated = f"<Answer>\n分析配置错误：{exc}\n</Answer>"
        persist_session_messages(
            session_id,
            messages,
            accumulated,
            generated_files,
            runtime.get("selected_file"),
            runtime.get("selected_file_profile"),
        )
        summary = build_session_summary(
            messages,
            accumulated,
            generated_files,
            runtime.get("selected_file"),
            runtime.get("selected_file_profile"),
        )
        yield chunk_payload(accumulated)
        yield final_chunk(session_id, generated_files, summary)
        return

    model = str(runtime.get("model") or settings.default_model).strip() or settings.default_model
    temperature = float(runtime.get("temperature") or 0.3)
    prepared = prepare_messages(
        messages,
        session_id,
        runtime.get("selected_file"),
        runtime.get("selected_file_profile"),
    )
    workspace = workspace_dir(session_id)
    max_rounds = int(runtime.get("max_rounds") or 8)

    for _ in range(max_rounds):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=prepared,
                temperature=temperature,
                stream=True,
            )
        except Exception as exc:
            error_block = f"\n<Answer>\n分析模型调用失败：{exc}\n</Answer>\n"
            accumulated += error_block
            yield chunk_payload(error_block)
            break

        segment = ""
        finished = False
        async for chunk in response:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta is None:
                continue
            segment += delta
            accumulated += delta
            yield chunk_payload(delta)
            if "</Answer>" in segment or "</Ask>" in segment:
                finished = True
                break

        code = extract_code(segment)
        if finished and not code:
            break
        if not code:
            break

        before = snapshot_workspace(workspace)
        executing_hint = "\n<Execute>\n⏳ 正在执行代码，请稍候...\n"
        accumulated += executing_hint
        yield chunk_payload(executing_hint)
        execution_output = await execute_python(code, workspace)
        after = snapshot_workspace(workspace)
        artifacts = collect_artifacts(before, after, workspace)
        artifact_metadata = render_artifact_metadata(artifacts, workspace)
        execute_result = f"```\n{execution_output}\n```\n</Execute>\n"
        file_block = render_file_block(session_id, artifacts, workspace, generated_files)
        prepared.append({"role": "assistant", "content": segment})
        execute_feedback = f"# Execute Result\n{execution_output}"
        if artifact_metadata:
            execute_feedback += "\n\n# Generated Artifacts\n" + json.dumps(artifact_metadata, ensure_ascii=False, indent=2)
        prepared.append({"role": "user", "content": execute_feedback})
        accumulated += execute_result + file_block
        yield chunk_payload(execute_result + file_block)

    persist_session_messages(
        session_id,
        messages,
        accumulated,
        generated_files,
        runtime.get("selected_file"),
        runtime.get("selected_file_profile"),
    )
    summary = build_session_summary(
        messages,
        accumulated,
        generated_files,
        runtime.get("selected_file"),
        runtime.get("selected_file_profile"),
    )
    yield final_chunk(session_id, generated_files, summary)
