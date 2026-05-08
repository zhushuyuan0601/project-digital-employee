import type { Task } from './task'

export type { AgentRole } from '@/config/agents'
import type { AgentRole } from '@/config/agents'

export type AgentStatus = 'idle' | 'busy' | 'offline'

export interface Agent {
  id: string
  name: string
  role: AgentRole
  icon: string
  status: AgentStatus
  currentTask?: Task
  completedTasks: number
  todayTasks?: number
  description: string
  runtimeAgentId?: string
}

export const AGENT_ROLES: Partial<Record<AgentRole, Agent>> = {}
