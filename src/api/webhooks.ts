import { request } from './base'

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
  async getWebhooks(): Promise<WebhooksResponse> {
    return request('/api/webhooks')
  },

  async createWebhook(webhook: {
    name: string
    url: string
    description?: string
    events: string[]
    secret?: string
    algorithm?: Webhook['algorithm']
    retryPolicy?: Webhook['retryPolicy']
    maxRetries?: number
    timeout?: number
    enabled?: boolean
  }): Promise<{ success: boolean; webhook: Webhook }> {
    return request('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    })
  },

  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    })
  },

  async toggleWebhook(webhookId: string): Promise<{ success: boolean; enabled: boolean }> {
    return request(`/api/webhooks/${webhookId}/toggle`, {
      method: 'POST',
    })
  },

  async testWebhook(webhookId: string, eventType: string): Promise<{ success: boolean }> {
    return request(`/api/webhooks/${webhookId}/test`, {
      method: 'POST',
      body: JSON.stringify({ event: eventType }),
    })
  },

  async getDeliveries(webhookId: string, limit?: number): Promise<{ success: boolean; deliveries: WebhookDelivery[] }> {
    const query = limit ? `?limit=${limit}` : ''
    return request(`/api/webhooks/${webhookId}/deliveries${query}`)
  },
}
