<template>
  <div class="dashboard-page">
    <section class="hero-grid">
      <article class="hero-card hero-card--intro">
        <div class="hero-topline">
          <span class="hero-chip">Live orchestration</span>
          <span class="hero-time">{{ currentDate }} · {{ currentTime }}</span>
        </div>

        <h2>用更清晰的方式管理多 Agent 协作节奏</h2>
        <p>
          从任务派发、资源压力到沟通链路，把真正影响执行效率的信息收敛到一个现代、轻盈、可持续阅读的工作台里。
        </p>

        <div class="hero-actions">
          <button type="button" class="hero-button hero-button--primary" @click="refreshData">
            <span class="hero-button__icon">
              <RefreshRight />
            </span>
            <span>刷新总览</span>
          </button>

          <router-link to="/task-center-2" class="hero-button hero-button--secondary">
            <span class="hero-button__icon">
              <Operation />
            </span>
            <span>进入任务中心</span>
          </router-link>

          <router-link to="/group-chat" class="hero-button hero-button--secondary">
            <span class="hero-button__icon">
              <Connection />
            </span>
            <span>打开群聊协作</span>
          </router-link>
        </div>

        <div class="hero-highlights">
          <div v-for="item in heroHighlights" :key="item.label" class="highlight-pill">
            <span class="highlight-pill__label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="hero-card hero-card--summary">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">今日概览</span>
            <h3>运行摘要</h3>
          </div>
          <div :class="['live-indicator', gatewayStatus]">
            <span class="live-indicator__dot"></span>
            {{ gatewayStatusText }}
          </div>
        </div>

        <div class="summary-board">
          <div class="summary-board__main">
            <span class="summary-board__label">当前在线 Agent</span>
            <strong>{{ stats.agents }}</strong>
            <p>协作链路稳定，指挥流与会话流可以继续推进。</p>
          </div>

          <div class="summary-board__list">
            <div v-for="item in summaryItems" :key="item.label" class="summary-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="dashboard-layout">
      <article class="surface-card surface-card--workflow">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">协作链路</span>
            <h3>任务流转</h3>
          </div>
          <span class="section-note">实时查看从发起到执行核心的交接路径</span>
        </div>

        <div class="workflow-track">
          <div
            v-for="(node, index) in flowNodes"
            :key="node.id"
            class="workflow-node"
            :class="`workflow-node--${node.type}`"
          >
            <div class="workflow-node__avatar">{{ node.avatar }}</div>
            <div class="workflow-node__copy">
              <strong>{{ node.name }}</strong>
              <span>{{ node.role }}</span>
            </div>
            <div v-if="index < flowNodes.length - 1" class="workflow-node__connector">
              <span class="workflow-node__line"></span>
              <span class="workflow-node__pulse"></span>
            </div>
          </div>
        </div>
      </article>

      <article class="surface-card surface-card--metrics">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">关键指标</span>
            <h3>工作台温度</h3>
          </div>
        </div>

        <div class="metric-feature">
          <span class="metric-feature__label">消息吞吐</span>
          <strong>{{ formatNumber(stats.messages) }}</strong>
          <p>比上一轮观察窗口提升 12.3%，对话链路保持活跃。</p>
        </div>

        <div class="metric-pair">
          <div class="metric-mini">
            <span>Token 总量</span>
            <strong>{{ formatNumber(stats.tokens) }}</strong>
            <em>成本走势平稳</em>
          </div>
          <div class="metric-mini">
            <span>请求数</span>
            <strong>{{ formatNumber(stats.requests) }}</strong>
            <em>高峰仍有余量</em>
          </div>
        </div>

        <div class="metric-insight">
          <span class="metric-insight__tag">建议</span>
          <p>当前更适合把分析型任务集中在白天时段，夜间优先保留巡检与异步执行。</p>
        </div>
      </article>
    </section>

    <section class="dashboard-layout">
      <article class="surface-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">资源健康</span>
            <h3>系统状态</h3>
          </div>
          <span class="section-note">资源读数用于快速判断是否需要介入</span>
        </div>

        <div class="health-grid">
          <div v-for="item in healthItems" :key="item.label" class="health-card">
            <div class="health-card__head">
              <span class="health-card__icon">
                <component :is="item.icon" />
              </span>
              <span class="health-card__label">{{ item.label }}</span>
            </div>
            <strong>{{ item.value }}</strong>
            <div class="health-bar">
              <span class="health-bar__fill" :style="{ width: `${item.progress}%` }"></span>
            </div>
            <p>{{ item.detail }}</p>
          </div>
        </div>
      </article>

      <article class="surface-card surface-card--actions">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">快捷入口</span>
            <h3>立即操作</h3>
          </div>
        </div>

        <div class="action-list">
          <router-link
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="action-link"
          >
            <span class="action-link__icon">
              <component :is="action.icon" />
            </span>
            <span class="action-link__body">
              <strong>{{ action.label }}</strong>
              <span>{{ action.meta }}</span>
            </span>
            <span class="action-link__arrow">
              <ArrowRight />
            </span>
          </router-link>
        </div>
      </article>
    </section>

    <section class="dashboard-layout dashboard-layout--equal">
      <article class="surface-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">协作准备度</span>
            <h3>角色看板</h3>
          </div>
        </div>

        <div class="lane-list">
          <div v-for="lane in readinessLanes" :key="lane.name" class="lane-row">
            <div class="lane-row__avatar">{{ lane.avatar }}</div>
            <div class="lane-row__copy">
              <strong>{{ lane.name }}</strong>
              <span>{{ lane.role }}</span>
            </div>
            <div class="lane-row__status" :class="lane.tone">{{ lane.status }}</div>
          </div>
        </div>
      </article>

      <article class="surface-card">
        <div class="section-head">
          <div>
            <span class="section-head__eyebrow">最近活动</span>
            <h3>操作动态</h3>
          </div>
        </div>

        <div class="activity-feed">
          <div v-for="item in activityItems" :key="`${item.time}-${item.message}`" class="activity-item">
            <div class="activity-item__time">{{ item.time }}</div>
            <div class="activity-item__content">
              <span class="activity-item__badge" :class="item.tone">{{ item.type }}</span>
              <p>{{ item.message }}</p>
            </div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue'
