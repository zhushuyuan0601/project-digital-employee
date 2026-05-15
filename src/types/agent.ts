import { AGENT_DEFINITIONS, type AgentRole } from '@/config/agents'
import type { Task } from './task'

export type { AgentRole } from '@/config/agents'

export type AgentStatus = 'idle' | 'busy' | 'offline'

export interface AgentMarketProfile {
  source: string
  installSource?: string
  version: string
  author?: string
  ratingAvg?: number
  ratingCount?: number
  pricing?: Record<string, unknown>
  marketVisible: boolean
}

export interface AgentCapabilityProfile {
  intents: string[]
  domains: string[]
  skills: string[]
  inputArtifacts: string[]
  outputArtifacts: string[]
  antiCapabilities: string[]
}

export interface AgentRoutingProfile {
  routeKeywords: string[]
  preferredWhen: string[]
  avoidWhen: string[]
  requiresTools: string[]
  requiresAgents: string[]
  canRunInParallel: boolean
  defaultPriority: number
  latencyTier: string
  costTier: string
}

export interface AgentGovernanceProfile {
  riskLevel: string
  permissionScope: string
  maxConcurrency: number
  requiresApproval: boolean
  costLimit: string
  dataAccessLevel: string
}

export interface AgentDefinition {
  id: string
  name: string
  roleName: string
  reportName?: string
  description: string
  boundary: string
  runtimeAgentId: string
  roleId: string
  capabilities: string[]
  allowedTools: string[]
  inputContract: string[]
  outputContract: string[]
  riskLevel: string
  defaultModel?: string
  maxConcurrency: number
  enabled: boolean
  sortOrder: number
  coordinator: boolean
  source?: string
  category?: string
  icon?: string
  instructions?: string
  version?: string
  marketVisible?: boolean
  originAgentId?: string
  aliases?: string[]
  marketProfile?: AgentMarketProfile
  capabilityProfile?: AgentCapabilityProfile
  routingProfile?: AgentRoutingProfile
  governanceProfile?: AgentGovernanceProfile
  createdAt?: number
  updatedAt?: number
}

export interface AgentRouteCandidate {
  agentId: string
  name: string
  category?: string
  score: number
  reasons: string[]
  costTier: string
  riskLevel: string
  canRunInParallel: boolean
  requiresApproval: boolean
}

export interface AgentRouteWorkflowNode {
  id: string
  title: string
  phase: string
  intent: string
  requiredCapabilities: string[]
  assignedAgentId: string
  routingReason: string
  objective: string
  dependsOn: string[]
  parallelGroup?: string
  inputArtifacts: string[]
  expectedOutputArtifacts: string[]
  requiredInputs: string[]
  expectedOutputs: string[]
  executionMode: 'report' | 'code' | 'test'
  requiredTools: string[]
  successCriteria: string[]
  acceptanceCriteria: string[]
  riskLevel: string
  costEstimate: string
  requiresApproval: boolean
  agentCapabilityHints: string[]
}

export interface AgentRoutePreview {
  intent: {
    text: string
    intents: string[]
    domains: string[]
    inputArtifacts: string[]
    outputArtifacts: string[]
    requiredTools: string[]
    riskLevel: string
  }
  candidates: AgentRouteCandidate[]
  workflow: AgentRouteWorkflowNode[]
  gaps: string[]
  governance: {
    requiresApproval: boolean
    riskLevel: string
    costLimit?: string
  }
  deterministicPreview?: unknown
  validatedRoute?: unknown
}

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
      runtimeAgentId: agent.runtimeAgentId,
    },
  ])
) as Record<AgentRole, Agent>
