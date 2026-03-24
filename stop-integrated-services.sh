#!/bin/bash

# 数字员工集成服务 - 停止脚本
# 停止 Mission Control 看板和 Star Office UI

echo "============================================================="
echo "🛑 数字员工集成服务 - 停止中"
echo "============================================================="
echo ""

# 检查 PID 文件
if [ ! -f "/tmp/digital-employee-pids.txt" ]; then
    echo "⚠️  未找到 PID 文件，尝试查找运行中的进程..."
    echo ""

    # 尝试查找并停止进程
    PIDS=$(ps aux | grep -E "(node.*server.ts|vite.*dev|python3.*app.py)" | grep -v grep | awk '{print $2}')

    if [ -n "$PIDS" ]; then
        echo "找到以下进程:"
        echo "$PIDS" | while read -r pid; do
            echo "  - PID: $pid"
        done
        echo ""
        echo "正在停止..."
        echo "$PIDS" | xargs kill -15 2>/dev/null
        sleep 2
        echo "✅ 进程已停止"
    else
        echo "✅ 没有找到运行中的服务"
    fi
else
    # 从文件读取 PID
    PID_STRING=$(cat /tmp/digital-employee-pids.txt)
    MISSION_BACKEND_PID=$(echo $PID_STRING | cut -d':' -f1)
    MISSION_FRONTEND_PID=$(echo $PID_STRING | cut -d':' -f2)
    STAR_PID=$(echo $PID_STRING | cut -d':' -f3)

    # 停止 Mission Control 后端
    if [ -n "$MISSION_BACKEND_PID" ] && kill -0 $MISSION_BACKEND_PID 2>/dev/null; then
        echo "📋 停止 Mission Control 后端 (PID: $MISSION_BACKEND_PID)"
        kill $MISSION_BACKEND_PID
        sleep 1
        if kill -0 $MISSION_BACKEND_PID 2>/dev/null; then
            echo "⚠️  正在强制停止..."
            kill -9 $MISSION_BACKEND_PID
        fi
        echo "✅ Mission Control 后端已停止"
    fi

    # 停止 Mission Control 前端
    if [ -n "$MISSION_FRONTEND_PID" ] && kill -0 $MISSION_FRONTEND_PID 2>/dev/null; then
        echo "📋 停止 Mission Control 前端 (PID: $MISSION_FRONTEND_PID)"
        kill $MISSION_FRONTEND_PID
        sleep 1
        if kill -0 $MISSION_FRONTEND_PID 2>/dev/null; then
            echo "⚠️  正在强制停止..."
            kill -9 $MISSION_FRONTEND_PID
        fi
        echo "✅ Mission Control 前端已停止"
    fi

    # 停止 Star Office UI
    if [ -n "$STAR_PID" ] && kill -0 $STAR_PID 2>/dev/null; then
        echo "🎨 停止 Star Office UI (PID: $STAR_PID)"
        kill $STAR_PID
        sleep 1
        if kill -0 $STAR_PID 2>/dev/null; then
            echo "⚠️  正在强制停止..."
            kill -9 $STAR_PID
        fi
        echo "✅ Star Office UI 已停止"
    fi

    # 清理 PID 文件
    rm -f /tmp/digital-employee-pids.txt
fi

# 额外清理：确保端口被释放
echo ""
echo "🔍 检查端口占用..."

# 检查 5173 端口
PORT_5173=$(lsof -ti:5173 2>/dev/null)
if [ -n "$PORT_5173" ]; then
    echo "⚠️  端口 5173 仍被占用 (PID: $PORT_5173)"
    kill -9 $PORT_5173 2>/dev/null
    echo "✅ 端口 5173 已释放"
fi

# 检查 19000 端口
PORT_19000=$(lsof -ti:19000 2>/dev/null)
if [ -n "$PORT_19000" ]; then
    echo "⚠️  端口 19000 仍被占用 (PID: $PORT_19000)"
    kill -9 $PORT_19000 2>/dev/null
    echo "✅ 端口 19000 已释放"
fi

echo ""
echo "============================================================="
echo "✅ 所有服务已停止"
echo "============================================================="
echo ""