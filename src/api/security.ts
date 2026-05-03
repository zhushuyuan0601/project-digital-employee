import { request } from './base'

export interface SecurityStats {
  score: number
  secretsDetected: number
  mcpConnections: number
  injectionAttempts: number
  passedChecks: number
  totalChecks: number
}

export interface SecretDetection {
  id: string
  type: 'api_key' | 'password' | 'token' | 'certificate'
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: string
  status: 'pending' | 'resolved' | 'ignored'
}

export interface MCPServer {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'error'
  lastConnected: string
  permissions: string[]
}

export interface InjectionAttempt {
  id: string
  type: 'prompt_injection' | 'jailbreak' | 'data_exfiltration'
  source: string
  payload: string
  blocked: boolean
  timestamp: string
}

export interface SecurityEvent {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  timestamp: string
  status: 'open' | 'investigating' | 'resolved'
}

export interface SecurityResponse {
  success: boolean
  stats: SecurityStats
  secrets: SecretDetection[]
  mcpServers: MCPServer[]
  injectionAttempts: InjectionAttempt[]
  events: SecurityEvent[]
  trustFactors: Array<{ name: string; score: number; maxScore: number }>
}

export const securityApi = {
  async getSecurityAudit(): Promise<SecurityResponse> {
    return request('/api/security/audit')
  },

  async runSecurityScan(): Promise<{ success: boolean; scanId: string }> {
    return request('/api/security/scan', {
      method: 'POST',
    })
  },

  async ignoreSecret(secretId: string): Promise<{ success: boolean }> {
    return request(`/api/security/secrets/${secretId}/ignore`, {
      method: 'POST',
    })
  },

  async resolveSecret(secretId: string): Promise<{ success: boolean }> {
    return request(`/api/security/secrets/${secretId}/resolve`, {
      method: 'POST',
    })
  },
}
