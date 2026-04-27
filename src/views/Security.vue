<template>
  <div class="security-page">
    <header class="security-hero">
      <div class="security-hero__copy">
        <p class="security-kicker">Security Governance Center</p>
        <h1>安全治理中心</h1>
        <p class="security-desc">把密钥治理、MCP 安全、提示词注入防护和审计事件拆成独立工作分区，便于按风险面持续运营。</p>
      </div>
      <div class="security-hero__actions">
        <button class="btn btn-warning btn-sm" @click="runSecurityScan" :disabled="scanning">
          <span>⚡</span> {{ scanning ? '扫描中...' : '运行安全扫描' }}
        </button>
        <button class="btn btn-secondary btn-sm" @click="refreshData" :disabled="loading">
          <span>⟳</span> 刷新
        </button>
      </div>
    </header>

    <section class="security-overview">
      <article class="score-card">
        <div class="score-circle" :class="scoreClass">
          <svg viewBox="0 0 100 100" class="score-svg">
            <circle class="score-bg" cx="50" cy="50" r="45" />
            <circle class="score-progress" cx="50" cy="50" r="45" :style="scoreStyle" />
          </svg>
          <div class="score-value">{{ securityScore }}</div>
          <div class="score-label">安全评分</div>
        </div>
        <div class="score-details">
          <div class="detail-item">
            <span class="detail-label">当前风险等级</span>
            <span :class="['risk-badge', riskLevel]">{{ riskText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">最后刷新</span>
            <span class="detail-value">{{ lastRefreshText }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">待处理密钥问题</span>
            <span class="detail-value warning">{{ secrets.length }} 个</span>
          </div>
        </div>
      </article>

      <div class="quick-stats">
        <article class="stat-card">
          <span class="stat-icon">🔑</span>
          <div class="stat-content">
            <strong>{{ secretsDetected }}</strong>
            <span>密钥检测</span>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-icon">🔌</span>
          <div class="stat-content">
            <strong>{{ mcpConnections }}</strong>
            <span>MCP 连接</span>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-icon">⚠️</span>
          <div class="stat-content">
            <strong>{{ injectionAttemptsCount }}</strong>
            <span>注入尝试</span>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-icon">✅</span>
          <div class="stat-content">
            <strong>{{ passedChecks }}</strong>
            <span>通过检查</span>
          </div>
        </article>
      </div>
    </section>

    <div class="security-tabs">
      <button
        v-for="tab in securityTabs"
        :key="tab.key"
        type="button"
        class="security-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="setTab(tab.key)"
      >
        <strong>{{ tab.label }}</strong>
        <span>{{ tab.meta }}</span>
      </button>
    </div>

    <section v-if="activeTab === 'secrets'" class="security-stage security-stage--split">
      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">密钥治理</h3>
          <span :class="['status-badge', secretsStatus]">{{ secretsStatusText }}</span>
        </div>
        <div class="result-list">
          <div v-for="item in secrets" :key="item.id" class="result-item">
            <div class="result-left">
              <span :class="['result-icon', item.type]">{{ item.type === 'api_key' ? '🔑' : '🔐' }}</span>
              <div class="result-info">
                <strong>{{ item.type }} · {{ item.severity }}</strong>
                <span>{{ item.location }}</span>
              </div>
            </div>
            <div class="result-actions">
              <button class="btn btn-sm btn-secondary" @click="viewSecret(item)">查看</button>
              <button class="btn btn-sm btn-secondary" @click="ignoreSecret(item)">忽略</button>
              <button class="btn btn-sm btn-warning" @click="revokeSecret(item)">撤销</button>
            </div>
          </div>
          <div v-if="secrets.length === 0" class="empty-result">
            <span class="empty-icon">✅</span>
            <span class="empty-text">未发现密钥泄露风险</span>
          </div>
        </div>
      </article>

      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">治理建议</h3>
        </div>
        <div class="governance-list">
          <div class="governance-item">
            <strong>集中收口高危密钥</strong>
            <span>先处理高危和可直接撤销的凭证，再逐步补充忽略规则。</span>
          </div>
          <div class="governance-item">
            <strong>减少重复暴露面</strong>
            <span>把环境变量、示例配置和测试数据中的敏感片段统一脱敏。</span>
          </div>
          <div class="governance-item">
            <strong>建立轮换节奏</strong>
            <span>把密钥检测接入发布前检查，避免问题进入主干或交付物。</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'mcp'" class="security-stage security-stage--split">
      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">MCP 服务器审计</h3>
          <span class="status-badge info">已连接 {{ mcpServers.length }} 个</span>
        </div>
        <div class="mcp-list">
          <div class="mcp-item" v-for="server in mcpServers" :key="server.id">
            <div class="mcp-info">
              <span class="mcp-icon">🔌</span>
              <div class="mcp-details">
                <strong>{{ server.name }}</strong>
                <span>{{ server.url }}</span>
              </div>
            </div>
            <div class="mcp-status">
              <span :class="['status-dot', server.status]"></span>
              <span>{{ getStatusText(server.status) }}</span>
            </div>
          </div>
          <div v-if="mcpServers.length === 0" class="empty-result">
            <span class="empty-icon">ℹ️</span>
            <span class="empty-text">暂无 MCP 连接记录</span>
          </div>
        </div>
      </article>

      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">Hook 与边界控制</h3>
        </div>
        <div class="hook-list">
          <div class="hook-item">
            <div class="hook-info">
              <strong>Pre-Execute Hook</strong>
              <span>~/.openclaw/hooks/pre-execute.js</span>
            </div>
            <span class="hook-status active"></span>
          </div>
          <div class="hook-item">
            <div class="hook-info">
              <strong>Post-Execute Hook</strong>
              <span>~/.openclaw/hooks/post-execute.js</span>
            </div>
            <span class="hook-status active"></span>
          </div>
          <div class="governance-item">
            <strong>建议</strong>
            <span>后续可将 Hook 白名单、命令审计和审批策略统一并入同一治理面板。</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'injection'" class="security-stage security-stage--split">
      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">提示词注入防护</h3>
          <span :class="['status-badge', injectionStatus]">{{ injectionStatusText }}</span>
        </div>
        <div class="injection-log">
          <div class="log-item" v-for="log in injectionAttempts" :key="log.id">
            <span :class="['log-level', log.blocked ? 'success' : 'warning']">{{ log.blocked ? 'BLOCKED' : 'WARN' }}</span>
            <span class="log-message">{{ log.type }} · {{ log.source }}</span>
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          </div>
          <div v-if="injectionAttempts.length === 0" class="empty-result">
            <span class="empty-icon">✅</span>
            <span class="empty-text">无注入尝试记录</span>
          </div>
        </div>
      </article>

      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">相关安全事件</h3>
        </div>
        <div class="timeline">
          <div
            v-for="event in injectionEvents"
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
          <div v-if="injectionEvents.length === 0" class="empty-result">
            <span class="empty-icon">ℹ️</span>
            <span class="empty-text">暂无注入相关安全事件</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="security-stage">
      <article class="section-card">
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
          <div v-if="events.length === 0" class="empty-result">
            <span class="empty-icon">✅</span>
            <span class="empty-text">暂无安全事件</span>
          </div>
        </div>
      </article>

      <article class="section-card">
        <div class="section-header">
          <h3 class="section-title">信任评分构成</h3>
        </div>
        <div class="trust-grid">
          <div v-for="factor in trustFactors" :key="factor.name" class="trust-item">
            <div class="trust-header">
              <span class="trust-name">{{ factor.name }}</span>
              <span :class="['trust-score', factor.score >= 80 ? 'excellent' : factor.score >= 60 ? 'good' : 'warning']">
                {{ factor.score }}分
              </span>
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
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotification } from '@/composables/useNotification'
import { useSecurityStore } from '@/stores/security'

type SecurityTab = 'secrets' | 'mcp' | 'injection' | 'audit'

const route = useRoute()
const router = useRouter()
const securityStore = useSecurityStore()
const notification = useNotification()
const lastRefreshAt = ref<Date | null>(null)

const securityTabs = [
  { key: 'secrets', label: '密钥治理', meta: '凭证检测、忽略与撤销' },
  { key: 'mcp', label: 'MCP 安全', meta: '服务连接、Hook 与边界控制' },
  { key: 'injection', label: '注入防护', meta: '攻击尝试与拦截结果' },
  { key: 'audit', label: '审计事件', meta: '事件时间线与信任评分' },
] as const

const activeTab = computed<SecurityTab>(() => {
  const tab = route.query.tab
  if (tab === 'mcp' || tab === 'injection' || tab === 'audit') {
    return tab
  }
  return 'secrets'
})

const stats = computed(() => securityStore.stats)
const secrets = computed(() => securityStore.secrets)
const mcpServers = computed(() => securityStore.mcpServers)
const injectionAttempts = computed(() => securityStore.injectionAttempts)
const events = computed(() => securityStore.events)
const trustFactors = computed(() => securityStore.trustFactors)
const loading = computed(() => securityStore.loading)
const scanning = computed(() => securityStore.scanning)

const securityScore = computed(() => stats.value?.score || 0)
const secretsDetected = computed(() => stats.value?.secretsDetected || 0)
const mcpConnections = computed(() => stats.value?.mcpConnections || 0)
const injectionAttemptsCount = computed(() => stats.value?.injectionAttempts || 0)
const passedChecks = computed(() => stats.value?.passedChecks || 0)
const lastRefreshText = computed(() => {
  return lastRefreshAt.value
    ? lastRefreshAt.value.toLocaleString('zh-CN')
    : '尚未刷新'
})

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
    strokeDashoffset: offset,
  }
})

const riskLevel = computed(() => {
  if (securityScore.value >= 80) return 'low'
  if (securityScore.value >= 60) return 'medium'
  if (securityScore.value >= 40) return 'high'
  return 'critical'
})

const riskText = computed(() => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  }
  return map[riskLevel.value] || '未知'
})

const secretsStatus = computed(() => secretsDetected.value > 0 ? 'warning' : 'success')
const secretsStatusText = computed(() => secretsDetected.value > 0 ? `发现 ${secretsDetected.value} 个` : '安全')
const injectionStatus = computed(() => injectionAttemptsCount.value > 0 ? 'warning' : 'success')
const injectionStatusText = computed(() => injectionAttemptsCount.value > 0 ? `${injectionAttemptsCount.value} 次尝试` : '无攻击')
const injectionEvents = computed(() => {
  return events.value.filter(event =>
    /inject|prompt|注入/i.test(event.type) || /inject|prompt|注入/i.test(event.description),
  )
})

function setTab(tab: SecurityTab) {
  router.replace({
    path: '/security',
    query: tab === 'secrets' ? {} : { tab },
  })
}

async function runSecurityScan() {
  try {
    await securityStore.runSecurityScan()
    lastRefreshAt.value = new Date()
  } catch (e: any) {
    notification.error(`扫描失败：${e.message}`)
  }
}

