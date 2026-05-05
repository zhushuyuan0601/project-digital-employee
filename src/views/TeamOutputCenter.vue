<template>
  <div class="center-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ currentPageTitle }}</h1>
        <p class="page-subtitle">{{ currentPageDesc }}</p>
      </div>
    </header>

    <div class="filters-bar">
      <div class="tab-group">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <section class="center-panel">
      <div v-if="activeTab === 'team'" class="team-project-view">
        <section class="team-overview">
          <article v-for="member in memberSummaries" :key="member.id" class="member-summary-card">
            <div class="member-summary-card__head">
              <span class="member-avatar">
                <img v-if="member.avatar" :src="member.avatar" :alt="member.name" />
                <span v-else>{{ member.initial }}</span>
              </span>
              <div>
                <strong>{{ member.name }}</strong>
                <p>{{ member.role }}</p>
              </div>
              <span class="member-state" :class="`member-state--${member.state}`">{{ member.stateText }}</span>
            </div>
            <div class="member-summary-card__metrics">
              <span><strong>{{ member.running }}</strong>执行中</span>
              <span><strong>{{ member.completed }}</strong>已完成</span>
              <span><strong>{{ member.outputs }}</strong>成果</span>
            </div>
            <div class="member-current-list">
              <p v-if="member.currentTasks.length === 0">当前暂无执行任务。</p>
              <button
                v-for="task in member.currentTasks"
                v-else
                :key="task.id"
                type="button"
                @click="openTask(task.id)"
              >
                {{ task.title }}
              </button>
            </div>
          </article>
        </section>

        <section class="project-board-section">
          <div class="section-heading">
            <div>
              <p class="section-kicker">项目看板</p>
              <h2>任务进度与成员协作</h2>
            </div>
            <button type="button" class="refresh-btn" @click="refreshAll">刷新</button>
          </div>
          <div v-if="tasksStore.tasks.length === 0" class="empty-output">暂无任务数据，请先在任务指挥中心创建任务。</div>
          <div v-else class="project-board-grid">
            <article v-for="task in projectTasks" :key="task.id" class="project-task-card" @click="openTask(task.id)">
              <div class="project-task-card__top">
                <span class="project-status" :class="`project-status--${task.status}`">{{ taskStatusText(task.status) }}</span>
                <span>{{ formatTime(task.updated_at) }}</span>
              </div>
              <h3>{{ task.title }}</h3>
              <p>{{ task.description }}</p>
              <div class="project-progress">
                <span :style="{ width: `${task.progress || 0}%` }"></span>
              </div>
              <div class="project-task-card__meta">
                <span>{{ task.progress || 0 }}%</span>
                <span>{{ task.completed_subtask_count || completedCount(task) }}/{{ task.subtask_count || task.subtasks?.length || 0 }} 子任务</span>
                <span>{{ task.output_count || task.outputs?.length || 0 }} 成果</span>
              </div>
              <div class="project-owner-list">
                <span v-for="owner in taskOwners(task)" :key="owner.id" class="owner-chip">
                  <img v-if="owner.avatar" :src="owner.avatar" :alt="owner.name" />
                  {{ owner.name }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>
      <div v-else-if="activeTab === 'projects'" class="project-board-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">项目看板</p>
            <h2>Claude Runtime 任务进度</h2>
          </div>
          <button type="button" class="refresh-btn" @click="refreshAll">刷新</button>
        </div>
        <div v-if="tasksStore.tasks.length === 0" class="empty-output">暂无任务数据，请先在任务指挥中心创建任务。</div>
        <div v-else class="project-board-grid">
          <article v-for="task in projectTasks" :key="task.id" class="project-task-card" @click="openTask(task.id)">
            <div class="project-task-card__top">
              <span class="project-status" :class="`project-status--${task.status}`">{{ taskStatusText(task.status) }}</span>
              <span>{{ formatTime(task.updated_at) }}</span>
            </div>
            <h3>{{ task.title }}</h3>
            <p>{{ task.description }}</p>
            <div class="project-progress">
              <span :style="{ width: `${task.progress || 0}%` }"></span>
            </div>
            <div class="project-task-card__meta">
              <span>{{ task.progress || 0 }}%</span>
              <span>{{ task.completed_subtask_count || completedCount(task) }}/{{ task.subtask_count || task.subtasks?.length || 0 }} 子任务</span>
              <span>{{ task.output_count || task.outputs?.length || 0 }} 成果</span>
            </div>
            <div class="project-owner-list">
              <span v-for="owner in taskOwners(task)" :key="owner.id" class="owner-chip">
                <img v-if="owner.avatar" :src="owner.avatar" :alt="owner.name" />
                {{ owner.name }}
              </span>
            </div>
          </article>
        </div>
      </div>
      <div v-else class="task-output-view">
        <div class="task-output-toolbar">
          <select v-model="outputFilters.taskId" class="filter-control" @change="loadTaskOutputs">
            <option value="">全部任务</option>
            <option v-for="task in tasksStore.tasks" :key="task.id" :value="task.id">{{ task.title }}</option>
          </select>
          <select v-model="outputFilters.agentId" class="filter-control" @change="loadTaskOutputs">
            <option value="">全部 Agent</option>
            <option value="xiaoyan">研究员</option>
            <option value="xiaochan">产品经理</option>
            <option value="xiaokai">研发工程师</option>
            <option value="xiaoce">测试员</option>
          </select>
          <select v-model="outputFilters.status" class="filter-control" @change="loadTaskOutputs">
            <option value="">全部状态</option>
            <option value="pending_review">待审阅</option>
            <option value="accepted">已接受</option>
            <option value="rejected">已退回</option>
          </select>
          <button type="button" class="refresh-btn" @click="loadTaskOutputs">刷新</button>
        </div>

        <div v-if="tasksStore.outputs.length === 0" class="empty-output">
          暂无任务成果。先在任务指挥中心扫描成果，产出会绑定到对应任务。
        </div>
        <div v-else class="member-output-groups">
          <section v-for="group in outputsByMember" :key="group.agentId" class="member-output-group">
            <div class="member-output-group__head">
              <div class="member-output-title">
                <span class="member-output-avatar">
                  <img v-if="group.avatar" :src="group.avatar" :alt="group.name" />
                  <span v-else>{{ group.initial }}</span>
                </span>
                <div>
                <p class="section-kicker">{{ group.agentId || 'unknown' }}</p>
                <h2>{{ group.name }}</h2>
                </div>
              </div>
              <span>{{ group.outputs.length }} 个成果</span>
            </div>
            <div class="task-output-grid">
              <article v-for="output in group.outputs" :key="output.id" class="task-output-card">
                <div class="output-card-head">
                  <span class="output-type">{{ output.type }}</span>
                  <span class="output-status">{{ outputStatusText(output.status) }}</span>
                </div>
                <h3>{{ output.name }}</h3>
                <p>{{ output.task_title || output.task_id }}</p>
                <div class="output-card-meta">
                  <span>{{ agentName(output.agent_id || '') }}</span>
                  <span>{{ output.subtask_title || output.subtask_id || '主任务' }}</span>
                </div>
                <div class="output-card-actions">
                  <button
                    type="button"
                    class="output-card-action"
                    :disabled="!output.path"
                    @click="openOutputDirectory(output)"
                  >
                    <i class="ri-folder-open-line"></i>
                    打开目录
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { taskApi } from '@/api/tasks'
import { AGENT_DEFINITIONS } from '@/config/agents'
import { useTasksStore } from '@/stores/tasks'
import type { Task, TaskOutput, TaskOutputStatus, TaskStatus } from '@/types/task'

type TeamTab = 'team' | 'projects' | 'outputs'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const outputFilters = reactive({
  taskId: '',
  agentId: '',
  status: '',
})

const agentMeta = AGENT_DEFINITIONS.reduce<Record<string, { name: string; role: string; initial: string; avatar: string }>>(
  (meta, agent) => {
    const roleMap: Record<string, string> = {
      xiaomu: '任务统筹与最终汇总',
      xiaoyan: '调研分析与资料研究',
      xiaochan: '需求分析与产品方案',
      xiaokai: '技术方案与实现建议',
      xiaoce: '测试验收与风险清单',
    }
    const initialMap: Record<string, string> = {
      xiaomu: '呦',
      xiaoyan: '研',
      xiaochan: '产',
      xiaokai: '研',
      xiaoce: '测',
    }
    meta[agent.id] = {
      name: agent.name,
      role: roleMap[agent.id] || agent.roleLabel,
      initial: initialMap[agent.id] || agent.name.slice(0, 1),
      avatar: agent.icon,
    }
    return meta
  },
  {}
)

const tabs = [
  { key: 'team', label: '团队态势', meta: '成员在线状态与当前职责' },
  { key: 'projects', label: '项目看板', meta: '项目进度、阶段与责任分工' },
  { key: 'outputs', label: '成果库', meta: '报告、文档、代码与产出检索' },
] as const

const activeTab = computed<TeamTab>(() => {
  const tab = route.query.tab
  if (tab === 'projects' || tab === 'outputs') {
    return tab
  }
  return 'team'
})

const currentPageTitle = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.label || '团队与产出中心'
})

