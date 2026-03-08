#!/bin/bash
# 任务状态报告生成器

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
TASKS_FILE="$CLAWDBOT_DIR/active-tasks.json"
COMPLETED_DIR="$CLAWDBOT_DIR/completed-tasks"
MEMORY_DIR="$CLAWDBOT_DIR/memory"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 生成每日报告
generate_daily_report() {
    local date="${1:-$(date +%Y-%m-%d)}"
    
    echo "# 开发日报 - $date"
    echo ""
    
    # 统计活跃任务
    if [ -f "$TASKS_FILE" ]; then
        local active_count=$(jq '.tasks | length' "$TASKS_FILE" 2>/dev/null || echo "0")
        local running_count=$(jq '[.tasks[] | select(.status == "running")] | length' "$TASKS_FILE" 2>/dev/null || echo "0")
        local pending_count=$(jq '[.tasks[] | select(.status == "pending")] | length' "$TASKS_FILE" 2>/dev/null || echo "0")
        
        echo "## 📊 任务统计"
        echo ""
        echo "- 活跃任务: $active_count"
        echo "- 运行中: $running_count"
        echo "- 待处理: $pending_count"
        echo ""
        
        # 列出活跃任务
        if [ "$active_count" -gt 0 ]; then
            echo "## 🔄 活跃任务"
            echo ""
            jq -r '.tasks[] | "- **\(.id)** (\(.agent)): \(.description // .taskType)"' "$TASKS_FILE" 2>/dev/null || true
            echo ""
        fi
    fi
    
    # 统计已完成任务
    local completed_file="$COMPLETED_DIR/completed-${date}.json"
    if [ -f "$completed_file" ]; then
        local completed_count=$(jq 'length' "$completed_file" 2>/dev/null || echo "0")
        
        echo "## ✅ 今日完成"
        echo ""
        echo "完成 $completed_count 个任务"
        echo ""
        
        jq -r '.[] | "- **\(.id)** (PR #\(.pr // "N/A")): \(.description // .taskType)"' "$completed_file" 2>/dev/null || true
        echo ""
    fi
    
    # Agent性能
    echo "## 🤖 Agent 性能"
    echo ""
    
    local perf_file="$MEMORY_DIR/agent-performance.json"
    if [ -f "$perf_file" ]; then
        echo "| Agent | 总任务 | 成功率 | 平均时长 |"
        echo "|-------|--------|--------|----------|"
        
        jq -r '.agents | to_entries[] | "\(.key)|\(.value.performance.backend.totalTasks // 0)|\(.value.performance.backend.successRate // 0)|\(.value.performance.backend.avgDuration // "N/A")"' "$perf_file" 2>/dev/null | \
            while IFS='|' read -r agent tasks rate duration; do
                echo "| $agent | $tasks | $rate | $duration |"
            done || true
        echo ""
    fi
    
    # 经验总结
    echo "## 💡 经验总结"
    echo ""
    
    local success_file="$MEMORY_DIR/successes-${date//-/}.json"
    if [ -f "$success_file" ]; then
        echo "### 成功经验"
        jq -r '.[] | "- \(.taskType): \(.promptStructure // "N/A")"' "$success_file" 2>/dev/null | head -5 || true
        echo ""
    fi
    
    local failure_file="$MEMORY_DIR/failures-${date//-/}.json"
    if [ -f "$failure_file" ]; then
        echo "### 失败教训"
        jq -r '.[] | "- \(.failureType): \(.rootCause // "待分析")"' "$failure_file" 2>/dev/null | head -5 || true
        echo ""
    fi
}

# 生成项目报告
generate_project_report() {
    local project_name="$1"
    
    echo "# 项目报告 - $project_name"
    echo ""
    
    # 项目任务统计
    if [ -f "$TASKS_FILE" ]; then
        local project_tasks=$(jq --arg project "$project_name" '[.tasks[] | select(.repo == $project)]' "$TASKS_FILE" 2>/dev/null || echo "[]")
        local total=$(echo "$project_tasks" | jq 'length')
        
        echo "## 📊 项目统计"
        echo ""
        echo "- 总任务数: $total"
        echo "- 运行中: $(echo "$project_tasks" | jq '[.[] | select(.status == "running")] | length')"
        echo "- 已完成: $(echo "$project_tasks" | jq '[.[] | select(.status == "done")] | length')"
        echo ""
    fi
}

# 生成Agent报告
generate_agent_report() {
    local agent_name="$1"
    
    echo "# Agent 报告 - $agent_name"
    echo ""
    
    # Agent任务统计
    if [ -f "$TASKS_FILE" ]; then
        local agent_tasks=$(jq --arg agent "$agent_name" '[.tasks[] | select(.agent == $agent)]' "$TASKS_FILE" 2>/dev/null || echo "[]")
        local total=$(echo "$agent_tasks" | jq 'length')
        
        echo "## 📊 任务统计"
        echo ""
        echo "- 总任务数: $total"
        echo "- 运行中: $(echo "$agent_tasks" | jq '[.[] | select(.status == "running")] | length')"
        echo "- 成功率: $(echo "$agent_tasks" | jq '[.[] | select(.status == "done")] | length / (if . == 0 then 1 else . end) * 100 | floor')%"
        echo ""
    fi
}

# 生成团队周报
generate_weekly_report() {
    local start_date="${1:-$(date -v-Monday +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)}"
    
    echo "# 团队周报 - $(date +%Y-W%V)"
    echo ""
    echo "报告周期: $start_date - $(date +%Y-%m-%d)"
    echo ""
    
    # 汇总统计
    local total_completed=0
    local total_failed=0
    
    for i in {0..6}; do
        local date=$(date -v+${i}d +%Y%m%d 2>/dev/null || date +%Y%m%d)
        local completed_file="$COMPLETED_DIR/completed-${date}.json"
        
        if [ -f "$completed_file" ]; then
            total_completed=$((total_completed + $(jq 'length' "$completed_file" 2>/dev/null || echo "0")))
        fi
    done
    
    echo "## 📊 本周统计"
    echo ""
    echo "- 完成任务: $total_completed"
    echo "- 活跃项目: $(jq '[.tasks[].repo] | unique | length' "$TASKS_FILE" 2>/dev/null || echo "0")"
    echo "- 代码提交: (待统计)"
    echo "- PR合并: (待统计)"
    echo ""
    
    echo "## 🎯 主要成果"
    echo ""
    echo "(从完成的任务中提取)"
    echo ""
    
    echo "## 📈 效率提升"
    echo ""
    echo "- 平均任务完成时间: (待计算)"
    echo "- Agent成功率: (待计算)"
    echo "- 人工干预次数: (待统计)"
    echo ""
}

# 主函数
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 1 ]; then
        echo "用法: $0 <report_type> [args...]"
        echo ""
        echo "报告类型:"
        echo "  daily [date]           - 每日报告"
        echo "  project <project_name> - 项目报告"
        echo "  agent <agent_name>     - Agent报告"
        echo "  weekly [start_date]    - 周报"
        exit 1
    fi
    
    REPORT_TYPE="$1"
    shift
    
    case "$REPORT_TYPE" in
        "daily")
            generate_daily_report "$@"
            ;;
        "project")
            generate_project_report "$@"
            ;;
        "agent")
            generate_agent_report "$@"
            ;;
        "weekly")
            generate_weekly_report "$@"
            ;;
        *)
            echo "未知报告类型: $REPORT_TYPE"
            exit 1
            ;;
    esac
fi