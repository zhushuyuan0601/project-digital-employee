export type AgentId = 'xiaomu' | 'xiaokai' | 'xiaochan' | 'xiaoyan' | 'xiaoce'
export type AgentRole = 'assistant' | 'developer' | 'product' | 'analyst' | 'tester'

export interface AgentDefinition {
  id: AgentId
  name: string
  roleType: AgentRole
  roleLabel: string
  icon: string
  chatAvatar: string
  description: string
  gatewayAgentId: string
  sessionKey: string
}

export interface MultiAgentStoreConfig {
  id: AgentId
  sessionKey: string
  displayName: string
  role: string
  avatar: string
  gatewayAgentId: string
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'xiaomu',
    name: '小呦',
    roleType: 'assistant',
    roleLabel: '项目统筹',
    icon: '/avatars/avatar-xiaomu.jpeg',
    chatAvatar: '◈',
    description: '项目统筹 - 任务调度、分配、汇报',
    gatewayAgentId: 'ceo',
    sessionKey: 'agent:ceo:main',
  },
  {
    id: 'xiaokai',
    name: '研发工程师',
    roleType: 'developer',
    roleLabel: '技术开发',
    icon: '/avatars/avatar-xiaokai.jpeg',
    chatAvatar: '💻',
    description: '技术开发 - 技术规划&研发管理',
    gatewayAgentId: 'tech-lead',
    sessionKey: 'agent:tech-lead:main',
  },
  {
    id: 'xiaochan',
    name: '产品经理',
    roleType: 'product',
    roleLabel: '产品设计',
    icon: '/avatars/avatar-xiaochan.jpeg',
    chatAvatar: '📝',
    description: '产品设计 - 产品需求分析',
    gatewayAgentId: 'pm',
    sessionKey: 'agent:pm:main',
  },
  {
    id: 'xiaoyan',
    name: '研究员',
    roleType: 'analyst',
    roleLabel: '调研分析',
    icon: '/avatars/avatar-xiaoyan.jpeg',
    chatAvatar: '🔍',
    description: '调研分析 - 市场调研',
    gatewayAgentId: 'researcher',
    sessionKey: 'agent:researcher:main',
  },
  {
    id: 'xiaoce',
    name: '测试员',
    roleType: 'tester',
    roleLabel: '质量检查',
    icon: '/avatars/avatar-xiaoce.jpeg',
    chatAvatar: '🛡️',
    description: '质量检查 - 测试验证&质量保障',
    gatewayAgentId: 'team-qa',
    sessionKey: 'agent:team-qa:main',
  },
]

export const AGENT_DEFINITION_MAP = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [agent.id, agent])
) as Record<AgentId, AgentDefinition>

export const AGENT_TO_GATEWAY_MAP = Object.fromEntries(
  AGENT_DEFINITIONS.map((agent) => [agent.id, agent.gatewayAgentId])
) as Record<AgentId, string>

export const DEFAULT_AGENT_IDS = AGENT_DEFINITIONS.map((agent) => agent.id)
export const DEFAULT_GROUP_CHAT_AGENT_IDS: AgentId[] = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai']

export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return AGENT_DEFINITION_MAP[agentId as AgentId]
}

export function getMultiAgentStoreConfigs(agentIds: AgentId[] = DEFAULT_AGENT_IDS as AgentId[]): MultiAgentStoreConfig[] {
  return agentIds
    .map((agentId) => getAgentDefinition(agentId))
    .filter((agent): agent is AgentDefinition => Boolean(agent))
    .map((agent) => ({
      id: agent.id,
      sessionKey: agent.sessionKey,
      displayName: agent.name,
      role: agent.roleLabel,
      avatar: agent.chatAvatar,
      gatewayAgentId: agent.gatewayAgentId,
    }))
}
