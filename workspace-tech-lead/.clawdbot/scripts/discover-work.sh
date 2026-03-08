#!/bin/bash
# 主动工作发现脚本
# 定期扫描各种数据源，自动发现需要处理的工作

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
TASKS_FILE="$CLAWDBOT_DIR/active-tasks.json"
LOGS_DIR="$CLAWDBOT_DIR/logs"
MEMORY_DIR="$CLAWDBOT_DIR/memory"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/discovery-$(date +%Y%m%d).log"
}

# 扫描 Sentry 错误日志
scan_sentry_errors() {
    log "🔍 扫描 Sentry 错误日志..."
    
    # TODO: 集成 Sentry API
    # 临时方案：读取错误日志文件
    
    local error_log="$HOME/.openclaw/shared-workspace/logs/sentry-errors.json"
    
    if [ ! -f "$error_log" ]; then
        log "   ℹ️  没有找到 Sentry 错误日志"
        return 0
    fi
    
    # 读取新错误（上次扫描后的）
    local last_scan_file="$CLAWDBOT_DIR/.last-sentry-scan"
    local last_scan="0"
    
    if [ -f "$last_scan_file" ]; then
        last_scan=$(cat "$last_scan_file")
    fi
    
    # 查找新错误
    local new_errors=$(jq --argjson last "$last_scan" '[.[] | select(.timestamp > $last)]' "$error_log" 2>/dev/null || echo "[]")
    local error_count=$(echo "$new_errors" | jq 'length')
    
    if [ "$error_count" -gt 0 ]; then
        log "   📊 发现 $error_count 个新错误"
        
        # 为每个错误生成修复Agent
        echo "$new_errors" | jq -c '.[]' | while read -r error; do
            local error_id=$(echo "$error" | jq -r '.id')
            local error_title=$(echo "$error" | jq -r '.title')
            local error_file=$(echo "$error" | jq -r '.file')
            
            log "   🐛 为错误生成修复Agent: $error_title"
            
            # 生成任务ID
            local task_id="bugfix-$(date +%s)-$(echo "$error_id" | cut -c1-8)"
            
            # 添加到任务队列
            # TODO: 调用实际的Agent生成逻辑
            add_task "$task_id" "bugfix" "$error_title" "$error_file"
        done
    else
        log "   ✅ 没有新错误"
    fi
    
    # 更新最后扫描时间
    date +%s > "$last_scan_file"
}

# 扫描会议记录
scan_meeting_notes() {
    log "🔍 扫描会议记录..."
    
    local meeting_dir="$HOME/.openclaw/shared-workspace/meetings"
    
    if [ ! -d "$meeting_dir" ]; then
        log "   ℹ️  没有找到会议记录目录"
        return 0
    fi
    
    # 查找新的会议记录
    local last_scan_file="$CLAWDBOT_DIR/.last-meeting-scan"
    local last_scan="0"
    
    if [ -f "$last_scan_file" ]; then
        last_scan=$(cat "$last_scan_file")
    fi
    
    # 查找新会议
    find "$meeting_dir" -name "*.md" -newer "$last_scan_file" 2>/dev/null | while read -r meeting_file; do
        log "   📝 发现新会议记录: $(basename "$meeting_file")"
        
        # 提取需求（简单匹配）
        # TODO: 使用AI提取需求
        local needs=$(grep -i "需求\|功能\|特性\|要实现" "$meeting_file" | head -5)
        
        if [ -n "$needs" ]; then
            log "   📋 提取到需求:"
            echo "$needs" | while read -r need; do
                log "      - $need"
            done
            
            # TODO: 自动生成开发Agent
            # 需要确认Scope，半自动模式
        fi
    done
    
    # 更新最后扫描时间
    date +%s > "$last_scan_file"
}

# 扫描 Git 日志
scan_git_log() {
    log "🔍 扫描 Git 日志..."
    
    # 查找今天需要更新changelog的项目
    local projects_dir="$HOME/.openclaw/workspace-projects"
    
    if [ ! -d "$projects_dir" ]; then
        log "   ℹ️  没有找到项目目录"
        return 0
    fi
    
    find "$projects_dir" -name ".git" -type d 2>/dev/null | while read -r git_dir; do
        local repo_dir=$(dirname "$git_dir")
        local repo_name=$(basename "$repo_dir")
        
        # 检查今天是否有提交
        local today_commits=$(cd "$repo_dir" && git log --since="midnight" --oneline 2>/dev/null | wc -l)
        
        if [ "$today_commits" -gt 0 ]; then
            log "   📊 $repo_name 有 $today_commits 个今日提交"
            
            # 检查是否需要更新changelog
            local changelog="$repo_dir/CHANGELOG.md"
            if [ -f "$changelog" ]; then
                local last_changelog_update=$(cd "$repo_dir" && git log -1 --format="%at" -- CHANGELOG.md 2>/dev/null || echo "0")
                local midnight=$(date -j -f "%Y-%m-%d" "$(date +%Y-%m-%d)" "+%s" 2>/dev/null || echo "0")
                
                if [ "$last_changelog_update" -lt "$midnight" ]; then
                    log "   📝 $repo_name 需要更新 CHANGELOG"
                    # TODO: 生成更新changelog的Agent
                fi
            fi
        fi
    done
}

# 扫描项目状态
scan_project_status() {
    log "🔍 扫描项目状态..."
    
    local projects_dir="$HOME/.openclaw/shared-workspace/projects"
    
    if [ ! -d "$projects_dir" ]; then
        log "   ℹ️  没有找到项目目录"
        return 0
    fi
    
    # 检查每个项目的状态
    find "$projects_dir" -maxdepth 1 -type d ! -name "projects" | while read -r project_dir; do
        local project_name=$(basename "$project_dir")
        local status_file="$project_dir/status.json"
        
        if [ -f "$status_file" ]; then
            local status=$(jq -r '.status // "unknown"' "$status_file" 2>/dev/null)
            local last_update=$(jq -r '.lastUpdate // "unknown"' "$status_file" 2>/dev/null)
            
            log "   📋 $project_name: $status (最后更新: $last_update)"
            
            # 检查是否需要关注
            if [ "$status" = "blocked" ]; then
                log "   ⚠️  $project_name 被阻塞，需要检查"
                # TODO: 通知Alex
            fi
        fi
    done
}

# 添加任务到队列
add_task() {
    local task_id="$1"
    local task_type="$2"
    local description="$3"
    local context="$4"
    
    local task=$(cat <<EOF
{
  "id": "$task_id",
  "type": "$task_type",
  "description": "$description",
  "context": "$context",
  "status": "pending",
  "createdAt": "$(date -Iseconds)",
  "attempts": 0
}
EOF
)
    
    # 添加到任务队列
    if [ -f "$TASKS_FILE" ]; then
        jq ".tasks += [$task]" "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
    else
        echo "{\"tasks\": [$task]}" > "$TASKS_FILE"
    fi
    
    log "   ✅ 已添加任务: $task_id"
}

# 主扫描循环
main() {
    local scan_type="${1:-all}"
    
    log "🚀 开始主动工作发现..."
    
    case "$scan_type" in
        "errors")
            scan_sentry_errors
            ;;
        "meetings")
            scan_meeting_notes
            ;;
        "git")
            scan_git_log
            ;;
        "projects")
            scan_project_status
            ;;
        "all")
            scan_sentry_errors
            scan_meeting_notes
            scan_git_log
            scan_project_status
            ;;
        *)
            echo "用法: $0 [errors|meetings|git|projects|all]"
            exit 1
            ;;
    esac
    
    log "✅ 扫描完成"
}

# 如果直接运行
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi