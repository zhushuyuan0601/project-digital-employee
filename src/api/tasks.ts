import { request } from './base'
import type { CreateTaskRequest, Task, TaskDispatch, TaskEvent, TaskOutput } from '@/types/task'

export interface TaskResponse {
  success: boolean
  task: Task
  dispatch?: TaskDispatch
  dispatches?: TaskDispatch[]
}

interface TasksResponse {
  success: boolean
  tasks: Task[]
}

interface TaskEventsResponse {
  success: boolean
  events: TaskEvent[]
}

interface TaskOutputsResponse {
  success: boolean
  outputs: TaskOutput[]
}

export const taskApi = {
  listTasks(params: { status?: string; limit?: number } = {}) {
    const search = new URLSearchParams()
    if (params.status) search.set('status', params.status)
    if (params.limit) search.set('limit', String(params.limit))
    const query = search.toString()
    return request<TasksResponse>(`/api/tasks${query ? `?${query}` : ''}`)
  },

  createTask(payload: CreateTaskRequest) {
    return request<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getTask(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}`)
  },

  applyPlan(taskId: string, content: string | Record<string, unknown>) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan: content }),
    })
  },

  dispatchTask(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/dispatch`, {
      method: 'POST',
    })
  },

  retrySubtask(subtaskId: string) {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/retry`, {
      method: 'POST',
    })
  },

  recordTaskDispatchResult(taskId: string, payload: { phase?: 'plan' | 'summary'; ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/dispatch-result`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  recordSubtaskDispatchResult(subtaskId: string, payload: { ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/dispatch-result`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  recordSubtaskAgentEvent(subtaskId: string, payload: { eventType: 'start' | 'assistant' | 'final' | 'done' | 'error'; message?: string; payload?: Record<string, unknown> }) {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/agent-event`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  completeSubtask(subtaskId: string, resultSummary = '') {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ resultSummary }),
    })
  },

  finalizeTask(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/finalize`, {
      method: 'POST',
    })
  },

  completeTask(taskId: string, summary = '') {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ summary }),
    })
  },

  scanOutputs(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/outputs/scan`, {
      method: 'POST',
    })
  },

  listEvents(taskId: string) {
    return request<TaskEventsResponse>(`/api/tasks/${encodeURIComponent(taskId)}/events`)
  },

  listOutputs(params: { taskId?: string; agentId?: string; status?: string } = {}) {
    const search = new URLSearchParams()
    if (params.taskId) search.set('taskId', params.taskId)
    if (params.agentId) search.set('agentId', params.agentId)
    if (params.status) search.set('status', params.status)
    const query = search.toString()
    return request<TaskOutputsResponse>(`/api/tasks/outputs${query ? `?${query}` : ''}`)
  },
}
