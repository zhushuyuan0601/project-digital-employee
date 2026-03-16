#!/bin/bash

# 启动文件扫描 API 服务

cd "$(dirname "$0")"

echo "Starting Unicom File Scanner API Server..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 启动服务
npm start
