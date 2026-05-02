<template>
  <div class="cron-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">⏰</span>
          <span class="title-main">定时任务</span>
          <span class="title-sub">CRON SCHEDULER // 自然语言调度</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" @click="showCreateModal = true">
          <span>+</span> 新建任务
        </button>
      </div>
    </div>

    <!-- 概览统计 -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">📋</span>
          <span class="card-label">总任务数</span>
        </div>
        <div class="card-value">{{ totalTasks }}</div>
      </div>
      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">✅</span>
          <span class="card-label">已启用</span>
        </div>
        <div class="card-value">{{ enabledTasks }}</div>
      </div>
      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">⏸️</span>
          <span class="card-label">已暂停</span>
        </div>
        <div class="card-value">{{ disabledTasks }}</div>
      </div>
      <div class="overview-card">
        <div class="card-header">
          <span class="card-icon">✓</span>
          <span class="card-label">今日执行</span>
        </div>
        <div class="card-value">{{ todayExecutions }}</div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <div class="section-header">
        <h3 class="section-title">任务列表</h3>
        <div class="section-actions">
          <select v-model="filterStatus" class="filter-select">
            <option value="">全部状态</option>
            <option value="active">已启用</option>
            <option value="paused">已暂停</option>
          </select>
        </div>
      </div>

      <div class="task-list">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-item"
          :class="{ disabled: !task.enabled }"
        >
          <div class="task-main">
            <div class="task-header">
              <div class="task-info">
                <span class="task-name">{{ task.name }}</span>
                <span :class="['task-badge', task.enabled ? 'active' : 'paused']">
                  {{ task.enabled ? '● 运行中' : '● 已暂停' }}
                </span>
              </div>
              <div class="task-schedule">
                <span class="schedule-icon">⏰</span>
                <span class="schedule-text">{{ task.schedule }}</span>
                <span class="schedule-natural">{{ task.naturalLanguage }}</span>
              </div>
            </div>

            <div class="task-body">
              <p class="task-description">{{ task.description }}</p>
              <div class="task-meta">
                <span class="meta-item">
                  <span class="meta-label">Agent:</span>
                  <span class="meta-value">{{ task.agent }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">上次执行:</span>
                  <span class="meta-value">{{ task.lastRun }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">下次执行:</span>
                  <span class="meta-value highlight">{{ task.nextRun }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">执行次数:</span>
                  <span class="meta-value">{{ task.runCount }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="task-actions">
            <button
              :class="['btn btn-sm', task.enabled ? 'btn-warning' : 'btn-success']"
              @click="toggleTask(task)"
            >
              {{ task.enabled ? '⏸ 暂停' : '▶ 启用' }}
            </button>
            <button class="btn btn-sm btn-secondary" @click="runNow(task)">
              ⚡ 立即执行
            </button>
            <button class="btn btn-sm btn-secondary" @click="editTask(task)">
              ✏ 编辑
            </button>
            <button class="btn btn-sm btn-danger" @click="deleteTask(task)">
              ✕ 删除
            </button>
          </div>
        </div>

        <div v-if="filteredTasks.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <p class="empty-text">暂无定时任务</p>
          <button class="btn btn-primary" @click="showCreateModal = true">
            创建第一个任务
          </button>
        </div>
      </div>
    </div>

    <!-- 执行历史 -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">最近执行历史</h3>
        <button class="btn btn-secondary btn-sm">查看全部</button>
      </div>
      <div class="execution-list">
        <div
          v-for="exec in executionHistory"
          :key="exec.id"
          class="execution-item"
        >
          <div class="execution-left">
            <span :class="['execution-icon', exec.status]">
              {{ exec.status === 'success' ? '✓' : exec.status === 'failed' ? '✕' : '⏳' }}
            </span>
            <div class="execution-info">
              <span class="execution-task">{{ exec.taskName }}</span>
              <span class="execution-detail">{{ exec.agent }} • {{ exec.duration }}ms</span>
            </div>
          </div>
          <div class="execution-time">
            <span class="time">{{ exec.time }}</span>
            <span class="date">{{ exec.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑任务弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingTask ? '编辑任务' : '创建定时任务' }}</h3>
          <button class="modal-close" @click="showCreateModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>任务名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="如：每日数据备份"
            />
          </div>

          <div class="form-group">
            <label>调度计划</label>
            <div class="schedule-input-group">
              <input
                v-model="formData.schedule"
                type="text"
                class="form-input"
                placeholder="0 2 * * *"
              />
              <span class="schedule-sep">或</span>
              <input
                v-model="formData.naturalLanguage"
                type="text"
                class="form-input"
                placeholder="每天早上 9 点"
              />
            </div>
            <p class="form-hint">支持 Cron 表达式或自然语言描述</p>
          </div>

          <div class="form-group">
            <label>执行 Agent</label>
            <select v-model="formData.agent" class="form-input">
              <option value="">选择执行任务的 Agent</option>
              <option value="xiaomu">小呦</option>
              <option value="xiaokai">研发工程师</option>
              <option value="xiaochan">产品经理</option>
              <option value="xiaoyan">研究员</option>
            </select>
          </div>

          <div class="form-group">
            <label>任务描述</label>
            <textarea
              v-model="formData.description"
              class="form-input textarea"
              placeholder="描述任务的具体内容..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="formData.enabled" type="checkbox" />
              <span>立即启用此任务</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="saveTask">
            {{ editingTask ? '保存修改' : '创建任务' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCronStore } from '@/stores/cron'
import type { CronTask } from '@/api'
import { useNotification } from '@/composables/useNotification'

type CronTaskViewModel = CronTask & {
  schedule: string
  naturalLanguage: string
  description: string
  agent: string
  runCount: number
}

type CronExecutionViewModel = {
  id: string
  taskName: string
  status: 'success' | 'failed' | 'running'
  agent: string
  duration: number
  time: string
  date: string
}

const cronStore = useCronStore()
const notification = useNotification()

const filterStatus = ref('')
const showCreateModal = ref(false)
const editingTask = ref<CronTask | null>(null)

// 使用 store 中的数据
const stats = computed(() => cronStore.stats)
const tasks = computed(() => cronStore.tasks)
const taskViewModels = computed<CronTaskViewModel[]>(() =>
  tasks.value.map((task) => ({
    ...task,
    schedule: task.cron,
    naturalLanguage: task.cronDescription || cronStore.cronToHuman(task.cron),
    description: task.lastError || '定时执行任务',
    agent: task.agentName,
    runCount: task.successCount + task.failureCount,
  }))
)
const executionHistory = computed<CronExecutionViewModel[]>(() =>
  cronStore.executions.map((exec) => {
    const start = new Date(exec.startTime)
    const end = exec.endTime ? new Date(exec.endTime) : null
    return {
      id: exec.id,
      taskName: exec.taskName,
      status: exec.status === 'failure' ? 'failed' : exec.status,
      agent: tasks.value.find((task) => task.id === exec.taskId)?.agentName || '未知 Agent',
      duration: end ? Math.max(end.getTime() - start.getTime(), 0) : 0,
      time: start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: start.toLocaleDateString('zh-CN'),
    }
  })
)

// 表单数据
const formData = ref({
  name: '',
  schedule: '',
  naturalLanguage: '',
  agent: '',
  description: '',
  enabled: true
})

const totalTasks = computed(() => stats.value?.totalTasks || 0)
const enabledTasks = computed(() => stats.value?.enabledTasks || 0)
const disabledTasks = computed(() => stats.value?.disabledTasks || 0)
const todayExecutions = computed(() => stats.value?.todayExecutions || 0)

// 过滤后的任务列表
const filteredTasks = computed(() => {
  if (!filterStatus.value) return taskViewModels.value
  if (filterStatus.value === 'active') return taskViewModels.value.filter((task) => task.enabled)
  if (filterStatus.value === 'paused') return taskViewModels.value.filter((task) => !task.enabled)
  return taskViewModels.value
})

const toggleTask = async (task: CronTask) => {
  try {
    await cronStore.toggleTask(task.id)
  } catch (e: any) {
    notification.error('操作失败：' + e.message)
  }
}

const runNow = async (task: CronTask) => {
  try {
    await cronStore.executeTask(task.id)
    notification.success('任务已启动执行')
  } catch (e: any) {
    notification.error('执行失败：' + e.message)
  }
}

const editTask = (task: CronTask) => {
  editingTask.value = task
  formData.value = {
    name: task.name,
    schedule: task.cron,
    naturalLanguage: task.cronDescription || '',
    agent: task.agentId,
    description: '',
    enabled: task.enabled
  }
  showCreateModal.value = true
}

const deleteTask = async (task: CronTask) => {
  const confirmed = await notification.confirm(`确定要删除任务 "${task.name}" 吗？`, '删除任务')
  if (!confirmed) return

  try {
    await cronStore.deleteTask(task.id)
  } catch (e: any) {
    notification.error('删除失败：' + e.message)
  }
}

const saveTask = async () => {
  try {
    if (editingTask.value) {
      await cronStore.updateTask(editingTask.value.id, {
        name: formData.value.name,
        cron: formData.value.schedule,
        agentId: formData.value.agent,
        enabled: formData.value.enabled
      })
    } else {
      await cronStore.createTask({
        name: formData.value.name,
        cron: formData.value.schedule,
        agentId: formData.value.agent,
        enabled: formData.value.enabled
      })
    }
    showCreateModal.value = false
    editingTask.value = null
    await cronStore.fetchTasks()
  } catch (e: any) {
    notification.error('保存失败：' + e.message)
  }
}

const refreshData = async () => {
  await cronStore.fetchTasks()
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.cron-page {
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

/* ========== 概览卡片 ========== */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s;
}

.overview-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 20px;
}

.card-label {
  font-size: 12px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

/* ========== 任务区域 ========== */
.tasks-section {
  margin-bottom: 24px;
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
}

.section-actions {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 16px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-mono);
  cursor: pointer;
  outline: none;
}

.filter-select:focus {
  border-color: var(--color-primary);
}

/* ========== 任务列表 ========== */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 20px;
  transition: all 0.3s;
}

.task-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
}

.task-item.disabled {
  opacity: 0.6;
}

.task-item.disabled:hover {
  box-shadow: none;
}

.task-main {
  flex: 1;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.task-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.task-badge.active {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.task-badge.paused {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

.task-schedule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line);
  border-radius: 6px;
  font-family: var(--font-mono);
}

.schedule-icon {
  font-size: 14px;
}

.schedule-text {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
}

.schedule-natural {
  font-size: 11px;
  color: var(--text-muted);
}

.task-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.task-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: var(--font-mono);
}

.meta-label {
  color: var(--text-tertiary);
}

.meta-value {
  color: var(--text-secondary);
}

.meta-value.highlight {
  color: var(--color-primary);
  font-weight: 600;
}

.task-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ========== 执行历史 ========== */
.section-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
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

.execution-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.execution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
}

.execution-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.execution-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
}

.execution-icon.success {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
}

.execution-icon.failed {
  background: rgba(255, 51, 102, 0.15);
  color: var(--color-error);
}

.execution-icon.pending {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
}

.execution-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.execution-task {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.execution-detail {
  font-size: 11px;
  color: var(--text-muted);
}

.execution-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.execution-time .time {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.execution-time .date {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

/* ========== 弹窗样式 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--grid-line);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--grid-line);
}

/* ========== 表单样式 ========== */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-mono);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.1);
}

.form-input.textarea {
  resize: vertical;
  min-height: 80px;
}

.schedule-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule-input-group .form-input {
  flex: 1;
}

.schedule-sep {
  font-size: 12px;
  color: var(--text-muted);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ========== 通用按钮 ========== */
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

.btn-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #000;
}

.btn-warning {
  background: var(--color-warning);
  border-color: var(--color-warning);
  color: #000;
}

.btn-danger {
  background: var(--color-error);
  border-color: var(--color-error);
  color: #fff;
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .task-item {
    flex-direction: column;
  }

  .task-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
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

:root.light-theme .overview-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .task-item {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .task-item:hover {
  border-color: #2563eb;
}

:root.light-theme .section-card {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .execution-item {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .modal {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .form-input {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .form-input:focus {
  border-color: #2563eb;
  background: #ffffff;
}
</style>
