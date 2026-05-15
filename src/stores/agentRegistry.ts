import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentsApi } from '@/api/agents'
import type { AgentDefinition, AgentRoutePreview } from '@/types/agent'

export const useAgentRegistryStore = defineStore('agentRegistry', () => {
  const agents = ref<AgentDefinition[]>([])
  const routePreview = ref<AgentRoutePreview | null>(null)
  const loading = ref(false)
  const previewing = ref(false)
  const savingAgentId = ref('')
  const error = ref<string | null>(null)

  const enabledAgents = computed(() => agents.value.filter(agent => agent.enabled))
  const routableAgents = computed(() => agents.value.filter(agent => agent.enabled && !agent.coordinator && agent.marketVisible !== false))
  const agentsById = computed(() => new Map(agents.value.map(agent => [agent.id, agent])))

  async function fetchAgents(params: Parameters<typeof agentsApi.listAgents>[0] = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await agentsApi.listAgents({ marketOnly: false, includeHidden: true, ...params })
      agents.value = response.agents
      return response.agents
    } catch (err: any) {
      error.value = err.message || '加载 Agent 失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateAgent(agentId: string, payload: Partial<AgentDefinition>) {
    savingAgentId.value = agentId
    error.value = null
    try {
      const response = await agentsApi.updateAgent(agentId, payload)
      if (response.agents) {
        agents.value = response.agents
      } else if (response.agent) {
        const index = agents.value.findIndex(agent => agent.id === agentId)
        if (index >= 0) agents.value[index] = response.agent
      }
      return response.agent
    } catch (err: any) {
      error.value = err.message || '更新 Agent 失败'
      throw err
    } finally {
      savingAgentId.value = ''
    }
  }

  async function previewRoute(taskDescription: string, constraints: Record<string, unknown> = {}) {
    previewing.value = true
    error.value = null
    try {
      const response = await agentsApi.previewRoute({ taskDescription, constraints })
      routePreview.value = response.preview
      return response.preview
    } catch (err: any) {
      error.value = err.message || '生成路由预览失败'
      throw err
    } finally {
      previewing.value = false
    }
  }

  function agentName(agentId: string) {
    return agentsById.value.get(agentId)?.name || agentId
  }

  return {
    agents,
    routePreview,
    loading,
    previewing,
    savingAgentId,
    error,
    enabledAgents,
    routableAgents,
    agentsById,
    fetchAgents,
    updateAgent,
    previewRoute,
    agentName,
  }
})
