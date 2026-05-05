import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getMultiAgentStoreConfigs } from '@/config/agents'

export interface AgentConfig {
  id: string
  sessionKey: string
  displayName: string
  role: string
  avatar: string
  runtimeAgentId?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentId?: string
}

export interface AgentConnection {
  config: AgentConfig
  ws: null
  isConnected: boolean
  isConnecting: boolean
  isTyping: boolean
  typingStartTime: number | null
  messages: ChatMessage[]
  currentAssistantMsgId: string | null
}

type EventListener = (agentId: string, event: string, payload: any) => void

export const useMultiAgentChatStore = defineStore('multiAgentChat', () => {
  const agentConfigs: AgentConfig[] = getMultiAgentStoreConfigs().map((agent) => ({
    ...agent,
    runtimeAgentId: agent.runtimeAgentId,
  }))
  const selectedAgentId = ref<string>('xiaomu')
  const agents = ref<Record<string, AgentConnection>>({})
  const eventListeners = ref<EventListener[]>([])

  agentConfigs.forEach((config) => {
    agents.value[config.id] = {
      config,
      ws: null,
      isConnected: true,
      isConnecting: false,
      isTyping: false,
      typingStartTime: null,
      messages: [],
      currentAssistantMsgId: null,
    }
  })

  const selectedAgent = computed(() => agents.value[selectedAgentId.value])
  const selectedMessages = computed(() => agents.value[selectedAgentId.value]?.messages || [])
  const allConnected = computed(() => true)
  const anyConnected = computed(() => true)

  function loadMessages() {
    agentConfigs.forEach((config) => {
      const saved = localStorage.getItem(`chat_messages_${config.id}`)
      if (!saved || !agents.value[config.id]) return
      try {
        agents.value[config.id].messages = JSON.parse(saved)
      } catch (err) {
        console.error(`Failed to load messages for ${config.id}:`, err)
      }
    })
  }

  const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {}

  function saveMessages(agentId: string) {
    clearTimeout(saveTimers[agentId])
    saveTimers[agentId] = setTimeout(() => {
      const agent = agents.value[agentId]
      if (!agent) return
      localStorage.setItem(`chat_messages_${agentId}`, JSON.stringify(agent.messages))
    }, 500)
  }

  function connect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    agent.isConnected = true
    agent.isConnecting = false
  }

  function disconnect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    agent.isConnected = true
    agent.isConnecting = false
  }

  function connectAll() {
    agentConfigs.forEach((config) => connect(config.id))
  }

  function disconnectAll() {
    agentConfigs.forEach((config) => disconnect(config.id))
  }

  function sendMessage(agentId: string, text: string) {
    const agent = agents.value[agentId]
    if (!agent || !text.trim()) return
    agent.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      agentId,
    })
    saveMessages(agentId)
  }

  function clearMessages(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    agent.messages = []
    agent.isTyping = false
    agent.typingStartTime = null
    saveMessages(agentId)
  }

  function resetChat(agentId: string) {
    clearMessages(agentId)
  }

  function selectAgent(agentId: string) {
    selectedAgentId.value = agentId
  }

  function addEventListener(listener: EventListener) {
    eventListeners.value.push(listener)
  }

  function removeEventListener(listener: EventListener) {
    const index = eventListeners.value.indexOf(listener)
    if (index >= 0) eventListeners.value.splice(index, 1)
  }

  return {
    agents,
    selectedAgentId,
    settings: ref({ autoConnect: false, wsUrl: '', token: '' }),
    agentConfigs,
    selectedAgent,
    selectedMessages,
    allConnected,
    anyConnected,
    loadMessages,
    connect,
    disconnect,
    connectAll,
    disconnectAll,
    sendMessage,
    clearMessages,
    resetChat,
    selectAgent,
    updateSettings: () => {},
    addEventListener,
    removeEventListener,
  }
})