import {
  ArrowRight,
  Connection,
  Cpu,
  DataAnalysis,
  Document,
  Operation,
  RefreshRight,
  Timer,
  User
} from '@element-plus/icons-vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { storeToRefs } from 'pinia'

const multiAgentStore = useMultiAgentChatStore()
const { anyConnected } = storeToRefs(multiAgentStore)

const currentTime = ref('')
const currentDate = ref('')

const stats = ref({
  agents: 11,
  messages: 12435,
  tokens: 1256800,
  requests: 3421
})

const flowNodes = ref([
  { id: 1, name: '任务发起人', avatar: 'L', role: '需求输入', type: 'leader' },
  { id: 2, name: '任务秘书', avatar: 'U', role: '调度中枢', type: 'ops' },
  { id: 3, name: '研究员', avatar: 'R', role: '信息检索', type: 'research' },
  { id: 4, name: '产品经理', avatar: 'P', role: '需求梳理', type: 'product' },
  { id: 5, name: '研发工程师', avatar: 'D', role: '执行开发', type: 'engineering' },
  { id: 6, name: '执行核心', avatar: 'C', role: '最终产出', type: 'core' }
])

const quickActions = [
  { to: '/agents', label: '查看团队成员', meta: '切到人员与负载视图', icon: markRaw(User) },
  { to: '/task-center-2', label: '派发新任务', meta: '进入任务指挥中心', icon: markRaw(Operation) },
  { to: '/group-chat', label: '启动群聊协作', meta: '让多个角色同步上下文', icon: markRaw(Connection) },
  { to: '/logs', label: '检查运行日志', meta: '回看最近动作链路', icon: markRaw(Document) }
]

const activityItems = ref([
  { time: '14:32:15', type: '成功', tone: 'success', message: 'Agent “ceo” 已完成任务分发并回传摘要。' },
  { time: '14:30:42', type: '信息', tone: 'info', message: '为用户 001 初始化了新的多角色会话。' },
  { time: '14:28:33', type: '提醒', tone: 'warning', message: 'Token 使用量接近设定阈值，建议关注成本。' },
  { time: '14:25:18', type: '成功', tone: 'success', message: '工具 “file_read” 在最新任务中执行成功。' },
  { time: '14:22:05', type: '异常', tone: 'danger', message: 'Agent “researcher” 出现一次短暂连接超时。' }
])

const gatewayStatus = computed(() => (anyConnected.value ? 'connected' : 'disconnected'))

const gatewayStatusText = computed(() => {
  return gatewayStatus.value === 'connected' ? '运行正常' : '连接中断'
})

