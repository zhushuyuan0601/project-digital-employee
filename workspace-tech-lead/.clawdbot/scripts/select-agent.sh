#!/bin/bash
# Agent 选择决策脚本
# 根据任务类型选择最合适的编码Agent

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Agent 特性定义
declare -A AGENT_FEATURES

# Codex: 后端逻辑、复杂bug、多文件重构
AGENT_FEATURES["codex"]="backend,bug,refactor,multi-file,reasoning"

# Claude Code: 前端、速度快、权限问题少
AGENT_FEATURES["claude-code"]="frontend,fast,git,ui,permissions"

# Gemini: 设计感强、UI美观
AGENT_FEATURES["gemini"]="design,ui-beauty,html,css"

# 任务类型到Agent的默认映射
DEFAULT_AGENT_MAPPING=(
    "backend:codex"
    "bug:codex"
    "refactor:codex"
    "multi-file:codex"
    "frontend:claude-code"
    "ui:claude-code"
    "git:claude-code"
    "design:gemini"
    "html:gemini"
)

select_agent() {
    local task_type="$1"
    local complexity="$2"  # simple, medium, complex
    local has_ui="$3"      # true, false
    local priority="$4"    # speed, quality
    
    local selected_agent="codex"  # 默认使用 Codex
    local reason=""
    
    # 复杂度高 -> Codex（推理能力强）
    if [ "$complexity" = "complex" ]; then
        selected_agent="codex"
        reason="复杂度高，需要强推理能力"
    fi
    
    # 前端/UI -> Claude Code
    if [ "$has_ui" = "true" ]; then
        if [ "$task_type" = "design" ]; then
            selected_agent="gemini"
            reason="设计任务，Gemini 设计感强"
        else
            selected_agent="claude-code"
            reason="前端任务，Claude Code 更快"
        fi
    fi
    
    # 速度优先 -> Claude Code
    if [ "$priority" = "speed" ]; then
        selected_agent="claude-code"
        reason="速度优先"
    fi
    
    # 质量优先 -> Codex
    if [ "$priority" = "quality" ]; then
        selected_agent="codex"
        reason="质量优先，Codex 更彻底"
    fi
    
    # Bug修复 -> Codex（边界情况处理更好）
    if [ "$task_type" = "bug" ]; then
        selected_agent="codex"
        reason="Bug修复，Codex 边界情况处理更好"
    fi
    
    # 重构 -> Codex
    if [ "$task_type" = "refactor" ]; then
        selected_agent="codex"
        reason="重构任务，Codex 推理能力强"
    fi
    
    # Git操作 -> Claude Code
    if [ "$task_type" = "git" ]; then
        selected_agent="claude-code"
        reason="Git操作，Claude Code 权限问题少"
    fi
    
    echo -e "${GREEN}✅ 选择 Agent: $selected_agent${NC}"
    echo "   原因: $reason"
    echo "$selected_agent"
}

# 生成启动命令
generate_spawn_command() {
    local agent="$1"
    local task_description="$2"
    local worktree_path="$3"
    local session_name="$4"
    
    case "$agent" in
        "codex")
            echo "codex --model gpt-5.3-codex -c 'model_reasoning_effort=high' --dangerously-bypass-approvals-and-sandbox \"$task_description\""
            ;;
        "claude-code")
            echo "claude --model claude-opus-4.5 --dangerously-skip-permissions -p \"$task_description\""
            ;;
        "gemini")
            echo "# Gemini: 先生成设计，再交给 Claude Code 实现\ngemini \"$task_description\""
            ;;
        *)
            echo "claude --model claude-opus-4.5 --dangerously-skip-permissions -p \"$task_description\""
            ;;
    esac
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 1 ]; then
        echo "用法: $0 <task_type> [complexity] [has_ui] [priority]"
        echo ""
        echo "示例:"
        echo "  $0 backend complex false quality"
        echo "  $0 frontend simple true speed"
        echo "  $0 bug medium false quality"
        exit 1
    fi
    
    TASK_TYPE="${1:-backend}"
    COMPLEXITY="${2:-medium}"
    HAS_UI="${3:-false}"
    PRIORITY="${4:-quality}"
    
    select_agent "$TASK_TYPE" "$COMPLEXITY" "$HAS_UI" "$PRIORITY"
fi