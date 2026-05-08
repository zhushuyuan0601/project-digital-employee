import type { AgentDefinition as MarketAgentDefinition } from '@/api/agents'

export type AgentId = string
export type AgentRole = 'assistant' | 'executor' | 'reviewer' | 'coordinator' | 'legacy'

export interface AgentDefinition {
  id: AgentId
  name: string
  roleType: AgentRole
  roleLabel: string
  icon: string
  chatAvatar: string
  description: string
  runtimeAgentId: string
  sessionKey: string
}

export interface MultiAgentStoreConfig {
  id: AgentId
  sessionKey: string
  displayName: string
  role: string
  avatar: string
  runtimeAgentId: string
}

export const AGENT_DEFINITIONS: AgentDefinition[] = []
export const AGENT_DEFINITION_MAP: Record<string, AgentDefinition> = {}
export const AGENT_TO_RUNTIME_MAP: Record<string, string> = {}
export const DEFAULT_AGENT_IDS: AgentId[] = []
export const DEFAULT_GROUP_CHAT_AGENT_IDS: AgentId[] = []

export function marketAgentToLegacyConfig(agent: MarketAgentDefinition): AgentDefinition {
  return {
    id: agent.id,
    name: agent.name,
    roleType: agent.coordinator ? 'coordinator' : agent.category === 'legacy' ? 'legacy' : 'executor',
    roleLabel: agent.roleName || agent.category || 'Agent',
    icon: agent.icon || '',
    chatAvatar: (agent.name || agent.id).slice(0, 1),
    description: agent.description,
    runtimeAgentId: agent.runtimeAgentId,
    sessionKey: `claude:${agent.id}:main`,
  }
}

export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return AGENT_DEFINITION_MAP[agentId]
}

export function getMultiAgentStoreConfigs(agentIds: AgentId[] = DEFAULT_AGENT_IDS): MultiAgentStoreConfig[] {
  return agentIds
    .map((agentId) => getAgentDefinition(agentId))
    .filter((agent): agent is AgentDefinition => Boolean(agent))
    .map((agent) => ({
      id: agent.id,
      sessionKey: agent.sessionKey,
      displayName: agent.name,
      role: agent.roleLabel,
      avatar: agent.chatAvatar,
      runtimeAgentId: agent.runtimeAgentId,
    }))
}
