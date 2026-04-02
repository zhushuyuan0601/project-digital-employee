<template>
  <!-- 未登录提示 -->
  <div v-if="!mcAuth.isAuthenticated" class="task-board">
    <div class="auth-overlay">
      <div class="auth-panel">
        <div class="auth-icon">🔐</div>
        <h2>需要登录 Mission Control</h2>
        <p>请先完成全局登录，系统将自动同步认证状态</p>
        <p class="auth-url">后端地址: http://localhost:3100</p>
        <el-button type="primary" @click="showGlobalAuth">
          打开登录对话框
        </el-button>
      </div>
    </div>
  </div>

  <!-- 已登录显示任务看板 -->
  <div v-else class="task-board">
    <!-- 顶部标题栏 -->
    <div class="board-header">
      <div class="header-left">
        <h1 class="board-title">
          <span class="title-icon">◈</span>
          任务指挥中心
        </h1>
        <p class="board-subtitle">实时追踪团队任务进度与 Agent 协作状态</p>
      </div>

      <div class="header-actions">
        <!-- 项目筛选 -->
        <el-select
          v-model="selectedProject"
          placeholder="选择项目"
          class="filter-select"
          clearable
          @change="onProjectChange"
        >
          <el-option
            v-for="project in projects"
            :key="project.id"
            :label="project.name"
            :value="project.id"
          />
        </el-select>

        <!-- Agent 筛选 -->
        <el-select
          v-model="selectedAgent"
          placeholder="选择 Agent"
          class="filter-select"
          clearable
          @change="onAgentChange"
        >
          <el-option
            v-for="agent in targetAgents"
            :key="agent.name"
            :label="agent.displayName"
            :value="agent.name"
          >
            <span class="agent-option">
              <span
                class="agent-dot"
                :style="{ backgroundColor: agent.color }"
              />
              {{ agent.displayName }}
            </span>
          </el-option>
        </el-select>

        <el-button
          type="primary"
          class="create-btn"
          @click="showCreateDialog = true"
        >
          <span class="btn-icon">+</span>
          新建任务
        </el-button>

        <el-button
          :loading="isLoading"
          class="refresh-btn"
          @click="refresh"
        >
          <span class="btn-icon">↻</span>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="store.error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ store.error }}</span>
      <el-button size="small" @click="store.loadBoardData()">重试</el-button>
    </div>

    <!-- Agent 状态栏 -->
    <div v-if="store.agents.length > 0" class="debug-info" style="padding: 4px 24px; font-size: 11px; color: #666;">
      已连接 {{ store.agents.length }} 个 Agent: {{ store.agents.map(a => a.name).join(', ') }}
    </div>
    <div class="agent-status-bar">
      <div class="status-bar-label">
        <span class="bracket">[</span>
        Agent 状态
        <span class="bracket">]</span>
      </div>
      <div class="agent-status-list">
        <div
          v-for="agent in targetAgents"
          :key="agent.name"
          class="agent-status-item"
          :class="`status--${getAgentStatus(agent.name)}`"
          @click="setAgentFilter(agent.name)"
        >
          <div class="agent-avatar-small" :style="{ backgroundColor: agent.color + '20' }">
            <img v-if="agent.icon" :src="agent.icon" :alt="agent.displayName" />
            <span v-else class="avatar-fallback" :style="{ color: agent.color }">
              {{ agent.displayName.charAt(0) }}
            </span>
          </div>
          <div class="agent-info">
            <span class="agent-name">{{ agent.displayName }}</span>
            <span class="agent-role">{{ agent.role }}</span>
          </div>
          <span class="status-indicator" :class="`indicator--${getAgentStatus(agent.name)}`">
            {{ getStatusText(getAgentStatus(agent.name)) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 看板主体 -->
    <div class="board-main">
      <div
        v-for="column in boardColumns"
        :key="column.key"
        class="board-column"
        :class="`column--${column.key}`"
        @dragover.prevent
        @drop="onDrop($event, column.key)"
      >
        <!-- 列标题 -->
        <div class="column-header" :style="{ borderColor: column.color }">
          <span class="column-title">{{ column.title }}</span>
          <span class="column-count">{{ tasksByStatus[column.key]?.length || 0 }}</span>
        </div>

        <!-- 任务列表 -->
        <div class="column-tasks">
          <div
            v-for="task in tasksByStatus[column.key]"
            :key="task.id"
            class="task-card"
            :class="{
              'is-selected': selectedTask?.id === task.id,
              [`priority--${task.priority}`]: true,
            }"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @click="selectTask(task)"
          >
            <!-- 任务标题 -->
            <div class="task-header">
              <span v-if="task.ticket_ref" class="task-ref">{{ task.ticket_ref }}</span>
              <span class="task-title">{{ task.title }}</span>
            </div>

            <!-- 任务描述预览 -->
            <p v-if="task.description" class="task-desc">
              {{ task.description.slice(0, 100) }}...
            </p>

            <!-- 任务元信息 -->
            <div class="task-meta">
              <!-- 优先级 -->
              <el-tag
                size="small"
                :type="getPriorityType(task.priority)"
                class="priority-tag"
              >
                {{ getPriorityLabel(task.priority) }}
              </el-tag>

              <!-- 分配给 -->
              <div v-if="task.assigned_to" class="task-assignee">
                <span
                  class="assignee-dot"
                  :style="{ backgroundColor: getAgentDisplay(task.assigned_to).color }"
                />
                <span class="assignee-name">
                  {{ getAgentDisplay(task.assigned_to).displayName }}
                </span>
              </div>
            </div>

            <!-- 底部信息 -->
            <div class="task-footer">
              <span v-if="task.project_name" class="project-tag">
                {{ task.project_name }}
              </span>
              <span class="task-date">
                {{ formatDate(task.created_at) }}
              </span>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!tasksByStatus[column.key]?.length" class="column-empty">
            <span class="empty-icon">◌</span>
            <span>暂无任务</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="selectedTask?.title || '任务详情'"
      size="600px"
      class="task-drawer"
      :before-close="() => selectTask(null)"
    >
      <TaskDetail
        v-if="selectedTask"
        :task="selectedTask"
        :comments="comments[selectedTask.id] || []"
        :messages="getTaskMessages(selectedTask)"
        @status-change="onStatusChange"
        @assign="onAssign"
      />
    </el-drawer>

    <!-- 新建任务对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建任务"
      width="500px"
      class="create-dialog"
    >
      <el-form :model="newTask" label-position="top">
        <el-form-item label="任务标题">
          <el-input v-model="newTask.title" placeholder="输入任务标题" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input
            v-model="newTask.description"
            type="textarea"
            :rows="3"
            placeholder="输入任务描述"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="newTask.priority" placeholder="选择优先级">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配给">
          <el-select v-model="newTask.assigned_to" placeholder="选择 Agent" clearable>
            <el-option
              v-for="agent in targetAgents"
              :key="agent.name"
              :label="agent.displayName"
              :value="agent.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="newTask.project_id" placeholder="选择项目" clearable>
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createNewTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTaskBoardStore } from '@/stores/taskBoard'
import { useMCAuthStore } from '@/stores/mcAuth'
import { TARGET_AGENTS, PRIORITY_CONFIG } from '@/types/task-board'
import type { Task, TaskStatus } from '@/types/task-board'
import TaskDetail from './task-board/TaskDetail.vue'

