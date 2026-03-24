#!/bin/bash

# 停止 Digital Employee 所有服务

echo "=========================================="
echo "停止 Digital Employee 全部服务"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 查找并杀死所有相关进程
echo ""
echo "🛑 停止数字员工主界面..."
pkill -f "vite --port 5173" && echo -e "${GREEN}✓ 数字员工主界面已停止${NC}" || echo -e "${YELLOW}⚠ 数字员工主界面未运行${NC}"

echo ""
echo "🛑 停止 Star Office UI..."
pkill -f "python3 server.py" && echo -e "${GREEN}✓ Star Office UI 已停止${NC}" || echo -e "${YELLOW}⚠ Star Office UI 未运行${NC}"

echo ""
echo "🛑 停止 Mission Control Backend..."
pkill -f "vite --port 50051" && echo -e "${GREEN}✓ Mission Control Backend 已停止${NC}" || echo -e "${YELLOW}⚠ Mission Control Backend 未运行${NC}"

echo ""
echo "🛑 停止 Mission Control Frontend..."
pkill -f "vite --port 3000" && echo -e "${GREEN}✓ Mission Control Frontend 已停止${NC}" || echo -e "${YELLOW}⚠ Mission Control Frontend 未运行${NC}"

echo ""
echo "=========================================="
echo "所有服务已停止"
echo "=========================================="