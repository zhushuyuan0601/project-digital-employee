#!/bin/bash
# AI每日简报定时任务脚本
# 执行时间：每天早上 7:30

set -e

# 工作目录
WORKSPACE="$HOME/.openclaw/workspace-researcher"
SHARED_WORKSPACE="$HOME/.openclaw/shared-workspace/daily-intel"

# 日志文件
LOG_FILE="$WORKSPACE/logs/newsletter_$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "========================================" | tee -a "$LOG_FILE"
echo "📰 AI每日简报定时任务" | tee -a "$LOG_FILE"
echo "⏰ 执行时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 步骤1: 爬取最新数据（调用研究员agent）
echo "" | tee -a "$LOG_FILE"
echo "📊 步骤1: 爬取最新AI热点数据..." | tee -a "$LOG_FILE"
cd "$WORKSPACE"
# 这里可以调用爬虫脚本或API

# 步骤2: 生成简报
echo "" | tee -a "$LOG_FILE"
echo "📝 步骤2: 生成简报..." | tee -a "$LOG_FILE"
# 简报生成逻辑已集成在agent中

# 步骤3: 发送邮件
echo "" | tee -a "$LOG_FILE"
echo "📧 步骤3: 发送邮件..." | tee -a "$LOG_FILE"
python3 "$WORKSPACE/scripts/send_newsletter_email.py" 2>&1 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "✅ 定时任务完成: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"