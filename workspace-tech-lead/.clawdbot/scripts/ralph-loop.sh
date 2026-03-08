#!/bin/bash
# Ralph Loop V2 - 智能失败处理
# 失败时不只是重试，而是分析原因并动态调整prompt

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
TASKS_FILE="$CLAWDBOT_DIR/active-tasks.json"
MEMORY_DIR="$CLAWDBOT_DIR/memory"
LOGS_DIR="$CLAWDBOT_DIR/logs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 最大重试次数
MAX_ATTEMPTS=3

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/ralph-loop-$(date +%Y%m%d).log"
}

# 分析失败原因
analyze_failure() {
    local task_id="$1"
    local failure_type="$2"
    local error_message="$3"
    
    case "$failure_type" in
        "context_overflow")
            echo "CONTEXT_OVERFLOW"
            echo "分析: Agent上下文溢出"
            echo "策略: 缩小范围，只关注核心文件"
            ;;
        "wrong_direction")
            echo "WRONG_DIRECTION"
            echo "分析: Agent方向错误"
            echo "策略: 纠正方向，附上会议原话"
            ;;
        "needs_clarification")
            echo "NEEDS_CLARIFICATION"
            echo "分析: 需要更多信息"
            echo "策略: 提供客户邮箱和背景信息"
            ;;
        "ci_failure")
            echo "CI_FAILURE"
            echo "分析: CI构建失败"
            echo "策略: 分析CI日志，提取关键错误"
            ;;
        "review_failure")
            echo "REVIEW_FAILURE"
            echo "分析: 代码审查失败"
            echo "策略: 提取关键反馈，生成修改指令"
            ;;
        "timeout")
            echo "TIMEOUT"
            echo "分析: 执行超时"
            echo "策略: 分解任务，减少范围"
            ;;
        *)
            echo "UNKNOWN"
            echo "分析: 未知错误"
            echo "策略: 重试一次，如果仍失败则通知人工"
            ;;
    esac
}

# 生成调整后的prompt
generate_adjusted_prompt() {
    local task_id="$1"
    local failure_type="$2"
    local original_prompt="$3"
    local attempt="$4"
    
    local adjusted_prompt=""
    
    case "$failure_type" in
        "CONTEXT_OVERFLOW")
            # 缩小范围
            adjusted_prompt="
⚠️ 上次尝试上下文溢出，本次缩小范围。

$original_prompt

🎯 本次只关注以下核心文件：
- [列出最关键的3-5个文件]

其他文件暂时不要修改。先完成核心功能。
"
            ;;
        "WRONG_DIRECTION")
            # 纠正方向
            adjusted_prompt="
⚠️ 上次方向有误，请按以下方向执行：

$original_prompt

🚨 重要纠正：
客户真正想要的是 X，不是 Y。
会议原话：「[客户的原始表述]」

请严格按照上述方向执行。
"
            ;;
        "NEEDS_CLARIFICATION")
            # 提供更多上下文
            adjusted_prompt="
$original_prompt

📋 补充信息：

客户背景：
- 公司名称：[公司名称]
- 业务：[做什么的]
- 联系方式：[邮箱]

项目上下文：
- 相关决策历史：[链接]
- 类似实现：[链接]
"
            ;;
        "CI_FAILURE")
            # CI失败处理
            adjusted_prompt="
$original_prompt

⚠️ 上次CI失败，错误如下：

