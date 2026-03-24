#!/bin/bash

# 数字员工集成 - 验证测试脚本
# 检查集成是否正确

echo "============================================================="
echo "🔍 数字员工集成 - 验证测试"
echo "============================================================="
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

# 辅助函数：检查文件
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $2"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    else
        echo "❌ $2 - 不存在"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

# 辅助函数：检查内容
check_content() {
    if grep -q "$2" "$1"; then
        echo "✅ $3"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    else
        echo "❌ $3 - 未找到"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        return 1
    fi
}

# 辅助函数：检查端口
check_port() {
    local port=$1
    local name=$2
    if lsof -ti:${port} > /dev/null 2>&1; then
        local pid=$(lsof -ti:${port} | head -1)
        echo "✅ $name - 端口 ${port} 已被占用（PID: ${pid}）"
        return 0
    else
        echo "⚠️  $name - 端口 ${port} 未被占用（服务未运行）"
        return 1
    fi
}

# 辅助函数：检查 HTTP 服务
check_http() {
    local url=$1
    local name=$2
    if curl -s "${url}" > /dev/null 2>&1; then
        echo "✅ $name - 响应正常"
        return 0
    else
        echo "⚠️  $name - 不可用"
        return 1
    fi
}

# ============================================================================
# 测试 1: 文件完整性检查
# ============================================================================

echo "📊 测试 1: 文件完整性检查"
echo ""

check_file "/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/src/App.vue" "App.vue（主应用）"
check_file "/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/start-integrated-services.sh" "启动脚本"
check_file "/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/stop-integrated-services.sh" "停止脚本"
check_file "/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/INTEGRATION-README.md" "集成文档"

echo ""

# ============================================================================
# 测试 2: App.vue 集成检查
# ============================================================================

echo "📊 测试 2: App.vue Tab 集成检查"
echo ""

APP_VUE="/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/src/App.vue"

check_content "$APP_VUE" 'mission-control' "Mission Control Tab 集成"
check_content "$APP_VUE" 'star-office' "Star Office UI Tab 集成"
check_content "$APP_VUE" 'localhost:5173' "Mission Control iframe URL"
check_content "$APP_VUE" '127.0.0.1:19000' "Star Office UI iframe URL"
check_content "$APP_VUE" 'van-tabbar' "Vant Tabbar 组件"
check_content "$APP_VUE" 'iframe' "iframe 标签"

echo ""

# ============================================================================
# 测试 3: 服务文件检查
# ============================================================================

echo "📊 测试 3: 服务文件检查"
echo ""

check_file "/Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/kanban-full-managed/packages/backend/src/server.ts" "Mission Control 后端"
check_file "/Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/kanban-full-managed/packages/frontend/src/App.vue" "Mission Control 前端"
check_file "/Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/Star-Office-UI/backend/app.py" "Star Office UI"

echo ""

# ============================================================================
# 测试 4: 端口占用检查
# ============================================================================

echo "📊 测试 4: 端口占用检查"
echo ""

check_port 5173 "Mission Control (localhost)"
check_port 19000 "Star Office UI (127.0.0.1)"

echo ""

# ============================================================================
# 测试 5: 服务健康检查
# ============================================================================

echo "📊 测试 5: 服务健康检查"
echo ""

check_http "http://localhost:5173/health" "Mission Control 后端"
check_http "http://127.0.0.1:19000/health" "Star Office UI"

echo ""

# ============================================================================
# 测试 6: 日志文件检查
# ============================================================================

echo "📊 测试 6: 日志文件检查"
echo ""

check_file "/tmp/mission-control-backend.log" "Mission Control 后端日志"
check_file "/tmp/mission-control-frontend.log" "Mission Control 前端日志"
check_file "/tmp/star-office-ui.log" "Star Office UI 日志"

echo ""

# ============================================================================
# 测试总结
# ============================================================================

echo "============================================================="
echo "📋 测试总结"
echo "============================================================="
echo ""

echo "✅ 通过测试: ${SUCCESS_COUNT}"
echo "❌ 失败测试: ${FAIL_COUNT}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 所有测试通过！集成成功！"
    echo ""
    echo "🚀 下一步："
    echo "   1. 启动服务: ./start-integrated-services.sh"
    echo "   2. 启动数字员工: npm run dev"
    echo "   3. 访问应用并在浏览器中切换 Tab"
    echo ""
else
    echo "⚠️  部分测试未通过，请检查："
    echo "   • App.vue 是否正确集成"
    echo "   • 服务是否正在运行"
    echo "   • 端口是否被正确占用"
    echo ""
    echo "💡 提示："
    echo "   - 如果服务未运行，请先执行 ./start-integrated-services.sh"
    echo "   - 如果端口未被占用，服务可能未启动"
    echo ""
fi

echo "============================================================="
echo ""

exit $FAIL_COUNT