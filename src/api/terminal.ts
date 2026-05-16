import { buildEventSourceUrl, buildWebSocketUrl, request } from './base'

export type TerminalSessionStatus = 'idle' | 'running' | 'failed' | 'cancelled'
export type TerminalEngine = 'codex' | 'claude'

export interface TerminalSession {
  id: string
  title: string
  engine: TerminalEngine
  args: string[]
  cwd: string
  status: TerminalSessionStatus
  turnCount: number
  startedAt: string
  lastEventAt: string
  activeTurnId: string | null
}

export interface TerminalEvent {
  id?: string
  sessionId: string
  type: 'system' | 'prompt' | 'turn:start' | 'turn:end' | 'data' | 'tool' | 'clear' | 'stop' | 'connected' | 'ping'
  stream?: 'stdout' | 'stderr' | 'stdin' | 'system'
  text?: string
  status?: string
  exitCode?: number | null
  signal?: string | null
  turnId?: string
  timestamp: number
  createdAt?: string
}

export interface TerminalSlashCommand {
  id: string
  source: 'terminal' | TerminalEngine
  command: string
  label: string
  description: string
}

export interface TerminalTuiSession {
  id: string
  title: string
  engine: TerminalEngine
  cwd: string
  status: 'running' | 'exited'
  startedAt: string
  lastEventAt: string
  exitCode: number | null
  signal: string | null
  clients: number
}

interface TerminalCapabilitiesResponse {
  success: boolean
  allowedCommands: TerminalEngine[]
  defaultCwd: string
  allowedRoots: string[]
  activeSessions: TerminalSession[]
}

interface TerminalCommandsResponse {
  success: boolean
  commands: TerminalSlashCommand[]
}

interface TerminalSessionResponse {
  success: boolean
  session: TerminalSession
  events?: TerminalEvent[]
}

interface TerminalSessionsResponse {
  success: boolean
  sessions: TerminalSession[]
}

interface TerminalTuiSessionsResponse {
  success: boolean
  sessions: TerminalTuiSession[]
}

interface TerminalTuiSessionResponse {
  success: boolean
  session: TerminalTuiSession
}

interface TerminalTuiTicketResponse {
  success: boolean
  ticket: string
  expiresAt: string
}

export interface CreateTerminalSessionPayload {
  engine: TerminalEngine
  args?: string[]
  cwd?: string
  title?: string
}

export const terminalApi = {
  getCapabilities() {
    return request<TerminalCapabilitiesResponse>('/api/terminal/capabilities')
  },

  listSessions() {
    return request<TerminalSessionsResponse>('/api/terminal/sessions')
  },

  listCommands() {
    return request<TerminalCommandsResponse>('/api/terminal/commands')
  },

  createSession(payload: CreateTerminalSessionPayload) {
    return request<TerminalSessionResponse>('/api/terminal/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getSession(sessionId: string) {
    return request<TerminalSessionResponse>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}`)
  },

  sendTurn(sessionId: string, prompt: string) {
    return request<TerminalSessionResponse>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/turns`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
  },

  runCommand(sessionId: string, command: string) {
    return request<TerminalSessionResponse>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/commands`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    })
  },

  clearSession(sessionId: string) {
    return request<TerminalSessionResponse>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/clear`, {
      method: 'POST',
    })
  },

  stopSession(sessionId: string, signal = 'SIGTERM') {
    return request<TerminalSessionResponse>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
      body: JSON.stringify({ signal }),
    })
  },

  buildSessionStreamUrl(sessionId: string) {
    return buildEventSourceUrl(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/stream`)
  },

  buildTuiWebSocketUrl(params: { engine: TerminalEngine; cwd: string; cols?: number; rows?: number }) {
    const query = new URLSearchParams({
      engine: params.engine,
      cwd: params.cwd,
      cols: String(params.cols || 120),
      rows: String(params.rows || 36),
    })
    const token = import.meta.env.VITE_API_AUTH_TOKEN || ''
    if (token) query.set('token', token)
    return buildWebSocketUrl(`/api/terminal/tui?${query.toString()}`)
  },

  listTuiSessions() {
    return request<TerminalTuiSessionsResponse>('/api/terminal/tui/sessions')
  },

  createTuiSession(payload: { engine: TerminalEngine; cwd: string; title?: string; cols?: number; rows?: number }) {
    return request<TerminalTuiSessionResponse>('/api/terminal/tui/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteTuiSession(sessionId: string) {
    return request<{ success: boolean }>(`/api/terminal/tui/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
  },

  createTuiTicket(sessionId: string) {
    return request<TerminalTuiTicketResponse>('/api/terminal/tui/tickets', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  },

  buildTuiAttachWebSocketUrl(params: { sessionId: string; ticket: string; cols?: number; rows?: number }) {
    const query = new URLSearchParams({
      sessionId: params.sessionId,
      ticket: params.ticket,
      cols: String(params.cols || 120),
      rows: String(params.rows || 36),
    })
    return buildWebSocketUrl(`/api/terminal/tui?${query.toString()}`)
  },
}
