<template>
  <div class="task-board-page">
    <header class="board-header">
      <div>
        <p class="eyebrow">任务整体观测</p>
        <h1>任务看板</h1>
      </div>
      <div class="board-header__actions">
        <span class="runtime-pill" :class="{ 'runtime-pill--down': !runtimeStatus?.healthy }">
          <i></i>
          {{ runtimeStatusText }}
        </span>
        <button class="board-btn" type="button" :disabled="loading" @click="refreshBoard">
          <span class="ri-refresh-line"></span>
          刷新
        </button>
      </div>
    </header>

    <section class="board-metrics">
      <article v-for="metric in boardMetrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.hint }}</small>
      </article>
    </section>

    <section class="runtime-strip">
      <div>
        <span>运行中</span>
        <strong>{{ runtimeStatus?.running ?? 0 }}</strong>
      </div>
      <div>
        <span>排队</span>
        <strong>{{ runtimeStatus?.queued ?? 0 }}</strong>
      </div>
      <div>
        <span>并发上限</span>
        <strong>{{ runtimeStatus?.maxConcurrency ?? '--' }}</strong>
      </div>
      <div>
        <span>今日完成</span>
        <strong>{{ runtimeStatus?.completedToday ?? 0 }}</strong>
      </div>
      <div>
        <span>今日失败</span>
        <strong>{{ runtimeStatus?.failedToday ?? 0 }}</strong>
      </div>
    </section>

    <section class="kanban-board" aria-label="任务阶段看板">
      <article
        v-for="column in taskBoardColumns"
        :key="column.key"
        class="kanban-column"
        :class="`kanban-column--${column.tone}`"
      >
        <div class="kanban-column__head">
          <div>
            <h2>{{ column.title }}</h2>
            <p>{{ column.description }}</p>
          </div>
          <strong>{{ column.tasks.length }}</strong>
        </div>

        <div class="kanban-column__body">
          <div v-if="loading && column.tasks.length === 0" class="empty-card">任务加载中...</div>
          <div v-else-if="column.tasks.length === 0" class="empty-card">暂无任务</div>
          <button
            v-for="task in column.tasks"
            :key="task.id"
            type="button"
            class="kanban-card"
            :class="{
              'kanban-card--running': task.status === 'running',
              'kanban-card--failed': ['failed', 'cancelled'].includes(task.status),
            }"
            @click="openTask(task.id)"
          >
            <div class="kanban-card__top">
              <strong>{{ task.title }}</strong>
              <span class="status-chip" :class="`status-chip--${task.status}`">{{ statusText(task.status) }}</span>
            </div>
            <p>{{ task.description || '暂无任务描述' }}</p>
            <div class="kanban-card__meta">
              <span>{{ task.progress || 0 }}%</span>
              <span>{{ completedCount(task) }}/{{ taskSubtaskTotal(task) }} 节点</span>
              <span>{{ taskOutputCount(task) }} 成果</span>
              <span>{{ taskRuntimeLabel(task) }}</span>
            </div>
            <div class="mini-progress">
              <i :style="{ width: `${task.progress || 0}%` }"></i>
            </div>
            <div class="kanban-card__foot">
              <span>{{ taskBoardCardHint(task) }}</span>
              <small>{{ formatTime(task.updated_at) }}</small>
            </div>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { taskApi } from '@/api/tasks'
import { useTasksStore } from '@/stores/tasks'
import type { Task, TaskStatus } from '@/types/task'

type RuntimeStatus = {
  healthy: boolean
  running: number
  queued: number
  maxConcurrency: number
  completedToday?: number
  failedToday?: number
  successRate?: number
}

type TaskBoardTone = 'neutral' | 'warning' | 'active' | 'review' | 'success' | 'danger'
type TaskBoardColumn = {
  key: string
  title: string
  description: string
  statuses: TaskStatus[]
  tone: TaskBoardTone
  tasks: Task[]
}

const POLL_INTERVAL_MS = 15000

const router = useRouter()
const tasksStore = useTasksStore()
const runtimeStatus = ref<RuntimeStatus | null>(null)
const loading = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const taskStatusLabels: Record<TaskStatus, string> = {
  draft: '草稿',
  planning: '规划中',
  clarifying: '待澄清',
  dispatching: '待派发',
  running: '执行中',
  reviewing: '待验收',
  completed: '已完成',
  failed: '异常',
  cancelled: '已取消',
}

const taskBoardColumnDefs: Array<Omit<TaskBoardColumn, 'tasks'>> = [
  {
    key: 'planning',
    title: '待规划',
    description: '理解目标或等待补充信息',
    statuses: ['draft', 'planning', 'clarifying'],
    tone: 'warning',
  },
  {
    key: 'dispatch',
    title: '待确认/派发',
    description: '方案生成后等待进入执行',
    statuses: ['dispatching'],
    tone: 'neutral',
  },
  {
    key: 'running',
    title: '执行中',
    description: 'Agent 正在处理节点',
    statuses: ['running'],
    tone: 'active',
  },
  {
    key: 'reviewing',
    title: '待验收',
    description: '汇总、复盘或人工验收',
    statuses: ['reviewing'],
    tone: 'review',
  },
  {
    key: 'completed',
    title: '已完成',
    description: '已归档，可回看成果',
    statuses: ['completed'],
    tone: 'success',
  },
  {
    key: 'failed',
    title: '异常',
    description: '需要重试或人工处理',
    statuses: ['failed', 'cancelled'],
    tone: 'danger',
  },
]

const tasks = computed(() => tasksStore.tasks)
const activeTaskCount = computed(() => tasks.value.filter(task => !['completed', 'cancelled'].includes(task.status)).length)
const failedTaskCount = computed(() => tasks.value.filter(task => ['failed', 'cancelled'].includes(task.status)).length)
const runningTaskCount = computed(() => tasks.value.filter(task => task.status === 'running').length)

const runtimeStatusText = computed(() => {
  if (!runtimeStatus.value?.healthy) return 'Runtime 未就绪'
  return `Runtime 就绪 · 运行 ${runtimeStatus.value.running} / 排队 ${runtimeStatus.value.queued}`
})

const boardMetrics = computed(() => [
  {
    label: '全部任务',
    value: tasks.value.length,
    hint: '当前任务池',
  },
  {
    label: '活跃任务',
    value: activeTaskCount.value,
    hint: '未完成和未取消',
  },
  {
    label: '执行中',
    value: runningTaskCount.value,
    hint: '正在被 Agent 处理',
  },
  {
    label: '异常任务',
    value: failedTaskCount.value,
    hint: '需要人工介入',
  },
  {
    label: '成功率',
    value: `${runtimeStatus.value?.successRate ?? 100}%`,
    hint: 'Runtime 今日统计',
  },
])

const taskBoardColumns = computed<TaskBoardColumn[]>(() =>
  taskBoardColumnDefs.map(column => ({
    ...column,
    tasks: tasks.value
      .filter(task => column.statuses.includes(task.status))
      .sort((left, right) => Number(right.updated_at || 0) - Number(left.updated_at || 0)),
  })),
)

async function refreshBoard() {
  loading.value = true
  try {
    await Promise.all([
      tasksStore.fetchTasks(),
      refreshRuntimeStatus(),
    ])
  } finally {
    loading.value = false
  }
}

async function refreshRuntimeStatus() {
  try {
    const response = await taskApi.runtimeStatus()
    runtimeStatus.value = response.status
  } catch {
    runtimeStatus.value = { healthy: false, running: 0, queued: 0, maxConcurrency: 0 }
  }
}

function openTask(taskId: string) {
  router.push({ path: '/task-center-2', query: { task: taskId } })
}

function statusText(status: TaskStatus) {
  return taskStatusLabels[status] || status
}

function completedCount(task: Task) {
  return task.subtasks?.filter(subtask => ['completed', 'skipped'].includes(subtask.status)).length || task.completed_subtask_count || 0
}

function taskSubtaskTotal(task: Task) {
  return task.subtask_count || task.subtasks?.length || 0
}

function taskOutputCount(task: Task) {
  return task.output_count || task.outputs?.length || 0
}

function taskRuntimeLabel(task?: Task | null) {
  return task?.runtime_engine === 'codex' ? 'Codex' : 'Claude Code'
}

function taskBoardCardHint(task: Task) {
  if (task.status === 'failed') return '异常待处理'
  if (task.status === 'cancelled') return '任务已取消'
  if (task.status === 'completed') return '已归档'
  const failedCount = task.subtasks?.filter(subtask => subtask.status === 'failed').length || 0
  if (failedCount) return `${failedCount} 个节点失败`
  const blockedCount = task.subtasks?.filter(subtask => subtask.status === 'blocked').length || 0
  if (blockedCount) return `${blockedCount} 个节点阻塞`
  const runningCount = task.subtasks?.filter(subtask => ['queued', 'assigned', 'running'].includes(subtask.status)).length || 0
  if (runningCount) return `${runningCount} 个节点推进中`
  if (task.status === 'reviewing') return '等待验收归档'
  if (['planning', 'clarifying'].includes(task.status)) return '等待协作方案'
  if (task.status === 'dispatching') return '等待派发执行'
  return '点击进入指挥中心'
}

