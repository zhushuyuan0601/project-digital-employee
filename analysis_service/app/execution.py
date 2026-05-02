from __future__ import annotations

import asyncio
import os
import platform
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .settings import settings

SAFE_ENV_KEYS = {"PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "MPLBACKEND", "QT_QPA_PLATFORM"}

_MAX_MEMORY_BYTES = 512 * 1024 * 1024  # 512 MB
_MAX_OPEN_FILES = 256


def _preexec_sandbox(timeout: int) -> None:
    """Applied in the child process before exec. Sets resource limits (Unix only)."""
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (_MAX_MEMORY_BYTES, _MAX_MEMORY_BYTES))
        resource.setrlimit(resource.RLIMIT_NOFILE, (_MAX_OPEN_FILES, _MAX_OPEN_FILES))
        resource.setrlimit(resource.RLIMIT_CPU, (timeout, timeout))
        if hasattr(resource, "RLIMIT_NPROC"):
            resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    except (ImportError, ValueError, OSError):
        pass


def snapshot_workspace(root: Path) -> dict[Path, tuple[int, int]]:
    try:
        return {
            path.resolve(): (path.stat().st_size, path.stat().st_mtime_ns)
            for path in root.rglob("*")
            if path.is_file()
        }
    except Exception:
        return {}


def collect_artifacts(before: dict[Path, tuple[int, int]], after: dict[Path, tuple[int, int]], workspace: Path) -> list[Path]:
    generated_root = workspace / "generated"
    generated_root.mkdir(parents=True, exist_ok=True)
    artifacts: list[Path] = []
    added = [path for path in after if path not in before]
    modified = [path for path in after if path in before and after[path] != before[path]]
    for path in added:
        if generated_root in path.parents:
            artifacts.append(path)
            continue
        target = generated_root / path.name
        counter = 1
        while target.exists():
            target = generated_root / f"{target.stem}_{counter}{target.suffix}"
            counter += 1
        try:
            shutil.copy2(path, target)
            artifacts.append(target.resolve())
        except Exception:
            artifacts.append(path)
    for path in modified:
        target = generated_root / f"{path.stem}_modified{path.suffix}"
        counter = 1
        while target.exists():
            target = generated_root / f"{path.stem}_modified_{counter}{path.suffix}"
            counter += 1
        try:
            shutil.copy2(path, target)
            artifacts.append(target.resolve())
        except Exception:
            continue
    return artifacts


async def execute_python(code: str, workspace: Path, timeout_sec: int | None = None) -> str:
    # NOTE: This provides process-level sandboxing only.
    # Production deployments MUST run this service in a container with --network=none and --read-only.
    timeout = timeout_sec or settings.execution_timeout_sec
    workspace.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(suffix=".py", dir=str(workspace))
    os.close(fd)
    process: asyncio.subprocess.Process | None = None
    try:
        Path(tmp_path).write_text(code, encoding="utf-8")
        env = {k: v for k, v in os.environ.items() if k in SAFE_ENV_KEYS}
        env["MPLBACKEND"] = "Agg"
        env["QT_QPA_PLATFORM"] = "offscreen"
        env["PYTHONPATH"] = str(workspace)

        preexec = None
        if platform.system() != "Windows":
            preexec = lambda: _preexec_sandbox(timeout)

        process = await asyncio.create_subprocess_exec(
            sys.executable,
            tmp_path,
            cwd=str(workspace),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            preexec_fn=preexec,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return f"[Timeout]: execution exceeded {timeout} seconds"
        output = (stdout.decode("utf-8", errors="replace") if stdout else "") + (stderr.decode("utf-8", errors="replace") if stderr else "")
        return output or "[Execute]: completed without stdout"
    except asyncio.CancelledError:
        if process and process.returncode is None:
            process.kill()
            await process.wait()
        raise
    except subprocess.TimeoutExpired:
        return f"[Timeout]: execution exceeded {timeout} seconds"
    except Exception as exc:
        return f"[Error]: {exc}"
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass
