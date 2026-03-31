/**
 * Agent Chat API 客户端
 * 对接本地集成的后端服务 (localhost:18888)
 */

import type { Agent, ChatMessage, Conversation } from '@/types/mission-control'
import { MC_AGENT_ROLES, MC_AGENT_CORE_NAMES } from '@/types/mission-control'

const API_BASE = '/api'

// 扩展的消息类型，包含工具调用和token信息
export interface ExtendedChatMessage extends ChatMessage {
  token_usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  tool_calls?: Array<{
    id: string
    type: string
    function: {
      name: string
      arguments: string
    }
  }>
  tools_result?: Array<{
    tool_call_id: string
    role: string
    name: string
    content: string
  }>
  // Thinking/Reasoning 内容
  thinking?: string
  reasoning_content?: string
  cost?: number
  latency?: number
  model?: string
}

// Agent 统计信息
export interface AgentStats {
  message_count: number
  token_usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  tool_calls: number
  cost: number
  last_message_at: number
}

// 请求拦截器
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error('Response is not JSON')
    }

    return response.json()
  } catch (err) {
    console.error('[AgentChat API] Fetch error:', err)
    throw err
  }
}

/**
 * 获取 Agent 列表
 */
export async function getAgents(params?: { status?: string; role?: string; limit?: number }): Promise<{
  agents: Agent[]
  total: number
  page: number
  limit: number
}> {
  const query = new URLSearchParams()
  if (params?.status) query.append('status', params.status)
  if (params?.role) query.append('role', params.role)
  if (params?.limit) query.append('limit', String(params.limit))

  return apiFetch(`/agents?${query.toString()}`)
}

/**
 * 获取 Agent 详细信息（包含配置、token统计等）
 */
export async function getAgentDetail(agentName: string): Promise<{
  agent: Agent
  stats: AgentStats
  config?: any
}> {
  return apiFetch(`/agents/${agentName}/detail`)
}

/**
 * 获取消息列表（扩展版，包含token和工具调用）
 */
export async function getMessages(params: {
  conversation_id?: string
  from_agent?: string
  to_agent?: string
  limit?: number
  since?: number
  include_metadata?: boolean
}): Promise<{
  messages: ExtendedChatMessage[]
  total: number
  page: number
  limit: number
}> {
  const query = new URLSearchParams()
  if (params.conversation_id) query.append('conversation_id', params.conversation_id)
  if (params.from_agent) query.append('from_agent', params.from_agent)
  if (params.to_agent) query.append('to_agent', params.to_agent)
  if (params.limit) query.append('limit', String(params.limit))
  if (params.since) query.append('since', String(params.since))
  query.append('include_metadata', 'true')

  return apiFetch(`/chat/messages?${query.toString()}`)
}

/**
 * 获取 Agent 的消息（按Agent过滤）
 */
export async function getAgentMessages(agentName: string, limit: number = 50): Promise<{
  messages: ExtendedChatMessage[]
  stats: AgentStats
}> {
  return apiFetch(`/agents/${agentName}/messages?limit=${limit}&include_metadata=true`)
}

/**
 * 发送消息
 */
export async function sendMessage(payload: {
  from?: string
  to?: string | null
  content: string
  conversation_id?: string
  message_type?: 'text' | 'system' | 'handoff' | 'status' | 'command'
  forward?: boolean
  metadata?: any
}): Promise<{
  message: ExtendedChatMessage
  forward?: {
    attempted: boolean
    delivered: boolean
    reason?: string
    session?: string
    runId?: string
  }
}> {
  return apiFetch('/chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 获取会话列表
 */
export async function getConversations(params?: {
  agent?: string
  limit?: number
}): Promise<{
  conversations: Conversation[]
  total: number
  page: number
  limit: number
}> {
  const query = new URLSearchParams()
  if (params?.agent) query.append('agent', params.agent)
  if (params?.limit) query.append('limit', String(params.limit))

  return apiFetch(`/chat/conversations?${query.toString()}`)
}

/**
 * 获取 Agent 的活跃会话
 */
export async function getAgentConversation(agentName: string): Promise<{
  conversation: Conversation | null
  isActive: boolean
}> {
  return apiFetch(`/agents/${agentName}/conversation`)
}

/**
 * 创建 SSE 事件流连接
 */
export function createEventSource(): EventSource {
  return new EventSource('/api/events')
}

/**
 * 检查 API 是否可用
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/agents?limit=1')
    return response.ok
  } catch {
    return false
  }
}

/**
 * 将完整 Agent 名称转换为 Gateway 接受的简化名称
 * agent:ceo:main → ceo
 * claudecode → claudecode
 */
export function toGatewayAgentName(fullAgentName: string): string {
  const normalized = fullAgentName.toLowerCase().trim()
  let coreName = normalized
    .replace(/^agent:/, '')
    .replace(/^agent_/, '')
    .replace(/^agent-/, '')
    .replace(/:main$/, '')
    .replace(/_main$/, '')
    .replace(/-main$/, '')
    .replace(/:primary$/, '')
    .replace(/_primary$/, '')

  // 特殊处理 claudecode
  if (coreName === 'claudecode' || coreName === 'claude-code' || coreName === 'claude_code') {
    return 'claudecode'
  }

  return coreName
}

/**
 * 将简化 Agent 名称转换为完整格式
 * ceo → agent:ceo:main
 * claudecode → claudecode
 */
export function toFullAgentName(coreName: string): string {
  const normalized = coreName.toLowerCase().trim()

  // 检查是否是 claudecode
  if (normalized === 'claudecode' || normalized === 'claude-code' || normalized === 'claude_code') {
    return MC_AGENT_ROLES.CLAUDE_CODE
  }

  // 查找匹配的角色
  for (const [key, value] of Object.entries(MC_AGENT_CORE_NAMES)) {
    if (value === normalized) {
      return MC_AGENT_ROLES[key as keyof typeof MC_AGENT_ROLES]
    }
  }

  // 如果没有匹配，返回默认格式
  return `agent:${normalized}:main`
}
