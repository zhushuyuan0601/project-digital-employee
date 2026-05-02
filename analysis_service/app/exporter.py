from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from .settings import settings

try:
    import pypandoc  # type: ignore
except Exception:
    pypandoc = None


REPORT_TITLES = {
    "executive": "管理层摘要",
    "full": "完整分析报告",
    "quality": "数据质量报告",
    "technical": "技术复盘",
}


REPORT_SECTION_TEMPLATES = {
    "executive": [
        ("核心结论", "answer"),
        ("图表证据", "files"),
        ("建议项与风险", "answer"),
    ],
    "quality": [
        ("质量结论", "answer"),
        ("数据理解与字段画像", "understand"),
        ("清洗建议", "answer"),
    ],
    "technical": [
        ("技术复盘", "answer"),
        ("分析过程", "process"),
        ("代码与执行日志", "technical"),
        ("产物清单", "files"),
    ],
    "full": [
        ("结论摘要", "answer"),
        ("分析策略", "analyze"),
        ("数据理解", "understand"),
        ("图表与产物", "files"),
        ("执行过程", "technical"),
    ],
}


def _collect_tagged_content(messages: list[dict[str, Any]]) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {tag: [] for tag in ("Analyze", "Understand", "Code", "Execute", "Ask", "Answer", "File")}
    for message in messages:
        if message.get("role") != "assistant":
            continue
        content = str(message.get("content") or "")
        for tag in buckets:
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
                if segment:
                    buckets[tag].append(segment)
                start = close_index + len(close_tag)
    return buckets


def _format_section(title: str, parts: list[str]) -> str:
    if not parts:
        return ""
    return f"## {title}\n\n" + "\n\n".join(parts).strip()


def extract_sections(messages: list[dict[str, Any]], options: dict[str, Any] | None = None) -> str:
    options = options or {}
    include_code = bool(options.get("include_code", True))
    include_charts = bool(options.get("include_charts", True))
    include_samples = bool(options.get("include_samples", False))
    report_type = str(options.get("report_type") or "full")
    buckets = _collect_tagged_content(messages)
    answer_parts = buckets["Answer"]
    file_parts = buckets["File"]
    if not include_charts:
        file_parts = [
            "\n".join(line for line in segment.splitlines() if not line.strip().startswith("![")).strip()
            for segment in file_parts
        ]
        file_parts = [segment for segment in file_parts if segment]
    technical_parts: list[str] = []
    if include_code:
        technical_parts.extend(f"### Code\n\n{segment}" for segment in buckets["Code"])
    technical_parts.extend(f"### Execute\n\n{segment}" for segment in buckets["Execute"])
    process_parts = []
    process_parts.extend(f"### Analyze\n\n{segment}" for segment in buckets["Analyze"])
    process_parts.extend(f"### Understand\n\n{segment}" for segment in buckets["Understand"])

    section_sources = {
        "answer": answer_parts,
        "files": file_parts,
        "understand": buckets["Understand"],
        "analyze": buckets["Analyze"],
        "technical": technical_parts,
        "process": process_parts,
    }

    title = REPORT_TITLES.get(report_type, REPORT_TITLES["full"])
    body_parts = [f"# {title}"]
    for section_title, source_key in REPORT_SECTION_TEMPLATES.get(report_type, REPORT_SECTION_TEMPLATES["full"]):
        section = _format_section(section_title, section_sources.get(source_key, []))
        if section:
            body_parts.append(section)
    if len(body_parts) == 1:
        body_parts.append("No final answer was generated.")

    appendix: list[str] = []
    for tag, segments in buckets.items():
        if tag == "Code" and not include_code:
            continue
        if tag == "File" and not include_charts:
            segments = file_parts
        for segment in segments:
            appendix.append(f"### {tag}\n\n{segment}\n")
    body = "\n\n".join(body_parts)
    if include_samples:
        body += "\n\n## 数据样例说明\n\n导出配置已请求包含数据样例。请参考工作区源文件和附录中的执行产物。"
    if appendix:
        body += "\n\n---\n\n## Appendix\n\n" + "\n".join(appendix)
    return body


def export_markdown(messages: list[dict[str, Any]], workspace: Path, options: dict[str, Any] | None = None) -> Path:
    generated_dir = workspace / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = generated_dir / f"analysis_report_{timestamp}.md"
    target.write_text(extract_sections(messages, options), encoding="utf-8")
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
