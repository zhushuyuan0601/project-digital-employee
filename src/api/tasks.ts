import { request } from './base'
import type { CreateTaskRequest, Task, TaskDispatch, TaskEvent, TaskOutput } from '@/types/task'

export interface TaskResponse {
  success: boolean
  task: Task
  dispatch?: TaskDispatch
  dispatches?: TaskDispatch[]
  run?: AgentRun
  runs?: AgentRun[]
  planRunId?: string
  summaryRunId?: string
}

export interface AgentRun {
  id: string
  task_id?: string | null
  subtask_id?: string | null
  agent_id: string
  role_name?: string | null
  claude_session_id?: string | null
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  cwd?: string | null
  prompt?: string | null
  result_summary?: string | null
  output_path?: string | null
  error?: string | null
  started_at?: number | null
  completed_at?: number | null
  created_at?: number
  updated_at?: number
}

export interface RuntimeAgentStat {
  agentId: string
  roleName: string
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  total: number
  avgDurationMs: number
}

export interface RuntimeConfig {
  runtime: string
  maxConcurrency: number
  maxTurns: number
  reportOnly: boolean
  cwd: string
  workspaceIsolation: boolean
  workspaceRoot: string
  allowedTools: string[]
  outputRoot: string
  model?: string
  mock: boolean
}

export interface AgentRunLog {
  id: number
  run_id: string
  task_id: string
  subtask_id?: string | null
  agent_id?: string | null
  type: string
  message: string
  payload_json?: Record<string, unknown> | null
  created_at: number
  created_at_ms?: number | null
}

interface RuntimeStatusResponse {
  success: boolean
  status: {
    runtime: string
    reportOnly: boolean
    maxConcurrency: number
    maxTurns: number
    workspaceIsolation: boolean
    workspaceRoot: string
    queued: number
    running: number
    completedToday: number
    failedToday: number
    avgDurationMs?: number
    avgQueueWaitMs?: number
    successRate?: number
    runCounts?: Record<string, number>
    agentStats?: RuntimeAgentStat[]
    failureReasons?: Array<{ reason: string; count: number }>
    recentRuns?: AgentRun[]
    dbPath?: string
    dbWritable?: boolean
    cwdExists?: boolean
    outputRootWritable?: boolean
    workspaceRootWritable?: boolean
    sdkAvailable?: boolean
    hasEnvFile?: boolean
    configSource?: string
    envOverrides?: Record<string, boolean>
    healthy: boolean
  }
}

interface RuntimeConfigResponse {
  success: boolean
  config: RuntimeConfig
  status?: RuntimeStatusResponse['status']
}

interface RunsResponse {
  success: boolean
  runs: AgentRun[]
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

interface TaskOutputResponse {
  success: boolean
  output: TaskOutput
}

interface OpenDirectoryResponse {
  success: boolean
  path: string
  workspaceAvailable?: boolean
}

interface AgentRunLogsResponse {
  success: boolean
  logs: AgentRunLog[]
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

