/**
 * 任务看板类型定义
 */

// 任务状态
export type TaskStatus =
  | 'inbox'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'quality_review'
  | 'done'
  | 'awaiting_owner'

// 任务优先级
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent'

// Agent 状态
export type AgentStatus = 'offline' | 'idle' | 'busy' | 'error'

// 任务
export interface Task {
  id: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to?: string
  created_by: string
  created_at: number
  updated_at: number
  due_date?: number
  estimated_hours?: number
  actual_hours?: number
  tags?: string[]
  metadata?: Record<string, any>
  aegisApproved?: boolean
  project_id?: number
  project_ticket_no?: number
  project_name?: string
  project_prefix?: string
  ticket_ref?: string
  github_issue_number?: number
  github_repo?: string
  github_branch?: string
  github_pr_number?: number
  github_pr_state?: string
}

// 项目
export interface Project {
  id: number
  name: string
  slug: string
  description?: string
  ticket_prefix: string
  status: 'active' | 'archived'
  task_count?: number
  assigned_agents?: string[]
  color?: string
}

// Agent
export interface Agent {
  id: number
  name: string
  role: string
  status: AgentStatus
  last_seen?: number
  last_activity?: string
  taskStats?: {
    total: number
    assigned: number
    in_progress: number
    completed: number
  }
}

// 任务评论
export interface TaskComment {
  id: number
  task_id: number
  author: string
  content: string
  created_at: number
  parent_id?: number
  mentions?: string[]
  replies?: TaskComment[]
}

// 聊天消息
export interface ChatMessage {
  id: number
  conversation_id: string
  from_agent: string
  to_agent: string | null
  content: string
  message_type: 'text' | 'system' | 'handoff' | 'status' | 'command'
  created_at: number
}

// 看板列配置
export interface BoardColumn {
  key: TaskStatus
  title: string
  color: string
}

// 看板列配置（默认）
export const BOARD_COLUMNS: BoardColumn[] = [
  { key: 'inbox', title: '收件箱', color: '#6b7280' },
  { key: 'assigned', title: '已分配', color: '#3b82f6' },
  { key: 'in_progress', title: '进行中', color: '#f59e0b' },
  { key: 'review', title: '审核中', color: '#8b5cf6' },
  { key: 'quality_review', title: '质量审核', color: '#6366f1' },
  { key: 'done', title: '已完成', color: '#10b981' },
]

// 优先级配置
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: '低', color: '#22c55e' },
  medium: { label: '中', color: '#eab308' },
  high: { label: '高', color: '#f97316' },
  critical: { label: '紧急', color: '#ef4444' },
  urgent: { label: '特急', color: '#dc2626' },
}

// Agent 显示配置
export interface AgentDisplayConfig {
  id: string
  name: string
  displayName: string
  role: string
  icon: string
  color: string
}

// 目标 Agent 列表
export const TARGET_AGENTS: AgentDisplayConfig[] = [
  {
    id: 'ceo',
    name: 'agent:ceo:main',
    displayName: '小呦',
    role: '项目统筹',
    icon: '/avatars/avatar-xiaomu.jpeg',
    color: '#e6a23c',
  },
  {
    id: 'researcher',
    name: 'agent:researcher:main',
    displayName: '研究员',
    role: '调研分析',
    icon: '/avatars/avatar-xiaoyan.jpeg',
    color: '#67c23a',
  },
  {
    id: 'pm',
    name: 'agent:pm:main',
    displayName: '产品经理',
    role: '产品设计',
    icon: '/avatars/avatar-xiaochan.jpeg',
    color: '#f56c6c',
  },
  {
    id: 'tech-lead',
    name: 'agent:tech-lead:main',
    displayName: '研发工程师',
    role: '技术开发',
    icon: '/avatars/avatar-xiaokai.jpeg',
    color: '#409eff',
  },
  {
    id: 'team-qa',
    name: 'agent:team-qa:main',
    displayName: '测试工程师',
    role: '质量保证',
    icon: '/avatars/avatar-xiaoce.jpeg',
    color: '#909399',
  },
  {
    id: 'claudecode',
    name: 'claudecode',
    displayName: 'Claude Code',
    role: '代码助手',
    icon: '',
    color: '#d4a574',
  },
]
