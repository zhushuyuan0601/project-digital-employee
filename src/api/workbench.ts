import { buildEventSourceUrl, request } from './base'

export type WorkbenchEngine = 'claudecode' | 'codex'
export type WorkbenchSessionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface WorkbenchSession {
  id: string
  title: string
  agent_id: string
  engine: WorkbenchEngine
  project_cwd: string | null
  status: WorkbenchSessionStatus
  model: string | null
  mode: string | null
  config_json: Record<string, unknown>
  active_run_id: string | null
  last_error: string | null
  created_at: number
  updated_at: number
  started_at: number | null
  completed_at: number | null
  last_event_id: number
}

export interface WorkbenchMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: string
  turn_id: string | null
  metadata_json: Record<string, unknown>
  created_at: number
}

export interface WorkbenchToolCall {
  id: number
  session_id: string
  turn_id: string | null
  tool_call_id: string
  name: string
  category: string
  status: string
  input_json: unknown
  output_json: unknown
  content: string | null
  error: string | null
  created_at: number
  updated_at: number
}

export interface WorkbenchAttachment {
  id: number
  session_id: string
  message_id: string | null
  name: string
  path: string | null
  mime_type: string | null
  size: number
  created_at: number
}

export interface WorkbenchPermission {
  id: number
  session_id: string
  tool_call_id: string | null
  status: string
  options_json: unknown[]
  response_json: unknown
  created_at: number
  resolved_at: number | null
}

export interface WorkbenchAgentConfig {
  agent_id: string
  display_name: string
  engine: WorkbenchEngine
  default_model: string | null
  default_cwd: string | null
  enabled: boolean
  config_json: Record<string, unknown>
}

export interface WorkbenchEvent {
  eventId?: number
  sessionId: string
  type: string
  payload: Record<string, unknown>
  createdAt?: number
  createdAtMs?: number
  replay?: boolean
}

export interface WorkbenchDetailResponse {
  success: boolean
  session: WorkbenchSession
  messages: WorkbenchMessage[]
  toolCalls: WorkbenchToolCall[]
  attachments: WorkbenchAttachment[]
  permissions: WorkbenchPermission[]
  activeRun: string | null
}

export const workbenchApi = {
  listAgentConfigs() {
    return request<{ success: boolean; agentConfigs: WorkbenchAgentConfig[] }>('/api/workbench/agent-configs')
  },

  selectDirectory(payload: { defaultPath?: string | null } = {}) {
    return request<{ success: boolean; path: string }>('/api/workbench/select-directory', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  selectFiles(payload: { defaultPath?: string | null; multiple?: boolean } = {}) {
    return request<{ success: boolean; files: Array<{ name: string; path: string; size: number; mimeType: string | null }> }>('/api/workbench/select-files', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  listSessions(params: { engine?: string; status?: string; search?: string; limit?: number } = {}) {
    const query = new URLSearchParams()
    if (params.engine) query.set('engine', params.engine)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.limit) query.set('limit', String(params.limit))
    const suffix = query.toString() ? `?${query}` : ''
    return request<{ success: boolean; sessions: WorkbenchSession[] }>(`/api/workbench/sessions${suffix}`)
  },

  createSession(payload: {
    title?: string
    agentId: string
    engine: WorkbenchEngine
    projectCwd?: string
    model?: string
    mode?: string
    config?: Record<string, unknown>
  }) {
    return request<{ success: boolean; session: WorkbenchSession }>('/api/workbench/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getSession(sessionId: string) {
    return request<WorkbenchDetailResponse>(`/api/workbench/sessions/${encodeURIComponent(sessionId)}`)
  },

  updateSession(sessionId: string, payload: {
    title?: string
    projectCwd?: string | null
    model?: string
    mode?: string
    config?: Record<string, unknown>
  }) {
    return request<{ success: boolean; session: WorkbenchSession }>(`/api/workbench/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  sendMessage(sessionId: string, payload: {
    content: string
    attachments?: Array<{ name: string; path?: string; mimeType?: string; size?: number }>
    mode?: string
    config?: Record<string, unknown>
  }) {
    return request<{ success: boolean; message: WorkbenchMessage; assistantMessage: WorkbenchMessage; runId: string }>(`/api/workbench/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  cancelSession(sessionId: string) {
    return request<{ success: boolean; session: WorkbenchSession }>(`/api/workbench/sessions/${encodeURIComponent(sessionId)}/cancel`, {
      method: 'POST',
    })
  },

  respondPermission(permissionId: number, payload: { decision: 'approve' | 'deny'; optionId?: string; remember?: boolean }) {
    return request<{ success: boolean; permission: WorkbenchPermission }>(`/api/workbench/permissions/${permissionId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  buildSessionStreamUrl(sessionId: string, since?: number | null) {
    const suffix = since ? `?since=${encodeURIComponent(String(since))}` : ''
    return buildEventSourceUrl(`/api/workbench/sessions/${encodeURIComponent(sessionId)}/stream${suffix}`)
  },
}
