import { requestBlob, request } from './base'

export interface TokenUsage {
  id: string
  timestamp: string
  agentId: string
  agentName: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  endpoint: string
  duration: number
}

export interface TokenStats {
  totalTokens: number
  totalCost: number
  inputTokens: number
  outputTokens: number
  apiCalls: number
  avgResponseTime: number
}

export interface ModelUsage {
  model: string
  tokens: number
  cost: number
  percentage: number
}

export interface AgentCost {
  agentId: string
  agentName: string
  tokens: number
  cost: number
  rank: number
  percentage?: number
}

export interface TokensResponse {
  success: boolean
  stats: TokenStats
  trend: Array<{ date: string; input: number; output: number }>
  modelUsage: ModelUsage[]
  agentCosts: AgentCost[]
  recentUsage: TokenUsage[]
}

export const tokensApi = {
  async getTokenStats(timeRange?: 'today' | 'week' | 'month' | 'all'): Promise<TokensResponse> {
    const query = timeRange ? `?range=${timeRange}` : ''
    return request(`/api/tokens/stats${query}`)
  },

  async exportReport(timeRange?: string): Promise<Blob> {
    const query = timeRange ? `?range=${timeRange}` : ''
    return requestBlob(`/api/tokens/export${query}`)
  },
}
