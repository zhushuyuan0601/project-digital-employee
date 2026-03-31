/**
 * API 服务模块
 * 提供统一的后端 API 调用接口
 */

// 使用相对路径，通过 Vite 代理转发到后端服务器
const API_BASE_URL = ''

/**
 * 通用请求方法
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============ Skills API ============

export interface Skill {
  id: string
  name: string
  author: string
  version: string
  description: string
  category: string
  icon: string
  downloads: number
  rating: number
  installed: boolean
  updateAvailable: boolean
  securityScan?: { status: 'safe' | 'warning' | 'danger' | 'pending' }
  repository?: string
}

export interface SkillsResponse {
  success: boolean
  skills: Skill[]
}

export const skillsApi = {
  /**
   * 获取技能列表
   */
  async getSkills(): Promise<SkillsResponse> {
    return request('/api/skills')
  },

  /**
   * 安装技能
   */
  async installSkill(skillId: string | { url: string }): Promise<{ success: boolean }> {
    return request('/api/skills/install', {
      method: 'POST',
      body: JSON.stringify(typeof skillId === 'string' ? { id: skillId } : skillId),
    })
  },

  /**
   * 更新技能
   */
  async updateSkill(skillId: string): Promise<{ success: boolean }> {
    return request(`/api/skills/${skillId}/update`, {
      method: 'POST',
    })
  },

  /**
   * 卸载技能
   */
  async uninstallSkill(skillId: string): Promise<{ success: boolean }> {
    return request(`/api/skills/${skillId}`, {
      method: 'DELETE',
    })
  },
}

// ============ Tokens API ============

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
  /**
   * 获取 Token 使用统计
   */
  async getTokenStats(timeRange?: 'today' | 'week' | 'month' | 'all'): Promise<TokensResponse> {
    const query = timeRange ? `?range=${timeRange}` : ''
    return request(`/api/tokens/stats${query}`)
  },

  /**
   * 导出 Token 报告
   */
  async exportReport(timeRange?: string): Promise<Blob> {
    const query = timeRange ? `?range=${timeRange}` : ''
    return request(`/api/tokens/export${query}`) as any
  },
}

// ============ Memory API ============

export interface MemoryFile {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime: string
  children?: MemoryFile[]
}

export interface MemoryNode {
  id: string
  name: string
  type: 'concept' | 'entity' | 'event' | 'document'
  description?: string
  connections: Array<{
    targetId: string
    type: string
    weight: number
  }>
  metadata?: Record<string, any>
}

export interface MemoryStats {
  fileCount: number
  nodeCount: number
  storageUsed: number
  storageUsedFormatted: string
}

export interface MemoryActivity {
  id: string
  type: 'create' | 'update' | 'delete' | 'connect'
  nodeId: string
  nodeName: string
  timestamp: string
  description: string
}

export interface MemoryResponse {
  success: boolean
  stats: MemoryStats
  files: MemoryFile[]
  nodes: MemoryNode[]
  activities: MemoryActivity[]
}

export const memoryApi = {
  /**
   * 获取内存数据
   */
  async getMemoryData(): Promise<MemoryResponse> {
    return request('/api/memory')
  },

  /**
   * 导入内存数据
   */
  async importMemory(file: File): Promise<{ success: boolean }> {
    const formData = new FormData()
    formData.append('file', file)
    return request('/api/memory/import', {
      method: 'POST',
      body: formData,
    })
  },

  /**
   * 导出内存数据
   */
  async exportMemory(): Promise<Blob> {
    return request('/api/memory/export') as any
  },
}

// ============ Security API ============

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
  /**
   * 获取安全审计数据
   */
  async getSecurityAudit(): Promise<SecurityResponse> {
    return request('/api/security/audit')
  },

  /**
   * 运行安全扫描
   */
  async runSecurityScan(): Promise<{ success: boolean; scanId: string }> {
    return request('/api/security/scan', {
      method: 'POST',
    })
  },

  /**
   * 忽略密钥检测
   */
  async ignoreSecret(secretId: string): Promise<{ success: boolean }> {
    return request(`/api/security/secrets/${secretId}/ignore`, {
      method: 'POST',
    })
  },

  /**
   * 解决密钥问题
   */
  async resolveSecret(secretId: string): Promise<{ success: boolean }> {
    return request(`/api/security/secrets/${secretId}/resolve`, {
      method: 'POST',
    })
  },
}

