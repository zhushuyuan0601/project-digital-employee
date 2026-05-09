import { useAuthStore } from '@/stores/auth'
import { useAgentSync } from '@/composables/useAgentSync'

export function useAppInit() {
  const authStore = useAuthStore()
  const { initializeAgentSync } = useAgentSync()

  function initializeApp() {
    authStore.restoreSession()
    initializeAgentSync()
  }

  return {
    initializeApp,
  }
}
