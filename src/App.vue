<template>
  <router-view v-if="isBlankLayout" />

  <div v-else class="app-shell">
    <div class="app-shell__glow app-shell__glow--left"></div>
    <div class="app-shell__glow app-shell__glow--right"></div>

    <div :class="['app-frame', { 'app-frame--sidebar-collapsed': sidebarCollapsed }]">
      <TheSidebar
        :collapsed="sidebarCollapsed"
        @toggle-collapse="toggleSidebar"
      />

      <main class="app-stage">
        <div v-if="showTaskActivity" class="global-task-activity">
          <button type="button" class="activity-main" @click="openActiveTask">
            <span class="activity-pulse"></span>
            <span class="activity-copy">
              <strong>{{ activityTitle }}</strong>
              <small>{{ activityDetail }}</small>
            </span>
          </button>
          <div class="activity-progress" :title="`${primaryActiveTask?.progress || 0}%`">
            <span :style="{ width: `${primaryActiveTask?.progress || 0}%` }"></span>
          </div>
          <button type="button" class="activity-action" @click="openActiveTask">
            查看任务
          </button>
        </div>
        <section class="stage-content">
          <router-view />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TheSidebar from '@/components/TheSidebar.vue'
import { useAppInit } from '@/composables/useAppInit'
import { useTasksStore } from '@/stores/tasks'
import type { TaskStatus } from '@/types/task'

const route = useRoute()
const router = useRouter()
const { initializeApp } = useAppInit()
const tasksStore = useTasksStore()
const isBlankLayout = computed(() => route.meta.layout === 'blank')
const sidebarCollapsed = ref(false)
let taskActivityTimer: ReturnType<typeof setInterval> | null = null

const activeTaskStatuses = new Set<TaskStatus>(['planning', 'clarifying', 'dispatching', 'running', 'reviewing'])
const statusLabels: Record<TaskStatus, string> = {
  draft: '草稿',
  planning: '规划中',
  clarifying: '待澄清',
  dispatching: '派发中',
  running: '执行中',
  reviewing: '验收中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

const visibleActiveTasks = computed(() =>
  tasksStore.tasks
    .filter(task => activeTaskStatuses.has(task.status))
    .sort((a, b) => {
      const statusWeight = (status: TaskStatus) => status === 'running' ? 0 : status === 'dispatching' ? 1 : status === 'reviewing' ? 2 : 3
      const diff = statusWeight(a.status) - statusWeight(b.status)
      if (diff !== 0) return diff
      return Number(b.updated_at || 0) - Number(a.updated_at || 0)
    })
)
const primaryActiveTask = computed(() => visibleActiveTasks.value[0] || null)
const showTaskActivity = computed(() =>
  !isBlankLayout.value &&
  route.name !== 'task-center-2' &&
  visibleActiveTasks.value.length > 0
)
const activityTitle = computed(() => {
  const task = primaryActiveTask.value
  if (!task) return ''
  const extra = visibleActiveTasks.value.length > 1 ? `等 ${visibleActiveTasks.value.length} 个任务` : ''
  return `${statusLabels[task.status]}：${task.title}${extra}`
})
const activityDetail = computed(() => {
  const task = primaryActiveTask.value
  if (!task) return ''
  const subtaskTotal = task.subtask_count || task.subtasks?.length || 0
  const completed = task.completed_subtask_count || task.subtasks?.filter(subtask => ['completed', 'skipped'].includes(subtask.status)).length || 0
  return `进度 ${task.progress || 0}% · 子任务 ${completed}/${subtaskTotal} · 切换模块后仍在后台运行`
})

function readSidebarCollapsed() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('app_sidebar_collapsed') === 'true'
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function refreshTaskActivity() {
  if (!tasksStore.loading) {
    tasksStore.fetchTasks().catch(() => {})
  }
}

function openActiveTask() {
  const task = primaryActiveTask.value
  router.push({
    path: '/task-center-2',
    query: task ? { task: task.id } : undefined,
  })
}

onMounted(() => {
  sidebarCollapsed.value = readSidebarCollapsed()
  initializeApp()
  refreshTaskActivity()
  taskActivityTimer = setInterval(refreshTaskActivity, 15000)
})

onUnmounted(() => {
  if (taskActivityTimer) clearInterval(taskActivityTimer)
})

watch(sidebarCollapsed, (value) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('app_sidebar_collapsed', String(value))
})
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: 12px;
  overflow: visible;
}

.app-shell__glow {
  position: absolute;
  inset: auto;
  width: 34rem;
  height: 34rem;
  border-radius: 50%;
  filter: blur(48px);
  pointer-events: none;
  opacity: 0.5;
}

.app-shell__glow--left {
  top: -12rem;
  left: -8rem;
  background:
    radial-gradient(circle, color-mix(in oklab, var(--color-primary) 24%, transparent) 0%, transparent 70%);
}

.app-shell__glow--right {
  right: -10rem;
  bottom: -16rem;
  background:
    radial-gradient(circle, color-mix(in oklab, var(--color-secondary) 28%, transparent) 0%, transparent 72%);
}

.app-frame {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: calc(100vh - 24px);
  transition: grid-template-columns 0.22s ease;
}

.app-frame--sidebar-collapsed {
  grid-template-columns: 72px minmax(0, 1fr);
}

.app-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: calc(100vh - 24px);
  padding: 0;
  border: none;
  border-radius: 0;
  background: var(--bg-base);
  background-image: radial-gradient(circle at top right, rgba(88, 166, 255, 0.03), transparent 40%);
  box-shadow: none;
}

.global-task-activity {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px auto;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  margin: 0 0 1px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--color-primary) 10%, var(--bg-panel)), var(--bg-panel));
  box-shadow: 0 10px 28px rgba(18, 28, 45, 0.08);
}

.activity-main {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.activity-pulse {
  position: relative;
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--color-success);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-success) 16%, transparent);
}

.activity-pulse::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 1px solid color-mix(in oklab, var(--color-success) 42%, transparent);
  border-radius: inherit;
  animation: activity-ping 1.7s ease-out infinite;
}

.activity-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.activity-copy strong,
.activity-copy small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-copy strong {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 750;
}

.activity-copy small {
  color: var(--text-secondary);
  font-size: 12px;
}

.activity-progress {
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in oklab, var(--border-default) 70%, transparent);
}

.activity-progress span {
  display: block;
  height: 100%;
  min-width: 6px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-success), var(--color-primary));
  transition: width 0.25s ease;
}

.activity-action {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid color-mix(in oklab, var(--color-primary) 42%, var(--border-default));
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.activity-action:hover {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.stage-content {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: inherit;
  padding: 0;
}

@keyframes activity-ping {
  0% {
    opacity: 0.75;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.9);
  }
}

@media (max-width: 1180px) {
  .app-frame {
    grid-template-columns: 1fr;
  }

  .app-frame--sidebar-collapsed {
    grid-template-columns: 1fr;
  }

  .app-stage {
    height: auto;
    min-height: auto;
  }

  .global-task-activity {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .activity-progress {
    display: none;
  }
}

@media (max-width: 820px) {
  .app-shell {
    padding: 8px;
  }

  .app-frame {
    gap: 0;
  }
}

@media (max-width: 620px) {
  .app-shell {
    padding: 4px;
  }

  .app-stage {
    padding: 0;
  }

  .stage-content {
    padding-left: 0;
    padding-right: 0;
  }

  .global-task-activity {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 10px 12px;
  }

  .activity-action {
    width: 100%;
  }
}
</style>
