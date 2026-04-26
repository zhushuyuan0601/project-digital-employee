import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useAuthStore } from '@/stores/auth'
import { useAgentSync } from '@/composables/useAgentSync'

let hasConnectedAgents = false

export function useAppInit() {
  const multiAgentStore = useMultiAgentChatStore()
  const authStore = useAuthStore()
  const { initializeAgentSync } = useAgentSync()

  function initializeApp() {
    authStore.restoreSession()
    initializeAgentSync()

    if (hasConnectedAgents || !authStore.isAuthenticated) return
    multiAgentStore.connectAll()
    hasConnectedAgents = true
  }

  return {
    initializeApp,
  }
}
