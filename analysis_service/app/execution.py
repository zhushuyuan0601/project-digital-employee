from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .settings import settings


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
    timeout = timeout_sec or settings.execution_timeout_sec
    workspace.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(suffix=".py", dir=str(workspace))
    os.close(fd)
    try:
        Path(tmp_path).write_text(code, encoding="utf-8")
        env = os.environ.copy()
        env.setdefault("MPLBACKEND", "Agg")
        env.setdefault("QT_QPA_PLATFORM", "offscreen")
        env.pop("DISPLAY", None)
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            tmp_path,
            cwd=str(workspace),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return f"[Timeout]: execution exceeded {timeout} seconds"
        output = (stdout.decode("utf-8", errors="replace") if stdout else "") + (stderr.decode("utf-8", errors="replace") if stderr else "")
        return output or "[Execute]: completed without stdout"
    except subprocess.TimeoutExpired:
        return f"[Timeout]: execution exceeded {timeout} seconds"
    except Exception as exc:
        return f"[Error]: {exc}"
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass
