<template>
  <div class="obs-dashboard">
    <!-- Header -->
    <header class="obs-header">
      <div class="obs-header__left">
        <h1 class="obs-header__title">运行观测中心</h1>
        <span class="obs-header__subtitle">System Operations Dashboard</span>
      </div>
      <div class="obs-header__right">
        <div v-if="dataSourceLabel" class="obs-header__source">
          {{ dataSourceLabel }}
        </div>
        <div class="obs-header__status" :class="gatewayStatus">
          <span class="obs-header__dot"></span>
          {{ gatewayStatusText }}
        </div>
        <div class="obs-header__time">{{ currentTime }}</div>
      </div>
    </header>

    <!-- KPI Metrics Row -->
    <div class="obs-metrics">
      <div v-for="m in metrics" :key="m.label" class="obs-metric-card">
        <div class="obs-metric-card__header">
          <span class="obs-metric-card__icon" :style="{ color: m.color }">
            <component :is="m.icon" />
          </span>
          <span class="obs-metric-card__label">{{ m.label }}</span>
        </div>
        <div class="obs-metric-card__value">{{ m.value }}</div>
      </div>
    </div>

    <!-- Middle: Workflow + Workload Chart -->
    <div class="obs-middle">
      <!-- Agent Workflow -->
      <div class="obs-card">
        <div class="obs-workflow-hero">
          <div class="obs-workflow-hero__badge">
            <Connection />
          </div>
          <div class="obs-workflow-hero__copy">
            <h2 class="obs-card__title obs-card__title--workflow">Agent 协作流程</h2>
            <p class="obs-workflow-hero__subtitle">从任务接收、需求分析到结果验证与交付的全链路编排</p>
          </div>
        </div>
        <div class="obs-workflow">
          <div class="obs-workflow__rail"></div>
          <div
            v-for="(node, index) in flowNodes"
            :key="node.id"
            class="obs-workflow__step-card"
          >
            <div class="obs-workflow__node">
              <div class="obs-workflow__orbit">
                <div class="obs-workflow__circle">
                  <span>{{ node.avatar }}</span>
                </div>
              </div>
              <span v-if="index < flowNodes.length - 1" class="obs-workflow__connector">
                <i class="obs-workflow__connector-line"></i>
                <i class="obs-workflow__connector-dot"></i>
              </span>
            </div>
            <div class="obs-workflow__step-index">{{ String(index + 1).padStart(2, '0') }}</div>
            <span class="obs-workflow__name">{{ node.name }}</span>
            <span class="obs-workflow__role">{{ node.role }}</span>
            <span class="obs-workflow__glyph">
              <component :is="node.icon" />
            </span>
          </div>
        </div>
      </div>

      <!-- Workload Chart -->
      <div class="obs-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><DataLine /></span>
          工作负载趋势
        </h2>
        <div class="obs-chart">
          <div
            v-for="(bar, idx) in workloadBars"
            :key="idx"
            class="obs-chart__group"
          >
            <div
              class="obs-chart__bar obs-chart__bar--total"
              :style="{ height: bar.total + '%' }"
            ></div>
            <div
              class="obs-chart__bar obs-chart__bar--success"
              :style="{ height: bar.success + '%' }"
            ></div>
            <div
              class="obs-chart__bar obs-chart__bar--fail"
              :style="{ height: bar.fail + '%' }"
            ></div>
          </div>
        </div>
        <div class="obs-chart__legend">
          <span class="obs-chart__legend-item">
            <span class="obs-chart__dot obs-chart__dot--total"></span> 总任务
          </span>
          <span class="obs-chart__legend-item">
            <span class="obs-chart__dot obs-chart__dot--success"></span> 成功
          </span>
          <span class="obs-chart__legend-item">
            <span class="obs-chart__dot obs-chart__dot--fail"></span> 失败
          </span>
        </div>
      </div>
    </div>

    <div class="runtime-grid">
      <section class="obs-card runtime-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><Tickets /></span>
          Claude Runtime Run 历史
        </h2>
        <div class="run-list">
          <article v-for="run in recentRuns" :key="run.id" class="run-row">
            <div>
              <strong>{{ run.role_name || run.agent_id }}</strong>
              <span>{{ run.id }}</span>
            </div>
            <span class="run-status" :class="`run-status--${run.status}`">{{ run.status }}</span>
            <span>{{ formatRunDuration(run) }}</span>
          </article>
          <div v-if="recentRuns.length === 0" class="runtime-empty">暂无 Runtime run 记录。</div>
        </div>
      </section>

      <section class="obs-card runtime-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><Aim /></span>
          角色吞吐
        </h2>
        <div class="agent-stat-list">
          <article v-for="agent in runtimeAgentStats" :key="agent.agentId" class="agent-stat">
            <div>
              <strong>{{ agent.roleName }}</strong>
              <span>total {{ agent.total }} · avg {{ formatDuration(agent.avgDurationMs) }}</span>
            </div>
            <div class="agent-stat__bars">
              <span class="is-success">{{ agent.completed }}</span>
              <span class="is-running">{{ agent.running }}</span>
              <span class="is-danger">{{ agent.failed }}</span>
            </div>
          </article>
          <div v-if="runtimeAgentStats.length === 0" class="runtime-empty">暂无角色运行统计。</div>
        </div>
      </section>

      <section class="obs-card runtime-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><List /></span>
          失败原因聚合
        </h2>
        <div class="failure-list">
          <article v-for="item in failureReasons" :key="item.reason" class="failure-row">
            <span>{{ item.count }}</span>
            <p>{{ item.reason }}</p>
          </article>
          <div v-if="failureReasons.length === 0" class="runtime-empty">暂无失败聚合。</div>
        </div>
      </section>
    </div>

    <!-- Bottom: System Status / Roles / Logs -->
    <div class="obs-bottom">
      <!-- System Resources -->
      <div class="obs-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><Monitor /></span>
          系统状态
        </h2>
        <div class="obs-progress-list">
          <div
            v-for="item in systemResources"
            :key="item.label"
            class="obs-progress"
          >
            <div class="obs-progress__info">
              <span>{{ item.label }}</span>
              <span
                class="obs-progress__val"
                :style="{ color: item.barColor }"
                >{{ item.value }}</span
              >
            </div>
            <div class="obs-progress__track">
              <div
                class="obs-progress__fill"
                :style="{
                  width: item.percent + '%',
                  background: item.barColor,
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Status -->
      <div class="obs-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><UserFilled /></span>
          角色运行状态
        </h2>
        <div class="obs-roles">
          <div
            v-for="role in runtimeRoleList"
            :key="role.name"
            class="obs-role-item"
          >
            <div class="obs-role-item__left">
              <span class="obs-role-item__icon">
                <component :is="role.icon" />
              </span>
              <span class="obs-role-item__name">{{ role.name }}</span>
            </div>
            <div class="obs-role-item__right">
              <span
                class="obs-role-item__status"
                :class="role.active ? 'is-active' : 'is-idle'"
              >
                {{ role.active ? '运行中' : '空闲' }}
              </span>
              <span class="obs-role-item__count">{{ role.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Logs -->
      <div class="obs-card">
        <h2 class="obs-card__title">
          <span class="obs-card__icon"><List /></span>
          操作日志
        </h2>
        <div class="obs-timeline">
          <div
            v-for="log in recentLogs"
            :key="log.time + log.message"
            class="obs-timeline__item"
          >
            <div
              class="obs-timeline__dot"
              :style="{ borderColor: log.dotColor }"
            ></div>
            <div class="obs-timeline__content">
              <div class="obs-timeline__time">{{ log.time }}</div>
              <div class="obs-timeline__text">{{ log.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue'
import {
  Connection,
  DataLine,
  Monitor,
  UserFilled,
  List,
  Operation,
  Aim,
  Edit,
  Filter,
  View,
  Document,
  Search,
  Tickets,
  Setting,
  Select,
  CircleCheck,
} from '@element-plus/icons-vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { storeToRefs } from 'pinia'
import { getActivities, getDashboard, type ActivityItem } from '@/api/dashboard'
import { taskApi, type AgentRun, type RuntimeAgentStat } from '@/api/tasks'

const multiAgentStore = useMultiAgentChatStore()
const { anyConnected } = storeToRefs(multiAgentStore)

// ─── Clock ──────────────────────────────────────────────
const currentTime = ref('')

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

let timerId = 0
onMounted(() => {
  updateClock()
  timerId = window.setInterval(updateClock, 1000)
  loadDashboardData()
})
onUnmounted(() => {
  window.clearInterval(timerId)
})

// ─── Gateway Status ─────────────────────────────────────
const gatewayStatus = computed(() =>
  runtimeStatus.value?.healthy || anyConnected.value ? 'connected' : 'disconnected'
)
const gatewayStatusText = computed(() =>
  runtimeStatus.value?.healthy
    ? `Claude Runtime 就绪 · 运行 ${runtimeStatus.value.running} / 排队 ${runtimeStatus.value.queued}`
    : gatewayStatus.value === 'connected' ? '系统运行正常' : '连接中断'
)

// ─── Stats (reactive) ───────────────────────────────────
const stats = ref({
  activeTasks: 128,
  activeAgents: 11,
  successRate: '98.6%',
  avgResponse: '1.32s',
  alerts: 3,
  systemLoad: '65%',
})
const dataSource = ref<'workspace' | 'database' | 'mock' | 'mixed' | ''>('')
const runtimeStatus = ref<{
  healthy: boolean
  running: number
  queued: number
  maxConcurrency: number
  completedToday?: number
  failedToday?: number
  avgDurationMs?: number
  avgQueueWaitMs?: number
  successRate?: number
  agentStats?: RuntimeAgentStat[]
  failureReasons?: Array<{ reason: string; count: number }>
  recentRuns?: AgentRun[]
} | null>(null)
const dataSourceLabel = computed(() => {
  if (!dataSource.value) return ''
  const labels = {
    workspace: 'Workspace 数据',
    database: 'Database 数据',
    mixed: '混合数据',
    mock: '演示数据',
  }
  return labels[dataSource.value]
})

async function loadDashboardData() {
  const [dashboardResult, activitiesResult, runtimeResult] = await Promise.allSettled([
    getDashboard(),
    getActivities(5),
    taskApi.runtimeStatus(),
  ])

  if (dashboardResult.status === 'fulfilled' && dashboardResult.value.success) {
    const dashboard = dashboardResult.value
    stats.value = {
      ...stats.value,
      activeTasks: dashboard.stats.inProgress ?? stats.value.activeTasks,
      activeAgents: roleList.value.filter(role => role.active).length,
      successRate: dashboard.projects.length > 0 ? '100%' : stats.value.successRate,
      alerts: dashboard.stats.notStarted ?? stats.value.alerts,
    }
    dataSource.value = dashboard.dataSource || 'workspace'
  } else {
    dataSource.value = 'mock'
  }

  if (activitiesResult.status === 'fulfilled' && activitiesResult.value.success) {
    recentLogs.value = activitiesResult.value.activities.slice(0, 5).map(formatActivityLog)
    if (activitiesResult.value.dataSource === 'mixed' || dataSource.value === 'mock') {
      dataSource.value = activitiesResult.value.dataSource || dataSource.value
    }
  }

  if (runtimeResult.status === 'fulfilled') {
    runtimeStatus.value = runtimeResult.value.status
    stats.value = {
      ...stats.value,
      activeAgents: runtimeResult.value.status.running,
      activeTasks: Math.max(Number(stats.value.activeTasks || 0), runtimeResult.value.status.queued + runtimeResult.value.status.running),
      successRate: `${runtimeResult.value.status.successRate ?? 100}%`,
      avgResponse: formatDuration(runtimeResult.value.status.avgDurationMs || 0),
      alerts: runtimeResult.value.status.failedToday ?? stats.value.alerts,
      systemLoad: `${Math.min(100, Math.round((runtimeResult.value.status.running / Math.max(1, runtimeResult.value.status.maxConcurrency)) * 100))}%`,
    }
  }
}

function formatDuration(valueMs?: number | null) {
  const value = Number(valueMs || 0)
  if (!value) return '--'
  if (value < 1000) return `${value}ms`
  const seconds = Math.round(value / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function formatRunDuration(run: AgentRun) {
  if (run.started_at && run.completed_at) {
    return formatDuration((Number(run.completed_at) - Number(run.started_at)) * 1000)
  }
  if (run.status === 'queued') return '等待中'
  if (run.status === 'running') return '执行中'
  return '--'
}

function formatActivityLog(activity: ActivityItem) {
  return {
    time: activity.time || new Date((activity.createdAt || Date.now() / 1000) * 1000).toLocaleTimeString('zh-CN', { hour12: false }),
    message: activity.description || activity.task || activity.type,
    dotColor: activity.status === 'failed' ? '#da3633' : activity.status === 'completed' ? '#238636' : '#2f81f7',
  }
}

// ─── KPI Metrics ────────────────────────────────────────
const metrics = computed(() => [
  {
    label: '运行中',
    value: runtimeStatus.value?.running ?? stats.value.activeAgents,
    icon: markRaw(Operation),
    color: '#2f81f7',
  },
  {
    label: '排队中',
    value: runtimeStatus.value?.queued ?? 0,
    icon: markRaw(Aim),
    color: '#2f81f7',
  },
  {
    label: '成功率',
    value: stats.value.successRate,
    icon: markRaw(View),
    color: '#238636',
  },
  {
    label: '平均耗时',
    value: stats.value.avgResponse,
    icon: markRaw(DataLine),
    color: '#2f81f7',
  },
  {
    label: '今日完成',
    value: runtimeStatus.value?.completedToday ?? 0,
    icon: markRaw(List),
    color: '#d29922',
  },
  {
    label: '系统负载',
    value: stats.value.systemLoad,
    icon: markRaw(Monitor),
    color: '#2f81f7',
  },
])

const recentRuns = computed(() => runtimeStatus.value?.recentRuns?.slice(0, 12) || [])
const runtimeAgentStats = computed(() => runtimeStatus.value?.agentStats || [])
const failureReasons = computed(() => runtimeStatus.value?.failureReasons || [])

// ─── Flow Nodes ─────────────────────────────────────────
const flowNodes = ref([
  { id: 1, name: '任务接收', avatar: 'L', role: '需求输入', icon: markRaw(Document) },
  { id: 2, name: '需求分析', avatar: 'A', role: '意图解析', icon: markRaw(Search) },
  { id: 3, name: '任务规划', avatar: 'P', role: '策略制定', icon: markRaw(Tickets) },
  { id: 4, name: '执行处理', avatar: 'D', role: '核心执行', icon: markRaw(Setting) },
  { id: 5, name: '结果验证', avatar: 'V', role: '质量检查', icon: markRaw(Select) },
  { id: 6, name: '输出完成', avatar: 'C', role: '交付产出', icon: markRaw(CircleCheck) },
])

// ─── Workload Bars ──────────────────────────────────────
const workloadBars = ref([
  { total: 60, success: 55, fail: 5 },
  { total: 70, success: 65, fail: 5 },
  { total: 85, success: 80, fail: 5 },
  { total: 50, success: 48, fail: 2 },
  { total: 90, success: 82, fail: 8 },
  { total: 75, success: 70, fail: 5 },
  { total: 65, success: 62, fail: 3 },
  { total: 80, success: 75, fail: 5 },
])

// ─── System Resources ───────────────────────────────────
const systemResources = computed(() => [
  {
    label: 'CPU 使用率',
    value: '65%',
    percent: 65,
    barColor: '#2f81f7',
  },
  {
    label: '内存使用率',
    value: '72%',
    percent: 72,
    barColor: '#d29922',
  },
  {
    label: '磁盘使用率',
    value: '58%',
    percent: 58,
    barColor: '#2f81f7',
  },
  {
    label: '网络带宽',
    value: '31%',
    percent: 31,
    barColor: '#238636',
  },
])

// ─── Role List ──────────────────────────────────────────
const roleList = ref([
  {
    name: 'Orchestrator',
    icon: markRaw(Connection),
    active: true,
    count: 32,
  },
  {
    name: 'DataAnalyzer',
    icon: markRaw(DataLine),
    active: true,
    count: 28,
  },
  {
    name: 'ContentGenerator',
    icon: markRaw(Edit),
    active: true,
    count: 24,
  },
  {
    name: 'CodeExecutor',
    icon: markRaw(Monitor),
    active: false,
    count: 8,
  },
  {
    name: 'DataCollector',
    icon: markRaw(Filter),
    active: true,
    count: 16,
  },
  {
    name: 'Monitor',
    icon: markRaw(View),
    active: false,
    count: 4,
  },
])

const runtimeRoleList = computed(() => {
  if (!runtimeAgentStats.value.length) return roleList.value
  const iconByAgent: Record<string, any> = {
    xiaomu: markRaw(Connection),
    xiaoyan: markRaw(Search),
    xiaochan: markRaw(Document),
    xiaokai: markRaw(Monitor),
    xiaoce: markRaw(Select),
  }
  return runtimeAgentStats.value.map((agent) => ({
    name: agent.roleName || agent.agentId,
    icon: iconByAgent[agent.agentId] || markRaw(Aim),
    active: agent.running > 0 || agent.queued > 0,
    count: agent.total,
  }))
})

// ─── Recent Logs ────────────────────────────────────────
const recentLogs = ref([
  {
    time: '14:28:33',
    message: '任务 #9842 数据分析处理完成',
    dotColor: '#238636',
  },
  {
    time: '14:25:12',
    message: 'ContentGenerator 生成报告成功',
    dotColor: '#238636',
  },
  {
    time: '14:18:05',
    message: 'API 响应时间延长警告，自动扩容中',
    dotColor: '#d29922',
  },
  {
    time: '14:10:44',
    message: '接收新批次处理任务 (150 个子任务)',
    dotColor: '#2f81f7',
  },
  {
    time: '14:05:21',
    message: 'CodeExecutor 环境初始化完成',
    dotColor: '#238636',
  },
])
</script>

<style scoped>
/* ── Theme Variables ──────────────────────────────────── */
.obs-dashboard {
  --bg: #0d1117;
  --card-bg: #161b22;
  --border: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent-blue: #2f81f7;
  --accent-green: #238636;
  --accent-red: #da3633;
  --accent-yellow: #d29922;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;

  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: var(--bg);
  color: var(--text-primary);
  border-radius: 16px;
  min-height: calc(100vh - 48px);
}

/* ── Header ───────────────────────────────────────────── */
.obs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 24px;
}

.obs-header__left {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.obs-header__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.obs-header__subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.obs-header__right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.obs-header__source {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.obs-header__status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.obs-header__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-green);
}

.obs-header__status.disconnected .obs-header__dot {
  background: var(--accent-red);
}

.obs-header__time {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* ── Metrics Grid ─────────────────────────────────────── */
.obs-metrics {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.obs-metric-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s;
}

.obs-metric-card:hover {
  border-color: color-mix(in oklab, var(--accent-blue) 40%, var(--border));
}

.obs-metric-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.obs-metric-card__icon {
  display: inline-flex;
  align-items: center;
  font-size: 1.1rem;
}

.obs-metric-card__icon :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.obs-metric-card__label {
  white-space: nowrap;
}

.obs-metric-card__value {
  font-size: 2rem;
  font-weight: 800;
  font-family: var(--font-mono);
  line-height: 1;
}

/* ── Middle Section ───────────────────────────────────── */
.obs-middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.runtime-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.9fr) minmax(260px, 0.9fr);
  gap: 20px;
}

.runtime-card {
  min-height: 260px;
}

.run-list,
.agent-stat-list,
.failure-list {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}

.run-row,
.agent-stat,
.failure-row {
  display: grid;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid color-mix(in oklab, var(--border) 84%, transparent);
  border-radius: 10px;
  background: color-mix(in oklab, #fff 2.2%, transparent);
}

.run-row {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.run-row strong,
.agent-stat strong {
  display: block;
  color: var(--text-primary);
  font-size: 0.86rem;
}

.run-row span,
.agent-stat span {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.run-status {
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: color-mix(in oklab, var(--border) 60%, transparent);
}

.run-status--running,
.run-status--queued {
  color: var(--accent-blue);
}

.run-status--completed {
  color: var(--accent-green);
}

.run-status--failed,
.run-status--cancelled {
  color: var(--accent-red);
}

.agent-stat {
  grid-template-columns: minmax(0, 1fr) auto;
}

.agent-stat__bars {
  display: flex;
  gap: 6px;
}

.agent-stat__bars span {
  min-width: 24px;
  padding: 3px 6px;
  border-radius: 999px;
  text-align: center;
  background: color-mix(in oklab, var(--border) 52%, transparent);
}

.agent-stat__bars .is-success {
  color: var(--accent-green);
}

.agent-stat__bars .is-running {
  color: var(--accent-blue);
}

.agent-stat__bars .is-danger {
  color: var(--accent-red);
}

.failure-row {
  grid-template-columns: 28px minmax(0, 1fr);
}

.failure-row span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: var(--accent-red);
  background: color-mix(in oklab, var(--accent-red) 12%, transparent);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.failure-row p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.45;
}

.runtime-empty {
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.6;
}

/* ── Card Base ────────────────────────────────────────── */
.obs-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.obs-card__title {
  margin: 0 0 20px;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.obs-card__icon {
  display: inline-flex;
  align-items: center;
  color: var(--accent-blue);
  font-size: 1.2rem;
}

.obs-card__icon :deep(svg) {
  width: 1.2rem;
  height: 1.2rem;
}

/* ── Workflow ─────────────────────────────────────────── */
.obs-workflow-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in oklab, var(--border) 72%, transparent);
}

.obs-workflow-hero__badge {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  color: color-mix(in oklab, var(--accent-blue) 82%, var(--text-primary));
  background: color-mix(in oklab, var(--accent-blue) 11%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent-blue) 22%, var(--border));
}

.obs-workflow-hero__badge :deep(svg) {
  width: 18px;
  height: 18px;
}

.obs-card__title--workflow {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: 0;
  line-height: 1.25;
}

.obs-workflow-hero__copy {
  min-width: 0;
}

.obs-workflow-hero__subtitle {
  margin: 3px 0 0;
  max-width: 58ch;
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.5;
}

.obs-workflow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(104px, 1fr));
  gap: 10px;
  overflow: visible;
  padding: 2px 0 0;
}

.obs-workflow__rail {
  position: absolute;
  top: 43px;
  left: 52px;
  right: 52px;
  height: 1px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent-blue) 24%, var(--border));
  pointer-events: none;
}

