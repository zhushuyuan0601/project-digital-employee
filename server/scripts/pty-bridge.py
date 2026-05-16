#!/usr/bin/env python3
import argparse
import fcntl
import os
import pty
import select
import signal
import struct
import subprocess
import sys
import termios

RESIZE_PREFIX = b"\x1b]1337;Resize="


def set_winsize(fd, cols, rows):
    try:
        size = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, size)
    except OSError:
        pass


def parse_resize_frame(data):
    if not data.startswith(RESIZE_PREFIX) or not data.endswith(b"\x07"):
        return None
    try:
        payload = data[len(RESIZE_PREFIX):-1].decode("ascii")
        cols_text, rows_text = payload.split("x", 1)
        cols = max(40, min(240, int(cols_text)))
        rows = max(12, min(120, int(rows_text)))
        return cols, rows
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cwd", required=True)
    parser.add_argument("--cols", type=int, default=120)
    parser.add_argument("--rows", type=int, default=36)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    if not args.command:
        print("pty-bridge: command is required", file=sys.stderr)
        return 2

    master_fd, slave_fd = pty.openpty()
    set_winsize(slave_fd, args.cols, args.rows)

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["COLORTERM"] = "truecolor"
    env["FORCE_COLOR"] = "1"
    env["COLUMNS"] = str(args.cols)
    env["LINES"] = str(args.rows)

    process = subprocess.Popen(
        args.command,
        cwd=args.cwd,
        env=env,
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        start_new_session=True,
        close_fds=True,
    )
    os.close(slave_fd)

    exit_code = 0
    stdin_open = True
    try:
        while True:
            if process.poll() is not None:
                exit_code = process.returncode
                break

            read_fds = [master_fd]
            if stdin_open:
                read_fds.append(0)
            readable, _, _ = select.select(read_fds, [], [], 0.1)
            for fd in readable:
                if fd == master_fd:
                    try:
                        data = os.read(master_fd, 4096)
                    except OSError:
                        data = b""
                    if not data:
                        exit_code = process.wait()
                        return exit_code
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
                else:
                    data = os.read(0, 4096)
                    if not data:
                        stdin_open = False
                        continue
                    resize = parse_resize_frame(data)
                    if resize:
                        cols, rows = resize
                        set_winsize(master_fd, cols, rows)
                        try:
                            os.killpg(process.pid, signal.SIGWINCH)
                        except OSError:
                            pass
                        continue
                    os.write(master_fd, data)
    except KeyboardInterrupt:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except OSError:
            pass
        exit_code = 130
    finally:
        try:
            os.close(master_fd)
        except OSError:
            pass

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
