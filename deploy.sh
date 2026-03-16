#!/bin/bash

echo "===================================="
echo "构建并部署到 OpenClaw"
echo "===================================="
echo ""

cd /Users/lihzz/.openclaw/workspace/unicom-ui

echo "🔨 开始构建..."
npm run build

echo ""
echo "📦 构建完成！"
echo ""
echo "⚠️  准备部署到 OpenClaw"
echo ""
echo "原始界面将备份到: /opt/homebrew/lib/node_modules/openclaw/dist/control-ui.backup"
echo ""
read -p "确认继续部署? (yes/no): " confirm

if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ]; then
    echo "❌ 已取消部署"
    exit 0
fi

echo ""
echo "📋 备份原始界面..."
sudo cp -r /opt/homebrew/lib/node_modules/openclaw/dist/control-ui /opt/homebrew/lib/node_modules/openclaw/dist/control-ui.backup

echo ""
echo "🚀 正在部署新界面..."
sudo cp -r dist/* /opt/homebrew/lib/node_modules/openclaw/dist/control-ui/

echo ""
echo "✅ 部署完成！"
echo ""
echo "🔄 重启 OpenClaw Gateway..."
openclaw gateway restart

echo ""
echo "===================================="
echo "完成！"
echo "===================================="
echo ""
echo "访问: http://127.0.0.1:18789/chat"
echo ""
echo "如需恢复原始界面，运行恢复脚本:"
echo "  ./restore-original.sh"
echo ""