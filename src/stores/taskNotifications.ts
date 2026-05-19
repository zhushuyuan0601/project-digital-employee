import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  TaskEvent,
  TaskNotificationAction,
  TaskNotificationLevel,
  TaskNotificationPayload,
  TaskNotificationPriority,
} from '@/types/task'

const STORAGE_KEY = 'task_notification_state_v1'
const MAX_NOTIFICATIONS = 120
const TOAST_SUPPRESSION_MS = 5000

type PersistedState = {
  readIds?: string[]
  dismissedIds?: string[]
  toastIds?: string[]
  preferences?: Partial<TaskNotificationPreferences>
}

export type TaskNotificationPreferences = {
  progress: boolean
  success: boolean
  attention: boolean
  desktop: boolean
}

export type TaskNotificationItem = {
  id: string
  eventId: number | string
  dbEventId?: number | null
  taskId: string
  subtaskId?: string | null
  agentId?: string | null
  level: TaskNotificationLevel
  priority: TaskNotificationPriority
  title: string
  message: string
  action: TaskNotificationAction
  toast: boolean
  desktop: boolean
  dedupeKey: string
  createdAt: number
  sourceType: string
  sourceEventId?: number | string
  read: boolean
  dismissed: boolean
}

const DEFAULT_PREFERENCES: TaskNotificationPreferences = {
  progress: true,
  success: true,
  attention: true,
  desktop: false,
}

function loadPersistedState(): PersistedState {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as PersistedState : {}
  } catch {
    return {}
  }
}

function notificationFromEvent(event: TaskEvent): TaskNotificationPayload | null {
  if (event.type !== 'task.notification') return null
  const payload = event.payload_json && typeof event.payload_json === 'object' ? event.payload_json : {}
  const notification = (payload as { notification?: unknown }).notification
  if (!notification || typeof notification !== 'object') return null
  const candidate = notification as Partial<TaskNotificationPayload>
  if (
    candidate.version !== 1 ||
    !candidate.taskId ||
    !candidate.title ||
    !candidate.dedupeKey ||
    !candidate.level ||
    !candidate.priority ||
    !candidate.action
  ) {
    return null
  }
  return candidate as TaskNotificationPayload
}

function notificationId(payload: TaskNotificationPayload, event: TaskEvent) {
  return `${payload.dedupeKey}:${payload.sourceEventId || event.id || payload.createdAt}`
}

function compactMessage(value: string, fallback: string) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return normalized.length > 96 ? `${normalized.slice(0, 95)}...` : normalized
}

function notificationSortId(item: TaskNotificationItem) {
  const id = Number(item.dbEventId ?? item.eventId)
  return Number.isFinite(id) ? id : 0
}

