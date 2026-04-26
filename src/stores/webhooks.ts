import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webhooksApi, type Webhook, type WebhookDelivery, type WebhookStats } from '@/api'

export const useWebhooksStore = defineStore('webhooks', () => {
  // State
  const stats = ref<WebhookStats | null>(null)
  const webhooks = ref<Webhook[]>([])
  const deliveries = ref<WebhookDelivery[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 统计
  const enabledWebhooks = computed(() => webhooks.value.filter(w => w.enabled).length)
  const disabledWebhooks = computed(() => webhooks.value.filter(w => !w.enabled).length)

  // Actions
  async function fetchWebhooks() {
    loading.value = true
    error.value = null
    try {
      const response = await webhooksApi.getWebhooks()
      stats.value = response.stats
      webhooks.value = response.webhooks || []
      deliveries.value = response.deliveries || []
    } catch (e: any) {
      error.value = e.message || '加载 Webhook 配置失败'
      console.error('Failed to fetch webhooks:', e)
      stats.value = null
      webhooks.value = []
      deliveries.value = []
    } finally {
      loading.value = false
    }
  }

  async function createWebhook(webhook: {
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
  }) {
    try {
      const result = await webhooksApi.createWebhook(webhook)
      if (result.success) {
        await fetchWebhooks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to create webhook:', e)
      throw e
    }
  }

  async function updateWebhook(webhookId: string, updates: Partial<Webhook>) {
    try {
      const result = await webhooksApi.updateWebhook(webhookId, updates)
      if (result.success) {
        await fetchWebhooks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to update webhook:', e)
      throw e
    }
  }

  async function deleteWebhook(webhookId: string) {
    try {
      const result = await webhooksApi.deleteWebhook(webhookId)
      if (result.success) {
        await fetchWebhooks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to delete webhook:', e)
      throw e
    }
  }

  async function toggleWebhook(webhookId: string) {
    try {
      const result = await webhooksApi.toggleWebhook(webhookId)
      if (result.success) {
        await fetchWebhooks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to toggle webhook:', e)
      throw e
    }
  }

  async function testWebhook(webhookId: string, eventType: string) {
    try {
      const result = await webhooksApi.testWebhook(webhookId, eventType)
      return result
    } catch (e: any) {
      console.error('Failed to test webhook:', e)
      throw e
    }
  }

  async function fetchDeliveries(webhookId: string, limit: number = 50) {
    try {
      const result = await webhooksApi.getDeliveries(webhookId, limit)
      return result.deliveries
    } catch (e: any) {
      console.error('Failed to fetch deliveries:', e)
      throw e
    }
  }

  return {
    // State
    stats,
    webhooks,
    deliveries,
    loading,
    error,
    // Getters
    enabledWebhooks,
    disabledWebhooks,
    // Actions
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    fetchDeliveries,
  }
})
