/**
 * Mission Control API 客户端
 * 对接 localhost:3100 的 mission-control 后端服务
 */

import type { Agent, ChatMessage, Conversation } from '@/types/mission-control'

const MC_BASE_URL = '/mc-api'

// 登录 Mission Control（通过 Vite 代理）
export async function loginMC(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('/mc-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[MissionControl] Login failed:', error)
      return false
    }

    const data = await response.json()
    return true
  } catch (err) {
    console.error('[MissionControl] Login error:', err)
    return false
  }
}

// 请求拦截器
async function mcFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${MC_BASE_URL}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      // 注意：认证由 Vite 代理处理，不设置 credentials
    })

    const contentType = response.headers.get('content-type')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[MissionControl API] Error:', response.status, errorText.slice(0, 300))
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`)
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[MissionControl API] Not JSON:', text.slice(0, 300))
      throw new Error('Response is not JSON')
    }

    return response.json()
  } catch (err) {
    console.error('[MissionControl API] Fetch error:', err)
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

  return mcFetch(`/api/agents?${query.toString()}`)
}

/**
 * 获取消息列表
 */
export async function getMessages(params: {
  conversation_id?: string
  from_agent?: string
  to_agent?: string
  limit?: number
  since?: number
}): Promise<{
  messages: ChatMessage[]
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

  return mcFetch(`/api/chat/messages?${query.toString()}`)
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
  message: ChatMessage
  forward?: {
    attempted: boolean
    delivered: boolean
    reason?: string
    session?: string
    runId?: string
  }
}> {
  return mcFetch('/api/chat/messages', {
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

  return mcFetch(`/api/chat/conversations?${query.toString()}`)
}

/**
 * 更新 Agent 状态
 */
export async function updateAgent(payload: {
  name: string
  status?: 'offline' | 'idle' | 'busy' | 'error'
  last_activity?: string
  config?: any
}): Promise<{ success: boolean }> {
  return mcFetch('/api/agents', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * 创建 SSE 事件流连接
 * 注意：认证由 Vite 代理处理
 */
export function createEventSource(): EventSource {
  return new EventSource('/mc-events')
}

// 检查 API 是否可用（用于调试）
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch('/mc-api/agents?limit=1')
    return response.ok
  } catch {
    return false
  }
}
