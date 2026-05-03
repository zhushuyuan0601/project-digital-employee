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
            <div class="obs-workflow-hero__accent">
              <span></span>
              <i></i>
            </div>
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
            v-for="role in roleList"
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
  anyConnected.value ? 'connected' : 'disconnected'
)
const gatewayStatusText = computed(() =>
  gatewayStatus.value === 'connected' ? '系统运行正常' : '连接中断'
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
  const [dashboardResult, activitiesResult] = await Promise.allSettled([
    getDashboard(),
    getActivities(5),
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
    label: '活跃任务',
    value: stats.value.activeTasks,
    icon: markRaw(Operation),
    color: '#2f81f7',
  },
  {
    label: '活跃 Agent',
    value: stats.value.activeAgents,
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
    label: '平均响应时间',
    value: stats.value.avgResponse,
    icon: markRaw(DataLine),
    color: '#2f81f7',
  },
  {
    label: '告警数',
    value: stats.value.alerts,
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
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 26px;
}

.obs-workflow-hero__badge {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  border-radius: 22px;
  color: #9ecbff;
  background:
    linear-gradient(180deg, rgba(34, 59, 110, 0.72), rgba(12, 22, 43, 0.92)),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(105, 166, 255, 0.32);
  box-shadow:
    inset 0 0 0 1px rgba(173, 215, 255, 0.12),
    0 0 30px rgba(44, 118, 255, 0.12);
}

.obs-workflow-hero__badge :deep(svg) {
  width: 30px;
  height: 30px;
}

.obs-card__title--workflow {
  margin: 0;
  font-size: 2.35rem;
  letter-spacing: 0.04em;
  line-height: 1.08;
}

.obs-workflow-hero__copy {
  min-width: 0;
}

.obs-workflow-hero__subtitle {
  margin: 8px 0 0;
  max-width: 56ch;
  color: color-mix(in oklab, var(--text-secondary) 88%, #dbeafe);
  font-size: 0.96rem;
  line-height: 1.6;
}

.obs-workflow-hero__accent {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.obs-workflow-hero__accent span {
  width: 88px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(40, 133, 255, 0.96), rgba(70, 172, 255, 0.2));
  box-shadow: 0 0 18px rgba(52, 140, 255, 0.45);
}

.obs-workflow-hero__accent i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2f81f7;
  box-shadow: 0 0 18px rgba(47, 129, 247, 0.85);
}

.obs-workflow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(210px, 1fr));
  gap: 34px;
  overflow-x: auto;
  padding: 26px 12px 14px;
  position: relative;
}

.obs-workflow__rail {
  position: absolute;
  top: 164px;
  left: 112px;
  right: 112px;
  height: 6px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(116, 185, 255, 0.5), rgba(89, 162, 255, 0.1));
  box-shadow:
    0 0 0 1px rgba(98, 162, 255, 0.08),
    0 0 22px rgba(47, 129, 247, 0.16);
  pointer-events: none;
  overflow: hidden;
}

.obs-workflow__rail::after {
  content: '';
  position: absolute;
  inset: -6px auto -6px -18%;
  width: 26%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(190, 230, 255, 0.9), rgba(255, 255, 255, 0));
  filter: blur(10px);
  opacity: 0.9;
  animation: workflowScan 5.4s linear infinite;
}

.obs-workflow__step-card {
  position: relative;
  min-height: 548px;
  padding: 28px 24px 30px;
  border-radius: 30px;
  border: 1px solid rgba(88, 138, 215, 0.28);
  background:
    linear-gradient(180deg, rgba(22, 35, 69, 0.84), rgba(10, 19, 40, 0.96)),
    radial-gradient(circle at 50% 12%, rgba(69, 134, 255, 0.2), transparent 34%);
  box-shadow:
    inset 0 0 0 1px rgba(162, 211, 255, 0.08),
    0 30px 55px rgba(4, 10, 24, 0.34),
    0 0 26px rgba(42, 121, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 1;
}

.obs-workflow__step-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(147, 205, 255, 0.14), transparent 22%),
    radial-gradient(circle at 50% 100%, rgba(60, 129, 255, 0.18), transparent 30%);
  pointer-events: none;
}

.obs-workflow__step-card::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -1px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(36, 110, 255, 0), rgba(64, 151, 255, 0.95), rgba(36, 110, 255, 0));
  box-shadow: 0 0 16px rgba(61, 146, 255, 0.45);
  pointer-events: none;
}

.obs-workflow__node {
  position: relative;
  margin-top: 8px;
  margin-bottom: 34px;
}

.obs-workflow__orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 182px;
  height: 182px;
  border-radius: 50%;
  border: 1px solid rgba(120, 170, 255, 0.34);
  background: radial-gradient(circle at center, rgba(67, 132, 255, 0.18), rgba(13, 27, 58, 0.18) 70%, transparent 72%);
  box-shadow:
    inset 0 0 0 1px rgba(173, 213, 255, 0.08),
    0 0 30px rgba(47, 129, 247, 0.18);
  animation: orbitPulse 3.8s ease-in-out infinite;
}

.obs-workflow__orbit::before {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(157, 201, 255, 0.3);
}

.obs-workflow__orbit::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1px solid rgba(130, 195, 255, 0.14);
  box-shadow: 0 0 36px rgba(69, 143, 255, 0.16);
}

