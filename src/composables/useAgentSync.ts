import { watch, type WatchStopHandle } from 'vue'
import { useAgentsStore } from '@/stores/agents'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'

let syncStarted = false
let stopHandle: WatchStopHandle | null = null

export function useAgentSync() {
  const agentsStore = useAgentsStore()
  const multiAgentStore = useMultiAgentChatStore()

  function syncAgentStates() {
    Object.values(multiAgentStore.agents).forEach((agentState) => {
      const status = !agentState.isConnected
        ? 'offline'
        : agentState.isTyping
          ? 'busy'
          : 'idle'

      agentsStore.updateAgentStatus(agentState.config.id, status)
    })
  }

  function initializeAgentSync() {
    if (!agentsStore.agents.length) {
      agentsStore.initializeDefaultAgents()
    }

    if (syncStarted) {
      syncAgentStates()
      return
    }

    stopHandle = watch(
      () => multiAgentStore.agents,
      () => syncAgentStates(),
      { deep: true, immediate: true }
    )

    syncStarted = true
  }

  function stopAgentSync() {
    stopHandle?.()
    stopHandle = null
    syncStarted = false
  }

  return {
    initializeAgentSync,
    stopAgentSync,
  }
}
