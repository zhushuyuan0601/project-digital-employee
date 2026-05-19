<template>
  <router-view v-if="isBlankLayout" />

  <div v-else class="app-shell">
    <div :class="['app-frame', { 'app-frame--sidebar-collapsed': sidebarCollapsed }]">
      <TheSidebar
        :collapsed="sidebarCollapsed"
        @toggle-collapse="toggleSidebar"
      />

      <main class="app-stage">
        <header class="desktop-toolbar">
          <div class="toolbar-title">
            <span class="toolbar-kicker">Digital Employee</span>
            <h1>{{ currentRouteTitle }}</h1>
            <p>{{ currentRouteMeta }}</p>
          </div>
          <div class="toolbar-context">
            <TaskNotificationCenter @open="openTaskNotification" />
            <span class="toolbar-context__item">{{ currentRoleLabel }}</span>
            <span class="toolbar-context__item">v1.0.0</span>
          </div>
        </header>

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
import TaskNotificationCenter from '@/components/task-center/TaskNotificationCenter.vue'
import { navigationSections } from '@/config/navigation'
import { useAppInit } from '@/composables/useAppInit'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useTaskNotificationsStore, type TaskNotificationItem } from '@/stores/taskNotifications'
import type { TaskStatus } from '@/types/task'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { initializeApp } = useAppInit()
const tasksStore = useTasksStore()
const taskNotificationsStore = useTaskNotificationsStore()
const authStore = useAuthStore()
const isBlankLayout = computed(() => route.meta.layout === 'blank')
const sidebarCollapsed = ref(false)
let taskActivityTimer: ReturnType<typeof setInterval> | null = null
const processedNotificationIds = new Set<string>()
let notificationsBootstrapped = false

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
const flatNavigationItems = computed(() => navigationSections.flatMap(section => section.items))
const currentNavigationItem = computed(() =>
  flatNavigationItems.value.find(item => route.path === item.to) ||
  flatNavigationItems.value.find(item => route.path.startsWith(`${item.to}/`))
)
const currentRouteTitle = computed(() => currentNavigationItem.value?.label || String(route.name || '工作台'))
const currentRouteMeta = computed(() => currentNavigationItem.value?.meta || '数字员工本地桌面运行环境')
const currentRoleLabel = computed(() => authStore.user?.displayName || '未登录')
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
    tasksStore.fetchTasks()
      .then(() => syncRecentTaskNotifications())
      .catch(() => {})
  }
}

function openActiveTask() {
  const task = primaryActiveTask.value
  router.push({
    path: '/task-center-2',
    query: task ? { task: task.id } : undefined,
  })
}

function notificationToastType(level: TaskNotificationItem['level']) {
  if (level === 'error') return 'error'
  if (level === 'warning' || level === 'attention') return 'warning'
  if (level === 'success') return 'success'
  return 'info'
}

function targetFromNotification(notification: TaskNotificationItem) {
  if (notification.action === 'review_plan' || notification.action === 'answer_clarification') return 'plan'
  if (notification.action === 'review_outputs') return 'review'
  return notification.level === 'error' ? 'execution' : undefined
}

async function syncRecentTaskNotifications() {
  const candidates = tasksStore.tasks
    .filter(task => ['planning', 'clarifying', 'dispatching', 'running', 'reviewing', 'completed', 'failed', 'cancelled'].includes(task.status))
    .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0))
    .slice(0, 8)

  await Promise.all(candidates.map(task =>
    tasksStore.fetchTaskEvents(task.id, { limit: 80 }).catch(() => [])
  ))
  if (!notificationsBootstrapped) {
    bootstrapTaskNotifications()
    return
  }
  showPendingToasts()
}

function bootstrapTaskNotifications() {
  for (const notification of taskNotificationsStore.visibleNotifications) {
    processedNotificationIds.add(notification.id)
  }
  notificationsBootstrapped = true
}