const currentPageDesc = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.meta || ''
})

function setTab(tab: TeamTab) {
  router.replace({
    path: '/team-output',
    query: tab === 'team' ? {} : { tab },
  })
}

const projectTasks = computed(() => [...tasksStore.tasks].sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0)))

const memberSummaries = computed(() => Object.entries(agentMeta).map(([agentId, meta]) => {
  const subtasks = tasksStore.tasks.flatMap(task =>
    (task.subtasks || []).filter(subtask => subtask.assigned_agent_id === agentId).map(subtask => ({ task, subtask }))
  )
  const running = subtasks.filter(item => ['running', 'assigned', 'pending'].includes(item.subtask.status)).length
  const completed = subtasks.filter(item => item.subtask.status === 'completed').length
  const failed = subtasks.filter(item => ['failed', 'blocked'].includes(item.subtask.status)).length
  const outputs = tasksStore.outputs.filter(output => output.agent_id === agentId).length
  const currentTasks = subtasks
    .filter(item => ['running', 'assigned', 'pending'].includes(item.subtask.status))
    .map(item => item.task)
    .filter((task, index, list) => list.findIndex(item => item.id === task.id) === index)
    .slice(0, 3)
  const state = failed > 0 ? 'danger' : running > 0 ? 'running' : completed > 0 ? 'done' : 'idle'
  const stateText = failed > 0 ? '异常' : running > 0 ? '执行中' : completed > 0 ? '最近完成' : '待命'
  return {
    id: agentId,
    ...meta,
    avatar: meta.avatar,
    running,
    completed,
    outputs,
    currentTasks,
    state,
    stateText,
  }
}))

