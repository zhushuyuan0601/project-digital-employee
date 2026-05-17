import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  workbenchApi,
  type WorkbenchAgentConfig,
  type WorkbenchAttachment,
  type WorkbenchEngine,
  type WorkbenchEvent,
  type WorkbenchMessage,
  type WorkbenchPermission,
  type WorkbenchSession,
  type WorkbenchToolCall,
} from '@/api/workbench'

export interface WorkbenchColumnState {
  sessionId: string
  messages: WorkbenchMessage[]
  toolCalls: WorkbenchToolCall[]
  attachments: WorkbenchAttachment[]
  permissions: WorkbenchPermission[]
  streamConnected: boolean
  loading: boolean
  sending: boolean
  draft: string
  pendingAttachments: Array<{ name: string; path?: string; mimeType?: string; size?: number }>
  selectedMode: string
  permissionMode: string
  model: string
  effort: string
  lastError: string | null
}

function upsertById<T extends { id: string | number }>(items: T[], item: T): T[] {
  const index = items.findIndex((current) => current.id === item.id)
  if (index === -1) return [...items, item]
  const next = [...items]
  next[index] = { ...next[index], ...item }
  return next
}

function upsertToolCall(items: WorkbenchToolCall[], item: WorkbenchToolCall): WorkbenchToolCall[] {
  const index = items.findIndex((current) => current.tool_call_id === item.tool_call_id)
  if (index === -1) return [...items, item]
  const next = [...items]
  next[index] = { ...next[index], ...item }
  return next
}

function makeColumn(sessionId: string): WorkbenchColumnState {
  return {
    sessionId,
    messages: [],
    toolCalls: [],
    attachments: [],
    permissions: [],
    streamConnected: false,
    loading: false,
    sending: false,
    draft: '',
    pendingAttachments: [],
    selectedMode: 'default',
    permissionMode: 'bypass',
    model: '',
    effort: 'xhigh',
    lastError: null,
  }
}

