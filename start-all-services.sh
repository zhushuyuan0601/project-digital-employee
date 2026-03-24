#!/bin/bash

# 自动启动 Digital Employee 全部服务

echo "=========================================="
echo "启动 Digital Employee 全部服务"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "项目根目录: $PROJECT_ROOT"

# 启动 Star Office UI
echo ""
echo "🚀 启动 Star Office UI..."
cd "$PROJECT_ROOT/Star-Office-UI"
python3 server.py > /tmp/star-office-ui.log 2>&1 &
STAR_PID=$!
sleep 2

if ps -p $STAR_PID > /dev/null; then
    echo -e "${GREEN}✓ Star Office UI 启动成功${NC} (PID: $STAR_PID, Port: 19000)"
else
    echo -e "${RED}✗ Star Office UI 启动失败${NC}"
fi

# 启动 Mission Control Backend
echo ""
echo "🚀 启动 Mission Control Backend..."
cd "$PROJECT_ROOT/kanban-full-managed/packages/backend"
pnpm dev > /tmp/mission-control-backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Mission Control Backend 启动成功${NC} (PID: $BACKEND_PID, Port: 50051)"
else
    echo -e "${YELLOW}⚠ Mission Control Backend 可能在启动中${NC}"
fi

# 启动 Mission Control Frontend
echo ""
echo "🚀 启动 Mission Control Frontend..."
cd "$PROJECT_ROOT/kanban-full-managed/packages/frontend"
pnpm dev > /tmp/mission-control-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Mission Control Frontend 启动成功${NC} (PID: $FRONTEND_PID, Port: 3000)"
else
    echo -e "${YELLOW}⚠ Mission Control Frontend 可能在启动中${NC}"
fi

# 启动数字员工主界面
echo ""
echo "🚀 启动数字员工主界面..."
cd "$PROJECT_ROOT"
npm run dev > /tmp/digital-employee.log 2>&1 &
DIGITAL_PID=$!
sleep 3

if ps -p $DIGITAL_PID > /dev/null; then
    echo -e "${GREEN}✓ 数字员工主界面启动成功${NC} (PID: $DIGITAL_PID, Port: 5173)"
else
    echo -e "${YELLOW}⚠ 数字员工主界面可能在启动中${NC}"
fi

# 健康检查
echo ""
echo "=========================================="
echo "服务健康检查"
echo "=========================================="

sleep 2

# Star Office UI 健康检查
echo ""
echo "🔍 检查 Star Office UI..."
curl -s http://127.0.0.1:19000/health 2>/dev/null && echo -e "${GREEN}✓ Star Office UI${NC}" || echo -e "${RED}✗ Star Office UI 无响应${NC}"

# Mission Control 健康检查
echo ""
echo "🔍 检查 Mission Control..."
curl -s http://localhost:3000 > /dev/null 2>&1 && echo -e "${GREEN}✓ Mission Control${NC}" || echo -e "${YELLOW}⚠ Mission Control 可能还在启动${NC}"

# 数字员工主界面健康检查
echo ""
echo "🔍 检查数字员工主界面..."
curl -s http://localhost:5173 > /dev/null 2>&1 && echo -e "${GREEN}✓ 数字员工主界面${NC}" || echo -e "${YELLOW}⚠ 数字员工主界面可能在启动中${NC}"

echo ""
echo "=========================================="
echo "所有服务启动完成"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - 数字员工主界面:         http://localhost:5173/"
echo "  - Star Office UI:           http://127.0.0.1:19000"
echo "  - Mission Control:          http://localhost:3000"
echo ""
echo "日志位置:"
echo "  - 数字员工主界面:         /tmp/digital-employee.log"
echo "  - Star Office UI:           /tmp/star-office-ui.log"
echo "  - Mission Control Backend:  /tmp/mission-control-backend.log"
echo "  - Mission Control Frontend: /tmp/mission-control-frontend.log"
echo ""
echo "停止服务: ./stop-all-services.sh"
echo "=========================================="