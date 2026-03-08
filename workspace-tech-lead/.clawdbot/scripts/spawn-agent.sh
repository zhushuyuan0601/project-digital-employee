#!/bin/bash
# Agent 生成器 - 创建新的编码Agent

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
TASKS_FILE="$CLAWDBOT_DIR/active-tasks.json"
TEMPLATES_DIR="$CLAWDBOT_DIR/templates"
LOGS_DIR="$CLAWDBOT_DIR/logs"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/spawn-$(date +%Y%m%d).log"
}

# 选择合适的Agent
select_agent() {
    local task_type="$1"
    local has_ui="$2"
    local priority="$3"
    
    case "$task_type" in
        backend|bugfix|refactor)
            echo "codex"
            ;;
        frontend|ui)
            echo "claude-code"
            ;;
        design)
            echo "gemini"
            ;;
        *)
            if [ "$has_ui" = "true" ]; then
                echo "claude-code"
            else
                echo "codex"
            fi
            ;;
    esac
}

# 生成任务ID
generate_task_id() {
    local task_type="$1"
    echo "${task_type}-$(date +%s)-$(head /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | head -c 6)"
}

# 生成worktree名称
generate_worktree_name() {
    local task_id="$1"
    local repo_name="$2"
    echo "../${repo_name}-worktrees/${task_id}"
}

# 创建worktree
create_worktree() {
    local repo_path="$1"
    local worktree_path="$2"
    local branch_name="$3"
    
    log "📂 创建 worktree: $worktree_path"
    
    # 创建worktree目录
    mkdir -p "$(dirname "$worktree_path")"
    
    # 创建git worktree
    cd "$repo_path"
    git worktree add "$worktree_path" -b "$branch_name" origin/main 2>/dev/null || {
        log "⚠️  分支已存在，使用现有分支"
        git worktree add "$worktree_path" "$branch_name"
    }
    
    # 安装依赖
    cd "$worktree_path"
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install
    elif [ -f "package-lock.json" ]; then
        npm install
    elif [ -f "yarn.lock" ]; then
        yarn install
    fi
    
    log "✅ Worktree 创建完成"
}

# 生成完整的prompt
generate_prompt() {
    local task_type="$1"
    local task_description="$2"
    local business_context="$3"
    local technical_context="$4"
    local constraints="$5"
    
    local template_file="$TEMPLATES_DIR/${task_type}.md"
    
    if [ -f "$template_file" ]; then
        # 使用模板
        local template=$(cat "$template_file")
        
        # 替换占位符
        echo "$template" | \
            sed "s/\[功能名称\]/$task_description/g" | \
            sed "s/\[业务上下文\]/$business_context/g" | \
            sed "s/\[技术要求\]/$technical_context/g" | \
            sed "s/\[约束\]/$constraints/g"
    else
        # 默认prompt结构
        cat <<EOF
# 任务：$task_description

## 背景
$business_context

## 目标
实现 $task_description 功能

## 技术要求
$technical_context

## 约束
$constraints

## 验收标准
- [ ] 功能正常运行
- [ ] 单元测试通过
- [ ] 代码审查通过

## 注意事项
- 保持代码简洁
- 关注核心功能
- 测试覆盖关键逻辑
EOF
    fi
}

# 启动Agent
spawn_agent() {
    local agent="$1"
    local worktree_path="$2"
    local session_name="$3"
    local prompt="$4"
    local model="$5"
    
    log "🚀 启动 $agent Agent..."
    log "   工作目录: $worktree_path"
    log "   会话名称: $session_name"
    
    # 创建tmux会话并启动Agent
    case "$agent" in
        codex)
            tmux new-session -d -s "$session_name" \
                -c "$worktree_path" \
                "codex --model ${model:-gpt-5.3-codex} -c 'model_reasoning_effort=high' --dangerously-bypass-approvals-and-sandbox \"$prompt\""
            ;;
        claude-code)
            tmux new-session -d -s "$session_name" \
                -c "$worktree_path" \
                "claude --model ${model:-claude-opus-4.5} --dangerously-skip-permissions -p \"$prompt\""
            ;;
        *)
            log "❌ 未知Agent类型: $agent"
            return 1
            ;;
    esac
    
    log "✅ Agent 已启动"
}

