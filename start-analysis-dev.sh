#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANALYSIS_DIR="$ROOT_DIR/analysis_service"
SERVER_DIR="$ROOT_DIR/server"

ANALYSIS_PORT="${ANALYSIS_SERVICE_PORT:-18900}"
SERVER_PORT="${PORT:-18888}"
FRONTEND_PORT="${VITE_PORT:-3000}"

ANALYSIS_LOG="${ANALYSIS_LOG:-/tmp/project-digital-employee-analysis.log}"
SERVER_LOG="${SERVER_LOG:-/tmp/project-digital-employee-server.log}"
ANALYSIS_PID_FILE="${ANALYSIS_PID_FILE:-/tmp/project-digital-employee-analysis.pid}"
SERVER_PID_FILE="${SERVER_PID_FILE:-/tmp/project-digital-employee-server.pid}"

echo "===================================="
echo "数据分析工作台 - 本地开发启动"
echo "===================================="
echo ""

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[错误] 缺少命令: $1"
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local retries="${3:-20}"

  for _ in $(seq 1 "$retries"); do
    if curl -sS "$url" >/dev/null 2>&1; then
      echo "  ✓ $name 已就绪"
      return 0
    fi
    sleep 1
  done

  echo "  ✗ $name 启动失败"
  return 1
}

cleanup_stale_pid() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
    fi
  fi
}

ensure_not_running() {
  local pid_file="$1"
  local name="$2"
  cleanup_stale_pid "$pid_file"

  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "[提示] $name 已在运行，PID=$pid"
      return 0
    fi
  fi

  return 1
}

start_analysis_service() {
  if ensure_not_running "$ANALYSIS_PID_FILE" "分析服务"; then
    return 0
  fi

  if [ ! -x "$ANALYSIS_DIR/.venv/bin/python" ]; then
    echo "[错误] 未找到 $ANALYSIS_DIR/.venv/bin/python"
    echo "请先执行："
    echo "  cd analysis_service"
    echo "  python3 -m venv .venv"
    echo "  .venv/bin/pip install -r requirements.txt"
    exit 1
  fi

  echo "[1/2] 启动分析服务 (端口 $ANALYSIS_PORT)..."
  (
    cd "$ANALYSIS_DIR"
    nohup .venv/bin/python run.py >"$ANALYSIS_LOG" 2>&1 &
    echo $! >"$ANALYSIS_PID_FILE"
  )

  if ! wait_for_http "http://127.0.0.1:$ANALYSIS_PORT/health" "分析服务"; then
    echo "  日志文件: $ANALYSIS_LOG"
    exit 1
  fi
}

start_node_server() {
  if ensure_not_running "$SERVER_PID_FILE" "Node API 服务"; then
    return 0
  fi

  echo "[2/2] 启动 Node API 服务 (端口 $SERVER_PORT)..."
  (
    cd "$SERVER_DIR"
    nohup node index.js >"$SERVER_LOG" 2>&1 &
    echo $! >"$SERVER_PID_FILE"
  )

  if ! wait_for_http "http://127.0.0.1:$SERVER_PORT/api/analysis/models" "Node API 服务"; then
    echo "  日志文件: $SERVER_LOG"
    exit 1
  fi
}

require_command curl
require_command node

start_analysis_service
start_node_server

echo ""
echo "服务状态"
echo "  分析服务: http://127.0.0.1:$ANALYSIS_PORT"
echo "  Node API: http://127.0.0.1:$SERVER_PORT"
echo "  前端开发页: http://127.0.0.1:$FRONTEND_PORT/analysis"
echo ""
echo "日志文件"
echo "  $ANALYSIS_LOG"
echo "  $SERVER_LOG"
echo ""
echo "前端未启动时，单独执行："
echo "  npm run dev"
