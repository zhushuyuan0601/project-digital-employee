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
      <Agents v-if="activeTab === 'team'" />
      <DigitalEmployee v-else-if="activeTab === 'projects'" view-mode="projects" :embedded="true" />
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
        <div v-else class="task-output-grid">
          <article v-for="output in tasksStore.outputs" :key="output.id" class="task-output-card">
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
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Agents from '@/components/team/AgentsPanel.vue'
import DigitalEmployee from '@/components/team/DigitalEmployeePanel.vue'
import { useTasksStore } from '@/stores/tasks'
import type { TaskOutputStatus } from '@/types/task'

type TeamTab = 'team' | 'projects' | 'outputs'

const route = useRoute()
const router = useRouter()
const tasksStore = useTasksStore()
const outputFilters = reactive({
  taskId: '',
  agentId: '',
  status: '',
})

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
  const labels: Record<string, string> = {
    xiaoyan: '研究员',
    xiaochan: '产品经理',
    xiaokai: '研发工程师',
    xiaoce: '测试员',
  }
  return labels[agentId] || agentId || '未归属'
}

watch(activeTab, (tab) => {
  if (tab === 'outputs') loadTaskOutputs()
})

onMounted(async () => {
  await tasksStore.fetchTasks()
  if (activeTab.value === 'outputs') {
    await loadTaskOutputs()
  }
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

.task-output-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.task-output-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
  padding: 16px;
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
  margin: 14px 0 8px;
}

.task-output-card p {
  color: var(--text-secondary);
  margin: 0 0 14px;
}

.output-status {
  color: var(--color-primary);
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