const heroHighlights = computed(() => [
  { label: '团队成员', value: `${stats.value.agents} 位` },
  { label: '消息吞吐', value: formatNumber(stats.value.messages) },
  { label: '请求节奏', value: `${formatNumber(stats.value.requests)} / 日` }
])

const summaryItems = computed(() => [
  { label: '累计 Token', value: formatNumber(stats.value.tokens) },
  { label: '请求总量', value: formatNumber(stats.value.requests) },
  { label: '在线状态', value: gatewayStatusText.value }
])

const healthItems = computed(() => [
  {
    label: '网关连接',
    value: gatewayStatus.value === 'connected' ? '稳定' : '待恢复',
    detail: gatewayStatus.value === 'connected' ? '消息与会话链路畅通。' : '建议检查 Gateway 与网络。',
    progress: gatewayStatus.value === 'connected' ? 92 : 36,
    icon: markRaw(Connection)
  },
  {
    label: 'CPU 负载',
    value: '25%',
    detail: '留有足够余量处理并发任务。',
    progress: 25,
    icon: markRaw(Cpu)
  },
  {
    label: '内存占用',
    value: '512 MB / 8 GB',
    detail: '缓存和会话上下文保持健康。',
    progress: 64,
    icon: markRaw(DataAnalysis)
  },
  {
    label: '运行时长',
    value: '2 天 14 小时',
    detail: '近期没有出现重启或异常抖动。',
    progress: 78,
    icon: markRaw(Timer)
  }
])

const readinessLanes = computed(() => [
  { name: '任务秘书', role: '统筹调度', avatar: 'U', status: '已就绪', tone: 'tone-success' },
  { name: '研究员', role: '竞品分析', avatar: 'R', status: '处理中', tone: 'tone-warning' },
  { name: '产品经理', role: '需求梳理', avatar: 'P', status: '待命', tone: 'tone-neutral' },
  { name: '研发工程师', role: '实现执行', avatar: 'D', status: '已就绪', tone: 'tone-success' }
])

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  })
}

