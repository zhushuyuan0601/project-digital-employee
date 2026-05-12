import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { riskApi } from '@/api/risks'
import type {
  RiskItem,
  AlertRule,
  RiskStats,
  AlertNotification,
  RiskLevel,
  RiskStatus,
  RiskCategory,
} from '@/types/risk'
import { useNotification } from '@/composables/useNotification'

const STORAGE_KEY = 'unicom_risk_alerts_ack'

function loadAcknowledgedAlerts(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveAcknowledgedAlerts(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export const useRisksStore = defineStore('risks', () => {
  const notification = useNotification()

  // State
  const risks = ref<RiskItem[]>([])
  const alertRules = ref<AlertRule[]>([])
  const stats = ref<RiskStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const alertNotifications = ref<AlertNotification[]>([])
  const acknowledgedAlertIds = ref<Set<string>>(loadAcknowledgedAlerts())

  // Filters
  const filterLevel = ref<RiskLevel[]>([])
  const filterStatus = ref<RiskStatus[]>([])
  const filterCategory = ref<RiskCategory[]>([])
  const filterOwner = ref<string>('')
  const filterKeyword = ref<string>('')
  const sortBy = ref<string>('createdAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // Computed
  const filteredRisks = computed(() => {
    let list = [...risks.value]
    if (filterLevel.value.length) {
      list = list.filter(r => filterLevel.value.includes(r.level))
    }
    if (filterStatus.value.length) {
      list = list.filter(r => filterStatus.value.includes(r.status))
    }
    if (filterCategory.value.length) {
      list = list.filter(r => filterCategory.value.includes(r.category))
    }
    if (filterOwner.value) {
      list = list.filter(r => r.owner === filterOwner.value)
    }
    if (filterKeyword.value) {
      const kw = filterKeyword.value.toLowerCase()
      list = list.filter(
        r => r.title.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw),
      )
    }
    return list
  })

  const unacknowledgedAlertCount = computed(() =>
    alertNotifications.value.filter(n => !n.acknowledged && !acknowledgedAlertIds.value.has(n.id)).length,
  )

  const uniqueOwners = computed(() => {
    const owners = new Set(risks.value.map(r => r.owner))
    return [...owners].sort()
  })

  // Actions
  function resetFilters() {
    filterLevel.value = []
    filterStatus.value = []
    filterCategory.value = []
    filterOwner.value = ''
    filterKeyword.value = ''
    sortBy.value = 'createdAt'
    sortOrder.value = 'desc'
  }

  async function fetchRisks() {
    loading.value = true
    error.value = null
    try {
      const response = await riskApi.listRisks({
        page: currentPage.value,
        pageSize: pageSize.value,
        level: filterLevel.value.length ? filterLevel.value : undefined,
        status: filterStatus.value.length ? filterStatus.value : undefined,
        category: filterCategory.value.length ? filterCategory.value : undefined,
        owner: filterOwner.value || undefined,
        keyword: filterKeyword.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      })
      risks.value = response.data
      total.value = response.total
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载风险列表失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchRisk(id: string): Promise<RiskItem | null> {
    try {
      const response = await riskApi.getRisk(id)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载风险详情失败'
      return null
    }
  }

  async function createRisk(input: Omit<RiskItem, 'id' | 'createdAt' | 'updatedAt'>) {
    loading.value = true
    error.value = null
    try {
      const response = await riskApi.createRisk(input)
      if (response.data) {
        risks.value = [response.data, ...risks.value]
        total.value++
        notification.success('风险已登记')
        await runAlertCheck()
      }
      return response.data
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建风险失败'
      error.value = msg
      notification.error(msg)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateRisk(id: string, input: Partial<RiskItem>) {
    loading.value = true
    error.value = null
    try {
      const response = await riskApi.updateRisk(id, input)
      if (response.data) {
        risks.value = risks.value.map(r => r.id === id ? response.data! : r)
        notification.success('风险已更新')
        await runAlertCheck()
      }
      return response.data
    } catch (err) {
      const msg = err instanceof Error ? err.message : '更新风险失败'
      error.value = msg
      notification.error(msg)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteRisk(id: string): Promise<boolean> {
    const confirmed = await notification.confirm('确认删除该风险？此操作不可撤销。', '确认删除')
    if (!confirmed) return false

    loading.value = true
    error.value = null
    try {
      const response = await riskApi.deleteRisk(id)
      if (response.success) {
        risks.value = risks.value.filter(r => r.id !== id)
        total.value--
        notification.success('已删除')
      }
      return response.success
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除风险失败'
      error.value = msg
      notification.error(msg)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchAlertRules() {
    try {
      const response = await riskApi.listAlertRules()
      alertRules.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载预警规则失败'
    }
  }

  async function updateAlertRule(id: string, input: Partial<AlertRule>) {
    try {
      const response = await riskApi.updateAlertRule(id, input)
      if (response.success) {
        alertRules.value = response.data
        notification.success('规则已更新')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '更新规则失败'
      notification.error(msg)
    }
  }

  async function createAlertRule(input: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const response = await riskApi.createAlertRule(input)
      if (response.success) {
        alertRules.value = response.data
        notification.success('规则已创建')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建规则失败'
      notification.error(msg)
    }
  }

  async function deleteAlertRule(id: string) {
    try {
      const response = await riskApi.deleteAlertRule(id)
      if (response.success) {
        alertRules.value = alertRules.value.filter(r => r.id !== id)
        notification.success('规则已删除')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除规则失败'
      notification.error(msg)
    }
  }

  async function fetchStats() {
    try {
      const response = await riskApi.getStats()
      stats.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载统计数据失败'
    }
  }

  async function runAlertCheck() {
    try {
      const result = await riskApi.checkAlerts()
      const newNotifications: AlertNotification[] = result.notifications.map(n => ({
        id: `alert-${n.risk.id}-${n.rule.id}-${Date.now()}`,
        riskId: n.risk.id,
        riskTitle: n.risk.title,
        ruleId: n.rule.id,
        ruleName: n.rule.name,
        triggeredAt: new Date().toISOString(),
        acknowledged: false,
        message: n.message,
      }))

      // Only add truly new notifications (not duplicates)
      for (const n of newNotifications) {
        const isDuplicate = alertNotifications.value.some(
          existing => existing.riskId === n.riskId && existing.ruleId === n.ruleId,
        )
        if (!isDuplicate) {
          alertNotifications.value.unshift(n)

          // Show notification based on severity
          if (n.message.includes('🚨')) {
            notification.error(n.message)
          } else if (n.message.includes('⚠️')) {
            notification.warning(n.message)
          } else {
            notification.info(n.message)
          }
        }
      }
    } catch {
      // Silent fail for alert check
    }
  }

  function acknowledgeAlert(alertId: string) {
    acknowledgedAlertIds.value.add(alertId)
    saveAcknowledgedAlerts(acknowledgedAlertIds.value)
    const alert = alertNotifications.value.find(n => n.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  function clearAlerts() {
    alertNotifications.value = []
    acknowledgedAlertIds.value = new Set()
    saveAcknowledgedAlerts(acknowledgedAlertIds.value)
  }

  async function refreshAll() {
    await Promise.all([fetchRisks(), fetchAlertRules(), fetchStats()])
  }

  return {
    risks,
    alertRules,
    stats,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    alertNotifications,
    unacknowledgedAlertCount,
    filterLevel,
    filterStatus,
    filterCategory,
    filterOwner,
    filterKeyword,
    sortBy,
    sortOrder,
    filteredRisks,
    uniqueOwners,
    fetchRisks,
    fetchRisk,
    createRisk,
    updateRisk,
    deleteRisk,
    fetchAlertRules,
    updateAlertRule,
    createAlertRule,
    deleteAlertRule,
    fetchStats,
    runAlertCheck,
    acknowledgeAlert,
    clearAlerts,
    refreshAll,
    resetFilters,
  }
})