export const useAgentWorkbenchStore = defineStore('agentWorkbench', () => {
  const sessions = ref<WorkbenchSession[]>([])
  const agentConfigs = ref<WorkbenchAgentConfig[]>([])
  const openSessionIds = ref<string[]>([])
  const activeSessionId = ref('')
  const columns = ref<Record<string, WorkbenchColumnState>>({})
  const loading = ref(false)
  const lastEventIdBySession = ref<Record<string, number>>({})
  const eventSources = new Map<string, EventSource>()

  const openColumns = computed(() =>
    openSessionIds.value
      .map((sessionId) => columns.value[sessionId])
      .filter(Boolean)
  )
  const activeSession = computed(() => sessions.value.find((session) => session.id === activeSessionId.value) || null)

  function sessionById(sessionId: string) {
    return sessions.value.find((session) => session.id === sessionId) || null
  }

  function ensureColumn(sessionId: string) {
    if (!columns.value[sessionId]) {
      columns.value = {
        ...columns.value,
        [sessionId]: makeColumn(sessionId),
      }
    }
    return columns.value[sessionId]
  }

  async function loadAgentConfigs() {
    const response = await workbenchApi.listAgentConfigs()
    agentConfigs.value = response.agentConfigs || []
  }

  async function loadSessions() {
    loading.value = true
    try {
      const response = await workbenchApi.listSessions({ limit: 160 })
      sessions.value = response.sessions || []
      if (!openSessionIds.value.length && sessions.value[0]) {
        await openSession(sessions.value[0].id)
      }
    } finally {
      loading.value = false
    }
  }

  async function createSession(payload: {
    title?: string
    agentId: string
    engine: WorkbenchEngine
    projectCwd?: string
    model?: string
    mode?: string
  }) {
    const response = await workbenchApi.createSession(payload)
    sessions.value = [response.session, ...sessions.value.filter((session) => session.id !== response.session.id)]
    await openSession(response.session.id)
    return response.session
  }

  async function openSession(sessionId: string) {
    const column = ensureColumn(sessionId)
    column.loading = true
    activeSessionId.value = sessionId
    if (!openSessionIds.value.includes(sessionId)) {
      openSessionIds.value = [...openSessionIds.value, sessionId]
    }
    try {
      const response = await workbenchApi.getSession(sessionId)
      sessions.value = upsertById(sessions.value, response.session)
      column.messages = response.messages || []
      column.toolCalls = response.toolCalls || []
      column.attachments = response.attachments || []
      column.permissions = response.permissions || []
      column.model = response.session.model || column.model
      column.lastError = response.session.last_error || null
      openStream(sessionId)
    } finally {
      column.loading = false
    }
  }

  function closeSession(sessionId: string) {
    closeStream(sessionId)
    openSessionIds.value = openSessionIds.value.filter((id) => id !== sessionId)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = openSessionIds.value[openSessionIds.value.length - 1] || ''
    }
  }

  async function sendMessage(sessionId: string) {
    const column = ensureColumn(sessionId)
    const content = column.draft.trim()
    if ((!content && column.pendingAttachments.length === 0) || column.sending) return
    const pendingAttachments = [...column.pendingAttachments]
    column.draft = ''
    column.pendingAttachments = []
    column.sending = true
    try {
      const response = await workbenchApi.sendMessage(sessionId, {
        content,
        attachments: pendingAttachments,
        mode: column.selectedMode,
        config: {
          permissionMode: column.permissionMode,
          model: column.model,
          effort: column.effort,
        },
      })
      column.messages = upsertById(column.messages, response.message)
      if (response.assistantMessage) {
        column.messages = upsertById(column.messages, response.assistantMessage)
      }
      const session = sessionById(sessionId)
      if (session) {
        sessions.value = upsertById(sessions.value, {
          ...session,
          status: 'running',
          active_run_id: response.runId,
        })
      }
    } catch (err) {
      column.draft = content
      column.pendingAttachments = pendingAttachments
      column.lastError = err instanceof Error ? err.message : '发送失败'
      throw err
    } finally {
      column.sending = false
    }
  }

  async function cancelSession(sessionId: string) {
    const response = await workbenchApi.cancelSession(sessionId)
    sessions.value = upsertById(sessions.value, response.session)
  }

  async function updateSessionConfig(sessionId: string, payload: {
    title?: string
    projectCwd?: string | null
    model?: string
    mode?: string
    config?: Record<string, unknown>
  }) {
    const response = await workbenchApi.updateSession(sessionId, payload)
    sessions.value = upsertById(sessions.value, response.session)
    const column = ensureColumn(sessionId)
    if (payload.model != null) column.model = payload.model
    if (payload.mode != null) column.selectedMode = payload.mode || 'default'
    return response.session
  }

  function applyEvent(event: WorkbenchEvent) {
    const column = ensureColumn(event.sessionId)
    if (event.eventId) {
      lastEventIdBySession.value = {
        ...lastEventIdBySession.value,
        [event.sessionId]: event.eventId,
      }
    }

    if (event.type === 'connected') {
      column.streamConnected = true
      return
    }
    if (event.type === 'ping') return

    const payload = event.payload || {}
    const eventSession = sessionById(event.sessionId)
    if (payload.session && typeof payload.session === 'object') {
      sessions.value = upsertById(sessions.value, payload.session as WorkbenchSession)
    }
    if (payload.message && typeof payload.message === 'object') {
      column.messages = upsertById(column.messages, payload.message as WorkbenchMessage)
    }
    if (payload.toolCall && typeof payload.toolCall === 'object') {
      column.toolCalls = upsertToolCall(column.toolCalls, payload.toolCall as WorkbenchToolCall)
    }
    if (payload.permission && typeof payload.permission === 'object') {
      column.permissions = upsertById(column.permissions, payload.permission as WorkbenchPermission)
    }

    if (event.type === 'session_created' && payload.session && typeof payload.session === 'object') {
      sessions.value = upsertById(sessions.value, payload.session as WorkbenchSession)
    }

    if (event.type === 'session_started' && eventSession) {
      sessions.value = upsertById(sessions.value, {
        ...eventSession,
        status: 'running',
        active_run_id: String(payload.runId || eventSession.active_run_id || ''),
      })
    }

    if (event.type === 'thinking') {
      column.lastError = null
    }

    if (event.type === 'content_delta') {
      if (payload.message && typeof payload.message === 'object') return
      const text = String(payload.text || '')
      const lastAssistant = [...column.messages].reverse().find((message) => message.role === 'assistant' && message.status === 'streaming')
      if (lastAssistant) {
        column.messages = upsertById(column.messages, {
          ...lastAssistant,
          content: payload.snapshot ? text : `${lastAssistant.content}${text}`,
        })
      }
    }

    if (event.type === 'turn_complete') {
      const session = sessionById(event.sessionId)
      if (session) {
        sessions.value = upsertById(sessions.value, {
          ...session,
          status: 'completed',
          active_run_id: null,
        })
      }
      column.messages = column.messages.map((message) => message.status === 'streaming' ? { ...message, status: 'completed' } : message)
      void openSession(event.sessionId)
    }

    if (event.type === 'error') {
      const message = String(payload.message || 'Workbench run failed')
      column.lastError = message
      const session = sessionById(event.sessionId)
      if (session) {
        sessions.value = upsertById(sessions.value, {
          ...session,
          status: payload.cancelled ? 'cancelled' : 'failed',
          active_run_id: null,
          last_error: message,
        })
      }
      column.messages = column.messages.map((item) => item.status === 'streaming' ? { ...item, status: 'failed' } : item)
    }
  }

  function openStream(sessionId: string) {
    if (eventSources.has(sessionId)) return
    const since = lastEventIdBySession.value[sessionId] || null
    const source = new EventSource(workbenchApi.buildSessionStreamUrl(sessionId, since))
    eventSources.set(sessionId, source)
    source.onopen = () => {
      ensureColumn(sessionId).streamConnected = true
    }
    source.onmessage = (event) => {
      try {
        applyEvent(JSON.parse(event.data) as WorkbenchEvent)
      } catch (err) {
        console.warn('[AgentWorkbench] stream parse failed', err)
      }
    }
    source.onerror = () => {
      ensureColumn(sessionId).streamConnected = false
    }
  }

  function closeStream(sessionId: string) {
    eventSources.get(sessionId)?.close()
    eventSources.delete(sessionId)
    if (columns.value[sessionId]) columns.value[sessionId].streamConnected = false
  }

  function closeAllStreams() {
    for (const sessionId of eventSources.keys()) closeStream(sessionId)
  }

  return {
    sessions,
    agentConfigs,
    openSessionIds,
    activeSessionId,
    activeSession,
    columns,
    openColumns,
    loading,
    sessionById,
    loadAgentConfigs,
    loadSessions,
    createSession,
    openSession,
    closeSession,
    sendMessage,
    cancelSession,
    updateSessionConfig,
    closeAllStreams,
  }
})