\`\`\`
[CI错误日志]
\`\`\`

请修复上述错误后重新提交。
"
            ;;
        "REVIEW_FAILURE")
            # 审查失败处理
            adjusted_prompt="
$original_prompt

⚠️ 代码审查反馈：

关键问题（必须修复）：
1. [问题1]
2. [问题2]

建议优化（可选）：
1. [建议1]

请先修复关键问题。
"
            ;;
        *)
            # 未知错误，简单重试
            adjusted_prompt="$original_prompt

⚠️ 这是第 $attempt 次尝试，请仔细检查后执行。"
            ;;
    esac
    
    echo "$adjusted_prompt"
}

# 处理失败任务
handle_failure() {
    local task_id="$1"
    local failure_type="$2"
    local error_message="$3"
    
    log "🔄 处理失败任务: $task_id"
    log "   失败类型: $failure_type"
    
    # 读取任务信息
    local task=$(jq --arg id "$task_id" '.tasks[] | select(.id == $id)' "$TASKS_FILE" 2>/dev/null)
    local attempts=$(echo "$task" | jq -r '.attempts // 0')
    local original_prompt=$(echo "$task" | jq -r '.prompt // ""')
    local tmux_session=$(echo "$task" | jq -r '.tmuxSession // ""')
    
    # 检查重试次数
    if [ "$attempts" -ge "$MAX_ATTEMPTS" ]; then
        log "❌ 已达到最大重试次数 ($MAX_ATTEMPTS)，需要人工干预"
        
        # 记录到经验库
        record_failure_experience "$task_id" "$failure_type" "$error_message" "$original_prompt" "$attempts"
        
        # 通知人工
        notify_human "$task_id" "已重试 $attempts 次，仍然失败。需要人工干预。"
        
        return 1
    fi
    
    # 分析失败原因
    local analysis=$(analyze_failure "$task_id" "$failure_type" "$error_message")
    log "   分析结果: $analysis"
    
    # 生成调整后的prompt
    local adjusted_prompt=$(generate_adjusted_prompt "$task_id" "$failure_type" "$original_prompt" "$((attempts + 1))")
    
    # 更新任务状态
    jq --arg id "$task_id" --arg attempts "$((attempts + 1))" --arg adjusted "$adjusted_prompt" '
        (.tasks[] | select(.id == $id)) |= . + {
            "attempts": ($attempts | tonumber),
            "lastFailure": $adjusted,
            "lastAttemptAt": (now | todate)
        }
    ' "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
    
    # 如果有tmux会话，发送纠正指令
    if [ -n "$tmux_session" ] && tmux has-session -t "$tmux_session" 2>/dev/null; then
        local correction=""
        case "$failure_type" in
            "WRONG_DIRECTION")
                correction="Stop. The customer wanted X, not Y. Here's what they said in the meeting: [客户原话]"
                ;;
            "CONTEXT_OVERFLOW")
                correction="Focus only on these three files: [文件列表]. Don't touch other files."
                ;;
            *)
                correction="Please review and retry. Previous attempt failed: $failure_type"
                ;;
        esac
        
        tmux send-keys -t "$tmux_session" "$correction" Enter
        log "   ✅ 已发送纠正指令到 tmux 会话"
    fi
    
    log "   ✅ 已调整策略，准备重试 (尝试 $((attempts + 1))/$MAX_ATTEMPTS)"
}

# 记录失败经验
record_failure_experience() {
    local task_id="$1"
    local failure_type="$2"
    local error_message="$3"
    local original_prompt="$4"
    local attempts="$5"
    
    local experience_file="$MEMORY_DIR/failures-$(date +%Y%m).json"
    
    mkdir -p "$MEMORY_DIR"
    
    local entry=$(cat <<EOF
{
  "date": "$(date -Iseconds)",
  "taskId": "$task_id",
  "failureType": "$failure_type",
  "errorMessage": "$error_message",
  "promptLength": ${#original_prompt},
  "attempts": $attempts,
  "resolution": "pending"
}
EOF
)
    
    if [ -f "$experience_file" ]; then
        jq ". += [$entry]" "$experience_file" > "$experience_file.tmp" && mv "$experience_file.tmp" "$experience_file"
    else
        echo "[$entry]" > "$experience_file"
    fi
    
    log "📝 已记录失败经验到: $experience_file"
}

# 通知人工
notify_human() {
    local task_id="$1"
    local message="$2"
    
    # TODO: 集成Telegram/飞书通知
    log "📢 需要人工干预: $task_id"
    log "   消息: $message"
    
    # 临时方案：写入通知文件
    echo "[{$(date -Iseconds)}] $task_id: $message" >> "$LOGS_DIR/notifications.log"
}

# 记录成功经验
record_success_experience() {
    local task_id="$1"
    local prompt="$2"
    local task_type="$3"
    
    local experience_file="$MEMORY_DIR/successes-$(date +%Y%m).json"
    
    mkdir -p "$MEMORY_DIR"
    
    # 提取有效的prompt结构
    local prompt_structure=$(echo "$prompt" | head -20)  # 只记录结构，不记录完整prompt
    
    local entry=$(cat <<EOF
{
  "date": "$(date -Iseconds)",
  "taskId": "$task_id",
  "taskType": "$task_type",
  "promptStructure": "有效结构",
  "duration": "计算中"
}
EOF
)
    
    if [ -f "$experience_file" ]; then
        jq ". += [$entry]" "$experience_file" > "$experience_file.tmp" && mv "$experience_file.tmp" "$experience_file"
    else
        echo "[$entry]" > "$experience_file"
    fi
    
    log "✅ 已记录成功经验"
}

# 主函数
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 2 ]; then
        echo "用法: $0 <task_id> <failure_type> [error_message]"
        echo ""
        echo "失败类型:"
        echo "  context_overflow   - 上下文溢出"
        echo "  wrong_direction    - 方向错误"
        echo "  needs_clarification - 需要澄清"
        echo "  ci_failure         - CI失败"
        echo "  review_failure     - 审查失败"
        echo "  timeout            - 执行超时"
        exit 1
    fi
    
    TASK_ID="$1"
    FAILURE_TYPE="$2"
    ERROR_MESSAGE="${3:-}"
    
    handle_failure "$TASK_ID" "$FAILURE_TYPE" "$ERROR_MESSAGE"
fi