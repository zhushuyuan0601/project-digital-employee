import { buildEventSourceUrl, request } from './base'

export interface GroupChatRuntimeStatus {
  healthy: boolean
  running: number
  queued: number
  completedToday: number
  recentRuns?: Array<{ id: string; status: string; task_id?: string | null; agent_id: string }>
}

export interface GroupChatMessageRecord {
  id: string | number
  content?: string
  sender?: string
  senderId?: string
  senderName?: string
  timestamp?: number
  runId?: string
}

export interface QueueGroupAgentRunResponse {
  success: boolean
  run?: { id?: string }
  error?: string
}

export function getGroupChatStatus() {
  return request<{ status: GroupChatRuntimeStatus }>('/api/group-chat/status')
}

export function persistGroupChatMessage(payload: {
  content: string
  sender: 'user' | 'agent' | 'system'
  senderId: string
  senderName: string
}) {
  return request<{ success: boolean }>('/api/group-chat/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listGroupChatMessages(params: { roomId: string; limit?: number }) {
  const search = new URLSearchParams({ roomId: params.roomId })
  if (params.limit) search.set('limit', String(params.limit))
  return request<{ success: boolean; messages: GroupChatMessageRecord[] }>(`/api/group-chat/messages?${search.toString()}`)
}

export function clearGroupChatMessages(roomId: string) {
  return request<{ success: boolean }>(`/api/group-chat/messages?roomId=${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
  })
}

export function queueGroupAgentRun(agentId: string, payload: { content: string; roomId: string }) {
  return request<QueueGroupAgentRunResponse>(`/api/group-chat/agents/${encodeURIComponent(agentId)}/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cancelGroupChatRun(runId: string) {
  return request<{ success: boolean }>(`/api/group-chat/runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'POST',
  })
}

export function buildGroupChatEventStreamUrl() {
  return buildEventSourceUrl('/api/group-chat/events/stream')
}