const store = useTaskBoardStore()
const mcAuth = useMCAuthStore()

// 显示全局登录对话框
function showGlobalAuth() {
  window.dispatchEvent(new CustomEvent('show-mc-auth'))
}

// ========== State ==========
const drawerVisible = computed({
  get: () => !!store.selectedTask,
  set: (val) => {
    if (!val) store.selectTask(null)
  },
})

const showCreateDialog = ref(false)
const newTask = ref<Partial<Task>>({
  title: '',
  description: '',
  priority: 'medium',
  assigned_to: '',
  project_id: undefined,
})

// ========== Computed ==========
const tasksByStatus = computed(() => store.tasksByStatus)
const boardColumns = computed(() => store.boardColumns)
const projects = computed(() => store.projects)
const targetAgents = computed(() => TARGET_AGENTS)
const selectedTask = computed(() => store.selectedTask)
const comments = computed(() => store.comments)
const isLoading = computed(() => store.isLoading)

const selectedProject = computed({
  get: () => store.selectedProject,
  set: (val) => store.setProjectFilter(val),
})

const selectedAgent = computed({
  get: () => store.selectedAgent,
  set: (val) => store.setAgentFilter(val),
})

// ========== Methods ==========
function getAgentStatus(agentName: string) {
  return store.getAgentStatus(agentName)
}

function getAgentDisplay(agentName: string) {
  return store.getAgentDisplay(agentName)
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    offline: '离线',
    idle: '空闲',
    busy: '忙碌',
    error: '错误',
  }
  return statusMap[status] || status
}

function getPriorityType(priority: string): string {
  const typeMap: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  return typeMap[priority] || 'info'
}

