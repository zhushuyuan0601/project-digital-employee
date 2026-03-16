<template>
  <div id="app" class="app-container">
    <!-- 战术网格背景 -->
    <div class="tactical-grid-bg"></div>
    <div class="interface-container">
      <!-- 左侧导航栏 -->
      <aside class="sidebar">
        <!-- 品牌区域 -->
        <div class="sidebar-header">
          <div class="logo-container">
            <div class="logo-symbol">
              <span class="logo-icon">🦞</span>
              <div class="logo-text-block">
                <span class="logo-brand">OPENCLAW</span>
                <span class="logo-subtext">人工智能产品部</span>
                <span class="logo-subtext2">24 小时自动办公系统</span>
              </div>
            </div>
          </div>
          <div class="system-id">
            <span class="system-label">SYSTEM:</span>
            <span class="system-value">OPENCLAW.UI // TACTICAL</span>
          </div>
        </div>

        <!-- 主导航 -->
        <nav class="sidebar-nav">
          <div class="nav-section-label">
            <span class="section-bracket">[</span>
            主菜单
            <span class="section-bracket">]</span>
          </div>

          <router-link to="/dashboard" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◈</span>
              <span class="nav-label">系统仪表盘</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/agents" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◰</span>
              <span class="nav-label">团队成员</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/digital-employee" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◈</span>
              <span class="nav-label">数字员工监控中心</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/task-center" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">▣</span>
              <span class="nav-label">任务指挥</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/task-center-2" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">▣</span>
              <span class="nav-label">任务指挥中心 II</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/chat" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◆</span>
              <span class="nav-label">团队对话</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/group-chat" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◉</span>
              <span class="nav-label">群聊会话</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <div class="nav-divider"></div>

          <div class="nav-section-label">
            <span class="section-bracket">[</span>
            系统
            <span class="section-bracket">]</span>
          </div>

          <router-link to="/logs" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">▤</span>
              <span class="nav-label">行动日志</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/status" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">◬</span>
              <span class="nav-label">系统状态</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/tools" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">⚙</span>
              <span class="nav-label">工具箱</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>

          <router-link to="/configs" custom v-slot="{ navigate, isActive }">
            <button :class="['nav-item', { active: isActive }]" @click="navigate">
              <span class="nav-bracket">[</span>
              <span class="nav-icon">⚡</span>
              <span class="nav-label">系统配置</span>
              <span class="nav-indicator"></span>
              <span class="nav-bracket-close">]</span>
            </button>
          </router-link>
        </nav>

        <!-- 底部状态区 -->
        <div class="sidebar-footer">
          <div class="connection-panel">
            <div class="panel-label">
              <span class="bracket">[</span>
              网关连接
              <span class="bracket">]</span>
            </div>
            <div class="status-row">
              <span class="status-dot" :class="connectionStatus"></span>
              <span class="status-text">{{ statusText }}</span>
              <span class="status-code">{{ connectionStatus.toUpperCase() }}</span>
            </div>
          </div>
          <div class="version-info">
            <span class="version-label">BUILD</span>
            <span class="version-value">v1.0.0 // TACTICAL</span>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 顶部状态栏 -->
        <header class="top-bar">
          <div class="top-bar-left">
            <div class="breadcrumb">
              <span class="breadcrumb-item">HOME</span>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-item current">{{ currentPageTitle }}</span>
            </div>
          </div>
          <div class="top-bar-right">
            <div class="status-widgets">
              <div class="widget">
                <span class="widget-label">SYS_STATUS</span>
                <span class="widget-value" :class="connectionStatus">{{ systemStatus }}</span>
              </div>
              <div class="widget-sep"></div>
              <div class="widget">
                <span class="widget-label">TIME</span>
                <span class="widget-value">{{ currentTime }}</span>
              </div>
              <div class="widget-sep"></div>
              <div class="widget">
                <span class="widget-label">SECURITY</span>
                <span class="widget-value">ENCRYPTED</span>
              </div>
              <div class="widget-sep"></div>
              <div class="widget">
                <button class="theme-toggle" @click="toggleTheme" :title="isLight ? '切换到暗色主题' : '切换到亮色主题'">
                  <span class="theme-icon">{{ isLight ? '🌙' : '☀️' }}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="content-area">
          <router-view></router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const route = useRoute()
const chatStore = useChatStore()
const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()

// 使用 storeToRefs 保持响应式连接
const { isConnected, isConnecting } = storeToRefs(chatStore)
const { currentTheme } = storeToRefs(themeStore)

// 是否是亮色主题
const isLight = computed(() => themeStore.isLight)

// 主题切换
function toggleTheme() {
  themeStore.toggle()
}

// 状态
const connectionStatus = ref('disconnected')
const currentTime = ref('')

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听 chatStore 连接状态
watch(
  [isConnected, isConnecting],
  ([connected, connecting]) => {
    if (connecting) {
      connectionStatus.value = 'connecting'
    } else if (connected) {
      connectionStatus.value = 'connected'
    } else {
      connectionStatus.value = 'disconnected'
    }
  },
  { immediate: true }
)

const statusText = computed(() => {
  const statusMap = {
    connected: '在线',
    connecting: '连接中',
    disconnected: '离线'
  }
  return statusMap[connectionStatus.value] || '未知'
})

const systemStatus = computed(() => {
  return connectionStatus.value === 'connected' ? '正常' : '--'
})

const currentPageTitle = computed(() => {
  const titles = {
    '/dashboard': '仪表盘',
    '/agents': '团队成员',
    '/digital-employee': '数字员工监控中心',
    '/task-center': '任务',
    '/configs': '配置',
    '/logs': '日志',
    '/status': '状态',
    '/tools': '工具',
    '/chat': '对话',
    '/group-chat': '群聊会话'
  }
  return titles[route.path] || '联通小队'
})

