import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  securityApi,
  type SecurityStats,
  type SecretDetection,
  type MCPServer,
  type InjectionAttempt,
  type SecurityEvent,
} from '@/api'

export const useSecurityStore = defineStore('security', () => {
  // State
  const stats = ref<SecurityStats | null>(null)
  const secrets = ref<SecretDetection[]>([])
  const mcpServers = ref<MCPServer[]>([])
  const injectionAttempts = ref<InjectionAttempt[]>([])
  const events = ref<SecurityEvent[]>([])
  const trustFactors = ref<Array<{ name: string; score: number; maxScore: number }>>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const scanning = ref(false)

  // 安全评分等级
  const securityLevel = computed(() => {
    if (!stats.value) return 'unknown'
    const score = stats.value.score
    if (score >= 90) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 50) return 'fair'
    if (score >= 30) return 'poor'
    return 'critical'
  })

  // 安全风险颜色
  const securityColor = computed(() => {
    const level = securityLevel.value
    const colorMap: Record<string, string> = {
      excellent: '#10b981',
      good: '#3b82f6',
      fair: '#f59e0b',
      poor: '#f97316',
      critical: '#ef4444',
      unknown: '#6b7280',
    }
    return colorMap[level] || '#6b7280'
  })

  // Actions
  async function fetchSecurityAudit() {
    loading.value = true
    error.value = null
    try {
      const response = await securityApi.getSecurityAudit()
      stats.value = response.stats
      secrets.value = response.secrets || []
      mcpServers.value = response.mcpServers || []
      injectionAttempts.value = response.injectionAttempts || []
      events.value = response.events || []
      trustFactors.value = response.trustFactors || []
    } catch (e: any) {
      error.value = e.message || '加载安全审计数据失败'
      console.error('Failed to fetch security audit:', e)
      stats.value = null
      secrets.value = []
      mcpServers.value = []
      injectionAttempts.value = []
      events.value = []
      trustFactors.value = []
    } finally {
      loading.value = false
    }
  }

  async function runSecurityScan() {
    scanning.value = true
    try {
      const result = await securityApi.runSecurityScan()
      // 轮询扫描结果
      let attempts = 0
      const maxAttempts = 30
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await fetchSecurityAudit()
        attempts++
        // 如果扫描完成，退出
        if (stats.value && stats.value.score > 0) {
          break
        }
      }
      return result
    } catch (e: any) {
      console.error('Failed to run security scan:', e)
      throw e
    } finally {
      scanning.value = false
    }
  }

  async function ignoreSecret(secretId: string) {
    try {
      const result = await securityApi.ignoreSecret(secretId)
      if (result.success) {
        await fetchSecurityAudit()
      }
      return result
    } catch (e: any) {
      console.error('Failed to ignore secret:', e)
      throw e
    }
  }

  async function resolveSecret(secretId: string) {
    try {
      const result = await securityApi.resolveSecret(secretId)
      if (result.success) {
        await fetchSecurityAudit()
      }
      return result
    } catch (e: any) {
      console.error('Failed to resolve secret:', e)
      throw e
    }
  }

  return {
    // State
    stats,
    secrets,
    mcpServers,
    injectionAttempts,
    events,
    trustFactors,
    loading,
    error,
    scanning,
    // Getters
    securityLevel,
    securityColor,
    // Actions
    fetchSecurityAudit,
    runSecurityScan,
    ignoreSecret,
    resolveSecret,
  }
})
