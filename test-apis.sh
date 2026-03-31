#!/bin/bash

# API 测试脚本

echo "╔════════════════════════════════════════════════════════╗"
echo "║          OpenClaw Unicom UI - API 测试                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="${1:-http://localhost:18888}"
echo "后端地址：$BASE_URL"
echo ""

# 健康检查
echo "[健康检查]"
HEALTH=$(curl -s "$BASE_URL/health" 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "  ✓ 服务正常"
    echo "  $HEALTH"
else
    echo "  ✗ 服务不可用"
    exit 1
fi
echo ""

# Skills API
echo "[Skills API]"
SKILLS=$(curl -s "$BASE_URL/api/skills" 2>/dev/null)
SKILLS_COUNT=$(echo "$SKILLS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('skills', [])))" 2>/dev/null || echo "0")
echo "  技能数量：$SKILLS_COUNT"
if [ "$SKILLS_COUNT" -gt 0 ]; then
    echo "  技能列表:"
    echo "$SKILLS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d.get('skills',[])[:5]:
    status = '✓' if s.get('installed') else '○'
    print(f'    {status} {s.get(\"name\")} v{s.get(\"version\")}')
" 2>/dev/null
fi
echo ""

# Tokens API
echo "[Tokens API]"
TOKENS=$(curl -s "$BASE_URL/api/tokens/stats" 2>/dev/null)
TOTAL_TOKENS=$(echo "$TOKENS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('totalTokens', 0))" 2>/dev/null || echo "0")
TOTAL_COST=$(echo "$TOKENS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('totalCost', 0))" 2>/dev/null || echo "0")
echo "  总 Token 数：$TOTAL_TOKENS"
echo "  总成本：\$ $TOTAL_COST"
echo ""

# Memory API
echo "[Memory API]"
MEMORY=$(curl -s "$BASE_URL/api/memory" 2>/dev/null)
FILES=$(echo "$MEMORY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('files', [])))" 2>/dev/null || echo "0")
NODES=$(echo "$MEMORY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('nodes', [])))" 2>/dev/null || echo "0")
echo "  文件数量：$FILES"
echo "  节点数量：$NODES"
echo ""

# Security API
echo "[Security API]"
SECURITY=$(curl -s "$BASE_URL/api/security/audit" 2>/dev/null)
SCORE=$(echo "$SECURITY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('score', 0))" 2>/dev/null || echo "0")
SECRETS=$(echo "$SECURITY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('secretsDetected', 0))" 2>/dev/null || echo "0")
echo "  安全评分：$SCORE / 100"
echo "  检测密钥：$SECRETS"
echo ""

# Cron API
echo "[Cron API]"
CRON=$(curl -s "$BASE_URL/api/cron/tasks" 2>/dev/null)
TASKS=$(echo "$CRON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('tasks', [])))" 2>/dev/null || echo "0")
ENABLED=$(echo "$CRON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stats',{}).get('enabledTasks', 0))" 2>/dev/null || echo "0")
echo "  任务总数：$TASKS"
echo "  已启用：$ENABLED"
echo ""

# Webhooks API
echo "[Webhooks API]"
WEBHOOKS=$(curl -s "$BASE_URL/api/webhooks" 2>/dev/null)
WH_COUNT=$(echo "$WEBHOOKS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('webhooks', [])))" 2>/dev/null || echo "0")
echo "  Webhook 数量：$WH_COUNT"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║  所有 API 测试完成                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
