<template>
  <div class="dashboard">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">◈</span>
          <span class="title-main">人工智能产品部</span>
          <span class="title-sub">24 小时自动办公系统</span>
        </h1>
        <div class="title-meta">
          <span class="meta-label">LAST_UPDATE:</span>
          <span class="meta-value">{{ currentTime }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="refreshData">
          <span>⟳</span> 刷新
        </button>
      </div>
    </div>

    <!-- 任务流转动态线条区域 -->
    <div class="task-flow-section">
      <div class="flow-header">
        <span class="flow-icon">▣</span>
        <span class="flow-title">任务流转指挥中心</span>
        <span class="flow-status">
          <span class="status-dot"></span>
          LIVE
        </span>
      </div>
      <div class="flow-container">
        <div class="flow-nodes">
          <div class="flow-node" v-for="(node, index) in flowNodes" :key="node.id" :class="['node-' + node.type]">
            <div class="node-box">
              <span class="node-avatar">{{ node.avatar }}</span>
              <span class="node-name">{{ node.name }}</span>
              <span class="node-role">{{ node.role }}</span>
            </div>
            <div class="node-connector" v-if="index < flowNodes.length - 1">
              <div class="flow-line"></div>
              <div class="flow-particle"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">◰</span>
          <span class="stat-card-label">团队成员</span>
        </div>
        <div class="stat-card-value">{{ stats.agents }}</div>
        <div class="stat-card-trend positive">
          <span>+2.5%</span>
          <span class="trend-indicator">↑</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">▣</span>
          <span class="stat-card-label">消息数</span>
        </div>
        <div class="stat-card-value">{{ formatNumber(stats.messages) }}</div>
        <div class="stat-card-trend positive">
          <span>+12.3%</span>
          <span class="trend-indicator">↑</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">◈</span>
          <span class="stat-card-label">Token 数</span>
        </div>
        <div class="stat-card-value">{{ formatNumber(stats.tokens) }}</div>
        <div class="stat-card-trend neutral">
          <span>-0.8%</span>
          <span class="trend-indicator">↓</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">⚡</span>
          <span class="stat-card-label">请求数</span>
        </div>
        <div class="stat-card-value">{{ formatNumber(stats.requests) }}</div>
        <div class="stat-card-trend positive">
          <span>+5.2%</span>
          <span class="trend-indicator">↑</span>
        </div>
      </div>
    </div>

    <!-- 主网格 -->
    <div class="dashboard-grid">
      <!-- 系统状态面板 -->
      <div class="panel panel-large">
        <div class="panel-header">
          <span class="panel-icon">◬</span>
          <h3 class="panel-title">系统状态</h3>
        </div>
        <div class="panel-body">
          <div class="status-grid">
            <div class="status-cell">
              <div class="status-cell-label">网关</div>
              <div class="status-cell-value" :class="gatewayStatus">
                <span class="status-indicator"></span>
                {{ gatewayStatusText }}
              </div>
            </div>
            <div class="status-cell">
              <div class="status-cell-label">运行时长</div>
              <div class="status-cell-value">{{ uptime }}</div>
            </div>
            <div class="status-cell">
              <div class="status-cell-label">内存</div>
              <div class="status-cell-value">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 64%"></div>
                </div>
                <span class="progress-text">512MB / 8GB</span>
              </div>
            </div>
            <div class="status-cell">
              <div class="status-cell-label">CPU LOAD</div>
              <div class="status-cell-value">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 25%"></div>
                </div>
                <span class="progress-text">25%</span>
              </div>
            </div>
            <div class="status-cell">
              <div class="status-cell-label">DISK</div>
              <div class="status-cell-value">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 42%"></div>
                </div>
                <span class="progress-text">128GB / 512GB</span>
              </div>
            </div>
            <div class="status-cell">
              <div class="status-cell-label">NETWORK</div>
              <div class="status-cell-value network">
                <span class="network-stat">
                  <span class="net-label">IN</span>
                  <span class="net-value">2.4 MB/s</span>
                </span>
                <span class="network-stat">
                  <span class="net-label">OUT</span>
                  <span class="net-value">1.1 MB/s</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作面板 -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-icon">⚡</span>
          <h3 class="panel-title">快速操作</h3>
        </div>
        <div class="panel-body">
          <div class="quick-actions">
            <router-link to="/task-center" class="action-btn">
              <span class="action-btn-icon">▣</span>
              <span class="action-btn-label">任务中心</span>
            </router-link>
            <router-link to="/agents" class="action-btn">
              <span class="action-btn-icon">◰</span>
              <span class="action-btn-label">团队成员</span>
            </router-link>
            <router-link to="/chat" class="action-btn">
              <span class="action-btn-icon">◈</span>
              <span class="action-btn-label">新建对话</span>
            </router-link>
            <router-link to="/group-chat" class="action-btn">
              <span class="action-btn-icon">◉</span>
              <span class="action-btn-label">群聊会话</span>
            </router-link>
            <router-link to="/logs" class="action-btn">
              <span class="action-btn-icon">▤</span>
              <span class="action-btn-label">查看日志</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="panel panel-full">
        <div class="panel-header">
          <span class="panel-icon">▤</span>
          <h3 class="panel-title">最近活动</h3>
        </div>
        <div class="panel-body">
          <div class="activity-list">
            <div class="activity-item">
              <span class="activity-time">14:32:15</span>
              <span class="activity-badge badge-success">成功</span>
              <span class="activity-message">Agent "ceo" 完成任务执行</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">14:30:42</span>
              <span class="activity-badge badge-info">信息</span>
              <span class="activity-message">为用户 001 初始化新会话</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">14:28:33</span>
              <span class="activity-badge badge-warning">警告</span>
              <span class="activity-message">Token 使用量超过 80% 阈值</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">14:25:18</span>
              <span class="activity-badge badge-success">成功</span>
              <span class="activity-message">工具 "file_read" 执行成功</span>
            </div>
            <div class="activity-item">
              <span class="activity-time">14:22:05</span>
              <span class="activity-badge badge-error">错误</span>
              <span class="activity-message">Agent "researcher" 连接超时</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'

const chatStore = useChatStore()
const { isConnected } = storeToRefs(chatStore)

const currentTime = ref('')
const gatewayStatus = ref('connected')
const stats = ref({
  agents: 11,
  messages: 12435,
  tokens: 1256800,
  requests: 3421
})

const uptime = ref('2d 14h 32m')

// 任务流转节点
const flowNodes = ref([
  { id: 1, name: '领导任务', avatar: '👤', role: '任务发起', type: 'leader' },
  { id: 2, name: '项目管理', avatar: 'U', role: '任务秘书', type: 'agent' },
  { id: 3, name: '研究员', avatar: 'R', role: '竞品分析师', type: 'agent' },
  { id: 4, name: '产品经理', avatar: 'P', role: '产品经理', type: 'agent' },
  { id: 5, name: '研发工程师', avatar: 'D', role: '研发工程师', type: 'dev' },
  { id: 6, name: 'ClaudeCode', avatar: 'C', role: '执行核心', type: 'core' }
])

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const gatewayStatusText = computed(() => {
  const statusMap = {
    connected: 'ONLINE',
    connecting: 'CONNECTING',
    disconnected: 'OFFLINE'
  }
  return statusMap[gatewayStatus.value] || 'UNKNOWN'
})

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

const refreshData = () => {
  // TODO: 从 Gateway API 获取真实数据
  console.log('Refreshing dashboard data...')
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* ========== 页面标题 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.title-main {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
  letter-spacing: 0.1em;
}

.title-sub {
  font-size: 14px;
  color: var(--color-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.title-icon {
  color: var(--color-primary);
  font-size: 28px;
  display: none;
}

.title-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.meta-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.meta-value {
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 700;
  font-family: var(--font-mono);
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ========== 任务流转区域 ========== */
.task-flow-section {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  position: relative;
}

.task-flow-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
}

.flow-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.flow-icon {
  font-size: 20px;
  color: var(--color-primary);
  animation: pulse-icon 2s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

.flow-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.flow-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-success);
  font-family: var(--font-mono);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.flow-container {
  padding: 24px 20px;
  overflow-x: auto;
}

.flow-nodes {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  min-width: max-content;
}

.flow-node {
  display: flex;
  align-items: center;
}

.node-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.05) 100%);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  min-width: 100px;
  position: relative;
  transition: all 0.3s;
}

.node-box:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.2);
}

