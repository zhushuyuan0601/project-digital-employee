#!/bin/bash

# 数字员工集成服务 - 一键启动脚本
# 启动 Mission Control 看板和 Star Office UI

echo "============================================================="
echo "🚀 数字员工集成服务 - 启动中"
echo "============================================================="
echo ""

# 保存当前目录
ORIGINAL_DIR=$(pwd)

# 1. 启动 Mission Control (kanban-full-managed)
echo ""
echo "📋 启动 Mission Control 看板..."
cd /Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/kanban-full-managed

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "⚠️  首次启动，正在安装依赖..."
    npm install
fi

# 启动后端服务器（后台）
node packages/backend/src/server.ts > /tmp/mission-control-backend.log 2>&1 &
MISSION_BACKEND_PID=$!
echo "✅ Mission Control 后端启动 (PID: $MISSION_BACKEND_PID)"

# 等待后端启动
sleep 2

# 启动前端开发服务器（后台）
cd /Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/kanban-full-managed/packages/frontend
npm run dev > /tmp/mission-control-frontend.log 2>&1 &
MISSION_FRONTEND_PID=$!
echo "✅ Mission Control 前端启动 (PID: $MISSION_FRONTEND_PID)"

# 2. 启动 Star Office UI
echo ""
echo "🎨 启动 Star Office UI..."
cd /Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/Star-Office-UI/backend

# 检查是否已安装依赖
if [ ! -d "venv" ]; then
    echo "⚠️  首次启动，正在创建虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt > /tmp/star-office-install.log 2>&1
else
    source venv/bin/activate
fi

# 启动后端服务（后台）
python3 app.py > /tmp/star-office-ui.log 2>&1 &
STAR_PID=$!
echo "✅ Star Office UI 启动 (PID: $STAR_PID)"

# 3. 等待服务启动
echo ""
echo "🔍 等待服务启动..."
sleep 5

# 4. 健康检查
echo ""
echo "============================================================="
echo "🔍 服务健康检查"
echo "============================================================="
echo ""

# 检查 Mission Control
if curl -s http://localhost:5173/health > /dev/null 2>&1; then
    echo "✅ Mission Control (http://localhost:5173) - 运行正常"
else
    echo "⚠️  Mission Control - 可能还在启动中，请稍候"
fi

# 检查 Star Office UI
if curl -s http://127.0.0.1:19000/health > /dev/null 2>&1; then
    echo "✅ Star Office UI (http://127.0.0.1:19000) - 运行正常"
else
    echo "⚠️  Star Office UI - 可能还在启动中，请稍候"
fi

# 5. 检查数字员工项目
cd "$ORIGINAL_DIR"
echo ""
echo "📱 数字员工项目:"
echo "   当前目录: $(pwd)"
if [ -f "vite.config.js" ]; then
    echo "   配置文件: vite.config.js"
    echo "   └─ 启动命令: npm run dev"
else
    echo "   ⚠️  未找到 vite.config.js"
fi

echo ""
echo "============================================================="
echo "🎉 所有服务已启动！"
echo "============================================================="
echo ""
echo "📋 访问地址:"
echo "   • Mission Control: http://localhost:5173"
echo "   • Star Office UI: http://127.0.0.1:19000"
echo "   • 数字员工: 运行 'npm run dev' 在项目根目录"
echo ""
echo "📊 进程信息:"
echo "   • Mission Control 后端 PID: $MISSION_BACKEND_PID"
echo "   • Mission Control 前端 PID: $MISSION_FRONTEND_PID"
echo "   • Star Office UI PID: $STAR_PID"
echo ""
echo "📝 日志文件:"
echo "   • Mission Control 后端: /tmp/mission-control-backend.log"
echo "   • Mission Control 前端: /tmp/mission-control-frontend.log"
echo "   • Star Office UI: /tmp/star-office-ui.log"
echo ""
echo "🛑 停止服务: Ctrl+C 或运行 ./stop-services.sh"
echo ""
echo "============================================================="

# 保存 PID 到文件，方便停止
echo "$MISSION_BACKEND_PID:$MISSION_FRONTEND_PID:$STAR_PID" > /tmp/digital-employee-pids.txt

# 捕获 Ctrl+C 信号，优雅关闭所有服务
trap cleanup SIGINT SIGTERM

function cleanup() {
    echo ""
    echo ""
    echo "============================================================="
    echo "🛑 正在停止所有服务..."
    echo "============================================================="

    # 停止 Mission Control
    if kill -0 $MISSION_BACKEND_PID 2>/dev/null; then
        echo "📋 停止 Mission Control 后端 (PID: $MISSION_BACKEND_PID)"
        kill $MISSION_BACKEND_PID
    fi

    if kill -0 $MISSION_FRONTEND_PID 2>/dev/null; then
        echo "📋 停止 Mission Control 前端 (PID: $MISSION_FRONTEND_PID)"
        kill $MISSION_FRONTEND_PID
    fi

    # 停止 Star Office UI
    if kill -0 $STAR_PID 2>/dev/null; then
        echo "🎨 停止 Star Office UI (PID: $STAR_PID)"
        kill $STAR_PID
    fi

    echo ""
    echo "✅ 所有服务已停止"
    echo "============================================================="

    # 清理 PID 文件
    rm -f /tmp/digital-employee-pids.txt

    # 返回原始目录
    cd "$ORIGINAL_DIR"

    exit 0
}

# 保持脚本运行
wait