function getPriorityLabel(priority: string): string {
  return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.label || priority
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function getTaskMessages(task: Task) {
  return store.getTaskMessages(task)
}

// ========== Event Handlers ==========
function onProjectChange(val: number | undefined) {
  store.setProjectFilter(val)
}

function onAgentChange(val: string | undefined) {
  store.setAgentFilter(val)
}

function selectTask(task: Task) {
  store.selectTask(task)
}

function refresh() {
  store.refresh()
  ElMessage.success('数据已刷新')
}

async function onStatusChange(taskId: number, status: TaskStatus) {
  try {
    await store.updateTaskStatus(taskId, status)
    ElMessage.success('状态已更新')
  } catch {
    ElMessage.error('更新失败')
  }
}

async function onAssign(taskId: number, agentName: string) {
  try {
    await store.assignTask(taskId, agentName)
    ElMessage.success('任务已分配')
  } catch {
    ElMessage.error('分配失败')
  }
}

async function createNewTask() {
  if (!newTask.value.title) {
    ElMessage.warning('请输入任务标题')
    return
  }

  try {
    await store.createTask(newTask.value)
    ElMessage.success('任务创建成功')
    showCreateDialog.value = false
    newTask.value = {
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      project_id: undefined,
    }
  } catch {
    ElMessage.error('创建失败')
  }
}

// ========== Drag & Drop ==========
function onDragStart(event: DragEvent, task: Task) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('taskId', String(task.id))
  }
}

async function onDrop(event: DragEvent, status: TaskStatus) {
  const taskId = event.dataTransfer?.getData('taskId')
  if (taskId) {
    try {
      await store.updateTaskStatus(Number(taskId), status)
      ElMessage.success('任务状态已更新')
    } catch {
      ElMessage.error('更新失败')
    }
  }
}

// ========== Lifecycle ==========
onMounted(() => {
  // 如果已登录，加载数据
  if (mcAuth.isAuthenticated) {
    store.loadBoardData()
  }
})
</script>

<style scoped lang="scss">
.task-board {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  color: #e0e0e0;
}

// 头部
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(20, 20, 30, 0.8);
  border-bottom: 1px solid rgba(0, 240, 255, 0.2);
  backdrop-filter: blur(10px);
}

.header-left {
  .board-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(90deg, #00d4ff, #bd00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    .title-icon {
      font-size: 28px;
      -webkit-text-fill-color: #00d4ff;
    }
  }

  .board-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    color: #888;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 错误提示
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(255, 70, 70, 0.1);
  border-bottom: 1px solid rgba(255, 70, 70, 0.3);
  color: #ff6b6b;

  .error-icon {
    font-size: 16px;
  }

  .error-text {
    flex: 1;
    font-size: 13px;
  }
}

.filter-select {
  width: 160px;
}

.create-btn {
  background: linear-gradient(135deg, #00d4ff, #bd00ff);
  border: none;

  &:hover {
    opacity: 0.9;
  }
}

.refresh-btn {
  background: rgba(100, 100, 200, 0.2);
  border: 1px solid rgba(100, 100, 200, 0.3);
  color: #a0a0c0;
}

// Agent 状态栏
.agent-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(20, 20, 30, 0.6);
  border-bottom: 1px solid rgba(100, 100, 200, 0.1);
}

.status-bar-label {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.15em;
  text-transform: uppercase;

  .bracket {
    color: #00d4ff;
  }
}

.agent-status-list {
  display: flex;
  gap: 12px;
  flex: 1;
  overflow-x: auto;
}

.agent-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    border-color: rgba(0, 240, 255, 0.3);
    background: rgba(40, 40, 60, 0.8);
  }
}

.agent-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-fallback {
    font-size: 16px;
    font-weight: 600;
  }
}

.agent-info {
  display: flex;
  flex-direction: column;

  .agent-name {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .agent-role {
    font-size: 10px;
    color: #888;
  }
}

.status-indicator {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;

  &.indicator--idle {
    background: rgba(0, 200, 100, 0.15);
    color: #00c864;
  }

  &.indicator--busy {
    background: rgba(0, 150, 255, 0.15);
    color: #0096ff;
  }

  &.indicator--offline {
    background: rgba(100, 100, 100, 0.15);
    color: #888;
  }

  &.indicator--error {
    background: rgba(255, 70, 70, 0.15);
    color: #ff4646;
  }
}

// 看板主体
.board-main {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 20px;
  overflow-x: auto;
  overflow-y: hidden;
}

.board-column {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 30, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(100, 100, 200, 0.1);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 2px solid;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 12px 12px 0 0;

  .column-title {
    font-size: 14px;
    font-weight: 600;
    color: #c0c0d0;
  }

  .column-count {
    padding: 2px 8px;
    background: rgba(100, 100, 200, 0.2);
    border-radius: 12px;
    font-size: 12px;
    color: #a0a0c0;
  }
}

.column-tasks {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 200, 0.3);
    border-radius: 2px;
  }
}