.node-leader .node-box {
  border-color: rgba(255, 170, 0, 0.5);
  background: linear-gradient(135deg, rgba(255, 170, 0, 0.15) 0%, rgba(255, 107, 0, 0.08) 100%);
}

.node-agent .node-box {
  border-color: rgba(0, 240, 255, 0.4);
}

.node-dev .node-box {
  border-color: rgba(189, 0, 255, 0.5);
  background: linear-gradient(135deg, rgba(189, 0, 255, 0.15) 0%, rgba(138, 43, 226, 0.08) 100%);
}

.node-core .node-box {
  border-color: rgba(0, 255, 136, 0.5);
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 240, 255, 0.08) 100%);
}

.node-avatar {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.node-leader .node-avatar {
  color: #ffaa00;
}

.node-core .node-avatar {
  color: var(--color-success);
}

.node-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.node-role {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.node-connector {
  position: relative;
  width: 60px;
  height: 4px;
  background: var(--grid-line);
  margin: 0 8px;
  border-radius: 2px;
  overflow: hidden;
}

.flow-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.3;
}

.flow-particle {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
  animation: flow-move 1.5s ease-in-out infinite;
}

@keyframes flow-move {
  0% { left: -20px; opacity: 0; }
  50% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

/* ========== 统计卡片网格 ========== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  padding: 20px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.6;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
  transform: translateY(-4px);
}

.stat-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-card-icon {
  font-size: 24px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.stat-card-label {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-card-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
  font-family: var(--font-mono);
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
}

.stat-card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-family: var(--font-mono);
}

.stat-card-trend.positive {
  color: var(--color-success);
}

.stat-card-trend.negative {
  color: var(--color-error);
}

.stat-card-trend.neutral {
  color: var(--text-tertiary);
}

.trend-indicator {
  font-size: 14px;
}

/* ========== 主网格布局 ========== */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.panel-large {
  grid-row: span 2;
}

.panel-full {
  grid-column: 1 / -1;
}

/* ========== 面板样式 ========== */
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary-dim), transparent);
}

