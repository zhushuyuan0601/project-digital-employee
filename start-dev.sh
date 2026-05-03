#!/bin/bash

# OpenClaw Unicom UI - 开发环境启动脚本
# 自动启动后端服务器和前端开发环境

echo "╔════════════════════════════════════════════════════════╗"
echo "║     OpenClaw Unicom UI - 开发环境启动                  ║"
echo "╚════════════════════════════════════════════════════════╝"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "[1/4] 检查 Node.js 版本..."
node --version
NODE_BIN_DIR="$(dirname "$(command -v node)")"
OPENCLAW_BIN_PATH="$(command -v openclaw 2>/dev/null || true)"
if [ -n "$OPENCLAW_BIN_PATH" ]; then
    export OPENCLAW_BIN="$OPENCLAW_BIN_PATH"
fi
export PATH="$NODE_BIN_DIR:$PATH"

# 停止已有进程
echo "[2/4] 停止已有服务..."
pkill -f "node server/index.js" 2>/dev/null || true
if command -v lsof &> /dev/null; then
    lsof -tiTCP:18888 -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
fi

# 启动后端服务器
echo "[3/4] 启动后端服务器 (端口 18888)..."
cd "$(dirname "$0")"
nohup env PATH="$PATH" OPENCLAW_BIN="${OPENCLAW_BIN:-}" node server/index.js > /tmp/unicom-server.log 2>&1 < /dev/null &
SERVER_PID=$!
echo "     后端服务器 PID: $SERVER_PID"

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:18888/health > /dev/null 2>&1; then
    echo "     ✓ 后端服务器启动成功"
else
    echo "     ✗ 后端服务器启动失败，请查看日志：/tmp/unicom-server.log"
    exit 1
fi

# 测试所有 API 端点
echo "[4/4] 测试 API 端点..."
echo ""

# Skills API
SKILLS_COUNT=$(curl -s http://localhost:18888/api/skills 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('skills', [])))" 2>/dev/null || echo "0")
echo "     Skills API: $SKILLS_COUNT 个技能"

# Tokens API
TOKENS_TOTAL=$(curl -s http://localhost:18888/api/tokens/stats 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('totalTokens', 0))" 2>/dev/null || echo "0")
echo "     Tokens API: $TOKENS_TOTAL tokens"

# Memory API
MEMORY_FILES=$(curl -s http://localhost:18888/api/memory 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('files', [])))" 2>/dev/null || echo "0")
echo "     Memory API: $MEMORY_FILES 个文件"

# Security API
SECURITY_SCORE=$(curl -s http://localhost:18888/api/security/audit 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('score', 0))" 2>/dev/null || echo "0")
echo "     Security API: 安全评分 $SECURITY_SCORE"

# Cron API
CRON_TASKS=$(curl -s http://localhost:18888/api/cron/tasks 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('tasks', [])))" 2>/dev/null || echo "0")
echo "     Cron API: $CRON_TASKS 个任务"

# Webhooks API
WEBHOOKS_COUNT=$(curl -s http://localhost:18888/api/webhooks 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('webhooks', [])))" 2>/dev/null || echo "0")
echo "     Webhooks API: $WEBHOOKS_COUNT 个 webhook"

# Tasks API
TASKS_COUNT=$(curl -s 'http://localhost:18888/api/tasks?limit=100' 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('tasks', [])))" 2>/dev/null || echo "0")
echo "     Tasks API: $TASKS_COUNT 个任务"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  后端服务器已启动                                       ║"
echo "║  访问地址：http://localhost:18888                      ║"
echo "║  日志文件：/tmp/unicom-server.log                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "下一步："
echo "  1. 启动前端：npm run dev"
echo "  2. 访问前端：http://localhost:3000"
echo ""
echo "停止服务："
echo "  pkill -f 'node server/index.js'"
echo ""