// 任务卡片
.task-card {
  padding: 16px;
  background: rgba(30, 30, 40, 0.6);
  border-radius: 10px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(40, 40, 60, 0.8);
    transform: translateY(-2px);
  }

  &.is-selected {
    border-color: #00d4ff;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
  }

  &.priority--critical { border-left-color: #ef4444; }
  &.priority--high { border-left-color: #f97316; }
  &.priority--medium { border-left-color: #eab308; }
  &.priority--low { border-left-color: #22c55e; }
}

.task-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;

  .task-ref {
    padding: 2px 6px;
    background: rgba(0, 212, 255, 0.1);
    border-radius: 4px;
    font-size: 10px;
    font-family: monospace;
    color: #00d4ff;
  }

  .task-title {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: #e0e0e0;
    line-height: 1.4;
  }
}

.task-desc {
  margin: 0 0 12px;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .priority-tag {
    font-size: 11px;
  }
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 6px;

  .assignee-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .assignee-name {
    font-size: 11px;
    color: #a0a0c0;
  }
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(100, 100, 200, 0.1);

  .project-tag {
    padding: 2px 8px;
    background: rgba(100, 100, 200, 0.1);
    border-radius: 4px;
    font-size: 10px;
    color: #888;
  }

  .task-date {
    font-size: 11px;
    color: #666;
  }
}

.column-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #555;

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.5;
  }
}

// Agent 选项样式
.agent-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .agent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
}

// 响应式
@media (max-width: 1400px) {
  .board-main {
    overflow-x: auto;
  }

  .board-column {
    min-width: 260px;
  }
}

// 认证覆盖层
.auth-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-panel {
  background: rgba(20, 20, 30, 0.9);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.2);

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    color: #00d4ff;
  }

  p {
    margin: 0 0 24px;
    color: #888;
    font-size: 14px;
  }
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;

  .el-input {
    width: 100%;
  }
}

.auth-hint {
  font-size: 12px;
  color: #666;
}

.auth-url {
  font-size: 12px;
  color: #00d4ff;
  font-family: monospace;
  margin: 8px 0;
}

.auth-error {
  background: rgba(255, 70, 70, 0.1);
  border: 1px solid rgba(255, 70, 70, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  color: #ff6b6b;
  font-size: 13px;
}

// ========== 亮色主题 ==========
:root.light-theme .task-board {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%);
  color: #1e293b;
}

:root.light-theme .board-header {
  background: #ffffff;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .board-title {
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  .title-icon {
    -webkit-text-fill-color: #2563eb;
  }
}

:root.light-theme .board-subtitle {
  color: #64748b;
}

:root.light-theme .refresh-btn {
  background: #f1f5f9;
  border-color: #e5e7eb;
  color: #64748b;
}

:root.light-theme .error-banner {
  background: rgba(239, 68, 68, 0.1);
  border-bottom-color: rgba(239, 68, 68, 0.3);
  color: #dc2626;
}

:root.light-theme .agent-status-bar {
  background: #ffffff;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .status-bar-label {
  color: #64748b;

  .bracket {
    color: #2563eb;
  }
}

:root.light-theme .agent-status-item {
  background: #f8fafc;
  border-color: #e5e7eb;

  &:hover {
    border-color: #2563eb;
    background: #f1f5f9;
  }
}

:root.light-theme .agent-info {
  .agent-name {
    color: #1e293b;
  }

  .agent-role {
    color: #64748b;
  }
}

:root.light-theme .board-main {
  background: transparent;
}

:root.light-theme .board-column {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:root.light-theme .column-header {
  background: #f8fafc;
  border-bottom-color: #e5e7eb;

  .column-title {
    color: #1e293b;
  }

  .column-count {
    background: #e2e8f0;
    color: #64748b;
  }
}

:root.light-theme .column-tasks {
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
  }
}

:root.light-theme .task-card {
  background: #f8fafc;
  border-color: #e5e7eb;

  &:hover {
    background: #f1f5f9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.is-selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }
}

:root.light-theme .task-header {
  .task-ref {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }

  .task-title {
    color: #1e293b;
  }
}

:root.light-theme .task-desc {
  color: #64748b;
}

:root.light-theme .task-footer {
  border-top-color: #e5e7eb;

  .project-tag {
    background: #e2e8f0;
    color: #64748b;
  }

  .task-date {
    color: #94a3b8;
  }
}

:root.light-theme .column-empty {
  color: #94a3b8;
}

// 认证覆盖层 - 亮色主题
:root.light-theme .auth-overlay {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%);
}

:root.light-theme .auth-panel {
  background: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 4px 24px rgba(37, 99, 235, 0.15);

  h2 {
    color: #2563eb;
  }

  p {
    color: #64748b;
  }
}

:root.light-theme .auth-url {
  color: #2563eb;
}
</style>