.obs-workflow__rail::after {
  display: none;
}

.obs-workflow__step-card {
  position: relative;
  min-height: 138px;
  padding: 14px 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklab, var(--border) 82%, transparent);
  background: color-mix(in oklab, #fff 2.4%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 1;
}

.obs-workflow__step-card::before {
  display: none;
}

.obs-workflow__step-card::after {
  content: '';
  width: 22px;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent-blue) 48%, transparent);
  margin-top: 10px;
  order: 10;
}

.obs-workflow__node {
  position: relative;
  margin-bottom: 10px;
}

.obs-workflow__orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--accent-blue) 25%, var(--border));
  background: color-mix(in oklab, var(--accent-blue) 8%, var(--card-bg));
}

.obs-workflow__orbit::before {
  display: none;
}

.obs-workflow__orbit::after {
  display: none;
}

.obs-workflow__circle {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0;
  color: color-mix(in oklab, var(--text-primary) 82%, var(--accent-blue));
  background: color-mix(in oklab, var(--accent-blue) 13%, var(--card-bg));
  border: 1px solid color-mix(in oklab, var(--accent-blue) 28%, var(--border));
}

.obs-workflow__circle::after {
  display: none;
}

.obs-workflow__connector {
  position: absolute;
  top: 50%;
  left: calc(100% + 8px);
  display: flex;
  align-items: center;
  gap: 6px;
  transform: translateY(-50%);
  width: 30px;
  pointer-events: none;
}