// ============ Cron API ============

export interface CronTask {
  id: string
  name: string
  cron: string
  cronDescription?: string
  agentId: string
  agentName: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  successCount: number
  failureCount: number
  lastStatus?: 'success' | 'failure' | 'running'
  lastError?: string
}

export interface CronExecution {
  id: string
  taskId: string
  taskName: string
  startTime: string
  endTime?: string
  status: 'success' | 'failure' | 'running'
  error?: string
  output?: string
}

export interface CronStats {
  totalTasks: number
  enabledTasks: number
  disabledTasks: number
  todayExecutions: number
}

export interface CronResponse {
  success: boolean
  stats: CronStats
  tasks: CronTask[]
  executions: CronExecution[]
}

export const cronApi = {
  /**
   * 获取定时任务列表
   */
  async getCronTasks(): Promise<CronResponse> {
    return request('/api/cron/tasks')
  },

  /**
   * 创建定时任务
   */
  async createTask(task: {
    name: string
    cron: string
    agentId: string
    enabled?: boolean
  }): Promise<{ success: boolean; task: CronTask }> {
    return request('/api/cron/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    })
  },

  /**
   * 更新定时任务
   */
  async updateTask(taskId: string, updates: Partial<CronTask>): Promise<{ success: boolean }> {
    return request(`/api/cron/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * 删除定时任务
   */
  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return request(`/api/cron/tasks/${taskId}`, {
      method: 'DELETE',
    })
  },

  /**
   * 切换任务状态
   */
  async toggleTask(taskId: string): Promise<{ success: boolean; enabled: boolean }> {
    return request(`/api/cron/tasks/${taskId}/toggle`, {
      method: 'POST',
    })
  },

  /**
   * 立即执行任务
   */
  async executeTask(taskId: string): Promise<{ success: boolean; executionId: string }> {
    return request(`/api/cron/tasks/${taskId}/execute`, {
      method: 'POST',
    })
  },
}

// ============ Webhooks API ============

export interface Webhook {
  id: string
  name: string
  url: string
  description?: string
  events: string[]
  secret?: string
  algorithm: 'HMAC-SHA256' | 'HMAC-SHA1' | 'HMAC-SHA512'
  retryPolicy: 'fixed' | 'exponential' | 'linear'
  maxRetries: number
  timeout: number
  enabled: boolean
  successCount: number
  failureCount: number
  avgResponseTime: number
  lastDelivery?: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  timestamp: string
  status: 'success' | 'failure' | 'pending'
  httpMethod: string
  httpStatus: number
  duration: number
  error?: string
  payload?: any
  response?: any
}

export interface WebhookStats {
  totalWebhooks: number
  enabledWebhooks: number
  disabledWebhooks: number
  todayDeliveries: number
}

export interface WebhooksResponse {
  success: boolean
  stats: WebhookStats
  webhooks: Webhook[]
  deliveries: WebhookDelivery[]
}

export const webhooksApi = {
  /**
   * 获取 Webhook 列表
   */
  async getWebhooks(): Promise<WebhooksResponse> {
    return request('/api/webhooks')
  },

  /**
   * 创建 Webhook
   */
  async createWebhook(webhook: {
    name: string
    url: string
    description?: string
    events: string[]
    secret?: string
    algorithm?: string
    retryPolicy?: string
    maxRetries?: number
    timeout?: number
    enabled?: boolean
  }): Promise<{ success: boolean; webhook: Webhook }> {
    return request('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    })
  },

  /**
   * 更新 Webhook
   */
  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  /**
   * 删除 Webhook
   */
  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    })
  },

  /**
   * 切换 Webhook 状态
   */
  async toggleWebhook(webhookId: string): Promise<{ success: boolean; enabled: boolean }> {
    return request(`/api/webhooks/${webhookId}/toggle`, {
      method: 'POST',
    })
  },

  /**
   * 发送测试通知
   */
  async testWebhook(webhookId: string, eventType: string): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}/test`, {
      method: 'POST',
      body: JSON.stringify({ event: eventType }),
    })
  },

  /**
   * 获取投递日志
   */
  async getDeliveries(webhookId: string, limit?: number): Promise<{ success: boolean; deliveries: WebhookDelivery[] }> {
    const query = limit ? `?limit=${limit}` : ''
    return request(`/api/webhooks/${webhookId}/deliveries${query}`)
  },
}