function formatTime(value?: number | null) {
  if (!value) return '--'
  return new Date(Number(value) * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

onMounted(() => {
  refreshBoard()
  refreshTimer = setInterval(refreshBoard, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped lang="scss">
.task-board-page {
  min-height: 100vh;
  padding: 24px;
  background: var(--bg-base);
  color: var(--text-primary);
}

.board-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
}

.board-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
}

.board-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.runtime-pill,
.board-btn {
  min-height: 36px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-size: 13px;
}

.runtime-pill i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2ea043;
  box-shadow: 0 0 0 4px rgba(46, 160, 67, 0.14);
}

.runtime-pill--down i {
  background: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
}

.board-btn {
  cursor: pointer;
}

.board-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.board-metrics,
.runtime-strip {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.board-metrics {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.metric-card,
.runtime-strip {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.metric-card {
  min-height: 104px;
  padding: 15px;
  display: grid;
  align-content: space-between;
  gap: 8px;
}

.metric-card span,
.runtime-strip span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.metric-card strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

.metric-card small {
  color: var(--text-secondary);
  font-size: 12px;
}

.runtime-strip {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 12px;
}

.runtime-strip div {
  min-height: 58px;
  border-radius: 8px;
  background: var(--bg-card);
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 0 12px;
}

.runtime-strip strong {
  font-size: 20px;
}

.kanban-board {
  display: grid;
  grid-template-columns: repeat(6, minmax(230px, 1fr));
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-board::-webkit-scrollbar {
  height: 7px;
}

.kanban-board::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.28);
}

.kanban-column {
  min-width: 230px;
  height: clamp(480px, calc(100vh - 260px), 680px);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kanban-column--active {
  border-color: rgba(var(--color-primary-rgb), 0.34);
}

.kanban-column--warning {
  border-color: rgba(245, 158, 11, 0.32);
}

.kanban-column--review {
  border-color: rgba(var(--color-secondary-rgb), 0.32);
}

.kanban-column--success {
  border-color: rgba(46, 160, 67, 0.32);
}

.kanban-column--danger {
  border-color: rgba(220, 38, 38, 0.32);
}

.kanban-column__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 13px;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-card);
}

.kanban-column__head h2 {
  margin: 0;
  font-size: 15px;
}

.kanban-column__head p {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.35;
}

.kanban-column__head strong {
  min-width: 28px;
  min-height: 28px;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.kanban-column__body {
  flex: 1;
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px;
}

.kanban-column__body::-webkit-scrollbar {
  width: 7px;
}

.kanban-column__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.24);
}

.empty-card {
  min-height: 94px;
  border: 1px dashed var(--border-default);
  border-radius: 8px;
  color: var(--text-tertiary);
  display: grid;
  place-items: center;
  font-size: 12px;
}

.kanban-card {
  width: 100%;
  display: grid;
  gap: 9px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  padding: 11px;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.kanban-card:hover {
  border-color: rgba(var(--color-primary-rgb), 0.44);
  background: color-mix(in srgb, var(--bg-card) 92%, rgba(var(--color-primary-rgb), 0.12));
  transform: translateY(-1px);
}

.kanban-card--running {
  border-color: rgba(var(--color-primary-rgb), 0.48);
  background: color-mix(in srgb, var(--bg-card) 86%, rgba(var(--color-primary-rgb), 0.16));
}

.kanban-card--failed {
  border-color: rgba(220, 38, 38, 0.48);
  background: color-mix(in srgb, var(--bg-card) 88%, rgba(220, 38, 38, 0.12));
}

.kanban-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.kanban-card__top strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.35;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.status-chip {
  min-height: 22px;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  white-space: nowrap;
}

.status-chip--failed,
.status-chip--cancelled {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.status-chip--completed {
  background: rgba(46, 160, 67, 0.12);
  color: #2ea043;
}

.status-chip--reviewing {
  background: rgba(var(--color-secondary-rgb), 0.12);
  color: var(--color-secondary);
}

.kanban-card p {
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.kanban-card__meta,
.kanban-card__foot {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  color: var(--text-tertiary);
  font-size: 11px;
}

.kanban-card__meta span {
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-panel);
  display: inline-flex;
  align-items: center;
}

.mini-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-panel);
}

.mini-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.kanban-card__foot {
  justify-content: space-between;
}

.kanban-card__foot small {
  color: var(--text-tertiary);
  font-size: 11px;
}

@media (max-width: 1180px) {
  .board-metrics,
  .runtime-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .task-board-page {
    padding: 16px;
  }

  .board-header {
    display: grid;
  }

  .board-header__actions {
    justify-content: flex-start;
  }

  .board-metrics,
  .runtime-strip {
    grid-template-columns: 1fr;
  }

  .kanban-board {
    grid-template-columns: repeat(6, minmax(220px, 84vw));
  }

  .kanban-column {
    height: min(620px, calc(100vh - 220px));
    min-height: 420px;
  }
}
</style>
