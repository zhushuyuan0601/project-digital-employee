#!/bin/bash
# 每日情报简报自动化脚本
# 执行时间：每天 05:16
# 创建日期：2026-03-04
# 更新日期：2026-03-04 (使用多智能体并行模式)

set -e

WORKSPACE="/Users/lihzz/.openclaw/workspace-ceo"
LOG_DIR="$WORKSPACE/logs"
DATE=$(date '+%Y-%m-%d')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 创建日志目录
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/daily-intel-$DATE.log"

echo "[$TIMESTAMP] 📊 每日情报简报流程开始" | tee -a "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"

# 步骤1：调用情报研究员爬取数据
echo "" | tee -a "$LOG_FILE"
echo "[$TIMESTAMP] 步骤1: 调用情报研究员爬取AI热点" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

# 使用 openclaw agent 命令调用情报研究员
# 将爬取的数据保存到共享工作区
echo "调用情报研究员..." | tee -a "$LOG_FILE"
openclaw agent --agent researcher --message "今日情报爬取任务：请爬取今天的 AI 和互联网热点数据，包括：
1. 微信公众号 AI 热点（量子位、新智元、机器之心）
2. 大模型、智能体 AI 相关热点
3. 互联网产品和技术热点
4. 竞品公司动态（电信、移动等）

请使用 multi-search-engine 技能（不需要 API key），搜索关键词如：
- AI 大模型 热点 最近
- 人工智能 最新消息
- AI agent 2026
- 智能体 最新

将爬取的数据整理成列表，包含：标题、链接、来源、时间，保存到文件：~/.openclaw/shared-workspace/daily-intel/$DATE-researcher.md
完成后在飞书群组汇报。任务接收后请回复：📥 任务已接收" --thinking low >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 情报研究员调用成功" | tee -a "$LOG_FILE"
else
    echo "❌ 情报研究员调用失败" | tee -a "$LOG_FILE"
fi

# 等待情报研究员完成（等待 3 分钟）
echo "等待情报研究员完成任务..." | tee -a "$LOG_FILE"
sleep 180

# 步骤2：调用产品经理整理简报
echo "" | tee -a "$LOG_FILE"
echo "[$TIMESTAMP] 步骤2: 调用产品经理整理简报" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

echo "调用产品经理..." | tee -a "$LOG_FILE"
openclaw agent --agent pm --message "简报整理任务：请阅读并整理共享工作区的情报数据文件：~/.openclaw/shared-workspace/daily-intel/$DATE-researcher.md

要求：
1. 按重要程度排序（Top 10）
2. 为每个热点添加简要说明（20-50字）
3. 进行热点分析（技术热点、行业动态、市场趋势）
4. 提取产品机会（高优先级、中优先级）

输出格式：Markdown，文件保存到：$WORKSPACE/daily-intel-$DATE.md
完成后在飞书群组汇报。任务接收后请回复：📥 任务已接收" --thinking medium >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 产品经理调用成功" | tee -a "$LOG_FILE"
else
    echo "❌ 产品经理调用失败" | tee -a "$LOG_FILE"
fi

# 等待产品经理完成（等待 3 分钟）
echo "等待产品经理完成任务..." | tee -a "$LOG_FILE"
sleep 180

# 步骤3：发送邮件
echo "" | tee -a "$LOG_FILE"
echo "[$TIMESTAMP] 步骤3: 发送邮件到 793323821@qq.com" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

# 如果简报已准备好，发送邮件
REPORT_FILE="$WORKSPACE/daily-intel-$DATE.md"
if [ -f "$REPORT_FILE" ]; then
    python3 "$WORKSPACE/send_intel_report.py" >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ 邮件发送成功" | tee -a "$LOG_FILE"
    else
        echo "❌ 邮件发送失败" | tee -a "$LOG_FILE"
    fi
else
    echo "⚠️ 简报文件不存在，跳过邮件发送" | tee -a "$LOG_FILE"
fi

# 步骤4：调用总助理同步到飞书群组
echo "" | tee -a "$LOG_FILE"
echo "[$TIMESTAMP] 步骤4: 同步到飞书群组" | tee -a "$LOG_FILE"
echo "------------------------------------------" | tee -a "$LOG_FILE"

openclaw agent --agent ceo --message "请将今日情报简报的关键信息同步到飞书群组（群组ID: oc_3ad0c001eb921e29e2c23f173a0b177f）

内容格式：
📊 AI 情报简报 - 日期
🔥 今日热点 Top 5（带重要程度星级）
💡 产品机会分析

数据来源文件：$REPORT_FILE" --thinking low >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 飞书同步任务下发成功" | tee -a "$LOG_FILE"
else
    echo "❌ 飞书同步任务下发失败" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "[$TIMESTAMP] ✅ 每日情报简报流程完成" | tee -a "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"