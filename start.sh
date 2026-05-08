#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-18888}"
FRONTEND_PORT="${FRONTEND_PORT:-10001}"
SERVER_LOG="${SERVER_LOG:-/tmp/digital-employee-server.log}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    echo "Stopping backend ${SERVER_PID}..."
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "${ROOT_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found in PATH." >&2
  exit 1
fi

echo "===================================="
echo "多Agent 协作开发环境"
echo "===================================="
echo "Project: ${ROOT_DIR}"
echo "Backend: http://localhost:${PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend log: ${SERVER_LOG}"
echo ""

if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  npm install
fi

if [[ ! -d "${ROOT_DIR}/server/node_modules" ]]; then
  echo "Installing backend dependencies..."
  npm --prefix server install
fi

# Local development convenience: stop a stale backend from this project before starting a new one.
pkill -f "node server/index.js" >/dev/null 2>&1 || true

echo "Starting backend..."
PORT="${PORT}" node server/index.js >"${SERVER_LOG}" 2>&1 &
SERVER_PID="$!"

echo "Waiting for backend health check..."
for _ in {1..30}; do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    echo "Backend is healthy."
    break
  fi
  sleep 1
done

if ! curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
  echo "Backend did not become healthy. See ${SERVER_LOG}" >&2
  exit 1
fi

echo "Starting frontend..."
npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT}"
