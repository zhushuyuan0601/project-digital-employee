#!/bin/bash

echo "===================================="
echo "恢复原始 OpenClaw 界面"
echo "===================================="
echo ""

if [ ! -d "/opt/homebrew/lib/node_modules/openclaw/dist/control-ui.backup" ]; then
    echo "❌ 未找到备份文件"
    echo "   路径: /opt/homebrew/lib/node_modules/openclaw/dist/control-ui.backup"
    exit 1
fi

echo "🔄 恢复中..."
sudo rm -rf /opt/homebrew/lib/node_modules/openclaw/dist/control-ui
sudo mv /opt/homebrew/lib/node_modules/openclaw/dist/control-ui.backup /opt/homebrew/lib/node_modules/openclaw/dist/control-ui

echo ""
echo "🔄 重启 OpenClaw Gateway..."
openclaw gateway restart

echo ""
echo "✅ 恢复完成！"
echo ""
echo "访问: http://127.0.0.1:18789/chat"
echo ""