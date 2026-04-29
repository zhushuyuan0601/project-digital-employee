from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from .settings import settings

try:
    import pypandoc  # type: ignore
except Exception:
    pypandoc = None


def extract_sections(messages: list[dict[str, Any]]) -> str:
    answer_parts: list[str] = []
    appendix: list[str] = []
    for message in messages:
        if message.get("role") != "assistant":
            continue
        content = str(message.get("content") or "")
        for tag in ("Analyze", "Understand", "Code", "Execute", "Ask", "Answer", "File"):
            open_tag = f"<{tag}>"
            close_tag = f"</{tag}>"
            start = 0
            while True:
                open_index = content.find(open_tag, start)
                if open_index == -1:
                    break
                close_index = content.find(close_tag, open_index + len(open_tag))
                if close_index == -1:
                    break
                segment = content[open_index + len(open_tag):close_index].strip()
                if tag == "Answer" and segment:
                    answer_parts.append(segment)
                if segment:
                    appendix.append(f"### {tag}\n\n{segment}\n")
                start = close_index + len(close_tag)
    body = "\n\n".join(answer_parts).strip() or "No final answer was generated."
    if appendix:
        body += "\n\n---\n\n## Appendix\n\n" + "\n".join(appendix)
    return body


def export_markdown(messages: list[dict[str, Any]], workspace: Path) -> Path:
    generated_dir = workspace / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = generated_dir / f"analysis_report_{timestamp}.md"
    target.write_text(extract_sections(messages), encoding="utf-8")
    return target


def export_pdf(markdown_path: Path) -> Path:
    if not settings.pdf_enabled:
        raise RuntimeError("PDF export is disabled")
    if pypandoc is None:
        raise RuntimeError("pypandoc is not installed")
    pdf_path = markdown_path.with_suffix(".pdf")
    pypandoc.convert_file(
        str(markdown_path),
        "pdf",
        outputfile=str(pdf_path),
        extra_args=["--pdf-engine=xelatex"],
    )
    return pdf_path
