#!/bin/bash
# 系统健康检查

CLAWDBOT_DIR="$HOME/.openclaw/workspace-tech-lead/.clawdbot"

echo "🔍 Agent Swarm 系统健康检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查目录结构
echo "📁 目录结构检查..."
for dir in scripts templates memory logs completed-tasks; do
    if [ -d "$CLAWDBOT_DIR/$dir" ]; then
        echo "  ✅ $dir/"
    else
        echo "  ❌ $dir/ 缺失"
    fi
done
echo ""

# 检查脚本
echo "📜 脚本检查..."
for script in spawn-agent.sh check-agents.sh check-dod.sh ralph-loop.sh discover-work.sh generate-prompt.sh select-agent.sh generate-report.sh; do
    if [ -f "$CLAWDBOT_DIR/scripts/$script" ]; then
        if [ -x "$CLAWDBOT_DIR/scripts/$script" ]; then
            echo "  ✅ $script (可执行)"
        else
            echo "  ⚠️  $script (不可执行)"
        fi
    else
        echo "  ❌ $script 缺失"
    fi
done
echo ""

# 检查配置文件
echo "⚙️  配置文件检查..."
for file in active-tasks.json memory/prompt-patterns.json memory/agent-performance.json memory/business-context.json; do
    if [ -f "$CLAWDBOT_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file 缺失"
    fi
done
echo ""

# 检查模板
echo "📝 模板检查..."
for template in feature-development.md bugfix.md; do
    if [ -f "$CLAWDBOT_DIR/templates/$template" ]; then
        echo "  ✅ $template"
    else
        echo "  ❌ $template 缺失"
    fi
done
echo ""

# 检查依赖工具
echo "🛠️  依赖工具检查..."
for tool in jq git tmux gh; do
    if command -v $tool &> /dev/null; then
        echo "  ✅ $tool ($(command -v $tool))"
    else
        echo "  ⚠️  $tool 未安装"
    fi
done
echo ""

# 统计
echo "📊 系统统计..."
echo "  脚本数量: $(ls $CLAWDBOT_DIR/scripts/*.sh 2>/dev/null | wc -l)"
echo "  模板数量: $(ls $CLAWDBOT_DIR/templates/*.md 2>/dev/null | wc -l)"
echo "  配置文件: $(ls $CLAWDBOT_DIR/memory/*.json 2>/dev/null | wc -l)"
if [ -f "$CLAWDBOT_DIR/active-tasks.json" ]; then
    echo "  活跃任务: $(jq '.tasks | length' $CLAWDBOT_DIR/active-tasks.json 2>/dev/null || echo "0")"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 系统检查完成！"