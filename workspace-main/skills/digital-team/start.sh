#!/bin/bash

echo "🚀 启动联通AI数字员工团队演示系统"
echo "=================================="
echo

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 错误：未找到 npm，请先安装"
    exit 1
fi

# 进入目录
cd "$(dirname "$0")"

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo
    echo "✅ 依赖安装完成"
    echo
fi

# 启动开发服务器
echo "🌐 启动演示页面..."
echo "📍 访问地址：http://localhost:5173"
echo "💡 按 Ctrl+C 停止服务"
echo
echo "=================================="
echo

npm run dev