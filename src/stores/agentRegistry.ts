import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentApi, type AgentDefinition } from '@/api/agents'

const CATEGORY_COLORS: Record<string, string> = {
  coordination: '#2563eb',
  information: '#0f766e',
  product: '#7c3aed',
  engineering: '#dc2626',
  quality: '#ca8a04',
  daily: '#059669',
  legacy: '#64748b',
  local: '#0891b2',
}

const CATEGORY_ICONS: Record<string, string> = {
  coordination: 'Connection',
  information: 'Search',
  product: 'DocumentChecked',
  engineering: 'Monitor',
  quality: 'Select',
  daily: 'MagicStick',
  legacy: 'Clock',
  local: 'Star',
}

function createFallbackAgent(id: string): AgentDefinition {
  return {
    id,
    name: id || 'Unknown Agent',
    roleName: '历史 Agent',
    reportName: `${id || 'Unknown Agent'}-报告`,
    description: '历史数据中的 Agent，当前市场没有对应能力卡。',
    boundary: '仅用于历史展示。',
    runtimeAgentId: id,
    roleId: id,
    capabilities: [],
    allowedTools: [],
    inputContract: [],
    outputContract: ['report'],
    riskLevel: 'medium',
    defaultModel: '',
    maxConcurrency: 1,
    enabled: false,
    sortOrder: 999,
    coordinator: false,
    source: 'history',
    category: 'legacy',
    icon: 'Clock',
    instructions: '',
    version: 'history',
    marketVisible: false,
    originAgentId: '',
    aliases: [],
    marketProfile: {
      source: 'history',
      installSource: 'system',
      version: 'history',
      author: 'system',
      ratingAvg: 0,
      ratingCount: 0,
      pricing: { model: 'metadata', unit: 'task', estimate: 'unknown' },
      marketVisible: false,
    },
    capabilityProfile: {
      intents: [],
      domains: [],
      skills: [],
      inputArtifacts: [],
      outputArtifacts: ['report'],
      antiCapabilities: [],
    },
    routingProfile: {
      routeKeywords: [],
      preferredWhen: [],
      avoidWhen: ['new_routing'],
      requiresTools: [],
      requiresAgents: [],
      canRunInParallel: false,
      defaultPriority: 0,
      latencyTier: 'unknown',
      costTier: 'unknown',
    },
    governanceProfile: {
      riskLevel: 'medium',
      permissionScope: 'history_display',
      maxConcurrency: 1,
      requiresApproval: false,
      costLimit: '',
      dataAccessLevel: 'history',
    },
  }
}

function firstCharacter(value: string) {
  return (value || '?').trim().slice(0, 1).toUpperCase() || '?'
}

export const useAgentRegistryStore = defineStore('agentRegistry', () => {
  const agents = ref<AgentDefinition[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const agentMap = computed(() => new Map(agents.value.map((agent) => [agent.id, agent])))
  const marketAgents = computed(() => agents.value.filter((agent) => agent.marketVisible && agent.marketProfile?.marketVisible !== false))
  const routableAgents = computed(() => marketAgents.value.filter((agent) => agent.enabled && !agent.coordinator))
  const coordinatorAgents = computed(() => agents.value.filter((agent) => agent.coordinator))
  const legacyAgents = computed(() => agents.value.filter((agent) => !agent.marketVisible || agent.category === 'legacy'))

  async function loadAgents(params: { includeHidden?: boolean; includeCoordinator?: boolean; enabledOnly?: boolean } = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await agentApi.listAgents({
        includeHidden: params.includeHidden ?? true,
        includeCoordinator: params.includeCoordinator ?? true,
        enabledOnly: params.enabledOnly,
      })
      agents.value = response.agents
      loaded.value = true
      return response.agents
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return agents.value
    } finally {
      loading.value = false
    }
  }

  function setAgents(nextAgents: AgentDefinition[]) {
    agents.value = nextAgents
    loaded.value = true
  }

  function fallbackAgent(id: string) {
    return agentMap.value.get(id) || createFallbackAgent(id)
  }

  function agentName(id: string) {
    return fallbackAgent(id).name || id
  }

  function agentInitial(id: string) {
    return firstCharacter(agentName(id))
  }

  function agentIcon(id: string) {
    const agent = fallbackAgent(id)
    return agent.icon || CATEGORY_ICONS[agent.category] || 'User'
  }

  function agentColor(id: string) {
    const agent = fallbackAgent(id)
    return CATEGORY_COLORS[agent.category] || '#64748b'
  }

  function agentCapabilitySummary(id: string) {
    const agent = fallbackAgent(id)
    const skills = agent.capabilityProfile?.skills?.length ? agent.capabilityProfile.skills : agent.capabilities
    return skills.slice(0, 3).join(' / ') || agent.description || '历史 Agent'
  }

  function isRoutable(id: string) {
    const agent = agentMap.value.get(id)
    return Boolean(agent?.enabled && !agent.coordinator && agent.marketVisible && agent.marketProfile?.marketVisible !== false)
  }

  async function updateAgent(agentId: string, payload: Parameters<typeof agentApi.updateAgent>[1]) {
    const response = await agentApi.updateAgent(agentId, payload)
    const index = agents.value.findIndex((agent) => agent.id === agentId)
    if (index >= 0) agents.value.splice(index, 1, response.agent)
    else agents.value.push(response.agent)
    return response.agent
  }

  async function createAgent(payload: Parameters<typeof agentApi.createAgent>[0]) {
    const response = await agentApi.createAgent(payload)
    agents.value.push(response.agent)
    return response.agent
  }

  async function deleteAgent(agentId: string) {
    const response = await agentApi.deleteAgent(agentId)
    const index = agents.value.findIndex((agent) => agent.id === agentId)
    if (index >= 0) agents.value.splice(index, 1, response.agent)
    return response.agent
  }

  return {
    agents,
    loading,
    error,
    loaded,
    agentMap,
    marketAgents,
    routableAgents,
    coordinatorAgents,
    legacyAgents,
    loadAgents,
    setAgents,
    fallbackAgent,
    agentName,
    agentInitial,
    agentIcon,
    agentColor,
    agentCapabilitySummary,
    isRoutable,
    updateAgent,
    createAgent,
    deleteAgent,
  }
})