async function refreshData() {
  await securityStore.fetchSecurityAudit()
  lastRefreshAt.value = new Date()
}

function viewSecret(item: any) {
  notification.info(`定位：${item.location}`)
}

async function ignoreSecret(item: any) {
  try {
    await securityStore.ignoreSecret(item.id)
    lastRefreshAt.value = new Date()
  } catch (e: any) {
    notification.error(`操作失败：${e.message}`)
  }
}

async function revokeSecret(item: any) {
  try {
    await securityStore.resolveSecret(item.id)
    lastRefreshAt.value = new Date()
  } catch (e: any) {
    notification.error(`操作失败：${e.message}`)
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getSeverityText(severity: string) {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  }
  return map[severity] || severity
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    connected: '运行中',
    disconnected: '未连接',
    error: '错误',
  }
  return map[status] || status
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.security-page {
  display: grid;
  gap: 18px;
  max-width: 1480px;
  margin: 0 auto;
  padding: 20px;
}

.security-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 24px 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), transparent 30%),
    var(--bg-panel);
  border: 1px solid var(--grid-line);
}

.security-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.security-hero h1 {
  margin: 0;
  font-size: 30px;
  color: var(--text-primary);
}

.security-desc {
  margin: 12px 0 0;
  max-width: 48rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.security-hero__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.security-overview {
  display: grid;
  grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.score-card,
.section-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 20px;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.score-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
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
  inset: 50% auto auto 50%;
  transform: translate(-50%, -56%);
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
}

.score-label {
  position: absolute;
  inset: auto auto 12px 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-tertiary);
}

