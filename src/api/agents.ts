import { request } from './base'
import type { AgentDefinition, AgentRoutePreview } from '@/types/agent'

interface AgentsResponse {
  success: boolean
  agents: AgentDefinition[]
}

interface AgentResponse {
  success: boolean
  agent: AgentDefinition
  agents?: AgentDefinition[]
}

interface RoutePreviewResponse {
  success: boolean
  preview: AgentRoutePreview
}

export const agentsApi = {
  listAgents(params: { enabledOnly?: boolean; includeCoordinator?: boolean; includeHidden?: boolean; marketOnly?: boolean } = {}) {
    const search = new URLSearchParams()
    if (params.enabledOnly) search.set('enabledOnly', '1')
    if (params.includeCoordinator === false) search.set('includeCoordinator', '0')
    if (params.includeHidden) search.set('includeHidden', '1')
    if (params.marketOnly === false) search.set('marketOnly', '0')
    const query = search.toString()
    return request<AgentsResponse>(`/api/agents${query ? `?${query}` : ''}`)
  },

  listRoutableAgents() {
    return request<AgentsResponse>('/api/agents/routable')
  },

  getAgent(agentId: string) {
    return request<AgentResponse>(`/api/agents/${encodeURIComponent(agentId)}`)
  },

  createAgent(payload: Partial<AgentDefinition> & { id: string; name: string }) {
    return request<AgentResponse>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateAgent(agentId: string, payload: Partial<AgentDefinition>) {
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

  previewRoute(payload: { taskDescription: string; constraints?: Record<string, unknown> }) {
    return request<RoutePreviewResponse>('/api/agents/route-preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
