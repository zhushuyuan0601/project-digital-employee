import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tokensApi, type TokenUsage, type TokenStats, type ModelUsage, type AgentCost } from '@/api'

export const useTokensStore = defineStore('tokens', () => {
  // State
  const stats = ref<TokenStats | null>(null)
  const trend = ref<Array<{ date: string; input: number; output: number }>>([])
  const modelUsage = ref<ModelUsage[]>([])
  const agentCosts = ref<AgentCost[]>([])
  const recentUsage = ref<TokenUsage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchTokenStats(timeRange: 'today' | 'week' | 'month' | 'all' = 'week') {
    loading.value = true
    error.value = null
    try {
      const response = await tokensApi.getTokenStats(timeRange)
      stats.value = response.stats
      trend.value = response.trend || []
      modelUsage.value = response.modelUsage || []
      agentCosts.value = response.agentCosts || []
      recentUsage.value = response.recentUsage || []
    } catch (e: any) {
      error.value = e.message || '加载 Token 数据失败'
      console.error('Failed to fetch tokens:', e)
      // 设置默认空数据
      stats.value = null
      trend.value = []
      modelUsage.value = []
      agentCosts.value = []
      recentUsage.value = []
    } finally {
      loading.value = false
    }
  }

  async function exportReport(timeRange?: string) {
    try {
      const blob = await tokensApi.exportReport(timeRange)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `token-report-${timeRange || 'all'}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error('Failed to export report:', e)
      throw e
    }
  }

  return {
    // State
    stats,
    trend,
    modelUsage,
    agentCosts,
    recentUsage,
    loading,
    error,
    // Actions
    fetchTokenStats,
    exportReport,
  }
})