function showPendingToasts() {
  if (!notificationsBootstrapped) return
  const pending = taskNotificationsStore.visibleNotifications
    .filter(notification => !processedNotificationIds.has(notification.id))
    .sort((a, b) => {
      const timeDiff = a.createdAt - b.createdAt
      if (timeDiff !== 0) return timeDiff
      const aId = Number(a.dbEventId ?? a.eventId)
      const bId = Number(b.dbEventId ?? b.eventId)
      if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId
      return String(a.eventId).localeCompare(String(b.eventId))
    })

  for (const notification of pending) {
    processedNotificationIds.add(notification.id)
    if (!taskNotificationsStore.shouldToast(notification)) continue
    ElMessage({
      type: notificationToastType(notification.level),
      message: `${notification.title}：${notification.message}`,
      duration: notification.priority === 'critical' ? 5200 : 3600,
      showClose: true,
    })
    showDesktopNotification(notification)
    taskNotificationsStore.markToasted(notification.id)
  }
}

function desktopNotificationBody(notification: TaskNotificationItem) {
  if (notification.priority === 'critical') return '任务需要立即查看，请回到应用处理。'
  if (notification.level === 'error') return '任务执行遇到异常，请回到应用查看详情。'
  if (notification.level === 'success') return '任务状态已更新，请回到应用查看成果。'
  if (notification.level === 'attention' || notification.level === 'warning') return '任务需要处理，请回到应用查看。'
  return '任务执行状态已更新。'
}

function showDesktopNotification(notification: TaskNotificationItem) {
  if (
    !notification.desktop ||
    !taskNotificationsStore.preferences.desktop ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return
  }

  const createNotification = () => {
    const desktopNotification = new Notification(notification.title, {
      body: desktopNotificationBody(notification),
      silent: true,
    })
    desktopNotification.onclick = () => {
      window.focus()
      openTaskNotification(notification)
      desktopNotification.close()
    }
  }

  if (Notification.permission === 'granted') {
    createNotification()
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission()
      .then((permission) => {
        if (permission === 'granted') createNotification()
      })
      .catch(() => {})
  }
}

function openTaskNotification(notification: TaskNotificationItem) {
  const target = targetFromNotification(notification)
  router.push({
    path: '/task-center-2',
    query: {
      task: notification.taskId,
      ...(target ? { target } : {}),
    },
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

watch(
  () => taskNotificationsStore.visibleNotifications[0]?.id,
  () => showPendingToasts()
)
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-base) 92%, black 8%), var(--bg-base));
}

.app-frame {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 308px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: 100vh;
  transition: grid-template-columns 0.22s ease;
}

.app-frame--sidebar-collapsed {
  grid-template-columns: 76px minmax(0, 1fr);
}

.app-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  padding: 0;
  border: none;
  border-radius: 0;
  background: var(--bg-base);
  box-shadow: none;
}

.desktop-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 72px;
  padding: 12px 22px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-panel) 96%, white 4%), var(--bg-panel-header));
}

.toolbar-title {
  min-width: 0;
}

.toolbar-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
}

.toolbar-title h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 750;
  line-height: 1.2;
}

.toolbar-title p {
  margin: 4px 0 0;
  max-width: 56rem;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-context {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.toolbar-context__item {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.global-task-activity {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px auto;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  margin: 0 0 1px;
  padding: 7px 18px;
  border-bottom: 1px solid var(--border-subtle);
  background:
    linear-gradient(90deg, color-mix(in oklab, var(--color-success) 7%, var(--bg-surface)), var(--bg-surface));
  box-shadow: none;
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
  background:
    linear-gradient(180deg, var(--bg-base), color-mix(in oklab, var(--bg-base) 94%, black 6%));
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
    min-height: 100vh;
  }

  .desktop-toolbar {
    position: sticky;
    top: 0;
    z-index: 8;
  }

  .global-task-activity {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .activity-progress {
    display: none;
  }
}

@media (max-width: 820px) {
  .app-frame {
    gap: 0;
  }

  .desktop-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .toolbar-context {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
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