export const useTaskNotificationsStore = defineStore('taskNotifications', () => {
  const persisted = loadPersistedState()
  const notifications = ref<TaskNotificationItem[]>([])
  const readIds = ref(new Set((persisted.readIds || []).map(String)))
  const dismissedIds = ref(new Set((persisted.dismissedIds || []).map(String)))
  const toastIds = ref(new Set((persisted.toastIds || []).map(String)))
  const preferences = ref<TaskNotificationPreferences>({
    ...DEFAULT_PREFERENCES,
    ...(persisted.preferences || {}),
  })
  const lastToastAtByDedupeKey = ref<Record<string, number>>({})

  const visibleNotifications = computed(() =>
    notifications.value.filter(item => !item.dismissed)
  )

  const unreadCount = computed(() =>
    visibleNotifications.value.filter(item => !item.read).length
  )

  const latestUnread = computed(() =>
    visibleNotifications.value.find(item => !item.read) || null
  )

  function persistState() {
    if (typeof localStorage === 'undefined') return
    const payload: PersistedState = {
      readIds: [...readIds.value].slice(-MAX_NOTIFICATIONS),
      dismissedIds: [...dismissedIds.value].slice(-MAX_NOTIFICATIONS),
      toastIds: [...toastIds.value].slice(-MAX_NOTIFICATIONS),
      preferences: preferences.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function shouldKeepByPreferences(item: TaskNotificationItem) {
    if (item.level === 'progress') return preferences.value.progress
    if (item.level === 'success') return preferences.value.success
    if (['attention', 'warning', 'error'].includes(item.level)) return preferences.value.attention
    return true
  }

  function upsertFromEvent(event: TaskEvent) {
    const payload = notificationFromEvent(event)
    if (!payload) return null
    const id = notificationId(payload, event)
    const item: TaskNotificationItem = {
      id,
      eventId: event.id,
      dbEventId: event.dbEventId ?? (typeof event.id === 'number' ? event.id : null),
      taskId: payload.taskId,
      subtaskId: payload.subtaskId ?? null,
      agentId: payload.agentId ?? null,
      level: payload.level,
      priority: payload.priority,
      title: compactMessage(payload.title, '任务通知'),
      message: compactMessage(payload.message || event.message, payload.sourceType),
      action: payload.action,
      toast: Boolean(payload.toast),
      desktop: Boolean(payload.desktop),
      dedupeKey: payload.dedupeKey,
      createdAt: Number(payload.createdAt || event.created_at || 0),
      sourceType: payload.sourceType,
      sourceEventId: payload.sourceEventId,
      read: readIds.value.has(id),
      dismissed: dismissedIds.value.has(id),
    }

    const index = notifications.value.findIndex(existing => existing.id === id)
    if (index >= 0) {
      notifications.value[index] = { ...notifications.value[index], ...item }
    } else {
      notifications.value.unshift(item)
    }

    notifications.value = notifications.value
      .sort((a, b) => b.createdAt - a.createdAt || notificationSortId(b) - notificationSortId(a) || String(b.eventId).localeCompare(String(a.eventId)))
      .slice(0, MAX_NOTIFICATIONS)

    return item
  }

  function ingestEvents(events: TaskEvent[]) {
    const items: TaskNotificationItem[] = []
    for (const event of events) {
      const item = upsertFromEvent(event)
      if (item) items.push(item)
    }
    return items
  }

  function shouldToast(item: TaskNotificationItem) {
    if (!item.toast || !shouldKeepByPreferences(item) || toastIds.value.has(item.id)) return false
    const lastAt = lastToastAtByDedupeKey.value[item.dedupeKey] || 0
    return Date.now() - lastAt > TOAST_SUPPRESSION_MS
  }

  function markToasted(id: string) {
    const item = notifications.value.find(notification => notification.id === id)
    if (!item) return
    toastIds.value.add(id)
    lastToastAtByDedupeKey.value = {
      ...lastToastAtByDedupeKey.value,
      [item.dedupeKey]: Date.now(),
    }
    persistState()
  }

  function markRead(id: string) {
    readIds.value.add(id)
    notifications.value = notifications.value.map(item =>
      item.id === id ? { ...item, read: true } : item
    )
    persistState()
  }

  function markAllRead() {
    for (const item of visibleNotifications.value) {
      readIds.value.add(item.id)
    }
    notifications.value = notifications.value.map(item => ({ ...item, read: true }))
    persistState()
  }

  function dismiss(id: string) {
    dismissedIds.value.add(id)
    notifications.value = notifications.value.map(item =>
      item.id === id ? { ...item, dismissed: true, read: true } : item
    )
    readIds.value.add(id)
    persistState()
  }

  function clearDismissed() {
    const hiddenIds = notifications.value
      .filter(item => item.dismissed)
      .map(item => item.id)
    for (const id of hiddenIds) {
      dismissedIds.value.delete(id)
    }
    notifications.value = notifications.value.map(item => ({ ...item, dismissed: false }))
    persistState()
  }

  function updatePreference(key: keyof TaskNotificationPreferences, value: boolean) {
    preferences.value = {
      ...preferences.value,
      [key]: value,
    }
    persistState()
  }

  return {
    notifications,
    visibleNotifications,
    unreadCount,
    latestUnread,
    preferences,
    ingestEvents,
    shouldToast,
    markToasted,
    markRead,
    markAllRead,
    dismiss,
    clearDismissed,
    updatePreference,
  }
})