.obs-workflow__connector-line {
  flex: 1;
  height: 1px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent-blue) 34%, var(--border));
  position: relative;
}

.obs-workflow__connector-line::after {
  display: none;
}

.obs-workflow__connector-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 0;
  background: color-mix(in oklab, var(--accent-blue) 58%, var(--text-secondary));
}

.obs-workflow__step-index {
  position: relative;
  margin-bottom: 7px;
  padding: 0;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0;
}

.obs-workflow__step-index::before,
.obs-workflow__step-index::after {
  display: none;
}

.obs-workflow__step-index::before {
  left: 0;
}

.obs-workflow__step-index::after {
  right: 0;
}

.obs-workflow__name {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
  color: var(--text-primary);
}

.obs-workflow__role {
  margin-top: 4px;
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.obs-workflow__glyph {
  display: grid;
  place-items: center;
  margin-top: 9px;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  color: color-mix(in oklab, var(--accent-blue) 70%, var(--text-secondary));
  background: color-mix(in oklab, var(--accent-blue) 7%, transparent);
}

.obs-workflow__glyph :deep(svg) {
  width: 14px;
  height: 14px;
}

/* ── Chart ────────────────────────────────────────────── */
.obs-chart {
  height: 180px;
  display: flex;
  align-items: flex-end;
  padding-bottom: 0;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  border-left: 1px solid var(--border);
  flex: 1;
}

.obs-chart__group {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 2px;
}

.obs-chart__bar {
  width: 12px;
  border-radius: 4px 4px 0 0;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.obs-chart__bar:hover {
  opacity: 1;
}

.obs-chart__bar--total {
  background: var(--accent-blue);
}

.obs-chart__bar--success {
  background: var(--accent-green);
}

.obs-chart__bar--fail {
  background: var(--accent-red);
}

.obs-chart__legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.obs-chart__legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.obs-chart__dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.obs-chart__dot--total {
  background: var(--accent-blue);
}

.obs-chart__dot--success {
  background: var(--accent-green);
}

.obs-chart__dot--fail {
  background: var(--accent-red);
}

/* ── Bottom Section ───────────────────────────────────── */
.obs-bottom {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* ── Progress Bars ────────────────────────────────────── */
.obs-progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.obs-progress__info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.obs-progress__val {
  font-family: var(--font-mono);
  font-weight: 700;
}

.obs-progress__track {
  height: 8px;
  background: color-mix(in oklab, #fff 5%, transparent);
  border-radius: 4px;
  overflow: hidden;
}

.obs-progress__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

/* ── Role List ────────────────────────────────────────── */
.obs-roles {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.obs-role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: color-mix(in oklab, #fff 2%, transparent);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.obs-role-item:hover {
  border-color: var(--border);
}

.obs-role-item__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.obs-role-item__icon {
  display: inline-flex;
  align-items: center;
  color: var(--accent-blue);
  font-size: 1rem;
}

.obs-role-item__icon :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.obs-role-item__name {
  font-weight: 600;
  font-size: 0.85rem;
}

.obs-role-item__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.obs-role-item__status {
  font-size: 0.8rem;
}

.obs-role-item__status.is-active {
  color: var(--accent-green);
}

.obs-role-item__status.is-idle {
  color: var(--text-secondary);
}

.obs-role-item__count {
  font-family: var(--font-mono);
  font-weight: 700;
  background: color-mix(in oklab, #fff 10%, transparent);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

/* ── Timeline ─────────────────────────────────────────── */
.obs-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.obs-timeline__item {
  display: flex;
  gap: 16px;
  position: relative;
}

.obs-timeline__item::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 20px;
  bottom: -16px;
  width: 2px;
  background: var(--border);
}

.obs-timeline__item:last-child::before {
  display: none;
}

.obs-timeline__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--card-bg);
  border: 2px solid var(--accent-blue);
  flex-shrink: 0;
  z-index: 1;
  margin-top: 2px;
}

.obs-timeline__content {
  flex: 1;
  background: color-mix(in oklab, #fff 2%, transparent);
  padding: 10px 14px;
  border-radius: 8px;
}

.obs-timeline__time {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 4px;
  font-family: var(--font-mono);
}

.obs-timeline__text {
  font-size: 0.8rem;
  color: var(--text-primary);
  line-height: 1.5;
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 1200px) {
  .obs-metrics {
    grid-template-columns: repeat(3, 1fr);
  }

  .obs-bottom {
    grid-template-columns: 1fr;
  }

  .obs-middle {
    grid-template-columns: 1fr;
  }

  .runtime-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .obs-dashboard {
    padding: 16px;
  }

  .obs-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .obs-workflow {
    grid-template-columns: repeat(3, minmax(118px, 1fr));
    gap: 10px;
  }

  .obs-workflow__rail,
  .obs-workflow__connector {
    display: none;
  }

  .obs-card__title--workflow {
    font-size: 1.05rem;
  }

  .obs-workflow__step-card {
    min-height: 136px;
  }

  .obs-workflow__name {
    font-size: 0.95rem;
  }

  .obs-workflow__role {
    font-size: 0.74rem;
  }
}

@media (max-width: 600px) {
  .obs-metrics {
    grid-template-columns: 1fr;
  }

  .obs-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .obs-header__left {
    flex-direction: column;
    gap: 4px;
  }

  .obs-workflow-hero {
    flex-direction: column;
  }

  .obs-card__title--workflow {
    font-size: 1rem;
  }

  .obs-workflow {
    grid-template-columns: 1fr;
    gap: 8px;
    padding-inline: 0;
  }

  .obs-workflow__step-card {
    min-height: auto;
    padding: 12px 14px;
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) 24px;
    grid-template-areas:
      "node index glyph"
      "node name glyph"
      "node role glyph";
    align-items: center;
    column-gap: 10px;
    text-align: left;
  }

  .obs-workflow__step-card::after {
    display: none;
  }

  .obs-workflow__node {
    grid-area: node;
    margin: 0;
  }

  .obs-workflow__step-index {
    grid-area: index;
    margin-bottom: 2px;
  }

  .obs-workflow__orbit {
    width: 44px;
    height: 44px;
  }

  .obs-workflow__circle {
    width: 34px;
    height: 34px;
    font-size: 0.84rem;
  }

  .obs-workflow__name {
    grid-area: name;
    font-size: 0.92rem;
  }

  .obs-workflow__role {
    grid-area: role;
    font-size: 0.72rem;
  }

  .obs-workflow__glyph {
    grid-area: glyph;
    margin-top: 0;
  }
}
</style>
