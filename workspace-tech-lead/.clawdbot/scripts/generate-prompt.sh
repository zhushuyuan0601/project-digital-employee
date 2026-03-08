#!/bin/bash
# Prompt 生成器 - 为编码Agent生成精准prompt

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
MEMORY_DIR="$CLAWDBOT_DIR/memory"
PATTERNS_FILE="$MEMORY_DIR/prompt-patterns.json"
CONTEXT_FILE="$MEMORY_DIR/business-context.json"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "$1"
}

# 加载prompt模式
load_pattern() {
    local task_type="$1"
    
    if [ -f "$PATTERNS_FILE" ]; then
        local pattern=$(jq --arg type "$task_type" '.patterns[] | select(.taskType == $type)' "$PATTERNS_FILE" 2>/dev/null | head -1)
        if [ -n "$pattern" ]; then
            echo "$pattern"
            return 0
        fi
    fi
    
    # 默认模式
    echo '{"structure": {"sections": ["背景", "目标", "技术要求", "验收标准"], "required": ["目标", "技术要求"]}}'
}

# 加载业务上下文
load_business_context() {
    local customer_id="$1"
    
    if [ -f "$CONTEXT_FILE" ]; then
        if [ -n "$customer_id" ]; then
            jq --arg id "$customer_id" '.context.customers[] | select(.id == $id)' "$CONTEXT_FILE" 2>/dev/null || echo ""
        fi
    fi
}

# 生成完整prompt
generate_full_prompt() {
    local task_type="$1"
    local task_description="$2"
    local business_context="$3"
    local technical_context="$4"
    local acceptance_criteria="$5"
    local constraints="$6"
    local historical_experience="$7"
    
    cat <<EOF
# 任务：$task_description

## 📋 背景

$business_context

## 🎯 目标

$task_description

### 验收标准
$acceptance_criteria

## 🔧 技术要求

$technical_context

## ⚠️ 约束条件

$constraints

## 📚 历史经验

$historical_experience

## ✅ 完成标准 (Definition of Done)

- [ ] 功能正常运行
- [ ] 单元测试通过
- [ ] CI构建通过
- [ ] 代码审查通过
- [ ] UI变更附带截图（如适用）

## 📝 执行提示

1. 先理解需求，确认技术方案
2. 实现核心功能
3. 编写测试用例
4. 确保代码质量
5. 提交PR

---
*生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
*任务类型: $task_type*
EOF
}

# 从会议记录提取需求
extract_from_meeting() {
    local meeting_file="$1"
    
    if [ ! -f "$meeting_file" ]; then
        log "❌ 会议文件不存在: $meeting_file"
        return 1
    fi
    
    log "📄 从会议记录提取需求: $(basename "$meeting_file")"
    
    # 简单提取（实际应该用AI）
    local customer=$(grep -i "客户\|公司" "$meeting_file" | head -1)
    local needs=$(grep -i "需求\|功能\|要实现" "$meeting_file" | head -3)
    local decisions=$(grep -i "决定\|确认\|方案" "$meeting_file" | head -2)
    
    cat <<EOF
## 客户信息
$customer

## 需求
$needs

## 决策
$decisions
EOF
}

# 从错误日志生成修复prompt
generate_bugfix_prompt() {
    local error_log="$1"
    local error_context="$2"
    
    cat <<EOF
# 任务：Bug修复

## 🐛 错误信息

\`\`\`
$error_log
\`\`\`

## 📍 错误上下文

$error_context

## 🔍 分析要求

1. 分析错误原因
2. 定位问题代码
3. 设计修复方案
4. 实现修复
5. 验证修复有效

## ⚠️ 注意事项

- 不要引入新bug
- 保持代码风格一致
- 添加必要的测试
- 更新相关文档（如需要）

## ✅ 验收标准

- [ ] 错误不再重现
- [ ] 添加了回归测试
- [ ] 代码审查通过
EOF
}

# 从PRD生成开发prompt
generate_feature_prompt() {
    local prd_file="$1"
    local technical_design="$2"
    
    if [ ! -f "$prd_file" ]; then
        log "❌ PRD文件不存在: $prd_file"
        return 1
    fi
    
    local prd_content=$(cat "$prd_file")
    
    cat <<EOF
# 任务：功能开发

## 📋 产品需求 (PRD)

$prd_content

## 🔧 技术设计

$technical_design

## 🎯 实现要求

1. 按照PRD和设计实现功能
2. 保持代码质量
3. 编写测试用例
4. 更新文档

## ✅ 验收标准

- [ ] 功能符合PRD描述
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] CI构建通过
- [ ] 代码审查通过
- [ ] 文档已更新
EOF
}

# 主函数
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 2 ]; then
        echo "用法: $0 <command> [args...]"
        echo ""
        echo "命令:"
        echo "  generate <task_type> <task_description> [business_context] [technical_context]"
        echo "  from-meeting <meeting_file>"
        echo "  bugfix <error_log> [error_context]"
        echo "  feature <prd_file> [technical_design]"
        echo ""
        echo "示例:"
        echo "  $0 generate backend '实现用户登录' '客户需要SSO' '使用JWT'"
        echo "  $0 from-meeting ~/meetings/2024-03-05.md"
        echo "  $0 bugfix 'TypeError: ...' '登录时发生'"
        exit 1
    fi
    
    COMMAND="$1"
    shift
    
    case "$COMMAND" in
        "generate")
            generate_full_prompt "$@"
            ;;
        "from-meeting")
            extract_from_meeting "$@"
            ;;
        "bugfix")
            generate_bugfix_prompt "$@"
            ;;
        "feature")
            generate_feature_prompt "$@"
            ;;
        *)
            echo "未知命令: $COMMAND"
            exit 1
            ;;
    esac
fi