const outputsByMember = computed(() => {
  const groups = new Map<string, TaskOutput[]>()
  for (const output of tasksStore.outputs) {
    const agentId = output.agent_id || 'unknown'
    groups.set(agentId, [...(groups.get(agentId) || []), output])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => agentName(a).localeCompare(agentName(b), 'zh-CN'))
    .map(([agentId, outputs]) => ({
      agentId,
      name: agentName(agentId),
      initial: agentMeta[agentId]?.initial || agentName(agentId).slice(0, 1),
      avatar: agentMeta[agentId]?.avatar || '',
      outputs,
    }))
})

async function refreshAll() {
  await Promise.all([
    tasksStore.fetchTasks(),
    loadTaskOutputs(),
  ])
}

async function loadTaskOutputs() {
  await tasksStore.fetchOutputs({
    taskId: outputFilters.taskId || undefined,
    agentId: outputFilters.agentId || undefined,
    status: outputFilters.status || undefined,
  })
}

function outputStatusText(status: TaskOutputStatus) {
  const labels: Record<TaskOutputStatus, string> = {
    pending_review: '待审阅',
    accepted: '已接受',
    rejected: '已退回',
  }
  return labels[status] || status
}

function agentName(agentId: string) {
  return agentMeta[agentId]?.name || agentId || '未归属'
}

function taskStatusText(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    draft: '草稿',
    planning: '拆解中',
    clarifying: '待补充',
    dispatching: '派发中',
    running: '执行中',
    reviewing: '待验收',
    completed: '已完成',
    failed: '异常',
    cancelled: '已取消',
  }
  return labels[status] || status
}

function completedCount(task: Task) {
  return task.subtasks?.filter(subtask => subtask.status === 'completed').length || 0
}

function taskOwners(task: Task) {
  const owners = new Map<string, { id: string; name: string; avatar: string }>()
  for (const subtask of task.subtasks || []) {
    const agentId = subtask.assigned_agent_id
    if (!owners.has(agentId)) {
      owners.set(agentId, {
        id: agentId,
        name: agentName(agentId),
        avatar: agentMeta[agentId]?.avatar || '',
      })
    }
  }
  return [...owners.values()].slice(0, 5)
}

function formatTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function openTask(taskId: string) {
  router.push({ path: '/task-center-2', query: { task: taskId } })
}

async function openOutputDirectory(output: TaskOutput) {
  if (!output.path) {
    ElMessage.warning('该成果没有可打开的本地文件路径')
    return
  }
  try {
    await taskApi.openFileDirectory(output.path)
    ElMessage.success('已打开成果所在目录')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '打开目录失败')
  }
}

watch(activeTab, (tab) => {
  if (tab === 'outputs') loadTaskOutputs()
})

onMounted(async () => {
  await refreshAll()
})
</script>

<style scoped>
.center-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 0;
  flex-shrink: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 6px 0 0;
}

/* 筛选栏 */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  margin-top: 16px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
  gap: 16px;
}

.tab-group {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-panel);
}

.tab-btn.active {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.2);
}

/* 内容面板 */
.center-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 32px;
}

.team-project-view,
.project-board-section,
.task-output-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.team-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.member-summary-card,
.project-task-card,
.member-output-group {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.member-summary-card {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.member-summary-card__head {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #08111f;
  background: var(--bg-card);
  border: 1px solid rgba(var(--color-primary-rgb), 0.35);
  font-weight: 800;
  overflow: hidden;
}

.member-avatar img,
.member-output-avatar img,
.owner-chip img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.member-summary-card strong {
  color: var(--text-primary);
}

.member-summary-card p,
.member-current-list p,
.project-task-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 13px;
}

.member-state,
.project-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-card);
  font-size: 12px;
}

.member-state--running,
.project-status--running,
.project-status--dispatching {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.member-state--done,
.project-status--completed,
.project-status--reviewing {
  color: var(--color-success);
  background: rgba(34, 197, 94, 0.12);
}

.member-state--danger,
.project-status--failed,
.project-status--cancelled {
  color: var(--color-error);
  background: rgba(248, 113, 113, 0.12);
}

.member-summary-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.member-summary-card__metrics span {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-tertiary);
  background: var(--bg-card);
  font-size: 12px;
}

.member-summary-card__metrics strong {
  font-size: 18px;
}

.member-current-list {
  display: grid;
  gap: 8px;
}

.member-current-list button {
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  min-height: 32px;
  padding: 0 10px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-heading,
.member-output-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h2,
.member-output-group__head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}

.section-kicker {
  margin: 0 0 4px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.project-board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
}

.project-task-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.project-task-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.project-task-card__top,
.project-task-card__meta,
.project-owner-list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--text-tertiary);
  font-size: 12px;
}

.project-task-card h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
}

.project-progress {
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-card);
}

.project-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.project-owner-list {
  justify-content: flex-start;
}

.owner-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.owner-chip img {
  width: 20px;
  height: 20px;
  border-radius: 999px;
}

.task-output-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-control,
.refresh-btn {
  height: 36px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-primary);
  padding: 0 12px;
}

.refresh-btn {
  cursor: pointer;
}

.task-output-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.member-output-groups {
  display: grid;
  gap: 18px;
}

.member-output-group {
  padding: 16px;
}

.member-output-group__head {
  margin-bottom: 14px;
}

.member-output-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-output-avatar {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.35);
  background: var(--bg-card);
  color: var(--color-primary);
  font-weight: 800;
}

.member-output-group__head > span {
  color: var(--text-secondary);
  font-size: 13px;
}

.task-output-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.output-card-head,
.output-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.task-output-card h3 {
  color: var(--text-primary);
  font-size: 15px;
  margin: 0;
}

.task-output-card p {
  color: var(--text-secondary);
  margin: 0;
}

.output-status {
  color: var(--color-primary);
}

.output-card-actions {
  display: flex;
  justify-content: flex-end;
}

.output-card-action {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.26);
  border-radius: 8px;
  padding: 0 10px;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--text-primary);
  cursor: pointer;
}

.output-card-action:hover:not(:disabled) {
  border-color: rgba(var(--color-primary-rgb), 0.5);
  background: rgba(var(--color-primary-rgb), 0.14);
}

.output-card-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.empty-output {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 32px;
  color: var(--text-secondary);
  background: var(--bg-panel);
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px 0;
  }

  .filters-bar {
    padding: 12px 20px;
  }

  .center-panel {
    padding: 16px 20px;
  }
}
</style>
