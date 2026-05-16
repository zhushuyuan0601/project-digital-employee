import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useRisksStore } from '@/stores/risks'

/**
 * 预警检查组合式函数
 * 在页面加载、数据变更后自动检查预警，并支持定时轮询
 */
export function useRiskAlert(options?: {
  pollIntervalMs?: number
  enabled?: Ref<boolean>
}) {
  const store = useRisksStore()
  const pollIntervalMs = options?.pollIntervalMs ?? 5 * 60 * 1000 // 5 分钟
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let visibilityHandler: (() => void) | null = null

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        store.runAlertCheck()
      }
    }, pollIntervalMs)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      startPolling()
    } else {
      stopPolling()
    }
  }

  onMounted(() => {
    // Initial check
    store.runAlertCheck()
    startPolling()

    // Pause polling when page is hidden
    visibilityHandler = handleVisibilityChange
    document.addEventListener('visibilitychange', visibilityHandler)
  })

  onUnmounted(() => {
    stopPolling()
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  })

  return {
    runAlertCheck: () => store.runAlertCheck(),
  }
}
