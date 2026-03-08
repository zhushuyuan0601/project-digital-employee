#!/bin/bash
# Agent Swarm 监控脚本 - Elvis 架构实现
# 每10分钟运行一次，检查所有活跃Agent的状态

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
TASKS_FILE="$CLAWDBOT_DIR/active-tasks.json"
LOGS_DIR="$CLAWDBOT_DIR/logs"
COMPLETED_DIR="$CLAWDBOT_DIR/completed-tasks"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/monitor-$(date +%Y%m%d).log"
}

# 检查任务文件是否存在
if [ ! -f "$TASKS_FILE" ]; then
    log "❌ 任务文件不存在: $TASKS_FILE"
    exit 1
fi

# 读取活跃任务数量
ACTIVE_COUNT=$(jq '.tasks | length' "$TASKS_FILE" 2>/dev/null || echo "0")

if [ "$ACTIVE_COUNT" -eq 0 ]; then
    log "ℹ️  没有活跃任务"
    exit 0
fi

log "🔍 检查 $ACTIVE_COUNT 个活跃任务..."

# 遍历每个任务
jq -c '.tasks[]' "$TASKS_FILE" | while read -r task; do
    TASK_ID=$(echo "$task" | jq -r '.id')
    TMUX_SESSION=$(echo "$task" | jq -r '.tmuxSession // empty')
    REPO=$(echo "$task" | jq -r '.repo // empty')
    BRANCH=$(echo "$task" | jq -r '.branch // empty')
    ATTEMPTS=$(echo "$task" | jq -r '.attempts // 0')
    
    log "📋 检查任务: $TASK_ID"
    
    # 检查1: tmux会话是否存活
    if [ -n "$TMUX_SESSION" ]; then
        if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
            log "⚠️  tmux会话已结束: $TMUX_SESSION"
            # 会话结束，检查是否创建了PR
        else
            log "✅ tmux会话存活: $TMUX_SESSION"
        fi
    fi
    
    # 检查2: 是否有PR创建
    if [ -n "$BRANCH" ] && [ -n "$REPO" ]; then
        PR_NUMBER=$(gh pr list --head "$BRANCH" --repo "$REPO" --json number --jq '.[0].number // empty' 2>/dev/null || echo "")
        
        if [ -n "$PR_NUMBER" ]; then
            log "✅ PR已创建: #$PR_NUMBER"
            
            # 检查3: CI状态
            CI_STATUS=$(gh pr checks "$PR_NUMBER" --repo "$REPO" 2>/dev/null || echo "unknown")
            
            if echo "$CI_STATUS" | grep -q "fail"; then
                log "❌ CI失败 - 触发重试逻辑"
                # TODO: 调用重试逻辑
            elif echo "$CI_STATUS" | grep -q "pass"; then
                log "✅ CI通过"
                
                # 检查4: 代码审查状态
                # TODO: 检查多个AI审查结果
                
                # 所有检查通过，移动到completed
                log "🎉 任务完成: $TASK_ID (PR #$PR_NUMBER)"
                
                # 更新任务状态
                jq --arg taskId "$TASK_ID" --arg pr "$PR_NUMBER" '
                    (.tasks[] | select(.id == $taskId)) |= . + {
                        "status": "done",
                        "pr": ($pr | tonumber),
                        "completedAt": (now | todate),
                        "checks": {"prCreated": true, "ciPassed": true}
                    }
                ' "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
            fi
        else
            log "⏳ PR尚未创建"
        fi
    fi
done

# 清理已完成的任务
COMPLETED=$(jq '[.tasks[] | select(.status == "done")]' "$TASKS_FILE" 2>/dev/null || echo "[]")
COMPLETED_COUNT=$(echo "$COMPLETED" | jq 'length')

if [ "$COMPLETED_COUNT" -gt 0 ]; then
    log "📦 移动 $COMPLETED_COUNT 个已完成任务到历史记录"
    
    # 保存到历史文件
    echo "$COMPLETED" >> "$COMPLETED_DIR/completed-$(date +%Y%m%d).json"
    
    # 从活跃任务中移除
    jq '.tasks = [.tasks[] | select(.status != "done")]' "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
fi

# 更新元数据
jq --arg count "$(jq '.tasks | length' "$TASKS_FILE")" '
    .metadata.lastUpdated = (now | todate) |
    .metadata.activeCount = ($count | tonumber)
' "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"

log "✅ 监控检查完成"