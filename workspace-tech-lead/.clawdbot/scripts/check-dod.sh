#!/bin/bash
# Definition of Done 检查脚本
# 验证任务是否真正完成

set -e

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"
LOGS_DIR="$CLAWDBOT_DIR/logs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/dod-$(date +%Y%m%d).log"
}

# 检查PR是否创建
check_pr_created() {
    local branch="$1"
    local repo="$2"
    
    local pr_number=$(gh pr list --head "$branch" --repo "$repo" --json number --jq '.[0].number // empty' 2>/dev/null || echo "")
    
    if [ -n "$pr_number" ]; then
        echo "PASS:$pr_number"
    else
        echo "FAIL:No PR found"
    fi
}

# 检查分支是否与main同步
check_branch_synced() {
    local branch="$1"
    local repo="$2"
    
    # 获取分支和main的差异
    local ahead=$(gh api "repos/$repo/compare/main...$branch" --jq '.ahead_by // 0' 2>/dev/null || echo "0")
    local behind=$(gh api "repos/$repo/compare/main...$branch" --jq '.behind_by // 0' 2>/dev/null || echo "0")
    
    # 检查是否有冲突
    local mergeable=$(gh pr list --head "$branch" --repo "$repo" --json mergeable --jq '.[0].mergeable // false' 2>/dev/null || echo "false")
    
    if [ "$mergeable" = "true" ]; then
        echo "PASS:Branch is mergeable (ahead: $ahead, behind: $behind)"
    else
        echo "FAIL:Branch has conflicts or not mergeable"
    fi
}

# 检查CI是否通过
check_ci_passed() {
    local pr_number="$1"
    local repo="$2"
    
    local checks=$(gh pr checks "$pr_number" --repo "$repo" 2>/dev/null || echo "unknown")
    
    if echo "$checks" | grep -q "fail"; then
        echo "FAIL:CI checks failed"
    elif echo "$checks" | grep -q "pending"; then
        echo "PENDING:CI checks still running"
    elif echo "$checks" | grep -q "pass"; then
        echo "PASS:All CI checks passed"
    else
        echo "UNKNOWN:Cannot determine CI status"
    fi
}

# 检查代码审查是否通过
check_review_passed() {
    local pr_number="$1"
    local repo="$2"
    local required_reviewers="$3"  # comma-separated: codex,claude,gemini
    
    local reviews=$(gh pr view "$pr_number" --repo "$repo" --json reviews --jq '.reviews[] | select(.state == "APPROVED") | .user.login' 2>/dev/null || echo "")
    
    local all_passed=true
    local missing=""
    
    IFS=',' read -ra REVIEWERS <<< "$required_reviewers"
    for reviewer in "${REVIEWERS[@]}"; do
        if ! echo "$reviews" | grep -qi "$reviewer"; then
            all_passed=false
            missing="$missing $reviewer"
        fi
    done
    
    if [ "$all_passed" = true ]; then
        echo "PASS:All required reviews approved"
    else
        echo "FAIL:Missing reviews from:$missing"
    fi
}

# 检查UI截图
check_ui_screenshots() {
    local pr_number="$1"
    local repo="$2"
    local has_ui_changes="$3"
    
    if [ "$has_ui_changes" != "true" ]; then
        echo "SKIP:No UI changes"
        return 0
    fi
    
    # 检查PR描述中是否有图片
    local pr_body=$(gh pr view "$pr_number" --repo "$repo" --json body --jq '.body // ""' 2>/dev/null || echo "")
    
    if echo "$pr_body" | grep -qiE '\!\[.*\]\(.*\)|<img'; then
        echo "PASS:UI screenshots included"
    else
        echo "FAIL:UI changes require screenshots in PR description"
    fi
}

# 完整DoD检查
check_definition_of_done() {
    local branch="$1"
    local repo="$2"
    local has_ui_changes="${3:-false}"
    local required_reviewers="${4:-codex,gemini}"
    
    log "🔍 检查 Definition of Done"
    log "   分支: $branch"
    log "   仓库: $repo"
    log ""
    
    local all_passed=true
    local results=""
    
    # 1. 检查PR
    log "1️⃣ 检查PR创建..."
    local pr_result=$(check_pr_created "$branch" "$repo")
    log "   $pr_result"
    
    if [[ "$pr_result" == FAIL* ]]; then
        all_passed=false
        results="$results\n❌ PR未创建"
    else
        local pr_number=$(echo "$pr_result" | cut -d: -f2)
        results="$results\n✅ PR #$pr_number 已创建"
        
        # 2. 检查分支同步
        log "2️⃣ 检查分支同步..."
        local sync_result=$(check_branch_synced "$branch" "$repo")
        log "   $sync_result"
        
        if [[ "$sync_result" == FAIL* ]]; then
            all_passed=false
            results="$results\n❌ 分支有冲突"
        else
            results="$results\n✅ 分支与main同步"
        fi
        
        # 3. 检查CI
        log "3️⃣ 检查CI状态..."
        local ci_result=$(check_ci_passed "$pr_number" "$repo")
        log "   $ci_result"
        
        if [[ "$ci_result" == FAIL* ]]; then
            all_passed=false
            results="$results\n❌ CI未通过"
        elif [[ "$ci_result" == PENDING* ]]; then
            results="$results\n⏳ CI运行中"
            all_passed=false
        else
            results="$results\n✅ CI全部通过"
        fi
        
        # 4. 检查代码审查
        log "4️⃣ 检查代码审查..."
        local review_result=$(check_review_passed "$pr_number" "$repo" "$required_reviewers")
        log "   $review_result"
        
        if [[ "$review_result" == FAIL* ]]; then
            all_passed=false
            results="$results\n❌ 代码审查未通过"
        else
            results="$results\n✅ 所有审查已通过"
        fi
        
        # 5. 检查UI截图
        log "5️⃣ 检查UI截图..."
        local ui_result=$(check_ui_screenshots "$pr_number" "$repo" "$has_ui_changes")
        log "   $ui_result"
        
        if [[ "$ui_result" == FAIL* ]]; then
            all_passed=false
            results="$results\n❌ UI变更缺少截图"
        else
            results="$results\n✅ UI截图检查通过"
        fi
    fi
    
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "📋 Definition of Done 检查结果:"
    echo -e "$results"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$all_passed" = true ]; then
        log ""
        log "🎉 所有检查通过！可以合并。"
        return 0
    else
        log ""
        log "⚠️  存在未通过的检查，需要处理。"
        return 1
    fi
}

# 主函数
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 2 ]; then
        echo "用法: $0 <branch> <repo> [has_ui_changes] [required_reviewers]"
        echo ""
        echo "示例:"
        echo "  $0 feat/templates owner/repo true codex,gemini,claude"
        echo "  $0 bugfix/login owner/repo false codex,gemini"
        exit 1
    fi
    
    BRANCH="$1"
    REPO="$2"
    HAS_UI="${3:-false}"
    REVIEWERS="${4:-codex,gemini}"
    
    check_definition_of_done "$BRANCH" "$REPO" "$HAS_UI" "$REVIEWERS"
fi