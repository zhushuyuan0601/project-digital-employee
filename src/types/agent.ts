import { AGENT_DEFINITIONS, type AgentRole } from '@/config/agents'
import type { Task } from './task'

export type { AgentRole } from '@/config/agents'

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
  gatewayAgentId?: string
}

export const AGENT_ROLES: Record<AgentRole, Agent> = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [
    agent.roleType,
    {
      id: agent.id,
      name: agent.name,
      role: agent.roleType,
      icon: agent.icon,
      status: 'idle',
      completedTasks: 0,
      description: agent.description,
      gatewayAgentId: agent.gatewayAgentId,
    },
  ])
) as Record<AgentRole, Agent>
