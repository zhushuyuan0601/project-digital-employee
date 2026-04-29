from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("ANALYSIS_SERVICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("ANALYSIS_SERVICE_PORT", "18900"))
    workspace_root: str = os.getenv(
        "ANALYSIS_WORKSPACE_ROOT",
        str((Path(__file__).resolve().parent.parent / "workspace").resolve()),
    )
    default_model: str = os.getenv("ANALYSIS_DEFAULT_MODEL", "gpt-4o-mini")
    default_api_base: str = os.getenv("ANALYSIS_DEFAULT_API_BASE", "").strip()
    default_api_key: str = os.getenv("ANALYSIS_DEFAULT_API_KEY", "").strip()
    execution_timeout_sec: int = int(os.getenv("ANALYSIS_EXECUTION_TIMEOUT_SEC", "120"))
    pdf_enabled: bool = _bool_env("ANALYSIS_PDF_ENABLED", True)


settings = Settings()