# 注册任务
register_task() {
    local task_id="$1"
    local agent="$2"
    local session_name="$3"
    local branch="$4"
    local repo="$5"
    local worktree="$6"
    local prompt="$7"
    
    local task=$(cat <<EOF
{
  "id": "$task_id",
  "agent": "$agent",
  "tmuxSession": "$session_name",
  "branch": "$branch",
  "repo": "$repo",
  "worktree": "$worktree",
  "status": "running",
  "prompt": $(echo "$prompt" | jq -Rs '.'),
  "startedAt": "$(date -Iseconds)",
  "attempts": 0
}
EOF
)
    
    # 添加到活跃任务列表
    if [ -f "$TASKS_FILE" ]; then
        jq ".tasks += [$task] | .metadata.activeCount += 1 | .metadata.lastUpdated = \"$(date -Iseconds)\"" \
            "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
    else
        echo "{\"tasks\": [$task], \"metadata\": {\"activeCount\": 1, \"lastUpdated\": \"$(date -Iseconds)\"}}" > "$TASKS_FILE"
    fi
    
    log "📝 任务已注册: $task_id"
}

# 主生成函数
spawn_coding_agent() {
    local task_type="$1"
    local task_description="$2"
    local repo_path="$3"
    local repo_name="$4"
    local business_context="${5:-}"
    local technical_context="${6:-}"
    local constraints="${7:-}"
    local has_ui="${8:-false}"
    local priority="${9:-quality}"
    local model="${10:-}"
    
    log "🤖 生成编码Agent..."
    log "   任务类型: $task_type"
    log "   任务描述: $task_description"
    log "   仓库: $repo_name"
    
    # 选择Agent
    local agent=$(select_agent "$task_type" "$has_ui" "$priority")
    log "   选择Agent: $agent"
    
    # 生成任务ID和分支名
    local task_id=$(generate_task_id "$task_type")
    local branch_name="${task_id}"
    local session_name="${task_id}"
    
    # 生成worktree路径
    local worktree_path=$(generate_worktree_name "$task_id" "$repo_name")
    
    # 生成prompt
    local prompt=$(generate_prompt \
        "$task_type" \
        "$task_description" \
        "$business_context" \
        "$technical_context" \
        "$constraints")
    
    # 创建worktree
    create_worktree "$repo_path" "$worktree_path" "$branch_name"
    
    # 启动Agent
    spawn_agent "$agent" "$worktree_path" "$session_name" "$prompt" "$model"
    
    # 注册任务
    register_task "$task_id" "$agent" "$session_name" "$branch_name" "$repo_name" "$worktree_path" "$prompt"
    
    log ""
    log "✅ Agent生成完成！"
    log "   任务ID: $task_id"
    log "   查看进度: tmux attach -t $session_name"
    log "   或使用: .clawdbot/scripts/check-agents.sh"
}

# 如果直接运行
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 4 ]; then
        echo "用法: $0 <task_type> <task_description> <repo_path> <repo_name> [business_context] [technical_context] [constraints] [has_ui] [priority] [model]"
        echo ""
        echo "参数:"
        echo "  task_type         - 任务类型 (backend/frontend/bugfix/refactor/design)"
        echo "  task_description  - 任务描述"
        echo "  repo_path         - 仓库路径"
        echo "  repo_name         - 仓库名称"
        echo "  business_context  - 业务上下文 (可选)"
        echo "  technical_context - 技术上下文 (可选)"
        echo "  constraints       - 约束条件 (可选)"
        echo "  has_ui            - 是否有UI变更 (true/false, 默认false)"
        echo "  priority          - 优先级 (speed/quality, 默认quality)"
        echo "  model             - 指定模型 (可选)"
        echo ""
        echo "示例:"
        echo "  $0 backend '实现用户登录功能' ~/projects/myapp myapp '客户需要SSO登录' '使用JWT'"
        exit 1
    fi
    
    spawn_coding_agent "$@"
fi