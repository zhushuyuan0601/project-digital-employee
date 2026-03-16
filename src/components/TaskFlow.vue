<template>
  <div class="task-flow">
    <div class="task-flow__header">
      <h3 class="task-flow__title">任务流转</h3>
      <span class="task-flow__count">{{ tasks.length }} 个任务</span>
    </div>

    <div class="task-flow__timeline">
      <div
        v-for="(task, index) in sortedTasks"
        :key="task.id"
        class="task-flow__item"
        :class="`task-flow__item--${task.status}`"
      >
        <div class="task-flow__node">
          <div class="node-icon" :class="`node-icon--${task.status}`">
            <span v-if="task.status === 'pending'">⏳</span>
            <span v-else-if="task.status === 'in_progress'">🔄</span>
            <span v-else-if="task.status === 'completed'">✅</span>
            <span v-else-if="task.status === 'failed'">❌</span>
          </div>
          <div class="node-line" v-if="index < sortedTasks.length - 1"></div>
        </div>

        <div class="task-flow__content" @click="selectTask(task)">
          <div class="task-card" :class="`task-card--${task.status}`">
            <div class="task-card__header">
              <span class="task-card__title">{{ task.title }}</span>
              <span class="task-card__status" :class="`status--${task.status}`">
                {{ getStatusText(task.status) }}
              </span>
            </div>
            <div class="task-card__body">
              <div class="task-card__desc">{{ task.description }}</div>
              <div class="task-card__meta">
                <span v-if="task.assignedTo" class="task-card__agent">
                  <span class="agent-icon">🤖</span>
                  {{ getAgentName(task.assignedTo) }}
                </span>
                <span class="task-card__time">{{ formatTime(task.createdAt) }}</span>
              </div>
            </div>
            <div class="task-card__progress" v-if="task.status === 'in_progress'">
              <el-progress :percentage="task.progress" :stroke-width="4" :show-text="false" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="sortedTasks.length === 0" class="task-flow__empty">
        <span class="empty-icon">📋</span>
        <p>暂无任务</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types/task'
import { useAgentsStore } from '@/stores/agents'

const props = defineProps<{
  tasks: Task[]
}>()

const emit = defineEmits<{
  select: [task: Task]
}>()

const agentsStore = useAgentsStore()

const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => b.createdAt - a.createdAt)
})

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

const getAgentName = (agentId: string) => {
  const agent = agentsStore.getAgent(agentId)
  return agent?.name || agentId
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const selectTask = (task: Task) => {
  emit('select', task)
}
</script>

<style scoped>
.task-flow {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
}

.task-flow__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.task-flow__title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.task-flow__count {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 12px;
  border-radius: 12px;
}

.task-flow__timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-flow__item {
  display: flex;
  gap: 12px;
}

.task-flow__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.node-icon--pending {
  background: rgba(255, 170, 0, 0.2);
  border-color: rgba(255, 170, 0, 0.5);
}

.node-icon--in_progress {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.5);
  animation: spin 2s linear infinite;
}

.node-icon--completed {
  background: rgba(0, 255, 136, 0.2);
  border-color: rgba(0, 255, 136, 0.5);
}

.node-icon--failed {
  background: rgba(255, 51, 102, 0.2);
  border-color: rgba(255, 51, 102, 0.5);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.node-line {
  width: 2px;
  flex: 1;
  min-height: 40px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
  border-radius: 2px;
}

.task-flow__content {
  flex: 1;
  cursor: pointer;
}

.task-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.task-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.task-card--completed {
  opacity: 0.7;
}

.task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-card__title {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.task-card__status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
}

.status--pending {
  background: rgba(255, 170, 0, 0.2);
  color: #ffaa00;
}

.status--in_progress {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.status--completed {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.status--failed {
  background: rgba(255, 51, 102, 0.2);
  color: #ff3366;
}

.task-card__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.task-card__desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
}

.task-card__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.task-card__agent {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-card__progress {
  margin-top: 12px;
}

.task-flow__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.task-flow__empty p {
  font-size: 14px;
  margin: 0;
}
</style>