  getTask(taskId: string, params: { includeEvents?: boolean; eventLimit?: number; beforeEventId?: number } = {}) {
    const search = new URLSearchParams()
    if (params.includeEvents) search.set('includeEvents', '1')
    if (params.eventLimit) search.set('eventLimit', String(params.eventLimit))
    if (params.beforeEventId) search.set('beforeEventId', String(params.beforeEventId))
    const query = search.toString()
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}${query ? `?${query}` : ''}`)
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

  confirmPlan(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/plan/confirm`, {
      method: 'POST',
    })
  },

  submitPlanFeedback(taskId: string, feedback: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/plan/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  },

  submitClarifications(taskId: string, answers: Record<string, string>) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/clarifications`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
  },

  runWorkflow(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/workflow/run`, {
      method: 'POST',
    })
  },

  runPlan(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/plan/run`, {
      method: 'POST',
    })
  },

  runSubtasks(taskId: string) {
    return request<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}/subtasks/run`, {
      method: 'POST',
    })
  },

  runSubtask(subtaskId: string) {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/run`, {
      method: 'POST',
    })
  },

  retrySubtask(subtaskId: string) {
    return request<TaskResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/retry`, {
      method: 'POST',
    })
  },

  skipWorkflowNode(subtaskId: string, reason = '') {
    return request<TaskResponse>(`/api/workflow-nodes/${encodeURIComponent(subtaskId)}/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
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

  listEvents(taskId: string, params: { limit?: number; beforeId?: number } = {}) {
    const search = new URLSearchParams()
    if (params.limit) search.set('limit', String(params.limit))
    if (params.beforeId) search.set('beforeId', String(params.beforeId))
    const query = search.toString()
    return request<TaskEventsResponse>(`/api/tasks/${encodeURIComponent(taskId)}/events${query ? `?${query}` : ''}`)
  },

  runtimeStatus() {
    return request<RuntimeStatusResponse>('/api/runtime/status')
  },

  runtimeConfig() {
    return request<RuntimeConfigResponse>('/api/runtime/config')
  },

  updateRuntimeConfig(payload: Partial<RuntimeConfig>) {
    return request<RuntimeConfigResponse>('/api/runtime/config', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  listRuns(params: { taskId?: string; subtaskId?: string; status?: string; limit?: number } = {}) {
    const search = new URLSearchParams()
    if (params.taskId) search.set('taskId', params.taskId)
    if (params.subtaskId) search.set('subtaskId', params.subtaskId)
    if (params.status) search.set('status', params.status)
    if (params.limit) search.set('limit', String(params.limit))
    const query = search.toString()
    return request<RunsResponse>(`/api/runs${query ? `?${query}` : ''}`)
  },

  cancelRun(runId: string) {
    return request<{ success: boolean; result: unknown; run: AgentRun }>(`/api/runs/${encodeURIComponent(runId)}/cancel`, {
      method: 'POST',
    })
  },

  listRunLogs(runId: string, params: { limit?: number; beforeId?: number } = {}) {
    const search = new URLSearchParams()
    if (params.limit) search.set('limit', String(params.limit))
    if (params.beforeId) search.set('beforeId', String(params.beforeId))
    const query = search.toString()
    return request<AgentRunLogsResponse>(`/api/runs/${encodeURIComponent(runId)}/logs${query ? `?${query}` : ''}`)
  },

  listSubtaskLogs(subtaskId: string, params: { limit?: number; beforeId?: number } = {}) {
    const search = new URLSearchParams()
    if (params.limit) search.set('limit', String(params.limit))
    if (params.beforeId) search.set('beforeId', String(params.beforeId))
    const query = search.toString()
    return request<AgentRunLogsResponse>(`/api/subtasks/${encodeURIComponent(subtaskId)}/logs${query ? `?${query}` : ''}`)
  },

  listOutputs(params: { taskId?: string; agentId?: string; status?: string } = {}) {
    const search = new URLSearchParams()
    if (params.taskId) search.set('taskId', params.taskId)
    if (params.agentId) search.set('agentId', params.agentId)
    if (params.status) search.set('status', params.status)
    const query = search.toString()
    return request<TaskOutputsResponse>(`/api/tasks/outputs${query ? `?${query}` : ''}`)
  },

  updateOutputStatus(outputId: number, status: TaskOutput['status']) {
    return request<TaskOutputResponse>(`/api/tasks/outputs/${encodeURIComponent(String(outputId))}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  openFileDirectory(path: string) {
    return request<OpenDirectoryResponse>('/api/files/open-directory', {
      method: 'POST',
      body: JSON.stringify({ path }),
    })
  },

  openTaskWorkspace(taskId: string) {
    return request<OpenDirectoryResponse>(`/api/tasks/${encodeURIComponent(taskId)}/open-workspace`, {
      method: 'POST',
    })
  },
}
