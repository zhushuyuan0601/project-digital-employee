#!/bin/bash

# 智能体状态同步脚本 v2

# Star Office UI 配置
STAR_OFFICE_URL="http://127.0.0.1:19000"

# 智能体角色映射
declare -A AGENT_ROLES=(
    ["ceo"]="小U（任务秘书）🐾"
    ["researcher"]="小研（竞品分析师）🔍"
    ["pm"]="小产（产品经理）📊"
    ["tech-lead"]="小开（研发工程师）💻"
    ["team-qa"]="小测（质量检查员）🛡️"
)

declare -A STATE_DESCRIPTIONS=(
    ["idle"]="待命中"
    ["writing"]="正在编写代码/文档"
    ["researching"]="正在调研分析"
    ["executing"]="正在执行任务"
    ["syncing"]="正在同步数据"
    ["error"]="发现问题，排查中"
)

# 检查参数
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "用法: ./agent-status-sync-v2.sh <agent-id> <state>"
    echo ""
    echo "agent-id: ceo, researcher, pm, tech-lead, team-qa"
    echo "state: idle, writing, researching, executing, syncing, error"
    echo ""
    echo "示例:"
    echo "  ./agent-status-sync-v2.sh tech-lead executing"
    echo "  ./agent-status-sync-v2.sh researcher researching"
    exit 1
fi

AGENT_ID="$1"
STATE="$2"

# 验证 agent-id
if [[ ! " ${!AGENT_ROLES[@]} " =~ " ${AGENT_ID} " ]]; then
    echo "错误: 未知的 agent-id '$AGENT_ID'"
    echo "可用的 agent-id: ${!AGENT_ROLES[@]}"
    exit 1
fi

# 验证 state
if [[ ! " ${!STATE_DESCRIPTIONS[@]} " =~ " ${STATE} " ]]; then
    echo "错误: 未知的 state '$STATE'"
    echo "可用的 state: ${!STATE_DESCRIPTIONS[@]}"
    exit 1
fi

# 获取智能体名称和描述
AGENT_NAME="${AGENT_ROLES[$AGENT_ID]}"
DESCRIPTION="${STATE_DESCRIPTIONS[$STATE]}"

# 显示状态信息
echo ""
echo "=========================================="
echo "智能体状态同步"
echo "=========================================="
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "智能体: $AGENT_NAME"
echo "状态: $STATE"
echo "描述: $DESCRIPTION"
echo "=========================================="
echo ""

# 同步到 Star Office UI
echo "→ Star Office UI: $STATE - $DESCRIPTION"
curl -s -X POST "$STAR_OFFICE_URL/set_state" \
    -H "Content-Type: application/json" \
    -d "{\"state\": \"$STATE\", \"description\": \"$DESCRIPTION\", \"character\": \"$AGENT_ID\"}" \
    > /dev/null 2>&1

echo "状态已更新: $STATE - $DESCRIPTION"
echo ""

# 完成
echo "✅ 状态同步完成"
echo ""