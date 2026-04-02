/**
 * Mission Control 类型定义
 */

// Agent 状态
export type AgentStatus = 'offline' | 'idle' | 'busy' | 'error'

// Agent 定义
export interface Agent {
  id: number
  name: string
  role: string
  session_key?: string
  soul_content?: string
  status: AgentStatus
  last_seen?: number
  last_activity?: string
  created_at: number
  updated_at: number
  config?: any
  taskStats?: {
    total: number
    assigned: number
    in_progress: number
    completed: number
  }
}

// 聊天消息
export interface ChatMessage {
  id: number
  conversation_id: string
  from_agent: string
  to_agent: string | null
  content: string
  message_type: 'text' | 'system' | 'handoff' | 'status' | 'command' | 'tool_call' | 'thinking'
  metadata?: any
  read_at?: number
  created_at: number
  pendingStatus?: 'sending' | 'sent' | 'failed'
  // Thinking/Reasoning 内容
  thinking?: string
  reasoning_content?: string
}

// 会话
export interface Conversation {
  id: string
  last_message_at: number
  message_count: number
  participant_count: number
  unread_count: number
  last_message?: ChatMessage
  session?: {
    sessionId: string
    sessionKind: string
    agent: string
    active: boolean
    model?: string
    tokens?: string
    age?: string
    workingDir?: string
    displayName?: string
    colorTag?: string
    prefKey: string
    sessionKey?: string
  }
}

// SSE 事件
export interface ServerEvent {
  type: string
  data: any
  timestamp: number
}

// 预定义的 Mission Control Agent 角色映射
// 注意：这些名称需要与 OpenClaw Gateway 发送的名称兼容
// Gateway 可能发送: "ceo", "agent:ceo:main", "agent_ceo" 等格式
export const MC_AGENT_ROLES = {
  CEO: 'agent:ceo:main',
  RESEARCHER: 'agent:researcher:main',
  PM: 'agent:pm:main',
  TECH_LEAD: 'agent:tech-lead:main',
  TEAM_QA: 'agent:team-qa:main',
  CLAUDE_CODE: 'claudecode',
} as const

// Agent 核心名称（用于匹配 Gateway 发送的简化名称）
export const MC_AGENT_CORE_NAMES = {
  CEO: 'ceo',
  RESEARCHER: 'researcher',
  PM: 'pm',
  TECH_LEAD: 'tech-lead',
  TEAM_QA: 'team-qa',
  CLAUDE_CODE: 'claudecode',
} as const

// Agent 显示配置
export interface AgentDisplayConfig {
  id: string
  name: string
  displayName: string
  role: string
  roleTag: string
  icon: string
  color: string
  description: string
}

// Agent 显示配置映射
export const AGENT_DISPLAY_CONFIG: Record<string, AgentDisplayConfig> = {
  [MC_AGENT_ROLES.CEO]: {
    id: 'ceo',
    name: 'agent:ceo:main',
    displayName: '小呦',
    role: 'agent:ceo:main',
    roleTag: '项目统筹',
    icon: '/avatars/avatar-xiaomu.jpeg',
    color: '#e6a23c',
    description: '项目统筹 Agent，负责任务分配和协调',
  },
  [MC_AGENT_ROLES.RESEARCHER]: {
    id: 'researcher',
    name: 'agent:researcher:main',
    displayName: '研究员',
    role: 'agent:researcher:main',
    roleTag: '调研分析',
    icon: '/avatars/avatar-xiaoyan.jpeg',
    color: '#67c23a',
    description: '调研分析 Agent，负责信息收集和研究',
  },
  [MC_AGENT_ROLES.PM]: {
    id: 'pm',
    name: 'agent:pm:main',
    displayName: '产品经理',
    role: 'agent:pm:main',
    roleTag: '产品设计',
    icon: '/avatars/avatar-xiaochan.jpeg',
    color: '#f56c6c',
    description: '产品设计 Agent，负责产品规划和设计',
  },
  [MC_AGENT_ROLES.TECH_LEAD]: {
    id: 'tech-lead',
    name: 'agent:tech-lead:main',
    displayName: '研发工程师',
    role: 'agent:tech-lead:main',
    roleTag: '技术开发',
    icon: '/avatars/avatar-xiaokai.jpeg',
    color: '#409eff',
    description: '技术开发 Agent，负责系统架构和代码实现',
  },
  [MC_AGENT_ROLES.TEAM_QA]: {
    id: 'team-qa',
    name: 'agent:team-qa:main',
    displayName: '测试工程师',
    role: 'agent:team-qa:main',
    roleTag: '质量保证',
    icon: '/avatars/avatar-xiaoce.jpeg',
    color: '#909399',
    description: '质量保证 Agent，负责测试和质量把控',
  },
  [MC_AGENT_ROLES.CLAUDE_CODE]: {
    id: 'claudecode',
    name: 'claudecode',
    displayName: 'Claude Code',
    role: 'claudecode',
    roleTag: '代码助手',
    icon: '',
    color: '#d4a574',
    description: '由 Tech Lead 调度的代码助手',
  },
}

// 工作流状态
export interface WorkflowState {
  isActive: boolean
  currentStep: string
  startedAt?: number
  completedAt?: number
  assignedAgents: string[]
}
