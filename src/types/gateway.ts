export interface GatewayRequest {
  type: 'req'
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface GatewayResponse {
  type: 'res'
  id: string
  ok: boolean
  result?: Record<string, unknown>
  error?: { message: string; code?: string }
}

export interface GatewayEvent {
  type: 'event'
  event: string
  payload: Record<string, unknown>
  seq?: number
}

export type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent

// --- Event payloads ---

export interface TickSession {
  key: string
  kind?: string
  model?: string
  totalTokens?: number
  contextTokens?: number
  flags?: string[]
  updatedAt?: number
  agentName?: string
  agent?: string
  startTime?: number
  messageCount?: number
  cost?: number
}

export interface TickPayload {
  snapshot: { sessions: TickSession[] }
}

export interface LogPayload {
  id?: string
  timestamp?: number
  level?: string
  source?: string
  session?: string
  message?: string
  extra?: unknown
  data?: unknown
}

export interface ChatMessagePayload {
  id?: string
  conversation_id?: string
  from_agent?: string
  to_agent?: string
  content?: string
  message_type?: string
  metadata?: Record<string, unknown>
  created_at?: number
}

export interface AgentStreamPayload {
  stream: 'lifecycle' | 'assistant' | 'thinking' | 'tool' | 'tool_use' | 'tool_result'
  data: unknown
  sessionKey?: string
  runId?: string
  seq?: number
}

export interface ExecApprovalPayload {
  id: string
  sessionKey?: string
  sessionId?: string
  agentName?: string
  agentId?: string
  toolName?: string
  name?: string
  args?: Record<string, unknown>
  toolArgs?: Record<string, unknown>
  command?: string
  risk?: 'low' | 'medium' | 'high'
  createdAtMs?: number
  createdAt?: number
}

export interface TokenUsagePayload {
  model?: string
  sessionId?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cost?: number
}

export interface ChatPayload {
  sessionKey?: string
  message?: { role?: string; content?: string; timestamp?: number }
  state?: 'start' | 'delta' | 'final' | 'committed' | 'error'
}

export interface ContextCompactionPayload {
  message?: string
  percentage?: number
}

export interface ModelFallbackPayload {
  message?: string
  from?: string
  to?: string
}

export interface ErrorPayload {
  message?: string
  error?: unknown
}

// --- Request params ---

export interface ConnectParams {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    displayName: string
    version?: string
    platform?: string
    mode?: string
    instanceId?: string
  }
  role: string
  scopes: string[]
  caps: string[]
  auth?: { token: string }
}

export interface ChatSendParams {
  sessionKey: string
  message: string
  idempotencyKey?: string
}

export interface AgentInvokeParams {
  agentId: string
  message: string
  idempotencyKey?: string
  deliver?: boolean
}

export interface ExecApprovalResolveParams {
  id: string
  decision: 'approve' | 'deny'
}

// --- Response results ---

export interface ConnectResult {
  scopes?: string[]
  deviceToken?: string
}

export interface AgentInvokeResult {
  runId?: string
  sessionId?: string
}
