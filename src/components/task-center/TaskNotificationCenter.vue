<template>
  <div class="notification-center">
    <button
      type="button"
      class="notification-trigger"
      :class="{ 'notification-trigger--active': unreadCount > 0 }"
      title="任务通知"
      @click="isOpen = !isOpen"
    >
      <i class="ri-notification-3-line"></i>
      <span v-if="unreadCount > 0" class="notification-trigger__badge">{{ unreadCountLabel }}</span>
    </button>

    <div v-if="isOpen" class="notification-panel">
      <header class="notification-panel__head">
        <div>
          <strong>任务通知</strong>
          <small>{{ headerHint }}</small>
        </div>
        <button type="button" class="text-btn" :disabled="unreadCount === 0" @click="markAllRead">
          全部已读
        </button>
      </header>

      <section class="notification-preferences" aria-label="通知偏好">
        <label>
          <input
            type="checkbox"
            :checked="preferences.attention"
            @change="updatePreference('attention', ($event.target as HTMLInputElement).checked)"
          />
          <span>待处理/失败</span>
        </label>
        <label>
          <input
            type="checkbox"
            :checked="preferences.success"
            @change="updatePreference('success', ($event.target as HTMLInputElement).checked)"
          />
          <span>完成</span>
        </label>
        <label>
          <input
            type="checkbox"
            :checked="preferences.progress"
            @change="updatePreference('progress', ($event.target as HTMLInputElement).checked)"
          />
          <span>普通进度</span>
        </label>
        <label>
          <input
            type="checkbox"
            :checked="preferences.desktop"
            @change="updatePreference('desktop', ($event.target as HTMLInputElement).checked)"
          />
          <span>桌面</span>
        </label>
      </section>

      <div class="notification-list">
        <div v-if="notifications.length === 0" class="notification-empty">
          <i class="ri-notification-off-line"></i>
          <strong>暂无任务通知</strong>
          <span>关键状态变化会保留在这里。</span>
        </div>
        <article
          v-for="item in notifications"
          v-else
          :key="item.id"
          class="notification-item"
          :class="[`notification-item--${item.level}`, { 'notification-item--unread': !item.read }]"
        >
          <button type="button" class="notification-item__main" @click="openNotification(item)">
            <span class="notification-item__icon">
              <i :class="iconForLevel(item.level)"></i>
            </span>
            <span class="notification-item__body">
              <span class="notification-item__title">{{ item.title }}</span>
              <span class="notification-item__message">{{ item.message }}</span>
              <span class="notification-item__meta">
                {{ timeAgo(item.createdAt) }} · {{ actionLabel(item.action) }}
              </span>
            </span>
          </button>
          <button type="button" class="notification-item__dismiss" title="移除" @click="dismiss(item.id)">
            <i class="ri-close-line"></i>
          </button>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskNotificationsStore, type TaskNotificationItem } from '@/stores/taskNotifications'
import type { TaskNotificationAction, TaskNotificationLevel } from '@/types/task'

const emit = defineEmits<{
  open: [notification: TaskNotificationItem]
}>()

const notificationStore = useTaskNotificationsStore()
const { visibleNotifications, unreadCount, preferences } = storeToRefs(notificationStore)
const isOpen = ref(false)

const notifications = computed(() => visibleNotifications.value)
const unreadCountLabel = computed(() => unreadCount.value > 99 ? '99+' : String(unreadCount.value))
const headerHint = computed(() =>
  unreadCount.value > 0 ? `${unreadCount.value} 条未读` : '关键状态可回看'
)

function iconForLevel(level: TaskNotificationLevel) {
  const icons: Record<TaskNotificationLevel, string> = {
    progress: 'ri-pulse-line',
    attention: 'ri-question-answer-line',
    success: 'ri-checkbox-circle-line',
    warning: 'ri-error-warning-line',
    error: 'ri-close-circle-line',
  }
  return icons[level] || 'ri-notification-3-line'
}

