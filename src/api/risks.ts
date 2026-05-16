import { request } from './base'
import type {
  AlertRule,
  AlertRuleListResponse,
  RiskCategory,
  RiskItem,
  RiskLevel,
  RiskListResponse,
  RiskResponse,
  RiskStatsResponse,
  RiskStatus,
} from '@/types/risk'

function appendArray(search: URLSearchParams, key: string, value?: string[]) {
  if (!value?.length) return
  search.set(key, value.join(','))
}

export const riskApi = {
  listRisks(params: {
    page?: number
    pageSize?: number
    level?: RiskLevel[]
    status?: RiskStatus[]
    category?: RiskCategory[]
    owner?: string
    keyword?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.pageSize) search.set('pageSize', String(params.pageSize))
    appendArray(search, 'level', params.level)
    appendArray(search, 'status', params.status)
    appendArray(search, 'category', params.category)
    if (params.owner) search.set('owner', params.owner)
    if (params.keyword) search.set('keyword', params.keyword)
    if (params.sortBy) search.set('sortBy', params.sortBy)
    if (params.sortOrder) search.set('sortOrder', params.sortOrder)
    const query = search.toString()
    return request<RiskListResponse>(`/api/risks${query ? `?${query}` : ''}`)
  },

  getRisk(id: string) {
    return request<RiskResponse>(`/api/risks/${encodeURIComponent(id)}`)
  },

  createRisk(input: Omit<RiskItem, 'id' | 'createdAt' | 'updatedAt'>) {
    return request<RiskResponse>('/api/risks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateRisk(id: string, input: Partial<RiskItem>) {
    return request<RiskResponse>(`/api/risks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  deleteRisk(id: string) {
    return request<{ success: boolean; error?: string }>(`/api/risks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  listAlertRules() {
    return request<AlertRuleListResponse>('/api/risks/alert-rules')
  },

  updateAlertRule(id: string, input: Partial<AlertRule>) {
    return request<AlertRuleListResponse>(`/api/risks/alert-rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  createAlertRule(input: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) {
    return request<AlertRuleListResponse>('/api/risks/alert-rules', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  deleteAlertRule(id: string) {
    return request<{ success: boolean; error?: string }>(`/api/risks/alert-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getStats() {
    return request<RiskStatsResponse>('/api/risks/stats')
  },

  checkAlerts() {
    return request<{ notifications: Array<{ risk: RiskItem; rule: AlertRule; message: string }> }>('/api/risks/alerts/check')
  },
}