// 生命周期 - 应用启动时连接 Gateway
let hasConnected = false

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)

  // 只连接一次，避免重复连接
  if (!hasConnected) {
    // 连接群聊会话的 Agent（多 Agent 聊天）
    console.log('[App] 连接群聊会话 Agent...')
    multiAgentStore.connectAll()

    hasConnected = true
    console.log('[App] Gateway 已连接')
  }
})
</script>

<style scoped>
/* ========== AI 作战指挥中心主题 ========== */
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg-base);
}

/* 战术网格背景 */
.tactical-grid-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(var(--grid-line-dim) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-dim) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: 0 0;
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
  animation: grid-scroll 20s linear infinite;
}

@keyframes grid-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

.interface-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--grid-line);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}

/* 侧边栏头部 */
.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid var(--grid-line);
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(189, 0, 255, 0.1) 100%);
  position: relative;
  overflow: hidden;
}

.sidebar-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-primary), var(--color-secondary), transparent);
  animation: scan-line 3s ease-in-out infinite;
}

@keyframes scan-line {
  0%, 100% { transform: translateX(-100%); opacity: 0.5; }
  50% { transform: translateX(100%); opacity: 1; }
}

.logo-container {
  margin-bottom: 16px;
}

.logo-symbol {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 56px;
  line-height: 1;
  filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.5));
  animation: icon-pulse 2s ease-in-out infinite;
}

.logo-text-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-brand {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-shadow: 0 0 15px rgba(0, 240, 255, 0.6);
}

.logo-subtext {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.logo-subtext2 {
  font-size: 10px;
  color: var(--color-secondary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@keyframes icon-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.system-id {
  display: flex;
  gap: 8px;
  font-size: 10px;
  opacity: 0.7;
  font-family: var(--font-mono);
}

.system-label {
  color: var(--text-tertiary);
}

.system-value {
  color: var(--color-primary);
  font-weight: 600;
}

/* 侧边栏导航 */
.sidebar-nav {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.02) 0%, transparent 100%);
}

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.2em;
  padding: 16px 0 10px;
  margin-top: 8px;
  border-top: 1px solid var(--grid-line-dim);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-bracket {
  color: var(--color-primary-dim);
}

.nav-section-label:first-child {
  margin-top: 0;
  border-top: none;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  position: relative;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-primary);
  transform: scaleY(0);
  transition: transform 0.2s;
}

.nav-item:hover {
  background: rgba(0, 240, 255, 0.08);
  color: var(--color-primary);
  border-color: rgba(0, 240, 255, 0.2);
  transform: translateX(4px);
}

.nav-item:hover::before {
  transform: scaleY(1);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  color: var(--color-primary);
  border: 1px solid rgba(0, 240, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.2), inset 0 0 10px rgba(0, 240, 255, 0.05);
}

.nav-item.active::before {
  transform: scaleY(1);
}

.nav-bracket,
.nav-bracket-close {
  color: var(--color-primary-dim);
  font-family: var(--font-mono);
  font-weight: 300;
}

.nav-icon {
  min-width: 18px;
  text-align: center;
  font-size: 15px;
  color: var(--color-primary);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

.nav-label {
  flex: 1;
  text-align: left;
}

.nav-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s;
}

.nav-item.active .nav-indicator {
  background: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
}

.nav-item:hover .nav-indicator {
  background: var(--color-primary-dim);
}

.nav-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--grid-line), transparent);
  margin: 20px 0;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--grid-line);
  background: var(--bg-panel);
}

.connection-panel {
  margin-bottom: 12px;
}

.panel-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-label .bracket {
  color: var(--color-primary-dim);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.status-code {
  font-size: 9px;
  color: var(--color-primary-dim);
  padding: 2px 6px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 3px;
  margin-left: auto;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: all 0.3s;
}

.status-dot.connected {
  background: var(--color-success);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
  animation: pulse 2s infinite;
}

.status-dot.connecting {
  background: var(--color-warning);
  animation: pulse 1s infinite;
}

.status-dot.disconnected {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.status-text {
  font-size: 11px;
  color: var(--text-secondary);
  flex: 1;
}

.version-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--grid-line-dim);
}

.version-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.version-value {
  font-size: 10px;
  color: var(--color-primary);
  font-family: var(--font-mono);
  padding: 2px 8px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 3px;
}

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.02) 0%, transparent 100%);
}

/* ========== 顶部状态栏 ========== */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--grid-line);
  background: var(--bg-surface);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
  position: relative;
}

.top-bar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary-dim), transparent);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}

.breadcrumb-item {
  color: var(--text-tertiary);
}

.breadcrumb-item.current {
  color: var(--color-primary);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}

.breadcrumb-sep {
  color: var(--grid-line);
}

.status-widgets {
  display: flex;
  align-items: center;
  gap: 24px;
}

.widget {
  display: flex;
  align-items: center;
  gap: 8px;
}

.widget-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: var(--font-mono);
}

.widget-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
}

.widget-value.connected {
  color: var(--color-success);
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

.widget-sep {
  width: 1px;
  height: 20px;
  background: linear-gradient(180deg, transparent, var(--grid-line), transparent);
}

/* ========== 主题切换按钮 ========== */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-panel-hover);
  border-color: var(--color-primary);
}

.theme-icon {
  font-size: 16px;
  line-height: 1;
}

/* ========== 内容区域 ========== */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-base);
}

.content-area::-webkit-scrollbar {
  width: 8px;
}

.content-area::-webkit-scrollbar-track {
  background: var(--bg-base);
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--color-primary-dim);
  border-radius: 4px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}
</style>
