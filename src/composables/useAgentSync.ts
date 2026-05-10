import { watch, type WatchStopHandle } from 'vue'
import { useAgentsStore } from '@/stores/agents'
import { useAgentRegistryStore } from '@/stores/agentRegistry'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'

let syncStarted = false
let stopHandle: WatchStopHandle | null = null

export function useAgentSync() {
  const agentsStore = useAgentsStore()
  const agentRegistry = useAgentRegistryStore()
  const multiAgentStore = useMultiAgentChatStore()

  function toChatConfig(agent: { id: string; name: string; roleName: string; runtimeAgentId: string }) {
    return {
      id: agent.id,
      sessionKey: `claude:${agent.id}:main`,
      displayName: agent.name,
      role: agent.roleName,
      avatar: (agent.name || agent.id).slice(0, 1),
      runtimeAgentId: agent.runtimeAgentId,
    }
  }

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

  async function initializeAgentSync() {
    if (!agentRegistry.loaded) {
      await agentRegistry.loadAgents({ includeHidden: true, includeCoordinator: true })
    }

    const visibleAgents = agentRegistry.marketAgents
    const chatAgents = [
      ...agentRegistry.coordinatorAgents.slice(0, 1),
      ...agentRegistry.routableAgents.slice(0, 8),
    ]
    agentsStore.initializeFromRegistry(visibleAgents)
    multiAgentStore.setAgentConfigs(chatAgents.map(toChatConfig))

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
