import { request } from './base'

export interface AgentMarketProfile {
  source: 'builtin' | 'local' | string
  installSource: 'system' | 'user' | 'imported' | string
  version: string
  author: string
  ratingAvg: number
  ratingCount: number
  pricing: {
    model: string
    unit: string
    estimate: string
  }
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
  source: string
  category: string
  icon: string
  instructions: string
  version: string
  marketVisible: boolean
  originAgentId?: string
  aliases: string[]
  marketProfile: AgentMarketProfile
  capabilityProfile: AgentCapabilityProfile
  routingProfile: AgentRoutingProfile
  governanceProfile: AgentGovernanceProfile
  createdAt?: number
  updatedAt?: number
}

export interface WorkflowRouteNode {
  id: string
  title: string
  phase: string
  intent: string
  requiredCapabilities: string[]
  assignedAgentId: string
  routingReason: string
  objective: string
  dependsOn: string[]
  parallelGroup: string
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

export interface AgentRoutePreviewRequest {
  taskDescription: string
  constraints?: Record<string, unknown>
}

export interface AgentRouteIntent {
  text: string
  intents: string[]
  domains: string[]
  inputArtifacts: string[]
  outputArtifacts: string[]
  requiredTools: string[]
  riskLevel: string
}

export interface AgentRouteCandidate {
  agentId: string
  name: string
  category: string
  score: number
  reasons: string[]
  costTier: string
  riskLevel: string
  canRunInParallel: boolean
  requiresApproval: boolean
  deterministicScore?: number
  semanticScore?: number
}

export interface AgentRouteGovernance {
  requiresApproval: boolean
  riskLevel: string
  costLimit: string
}

export interface AgentRoutePreviewLayer {
  source: string
  available: boolean
  confidence: number
  intent: AgentRouteIntent
  candidates: AgentRouteCandidate[]
  workflow: WorkflowRouteNode[]
  gaps: string[]
  governance: AgentRouteGovernance
  notes: string[]
}

export interface AgentRouteValidationIssue {
  severity: 'error' | 'warning' | string
  layer: string
  nodeId?: string
  agentId?: string
  code: string
  message: string
}

export interface AgentValidatedRoute {
  source: 'validated' | string
  strategy: 'semantic' | 'hybrid' | 'deterministic_fallback' | string
  intent: AgentRouteIntent
  candidates: AgentRouteCandidate[]
  workflow: WorkflowRouteNode[]
  gaps: string[]
  governance: AgentRouteGovernance
  validation: {
    passed: boolean
    selectedLayer: 'semanticPreview' | 'deterministicPreview' | string
    issues: AgentRouteValidationIssue[]
  }
}

export interface AgentRoutePreviewResponse {
  deterministicPreview: AgentRoutePreviewLayer
  semanticPreview: AgentRoutePreviewLayer
  validatedRoute: AgentValidatedRoute
  intent: AgentRouteIntent
  candidates: AgentRouteCandidate[]
  workflow: WorkflowRouteNode[]
  gaps: string[]
  governance: AgentRouteGovernance
}

interface AgentsResponse {
  success: boolean
  agents: AgentDefinition[]
}

interface AgentResponse {
  success: boolean
  agent: AgentDefinition
}

interface RoutePreviewApiResponse {
  success: boolean
  preview: AgentRoutePreviewResponse
}

export type AgentUpdatePayload = Partial<Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt'>>
export type AgentCreatePayload = Partial<Omit<AgentDefinition, 'createdAt' | 'updatedAt'>> & { id: string; name: string }

export const agentApi = {
  listAgents(params: { enabledOnly?: boolean; includeCoordinator?: boolean; includeHidden?: boolean } = {}) {
    const search = new URLSearchParams()
    if (params.enabledOnly) search.set('enabledOnly', '1')
    if (params.includeCoordinator === false) search.set('includeCoordinator', '0')
    if (params.includeHidden) search.set('includeHidden', '1')
    const query = search.toString()
    return request<AgentsResponse>(`/api/agents${query ? `?${query}` : ''}`)
  },

  getAgent(agentId: string) {
    return request<AgentResponse>(`/api/agents/${encodeURIComponent(agentId)}`)
  },

  createAgent(payload: AgentCreatePayload) {
    return request<AgentResponse>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateAgent(agentId: string, payload: AgentUpdatePayload) {
    return request<AgentResponse>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  deleteAgent(agentId: string) {
    return request<AgentResponse>(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
    })
  },

  previewRoute(payload: AgentRoutePreviewRequest) {
    return request<RoutePreviewApiResponse>('/api/agents/route-preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
