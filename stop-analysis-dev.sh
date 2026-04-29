#!/bin/bash

set -euo pipefail

ANALYSIS_PID_FILE="${ANALYSIS_PID_FILE:-/tmp/project-digital-employee-analysis.pid}"
SERVER_PID_FILE="${SERVER_PID_FILE:-/tmp/project-digital-employee-server.pid}"

stop_by_pid_file() {
  local pid_file="$1"
  local name="$2"

  if [ ! -f "$pid_file" ]; then
    echo "[提示] $name 未记录 PID"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "已停止 $name，PID=$pid"
  else
    echo "[提示] $name 进程不存在"
  fi

  rm -f "$pid_file"
}

echo "停止数据分析工作台相关服务..."
stop_by_pid_file "$SERVER_PID_FILE" "Node API 服务"
stop_by_pid_file "$ANALYSIS_PID_FILE" "分析服务"
