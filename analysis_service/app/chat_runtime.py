from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Any, Iterable

from openai import AsyncOpenAI

from .execution import collect_artifacts, execute_python, snapshot_workspace
from .settings import settings
from .storage import load_session_state, save_session_state, workspace_dir
from .workspace import build_download_url, collect_file_info


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


def normalize_content(raw: Any) -> str:
    if isinstance(raw, list):
        parts: list[str] = []
        for item in raw:
            if isinstance(item, dict) and item.get("type") == "text":
                text_payload = item.get("text") or {}
                parts.append(str(text_payload.get("value") or ""))
        return "".join(parts)
    return str(raw or "")


def prepare_messages(messages: list[dict[str, Any]], session_id: str) -> list[dict[str, str]]:
    prepared: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for message in messages:
        role = str(message.get("role") or "user")
        prepared.append({"role": role, "content": normalize_content(message.get("content"))})
    file_info = collect_file_info(session_id)
    if file_info:
        for idx in range(len(prepared) - 1, -1, -1):
            if prepared[idx]["role"] == "user":
                prepared[idx]["content"] = f"# Instruction\n{prepared[idx]['content']}\n\n# Data\n{file_info}"
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


def final_chunk(session_id: str, files: list[dict[str, str]]) -> str:
    return chunk_payload(
        None,
        finish_reason="stop",
        extra_delta={"session_id": session_id, "files": files},
    ) + "data: [DONE]\n\n"


def extract_code(content: str) -> str | None:
    matches = CODE_RE.findall(content)
    if not matches:
        return None
    code = matches[-1].strip()
    fenced = re.search(r"```(?:python)?([\s\S]*?)```", code, re.DOTALL)
    return fenced.group(1).strip() if fenced else code


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
        entry = {"name": artifact.name, "url": url}
        if entry not in files_sink:
            files_sink.append(entry)
        lines.append(f"- [{artifact.name}]({url})")
    lines.append("</File>")
    return "\n" + "\n".join(lines) + "\n"


def persist_session_messages(
    session_id: str,
    messages: list[dict[str, Any]],
    assistant_content: str,
    generated_files: list[dict[str, str]],
) -> None:
    state = load_session_state(session_id)
    normalized_messages = [{"role": msg.get("role", "user"), "content": normalize_content(msg.get("content"))} for msg in messages]
    normalized_messages.append({"role": "assistant", "content": assistant_content})
    state["messages"] = normalized_messages
    state["generated_files"] = generated_files
    save_session_state(session_id, state)


async def run_analysis(messages: list[dict[str, Any]], runtime: dict[str, Any], session_id: str):
    generated_files: list[dict[str, str]] = []
    accumulated = ""
    try:
        client = create_client(runtime)
    except Exception as exc:
        accumulated = f"<Answer>\n分析配置错误：{exc}\n</Answer>"
        persist_session_messages(session_id, messages, accumulated, generated_files)
        yield chunk_payload(accumulated)
        yield final_chunk(session_id, generated_files)
        return

    model = str(runtime.get("model") or settings.default_model).strip() or settings.default_model
    temperature = float(runtime.get("temperature") or 0.3)
    prepared = prepare_messages(messages, session_id)
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
        execution_output = await execute_python(code, workspace)
        after = snapshot_workspace(workspace)
        artifacts = collect_artifacts(before, after, workspace)
        execute_block = f"\n<Execute>\n```\n{execution_output}\n```\n</Execute>\n"
        file_block = render_file_block(session_id, artifacts, workspace, generated_files)
        prepared.append({"role": "assistant", "content": segment})
        prepared.append({"role": "user", "content": f"# Execute Result\n{execution_output}"})
        accumulated += execute_block + file_block
        if execute_block:
            yield chunk_payload(execute_block + file_block)

    persist_session_messages(session_id, messages, accumulated, generated_files)
    yield final_chunk(session_id, generated_files)
