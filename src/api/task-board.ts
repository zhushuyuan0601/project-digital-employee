/**
 * 任务看板 API 客户端
 * 对接 Mission Control 后端服务
 */

import type { Task, Project, Agent, TaskComment } from '@/types/task-board'

// 使用 Vite 代理
const API_BASE = '/mc-api'

// 请求封装
async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error ${response.status}: ${error}`)
  }

  return response.json()
}

/**
 * 获取任务列表
 */
export async function getTasks(params?: {
  status?: string
  assigned_to?: string
  priority?: string
  project_id?: number
  limit?: number
  offset?: number
}): Promise<{
  tasks: Task[]
  total: number
  page: number
  limit: number
}> {
  const query = new URLSearchParams()
  if (params?.status) query.append('status', params.status)
  if (params?.assigned_to) query.append('assigned_to', params.assigned_to)
  if (params?.priority) query.append('priority', params.priority)
  if (params?.project_id) query.append('project_id', String(params.project_id))
  if (params?.limit) query.append('limit', String(params.limit))
  if (params?.offset) query.append('offset', String(params.offset))

  return fetchAPI(`/tasks?${query.toString()}`)
}

/**
 * 获取项目列表
 */
export async function getProjects(): Promise<{ projects: Project[] }> {
  return fetchAPI('/projects')
}

/**
 * 获取 Agent 列表
 */
export async function getAgents(): Promise<{ agents: Agent[] }> {
  return fetchAPI('/agents')
}

/**
 * 获取单个任务详情
 */
export async function getTask(id: number): Promise<{ task: Task }> {
  return fetchAPI(`/tasks/${id}`)
}

/**
 * 创建任务
 */
export async function createTask(payload: Partial<Task>): Promise<{ task: Task }> {
  return fetchAPI('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * 更新任务
 */
export async function updateTask(id: number, payload: Partial<Task>): Promise<{ task: Task }> {
  return fetchAPI(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * 获取任务评论
 */
export async function getTaskComments(taskId: number): Promise<{ comments: TaskComment[] }> {
  return fetchAPI(`/tasks/${taskId}/comments`)
}

/**
 * 添加任务评论
 */
export async function addTaskComment(taskId: number, content: string): Promise<{ comment: TaskComment }> {
  return fetchAPI(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

/**
 * 获取聊天消息（用于追踪 Agent 对话）
 */
export async function getChatMessages(params?: {
  conversation_id?: string
  from_agent?: string
  to_agent?: string
  limit?: number
}): Promise<{
  messages: Array<{
    id: number
    from_agent: string
    to_agent: string | null
    content: string
    message_type: string
    created_at: number
  }>
}> {
  const query = new URLSearchParams()
  if (params?.conversation_id) query.append('conversation_id', params.conversation_id)
  if (params?.from_agent) query.append('from_agent', params.from_agent)
  if (params?.to_agent) query.append('to_agent', params.to_agent)
  if (params?.limit) query.append('limit', String(params.limit))

  return fetchAPI(`/chat/messages?${query.toString()}`)
}