.score-details {
  display: grid;
  gap: 12px;
  flex: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--grid-line-dim);
}

.detail-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.detail-label {
  color: var(--text-tertiary);
  font-size: 12px;
}

.detail-value {
  color: var(--text-primary);
  font-weight: 600;
}

.detail-value.warning {
  color: var(--color-warning);
}

.risk-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.risk-badge.low,
.status-badge.success {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success);
}

.risk-badge.medium,
.status-badge.info {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}

.risk-badge.high,
.risk-badge.critical,
.status-badge.warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-radius: 18px;
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  display: grid;
  gap: 4px;
}

.stat-content strong {
  color: var(--text-primary);
  font-size: 22px;
}

.stat-content span {
  color: var(--text-secondary);
  font-size: 13px;
}

.security-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.security-tab {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid var(--grid-line);
  border-radius: 18px;
  background: var(--bg-panel);
  text-align: left;
  color: var(--text-secondary);
  cursor: pointer;
}

.security-tab strong {
  color: var(--text-primary);
  font-size: 15px;
}

.security-tab span {
  font-size: 12px;
}

.security-tab.is-active {
  background: color-mix(in oklab, var(--color-success) 10%, var(--bg-panel));
  border-color: color-mix(in oklab, var(--color-success) 50%, var(--grid-line));
}

.security-stage {
  display: grid;
  gap: 16px;
}

.security-stage--split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--grid-line);
}

.section-title {
  margin: 0;
  color: var(--text-primary);
}

.result-list,
.mcp-list,
.injection-log,
.timeline,
.trust-grid,
.governance-list,
.hook-list {
  display: grid;
  gap: 12px;
  padding: 18px 20px 20px;
}

.result-item,
.mcp-item,
.hook-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.06);
}

.result-left,
.mcp-info,
.hook-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.result-info,
.mcp-details,
.hook-info {
  display: grid;
  gap: 4px;
}

.result-info strong,
.mcp-details strong,
.hook-info strong,
.governance-item strong,
.trust-name,
.timeline-title {
  color: var(--text-primary);
}

.result-info span,
.mcp-details span,
.hook-info span,
.governance-item span,
.timeline-description,
.timeline-source,
.timeline-time,
.trust-description {
  color: var(--text-secondary);
}

.result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.governance-item {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.06);
}

.mcp-status,
.timeline-meta,
.timeline-header,
.trust-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.status-dot,
.hook-status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.status-dot.connected,
.hook-status.active {
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}

.status-dot.error {
  background: var(--color-error);
}

.log-item,
.timeline-item {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.06);
}

.log-item {
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.log-level,
.timeline-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.log-level.success,
.timeline-badge.low {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success);
}

.log-level.warning,
.timeline-badge.medium,
.timeline-badge.high,
.timeline-badge.critical {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}

.timeline-item {
  grid-template-columns: 16px minmax(0, 1fr);
}

.timeline-marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  background: var(--text-tertiary);
}

.timeline-marker.low {
  background: var(--color-success);
}

.timeline-marker.medium,
.timeline-marker.high,
.timeline-marker.critical {
  background: var(--color-warning);
}

.trust-item {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.06);
}

.trust-score {
  font-weight: 700;
}

.trust-score.excellent {
  color: var(--color-success);
}

.trust-score.good {
  color: #60a5fa;
}

.trust-score.warning {
  color: var(--color-warning);
}

.trust-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  overflow: hidden;
}

.trust-fill {
  height: 100%;
  border-radius: inherit;
}

.trust-fill.excellent {
  background: var(--color-success);
}

.trust-fill.good {
  background: #60a5fa;
}

.trust-fill.warning {
  background: var(--color-warning);
}

.empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  color: var(--text-secondary);
}

@media (max-width: 1180px) {
  .security-overview,
  .security-stage--split {
    grid-template-columns: 1fr;
  }

  .quick-stats,
  .security-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .security-page {
    padding: 12px;
  }

  .security-hero {
    flex-direction: column;
  }

  .quick-stats,
  .security-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
