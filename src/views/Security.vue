<template>
  <div class="security-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">🛡️</span>
          <span class="title-main">安全审计</span>
          <span class="title-sub">SECURITY AUDIT // 实时安全姿态监控</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-warning btn-sm" @click="runSecurityScan">
          <span>⚡</span> 运行安全扫描
        </button>
        <button class="btn btn-secondary btn-sm" @click="refreshData">
          <span>⟳</span> 刷新
        </button>
      </div>
    </div>

    <!-- 安全评分概览 -->
    <div class="security-overview">
      <div class="score-card">
        <div class="score-circle" :class="scoreClass">
          <svg viewBox="0 0 100 100" class="score-svg">
            <circle class="score-bg" cx="50" cy="50" r="45" />
            <circle
              class="score-progress"
              cx="50"
              cy="50"
              r="45"
              :style="scoreStyle"
            />
          </svg>
          <div class="score-value">{{ securityScore }}</div>
          <div class="score-label">安全评分</div>
        </div>
        <div class="score-details">
          <div class="detail-item">
            <span class="detail-label">最后扫描</span>
            <span class="detail-value">{{ new Date().toLocaleString('zh-CN') }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">风险等级</span>
            <span :class="['risk-badge', riskLevel]">{{ riskText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">待处理问题</span>
            <span class="detail-value warning">{{ secrets.length }} 个</span>
          </div>
        </div>
      </div>

      <!-- 快速统计 -->
      <div class="quick-stats">
        <div class="stat-card">
          <span class="stat-icon">🔑</span>
          <div class="stat-content">
            <span class="stat-value">{{ secretsDetected }}</span>
            <span class="stat-label">密钥检测</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🔌</span>
          <div class="stat-content">
            <span class="stat-value">{{ mcpConnections }}</span>
            <span class="stat-label">MCP 连接</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">⚠️</span>
          <div class="stat-content">
            <span class="stat-value">{{ injectionAttempts }}</span>
            <span class="stat-label">注入尝试</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✅</span>
          <span class="stat-content">
            <span class="stat-value">{{ passedChecks }}</span>
            <span class="stat-label">通过检查</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 安全模块 -->
    <div class="security-modules">
      <!-- 密钥检测 -->
      <div class="module-card">
        <div class="module-header">
          <div class="module-title">
            <span class="module-icon">🔑</span>
            <span>密钥/凭证检测</span>
          </div>
          <span :class="['status-badge', secretsStatus]">
            {{ secretsStatusText }}
          </span>
        </div>
        <div class="module-body">
          <div class="scan-result">
            <div class="result-item" v-for="item in secrets" :key="item.id">
              <div class="result-left">
                <span :class="['result-icon', item.type]">{{ item.type === 'api_key' ? '🔑' : '🔐' }}</span>
                <div class="result-info">
                  <span class="result-name">{{ item.type }} - {{ item.severity }}</span>
                  <span class="result-path">{{ item.location }}</span>
                </div>
              </div>
              <div class="result-actions">
                <button class="btn btn-sm btn-secondary" @click="viewSecret(item)">
                  查看
                </button>
                <button class="btn btn-sm btn-warning" @click="revokeSecret(item)">
                  撤销
                </button>
              </div>
            </div>
            <div v-if="secrets.length === 0" class="empty-result">
              <span class="empty-icon">✅</span>
              <span class="empty-text">未发现密钥泄露风险</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MCP 审计 -->
      <div class="module-card">
        <div class="module-header">
          <div class="module-title">
            <span class="module-icon">🔌</span>
            <span>MCP 服务器审计</span>
          </div>
          <span class="status-badge info">已连接 {{ mcpServers.length }} 个</span>
        </div>
        <div class="module-body">
          <div class="mcp-list">
            <div class="mcp-item" v-for="server in mcpServers" :key="server.id">
              <div class="mcp-info">
                <span class="mcp-icon">🔌</span>
                <div class="mcp-details">
                  <span class="mcp-name">{{ server.name }}</span>
                  <span class="mcp-url">{{ server.url }}</span>
                </div>
              </div>
              <div class="mcp-status">
                <span :class="['status-dot', server.status]"></span>
                <span class="status-text">{{ getStatusText(server.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 注入防护 -->
      <div class="module-card">
        <div class="module-header">
          <div class="module-title">
            <span class="module-icon">⚠️</span>
            <span>提示词注入防护</span>
          </div>
          <span :class="['status-badge', injectionStatus]">
            {{ injectionStatusText }}
          </span>
        </div>
        <div class="module-body">
          <div class="injection-log">
            <div class="log-item" v-for="log in injectionAttempts" :key="log.id">
              <span :class="['log-level', log.blocked ? 'success' : 'warning']">{{ log.blocked ? 'BLOCKED' : 'WARN' }}</span>
              <span class="log-message">{{ log.type }} - {{ log.source }}</span>
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div v-if="injectionAttempts.length === 0" class="empty-result">
              <span class="empty-icon">✅</span>
              <span class="empty-text">无注入尝试记录</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hook 配置文件 -->
      <div class="module-card">
        <div class="module-header">
          <div class="module-title">
            <span class="module-icon">⚙️</span>
            <span>Hook 配置文件</span>
          </div>
          <span class="status-badge success">已监控</span>
        </div>
        <div class="module-body">
          <div class="hook-list">
            <div class="hook-item">
              <div class="hook-info">
                <span class="hook-name">Pre-Execute Hook</span>
                <span class="hook-path">~/.openclaw/hooks/pre-execute.js</span>
              </div>
              <div class="hook-status">
                <span class="hook-status-dot active"></span>
              </div>
            </div>
            <div class="hook-item">
              <div class="hook-info">
                <span class="hook-name">Post-Execute Hook</span>
                <span class="hook-path">~/.openclaw/hooks/post-execute.js</span>
              </div>
              <div class="hook-status">
                <span class="hook-status-dot active"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全事件时间线 -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">安全事件时间线</h3>
        <button class="btn btn-secondary btn-sm">导出日志</button>
      </div>
      <div class="timeline">
        <div
          v-for="event in events"
          :key="event.id"
          class="timeline-item"
          :class="event.severity"
        >
          <div class="timeline-marker" :class="event.severity"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">{{ event.type }}</span>
              <span class="timeline-time">{{ formatTime(event.timestamp) }}</span>
            </div>
            <p class="timeline-description">{{ event.description }}</p>
            <div class="timeline-meta">
              <span :class="['timeline-badge', event.severity]">{{ getSeverityText(event.severity) }}</span>
              <span class="timeline-source">{{ event.status }}</span>
            </div>
          </div>
        </div>
        <div v-if="events.length === 0" class="empty-timeline">
          <span class="empty-icon">✅</span>
          <span class="empty-text">暂无安全事件</span>
        </div>
      </div>
    </div>

    <!-- 信任评分详情 -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">信任评分构成</h3>
      </div>
      <div class="trust-grid">
        <div
          v-for="factor in trustFactors"
          :key="factor.name"
          class="trust-item"
        >
          <div class="trust-header">
            <span class="trust-name">{{ factor.name }}</span>
            <span :class="['trust-score', factor.score >= 80 ? 'excellent' : factor.score >= 60 ? 'good' : 'warning']">{{ factor.score }}分</span>
          </div>
          <div class="trust-bar">
            <div
              class="trust-fill"
              :class="factor.score >= 80 ? 'excellent' : factor.score >= 60 ? 'good' : 'warning'"
              :style="{ width: (factor.score / factor.maxScore) * 100 + '%' }"
            ></div>
          </div>
          <div class="trust-description">{{ factor.name }}得分率 {{ ((factor.score / factor.maxScore) * 100).toFixed(0) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSecurityStore } from '@/stores/security'
import { useNotification } from '@/composables/useNotification'

const securityStore = useSecurityStore()
const notification = useNotification()

// 使用 store 中的数据
const stats = computed(() => securityStore.stats)
const secrets = computed(() => securityStore.secrets)
const mcpServers = computed(() => securityStore.mcpServers)
const injectionAttempts = computed(() => securityStore.injectionAttempts)
const events = computed(() => securityStore.events)
const trustFactors = computed(() => securityStore.trustFactors)

const securityScore = computed(() => stats.value?.score || 0)
const secretsDetected = computed(() => stats.value?.secretsDetected || 0)
const mcpConnections = computed(() => stats.value?.mcpConnections || 0)
const injectionAttemptsCount = computed(() => stats.value?.injectionAttempts || 0)
const passedChecks = computed(() => stats.value?.passedChecks || 0)

const scoreClass = computed(() => {
  if (securityScore.value >= 80) return 'excellent'
  if (securityScore.value >= 60) return 'good'
  if (securityScore.value >= 40) return 'warning'
  return 'danger'
})

const scoreStyle = computed(() => {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (securityScore.value / 100) * circumference
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset
  }
})

const riskLevel = computed(() => {
  if (securityScore.value >= 80) return 'low'
  if (securityScore.value >= 60) return 'medium'
  if (securityScore.value >= 40) return 'high'
  return 'critical'
})

const riskText = computed(() => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
  return map[riskLevel.value] || '未知'
})

const secretsStatus = computed(() => secretsDetected.value > 0 ? 'warning' : 'success')
const secretsStatusText = computed(() => secretsDetected.value > 0 ? `发现 ${secretsDetected.value} 个` : '安全')

const injectionStatus = computed(() => injectionAttemptsCount.value > 0 ? 'warning' : 'success')
const injectionStatusText = computed(() => injectionAttemptsCount.value > 0 ? `${injectionAttemptsCount.value} 次尝试` : '无攻击')

const runSecurityScan = async () => {
  try {
    await securityStore.runSecurityScan()
  } catch (e: any) {
    notification.error('扫描失败：' + e.message)
  }
}

const refreshData = async () => {
  await securityStore.fetchSecurityAudit()
}

const viewSecret = (item: any) => {
  console.log('Viewing secret:', item.name)
}

const revokeSecret = async (item: any) => {
  try {
    await securityStore.resolveSecret(item.id)
  } catch (e: any) {
    notification.error('操作失败：' + e.message)
  }
}

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 获取严重程度文本
const getSeverityText = (severity: string): string => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  }
  return map[severity] || severity
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    connected: '运行中',
    disconnected: '未连接',
    error: '错误'
  }
  return map[status] || status
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.security-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* ========== 页面头部 ========== */
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
  font-size: 12px;
  color: var(--color-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.title-icon {
  display: none;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ========== 安全概览 ========== */
.security-overview {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .security-overview {
    grid-template-columns: 1fr;
  }
}

.score-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.score-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.score-bg {
  fill: none;
  stroke: var(--bg-base);
  stroke-width: 10;
}

.score-progress {
  fill: none;
  stroke: var(--color-success);
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s;
}

.score-circle.excellent .score-progress { stroke: var(--color-success); }
.score-circle.good .score-progress { stroke: #00d9ff; }
.score-circle.warning .score-progress { stroke: var(--color-warning); }
.score-circle.danger .score-progress { stroke: var(--color-error); }

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.score-label {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--grid-line-dim);
}

.detail-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.detail-value.warning {
  color: var(--color-warning);
}

.risk-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.risk-badge.low {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.risk-badge.medium {
  background: rgba(0, 217, 255, 0.15);
  color: #00d9ff;
  border: 1px solid #00d9ff;
}

.risk-badge.high {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.risk-badge.critical {
  background: rgba(255, 51, 102, 0.15);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

/* ========== 快速统计 ========== */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
}

.stat-icon {
  font-size: 28px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.stat-label {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

/* ========== 安全模块 ========== */
.security-modules {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .security-modules {
    grid-template-columns: 1fr;
  }
}

.module-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.module-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-icon {
  font-size: 18px;
}

.module-title span {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.status-badge.success {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.status-badge.warning {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.status-badge.info {
  background: rgba(0, 217, 255, 0.15);
  color: #00d9ff;
  border: 1px solid #00d9ff;
}

.module-body {
  padding: 16px 20px;
}

/* ========== 扫描结果 ========== */
.scan-result, .mcp-list, .injection-log, .hook-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item, .mcp-item, .log-item, .hook-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
  transition: all 0.2s;
}

.result-item:hover, .mcp-item:hover, .log-item:hover, .hook-item:hover {
  border-color: var(--color-primary);
  background: rgba(0, 240, 255, 0.05);
}

.result-left, .mcp-info, .hook-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-icon {
  font-size: 20px;
}

.result-info, .mcp-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name, .mcp-name, .hook-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-path, .mcp-url, .hook-path {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.result-actions {
  display: flex;
  gap: 8px;
}

.mcp-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.active {
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-dot.warning {
  background: var(--color-warning);
}

.status-dot.inactive {
  background: var(--text-muted);
}

.status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ========== 注入日志 ========== */
.log-level {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.log-level.info {
  background: rgba(0, 217, 255, 0.15);
  color: #00d9ff;
}

.log-level.warning {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
}

.log-message {
  flex: 1;
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 12px;
}

.log-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== Hook 状态 ========== */
.hook-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hook-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.hook-status-dot.active {
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.hook-status-dot.warning {
  background: var(--color-warning);
}

/* ========== 章节卡片 ========== */
.section-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

/* ========== 时间线 ========== */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1px;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--grid-line);
}

.timeline-item {
  display: flex;
  gap: 16px;
  padding: 16px 0 16px 48px;
  position: relative;
}

.timeline-marker {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--bg-panel);
}

.timeline-marker.warning {
  background: var(--color-warning);
  box-shadow: 0 0 0 3px rgba(255, 170, 0, 0.2);
}

.timeline-marker.success {
  background: var(--color-success);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.2);
}

.timeline-marker.info {
  background: #00d9ff;
  box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.2);
}

.timeline-marker.error {
  background: var(--color-error);
  box-shadow: 0 0 0 3px rgba(255, 51, 102, 0.2);
}

.timeline-content {
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
  padding: 12px 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.timeline-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.timeline-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.timeline-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.timeline-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.timeline-badge.high {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
}

.timeline-badge.medium {
  background: rgba(0, 217, 255, 0.15);
  color: #00d9ff;
}

.timeline-badge.low {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
}

.timeline-source {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ========== 信任评分网格 ========== */
.trust-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.trust-item {
  padding: 16px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
}

.trust-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.trust-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.trust-score {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.trust-score.excellent { color: var(--color-success); }
.trust-score.good { color: #00d9ff; }
.trust-score.warning { color: var(--color-warning); }
.trust-score.danger { color: var(--color-error); }

.trust-bar {
  height: 6px;
  background: var(--bg-panel);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid var(--grid-line-dim);
}

.trust-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s;
}

.trust-fill.excellent { background: var(--color-success); }
.trust-fill.good { background: #00d9ff; }
.trust-fill.warning { background: var(--color-warning); }
.trust-fill.danger { background: var(--color-error); }

.trust-description {
  font-size: 11px;
  color: var(--text-muted);
}

/* ========== 通用按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 11px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-color: transparent;
  color: var(--text-inverse);
}

.btn-warning {
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-accent) 100%);
  border-color: transparent;
  color: var(--text-inverse);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

/* ========== 亮色主题 ========== */
:root.light-theme .page-header {
  border-bottom-color: #e5e7eb;
}

:root.light-theme .title-main {
  color: #1e293b;
  text-shadow: none;
  font-weight: 800;
}

:root.light-theme .score-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .module-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .module-header {
  border-bottom-color: #f3f4f6;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%);
}

:root.light-theme .section-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .timeline::before {
  background: #e5e7eb;
}

:root.light-theme .timeline-content {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .trust-item {
  background: #f9fafb;
  border-color: #e5e7eb;
}
</style>
