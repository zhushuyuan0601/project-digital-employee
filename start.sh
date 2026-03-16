#!/bin/bash

echo "===================================="
echo "OpenClaw 中国联通风格 UI 启动脚本"
echo "===================================="
echo ""

cd /Users/lihzz/.openclaw/workspace/unicom-ui.bak.bak

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖中..."
    npm install
    echo ""
fi

echo "🚀 启动开发服务器..."
echo ""
echo "访问地址: http://localhost:3000"
echo "按 Ctrl+C 停止服务"
echo ""
echo "===================================="
echo ""

npm run dev