function formatNumber(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`
  }

  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toLocaleString()
}

function refreshData() {
  updateClock()
  stats.value = {
    agents: stats.value.agents,
    messages: stats.value.messages + 38,
    tokens: stats.value.tokens + 12600,
    requests: stats.value.requests + 9
  }

  activityItems.value = [
    {
      time: currentTime.value,
      type: '信息',
      tone: 'info',
      message: '仪表盘已刷新，最新运行摘要已同步到当前视图。'
    },
    ...activityItems.value
  ].slice(0, 5)
}

let timerId = 0

onMounted(() => {
  updateClock()
  timerId = window.setInterval(updateClock, 1000)
})

onUnmounted(() => {
  window.clearInterval(timerId)
})
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
  padding-bottom: 12px;
}

.hero-grid,
.dashboard-layout {
  display: grid;
  gap: 18px;
}

.hero-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
}

.dashboard-layout {
  grid-template-columns: minmax(0, 1.28fr) minmax(280px, 0.9fr);
}

.dashboard-layout--equal {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hero-card,
.surface-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 30px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-surface) 92%, white 8%) 0%, var(--bg-panel) 100%);
  box-shadow: var(--shadow-md);
}

.hero-card {
  padding: 28px;
}

.surface-card {
  padding: 24px;
}

.hero-card::before,
.surface-card::before {
  content: '';
  position: absolute;
  inset: auto auto 0 0;
  width: 9rem;
  height: 9rem;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in oklab, var(--color-primary) 12%, transparent) 0%, transparent 72%);
  pointer-events: none;
}

.hero-card--intro {
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--color-primary-bg) 82%, white 18%) 0%, color-mix(in oklab, var(--bg-surface) 92%, white 8%) 100%);
}

.hero-topline,
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-topline {
  margin-bottom: 18px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-primary) 10%, white 90%);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-time {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.hero-card h2 {
  max-width: 14ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.55rem + 1.4vw, 3.15rem);
  line-height: 0.98;
  color: var(--text-primary);
}

.hero-card p {
  max-width: 56ch;
  margin: 14px 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 10px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base), background var(--transition-base);
}

.hero-button:hover {
  transform: translateY(-1px);
}

.hero-button--primary {
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 88%, white 12%) 0%, color-mix(in oklab, var(--color-secondary) 74%, white 26%) 100%);
  color: white;
  box-shadow: 0 14px 28px color-mix(in oklab, var(--color-primary) 20%, transparent);
}

.hero-button--secondary {
  background: color-mix(in oklab, var(--bg-surface) 88%, transparent);
  border-color: var(--border-subtle);
  color: var(--text-primary);
}

.hero-button__icon,
.action-link__icon,
.health-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
}

.hero-button__icon {
  width: 2.25rem;
  height: 2.25rem;
  background: color-mix(in oklab, white 22%, transparent);
}

.hero-button--secondary .hero-button__icon {
  background: color-mix(in oklab, var(--color-primary-bg) 84%, white 16%);
  color: var(--color-primary);
}

.hero-button__icon :deep(svg),
.action-link__icon :deep(svg),
.health-card__icon :deep(svg),
.action-link__arrow :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.hero-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.highlight-pill {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 120px;
  padding: 12px 14px;
  border: 1px solid color-mix(in oklab, var(--color-primary) 12%, var(--border-subtle));
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-surface) 84%, transparent);
}

.highlight-pill__label {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.highlight-pill strong {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1rem;
}

.section-head {
  margin-bottom: 18px;
}

.section-head h3 {
  margin: 4px 0 0;
  font-family: var(--font-display);
  font-size: 1.28rem;
  color: var(--text-primary);
}

.section-head__eyebrow {
  color: var(--text-muted);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-note {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  text-align: right;
}

.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-surface) 90%, transparent);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

.live-indicator__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.live-indicator.connected .live-indicator__dot {
  background: var(--color-success);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--color-success) 14%, transparent);
}

.live-indicator.disconnected .live-indicator__dot {
  background: var(--color-error);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--color-error) 10%, transparent);
}

.summary-board {
  display: grid;
  gap: 14px;
}

.summary-board__main {
  padding: 18px;
  border-radius: 24px;
  background:
    linear-gradient(145deg, color-mix(in oklab, var(--color-primary-bg) 78%, white 22%) 0%, color-mix(in oklab, var(--bg-surface) 94%, white 6%) 100%);
}

.summary-board__label {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.summary-board__main strong {
  display: block;
  margin-top: 10px;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 2.8rem;
  line-height: 1;
}

.summary-board__main p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.summary-board__list {
  display: grid;
  gap: 10px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  background: color-mix(in oklab, var(--bg-surface) 88%, transparent);
}

.summary-row span {
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.summary-row strong {
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.workflow-track {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 8px 4px 2px;
  overflow-x: auto;
}

.workflow-node {
  display: flex;
  align-items: center;
  min-width: max-content;
}

.workflow-node__avatar {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1.2rem;
  background: color-mix(in oklab, var(--color-primary-bg) 78%, white 22%);
  color: var(--color-primary);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
}

.workflow-node__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 134px;
  margin-left: 12px;
}

.workflow-node__copy strong {
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.workflow-node__copy span {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.workflow-node__connector {
  position: relative;
  width: 76px;
  height: 2px;
  margin: 0 16px;
}

.workflow-node__line,
.workflow-node__pulse {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.workflow-node__line {
  background: color-mix(in oklab, var(--color-primary) 18%, var(--border-subtle));
}

.workflow-node__pulse {
  width: 18px;
  background:
    linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--color-primary) 72%, white 28%) 100%);
  animation: move-pulse 2.8s ease-in-out infinite;
}

.workflow-node--leader .workflow-node__avatar {
  background: color-mix(in oklab, var(--color-accent) 16%, white 84%);
  color: var(--color-accent);
}

.workflow-node--core .workflow-node__avatar {
  background: color-mix(in oklab, var(--color-success) 18%, white 82%);
  color: var(--color-success);
}

.metric-feature {
  padding: 20px;
  border-radius: 24px;
  background:
    linear-gradient(155deg, color-mix(in oklab, var(--color-secondary) 12%, white 88%) 0%, color-mix(in oklab, var(--bg-surface) 94%, white 6%) 100%);
}

.metric-feature__label {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.metric-feature strong {
  display: block;
  margin-top: 10px;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 2.3rem;
  line-height: 1.05;
}

.metric-feature p,
.metric-insight p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.7;
}

.metric-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.metric-mini {
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-surface) 90%, transparent);
}

.metric-mini span,
.metric-mini em {
  display: block;
}

.metric-mini span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.metric-mini strong {
  display: block;
  margin: 8px 0 6px;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.metric-mini em {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-style: normal;
}

.metric-insight {
  margin-top: 12px;
  padding: 18px;
  border-radius: 22px;
  background: color-mix(in oklab, var(--color-accent) 8%, white 92%);
}

.metric-insight__tag {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-accent) 14%, white 86%);
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.health-card {
  padding: 18px;
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  background: color-mix(in oklab, var(--bg-surface) 90%, transparent);
}

.health-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.health-card__icon {
  width: 2.2rem;
  height: 2.2rem;
  background: color-mix(in oklab, var(--color-primary-bg) 82%, white 18%);
  color: var(--color-primary);
}

.health-card__label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.health-card strong {
  display: block;
  margin-top: 14px;
  color: var(--text-primary);
  font-size: 1.15rem;
}

.health-bar {
  height: 8px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-primary) 10%, var(--bg-base));
}

.health-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--color-primary) 82%, white 18%) 0%, color-mix(in oklab, var(--color-secondary) 72%, white 28%) 100%);
}

.health-card p {
  margin: 10px 0 0;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.7;
}

.surface-card--actions {
  display: flex;
  flex-direction: column;
}

.action-list {
  display: grid;
  gap: 10px;
}

.action-link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-surface) 90%, transparent);
  color: inherit;
  text-decoration: none;
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}

.action-link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--color-primary) 18%, var(--border-default));
  box-shadow: 0 14px 28px color-mix(in oklab, var(--color-primary) 10%, transparent);
}

.action-link__icon {
  width: 2.4rem;
  height: 2.4rem;
  background: color-mix(in oklab, var(--color-primary-bg) 82%, white 18%);
  color: var(--color-primary);
}

.action-link__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-link__body strong {
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.action-link__body span {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.action-link__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: var(--text-muted);
}

.lane-list,
.activity-feed {
  display: grid;
  gap: 10px;
}

.lane-row,
.activity-item {
  display: grid;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-surface) 90%, transparent);
}

.lane-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.lane-row__avatar {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 1rem;
  background: color-mix(in oklab, var(--color-primary-bg) 78%, white 22%);
  color: var(--color-primary);
  font-weight: 700;
}

.lane-row__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lane-row__copy strong {
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.lane-row__copy span {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.lane-row__status {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 700;
}

.tone-success {
  background: color-mix(in oklab, var(--color-success) 12%, white 88%);
  color: color-mix(in oklab, var(--color-success) 82%, black 18%);
}

.tone-warning {
  background: color-mix(in oklab, var(--color-warning) 16%, white 84%);
  color: color-mix(in oklab, var(--color-warning) 80%, black 20%);
}

.tone-neutral {
  background: color-mix(in oklab, var(--color-primary) 10%, white 90%);
  color: var(--text-secondary);
}

.activity-item {
  grid-template-columns: auto minmax(0, 1fr);
}

.activity-item__time {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.activity-item__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item__badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 700;
}

.activity-item__badge.success {
  background: color-mix(in oklab, var(--color-success) 12%, white 88%);
  color: color-mix(in oklab, var(--color-success) 84%, black 16%);
}

.activity-item__badge.info {
  background: color-mix(in oklab, var(--color-primary) 10%, white 90%);
  color: var(--color-primary);
}

.activity-item__badge.warning {
  background: color-mix(in oklab, var(--color-warning) 16%, white 84%);
  color: color-mix(in oklab, var(--color-warning) 84%, black 16%);
}

.activity-item__badge.danger {
  background: color-mix(in oklab, var(--color-error) 12%, white 88%);
  color: color-mix(in oklab, var(--color-error) 82%, black 18%);
}

.activity-item__content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.7;
}

@keyframes move-pulse {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0;
  }

  25%,
  75% {
    opacity: 1;
  }

  50% {
    transform: translateX(58px);
    opacity: 1;
  }
}

@media (max-width: 1180px) {
  .hero-grid,
  .dashboard-layout,
  .dashboard-layout--equal {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .hero-card,
  .surface-card {
    padding: 20px;
    border-radius: 24px;
  }

  .hero-card h2 {
    max-width: 100%;
  }

  .metric-pair,
  .health-grid {
    grid-template-columns: 1fr;
  }

  .workflow-track {
    display: grid;
    gap: 14px;
    padding-right: 0;
    overflow: visible;
  }

  .workflow-node {
    align-items: flex-start;
  }

  .workflow-node__connector {
    display: none;
  }

  .section-head,
  .hero-topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-note {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workflow-node__pulse {
    animation: none;
  }

  .hero-button,
  .action-link {
    transition: none;
  }
}
</style>
