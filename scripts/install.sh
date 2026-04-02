#!/bin/bash

# OpenClaw Unicom UI - 一键安装脚本
# 自动安装所有依赖并初始化项目

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     OpenClaw Unicom UI - 一键安装脚本                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "   ✓ Node.js: $NODE_VERSION"

# 检查 npm
echo "[2/6] 检查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "   ✓ npm: $NPM_VERSION"

# 检查 OpenClaw
echo "[3/6] 检查 OpenClaw Gateway..."
if ! command -v openclaw &> /dev/null; then
    echo "⚠️  OpenClaw Gateway 未安装"
    echo "   正在安装 openclaw..."
    npm install -g openclaw
    if [ $? -ne 0 ]; then
        echo "❌ OpenClaw 安装失败，请手动执行：npm install -g openclaw"
        exit 1
    fi
    echo "   ✓ OpenClaw 安装成功"
else
    OPENCLAW_VERSION=$(openclaw --version 2>&1 | head -1)
    echo "   ✓ OpenClaw: $OPENCLAW_VERSION"
fi

# 安装前端依赖
echo "[4/6] 安装前端依赖..."
if [ -d "node_modules" ]; then
    echo "   前端依赖已安装，跳过"
else
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
fi
echo "   ✓ 前端依赖安装完成"

# 安装后端依赖
echo "[5/6] 安装后端依赖..."
cd server
if [ -d "node_modules" ]; then
    echo "   后端依赖已安装，跳过"
else
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi
cd ..
echo "   ✓ 后端依赖安装完成"

# 初始化环境变量
echo "[6/6] 初始化环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   ✓ 已创建 .env 文件"
        echo ""
        echo "   ⚠️  请编辑 .env 文件，配置 VITE_GATEWAY_TOKEN"
        echo "       使用 openclaw gateway token 命令获取 Token"
    else
        cat > .env << 'EOF'
# Gateway WebSocket 代理路径
VITE_GATEWAY_WS_PATH=/ws

# Gateway 认证令牌（请修改为你的实际 Token）
VITE_GATEWAY_TOKEN=your-token-here

# Gateway 客户端 ID
VITE_GATEWAY_CLIENT_ID=unicom-mission-control
EOF
        echo "   ✓ 已创建 .env 文件（默认配置）"
        echo ""
        echo "   ⚠️  请编辑 .env 文件，配置 VITE_GATEWAY_TOKEN"
    fi
else
    echo "   ✓ .env 文件已存在"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  安装完成！                                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "下一步操作："
echo ""
echo "1. 启动 OpenClaw Gateway:"
echo "   openclaw gateway start"
echo ""
echo "2. 配置 Gateway Token（如未配置）:"
echo "   openclaw gateway token"
echo "   然后编辑 .env 文件，填入 VITE_GATEWAY_TOKEN"
echo ""
echo "3. 启动所有服务:"
echo "   ./start-dev.sh"
echo ""
echo "4. 访问应用:"
echo "   http://localhost:3000"
echo ""
echo "详细说明请查看：DEPLOYMENT.md"
echo ""