.obs-workflow__circle {
  position: relative;
  width: 138px;
  height: 138px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 4.25rem;
  letter-spacing: 0.04em;
  color: #f8fbff;
  background:
    radial-gradient(circle at 30% 20%, rgba(177, 223, 255, 0.7), rgba(177, 223, 255, 0) 24%),
    linear-gradient(180deg, #67b0ff 0%, #2d79ff 30%, #1147c8 100%);
  border: 3px solid rgba(192, 230, 255, 0.54);
  box-shadow:
    inset 0 2px 8px rgba(255, 255, 255, 0.42),
    0 12px 28px rgba(17, 71, 200, 0.52),
    0 0 28px rgba(65, 143, 255, 0.4);
  animation: corePulse 2.8s ease-in-out infinite;
}

.obs-workflow__circle::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1px solid rgba(186, 228, 255, 0.28);
  opacity: 0.75;
  filter: blur(2px);
}

.obs-workflow__connector {
  position: absolute;
  top: 50%;
  left: calc(100% + 16px);
  display: flex;
  align-items: center;
  gap: 14px;
  transform: translateY(-50%);
  width: 82px;
  pointer-events: none;
}

.obs-workflow__connector-line {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(161, 212, 255, 0.84), rgba(78, 156, 255, 0.32));
  box-shadow: 0 0 18px rgba(68, 145, 255, 0.38);
  position: relative;
  overflow: hidden;
}

.obs-workflow__connector-line::after {
  content: '';
  position: absolute;
  inset: -8px auto -8px -30%;
  width: 45%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(193, 233, 255, 0.92), rgba(255, 255, 255, 0));
  filter: blur(8px);
  animation: connectorScan 2.8s linear infinite;
}

.obs-workflow__connector-dot {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 3px solid rgba(180, 223, 255, 0.82);
  background: radial-gradient(circle, #8ed0ff 0%, #3b85ff 58%, #0e3eaf 100%);
  box-shadow: 0 0 18px rgba(76, 154, 255, 0.7);
  animation: connectorPulse 2.2s ease-in-out infinite;
}

.obs-workflow__step-index {
  position: relative;
  margin-bottom: 16px;
  padding: 0 32px;
  color: #4aa2ff;
  font-family: var(--font-mono);
  font-size: 2.15rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.obs-workflow__step-index::before,
.obs-workflow__step-index::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 16px;
  height: 2px;
  border-radius: 999px;
  background: rgba(74, 162, 255, 0.55);
}

.obs-workflow__step-index::before {
  left: 0;
}

.obs-workflow__step-index::after {
  right: 0;
}

.obs-workflow__name {
  font-size: 2.35rem;
  font-weight: 900;
  line-height: 1.14;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}

.obs-workflow__role {
  margin-top: 12px;
  font-size: 1.38rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.obs-workflow__glyph {
  display: grid;
  place-items: center;
  margin-top: auto;
  width: 76px;
  height: 76px;
  border-radius: 24px;
  color: #2f81f7;
  background: linear-gradient(180deg, rgba(22, 44, 88, 0.68), rgba(10, 19, 40, 0.52));
  box-shadow:
    inset 0 0 0 1px rgba(112, 177, 255, 0.12),
    0 0 18px rgba(47, 129, 247, 0.08);
}

.obs-workflow__glyph :deep(svg) {
  width: 38px;
  height: 38px;
}

@keyframes corePulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      inset 0 2px 8px rgba(255, 255, 255, 0.42),
      0 12px 28px rgba(17, 71, 200, 0.52),
      0 0 28px rgba(65, 143, 255, 0.4);
  }
  50% {
    transform: scale(1.035);
    box-shadow:
      inset 0 2px 10px rgba(255, 255, 255, 0.52),
      0 16px 32px rgba(17, 71, 200, 0.6),
      0 0 40px rgba(96, 176, 255, 0.62);
  }
}

@keyframes orbitPulse {
  0%, 100% {
    box-shadow:
      inset 0 0 0 1px rgba(173, 213, 255, 0.08),
      0 0 30px rgba(47, 129, 247, 0.18);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(173, 213, 255, 0.14),
      0 0 42px rgba(76, 154, 255, 0.28);
  }
}

@keyframes connectorPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 18px rgba(76, 154, 255, 0.7);
  }
  50% {
    transform: scale(1.12);
    box-shadow: 0 0 28px rgba(132, 203, 255, 0.95);
  }
}

@keyframes connectorScan {
  0% {
    transform: translateX(0%);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  100% {
    transform: translateX(260%);
    opacity: 0;
  }
}

@keyframes workflowScan {
  0% {
    transform: translateX(0%);
    opacity: 0;
  }
  12% {
    opacity: 0.95;
  }
  100% {
    transform: translateX(470%);
    opacity: 0;
  }
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
}

@media (max-width: 900px) {
  .obs-dashboard {
    padding: 16px;
  }

  .obs-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .obs-workflow {
    grid-template-columns: repeat(3, minmax(220px, 1fr));
  }

  .obs-workflow__rail,
  .obs-workflow__connector {
    display: none;
  }

  .obs-card__title--workflow {
    font-size: 1.9rem;
  }

  .obs-workflow__step-card {
    min-height: 420px;
  }

  .obs-workflow__name {
    font-size: 1.7rem;
  }

  .obs-workflow__role {
    font-size: 1.05rem;
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
    font-size: 1.5rem;
  }

  .obs-workflow {
    grid-template-columns: 1fr;
    gap: 18px;
    padding-inline: 0;
  }

  .obs-workflow__step-card {
    min-height: auto;
    padding: 20px;
  }

  .obs-workflow__orbit {
    width: 126px;
    height: 126px;
  }

  .obs-workflow__circle {
    width: 96px;
    height: 96px;
    font-size: 2.8rem;
  }

  .obs-workflow__name {
    font-size: 1.45rem;
  }

  .obs-workflow__role {
    font-size: 0.98rem;
  }
}
</style>