.panel:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 240, 255, 0.15);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.panel-icon {
  font-size: 20px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.panel-body {
  padding: 16px;
}

/* ========== 状态网格 ========== */
.status-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 6px;
}

.status-cell-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: var(--font-mono);
}

.status-cell-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-success);
  font-family: var(--font-mono);
}

.status-cell-value.connecting {
  color: var(--color-warning);
}

.status-cell-value.disconnected {
  color: var(--color-error);
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: currentColor;
  margin-right: 8px;
  border-radius: 50%;
  vertical-align: middle;
  box-shadow: 0 0 8px currentColor;
}

.status-cell-value.network {
  display: flex;
  gap: 16px;
}

.network-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.net-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.net-value {
  color: var(--color-primary);
  font-family: var(--font-mono);
}

/* ========== 进度条 ========== */
.progress-bar {
  display: inline-block;
  width: 100px;
  height: 6px;
  background: var(--bg-base);
  border-radius: 3px;
  vertical-align: middle;
  margin-right: 8px;
  overflow: hidden;
  border: 1px solid var(--grid-line-dim);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 3px;
  transition: width 0.3s;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* ========== 快速操作 ========== */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), transparent);
  opacity: 0.5;
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.2);
}

.action-btn-icon {
  font-size: 28px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.action-btn-label {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== 活动列表 ========== */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 6px;
  font-family: var(--font-mono);
}

.activity-time {
  color: var(--text-tertiary);
  font-size: 11px;
  min-width: 72px;
}

.activity-badge {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background: rgba(0, 255, 136, 0.15);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}

.badge-info {
  background: rgba(0, 168, 255, 0.15);
  border: 1px solid var(--color-info);
  color: var(--color-info);
}

.badge-warning {
  background: rgba(255, 170, 0, 0.15);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}

.badge-error {
  background: rgba(255, 51, 102, 0.15);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.activity-message {
  color: var(--text-secondary);
  flex: 1;
  font-size: 12px;
}

/* ========== 页面加载动画 ========== */
.dashboard {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 亮色主题特定样式 ========== */
:root.light-theme .page-title {
  color: #1e293b;
}

:root.light-theme .title-main {
  color: #1e293b;
  text-shadow: none;
  font-weight: 800;
  font-size: 20px;
}

:root.light-theme .title-sub {
  color: #64748b;
}

:root.light-theme .title-icon {
  color: #2563eb;
  text-shadow: none;
}

:root.light-theme .meta-label {
  color: #94a3b8;
}

:root.light-theme .meta-value {
  color: #1e293b;
  text-shadow: none;
  font-weight: 600;
}

:root.light-theme .stat-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .stat-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

:root.light-theme .stat-card::before {
  background: #2563eb;
  opacity: 1;
}

:root.light-theme .stat-card-label {
  color: #64748b;
  font-weight: 500;
}

:root.light-theme .stat-card-value {
  color: #1e293b;
  text-shadow: none;
  font-weight: 700;
}

:root.light-theme .stat-card-trend.positive {
  color: #059669;
}

:root.light-theme .stat-card-trend.negative {
  color: #dc2626;
}

:root.light-theme .stat-card-trend.neutral {
  color: #64748b;
}

:root.light-theme .panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .panel:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

:root.light-theme .panel::before {
  background: linear-gradient(90deg, transparent, #2563eb, transparent);
  opacity: 1;
}

:root.light-theme .panel-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

:root.light-theme .panel-title {
  color: #1e293b;
  font-weight: 700;
}

:root.light-theme .panel-icon {
  color: #2563eb;
  text-shadow: none;
}

:root.light-theme .panel-body {
  color: #475569;
}

:root.light-theme .status-cell {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .status-cell-label {
  color: #64748b;
  font-weight: 500;
}

:root.light-theme .status-cell-value {
  text-shadow: none;
  color: #1e293b;
  font-weight: 600;
}

:root.light-theme .progress-bar {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

:root.light-theme .progress-fill {
  box-shadow: none;
  background: #2563eb;
}

:root.light-theme .action-btn {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #475569;
}

:root.light-theme .action-btn:hover {
  border-color: #2563eb;
  color: #1e293b;
  background: #f9fafb;
}

:root.light-theme .action-btn::before {
  background: #2563eb;
  opacity: 1;
}

:root.light-theme .activity-item {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .activity-time {
  color: #9ca3af;
}

:root.light-theme .activity-message {
  color: #475569;
}

:root.light-theme .badge-success {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #059669;
}

:root.light-theme .badge-info {
  background: rgba(14, 165, 233, 0.1);
  border-color: #0ea5e9;
  color: #0284c7;
}

:root.light-theme .badge-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
  color: #d97706;
}

:root.light-theme .badge-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #dc2626;
}

:root.light-theme .flow-node .node-box {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .flow-node:hover .node-box {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:root.light-theme .node-name {
  color: #1e293b;
  font-weight: 600;
}

:root.light-theme .node-role {
  color: #94a3b8;
}

:root.light-theme .flow-line {
  background: #e5e7eb;
}

:root.light-theme .flow-particle {
  background: linear-gradient(90deg, transparent, #2563eb, transparent);
}
</style>