function actionLabel(action: TaskNotificationAction) {
  const labels: Record<TaskNotificationAction, string> = {
    open_task: '打开任务',
    review_plan: '查看计划',
    answer_clarification: '补充信息',
    review_outputs: '查看成果',
  }
  return labels[action] || '打开任务'
}

function timeAgo(value: number) {
  if (!value) return '刚刚'
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - value)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return new Date(value * 1000).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function openNotification(item: TaskNotificationItem) {
  notificationStore.markRead(item.id)
  isOpen.value = false
  emit('open', item)
}

function markAllRead() {
  notificationStore.markAllRead()
}

function dismiss(id: string) {
  notificationStore.dismiss(id)
}

function updatePreference(key: keyof typeof preferences.value, value: boolean) {
  notificationStore.updatePreference(key, value)
}
</script>

<style scoped>
.notification-center {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.notification-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.notification-trigger:hover,
.notification-trigger--active {
  border-color: color-mix(in oklab, var(--color-primary) 44%, var(--border-default));
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.notification-trigger i {
  font-size: 18px;
  line-height: 1;
}

.notification-trigger__badge {
  position: absolute;
  top: -6px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 2px solid var(--bg-panel);
  border-radius: 999px;
  background: var(--color-error);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
}

.notification-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  width: min(390px, calc(100vw - 28px));
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-surface-elevated);
  box-shadow: var(--shadow-lg);
}

.notification-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 11px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-panel-header);
}

.notification-panel__head div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.notification-panel__head strong {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.2;
}

.notification-panel__head small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.text-btn {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.text-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.notification-preferences {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-panel);
}

.notification-preferences label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.notification-preferences input {
  width: 13px;
  height: 13px;
  accent-color: var(--color-primary);
}

.notification-list {
  max-height: min(520px, calc(100vh - 178px));
  overflow-y: auto;
  padding: 6px;
}

.notification-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 34px 20px;
  color: var(--text-tertiary);
  text-align: center;
}

.notification-empty i {
  color: var(--text-muted);
  font-size: 26px;
}

.notification-empty strong {
  color: var(--text-secondary);
  font-size: 13px;
}

.notification-empty span {
  font-size: 12px;
}

.notification-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
}

.notification-item + .notification-item {
  margin-top: 4px;
}

.notification-item:hover,
.notification-item--unread {
  border-color: var(--border-subtle);
  background: var(--bg-card);
}

.notification-item--unread::before {
  content: '';
  position: absolute;
  top: 16px;
  left: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary);
}

.notification-item__main {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  padding: 10px 0 10px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notification-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--bg-panel);
  color: var(--text-secondary);
}

.notification-item--attention .notification-item__icon,
.notification-item--warning .notification-item__icon {
  background: color-mix(in oklab, var(--color-warning) 16%, var(--bg-panel));
  color: var(--color-warning);
}

.notification-item--success .notification-item__icon {
  background: color-mix(in oklab, var(--color-success) 16%, var(--bg-panel));
  color: var(--color-success);
}

.notification-item--error .notification-item__icon {
  background: color-mix(in oklab, var(--color-error) 14%, var(--bg-panel));
  color: var(--color-error);
}

.notification-item--progress .notification-item__icon {
  background: color-mix(in oklab, var(--color-primary) 14%, var(--bg-panel));
  color: var(--color-primary);
}

.notification-item__body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.notification-item__title,
.notification-item__message,
.notification-item__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item__title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 750;
}

.notification-item__message {
  color: var(--text-secondary);
  font-size: 12px;
}

.notification-item__meta {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 10px;
}

.notification-item__dismiss {
  align-self: start;
  justify-self: center;
  width: 26px;
  height: 26px;
  margin-top: 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.notification-item__dismiss:hover {
  background: var(--bg-panel-hover);
  color: var(--text-primary);
}

@media (max-width: 620px) {
  .notification-center {
    align-self: flex-start;
  }

  .notification-panel {
    right: auto;
    left: 0;
  }
}
</style>
