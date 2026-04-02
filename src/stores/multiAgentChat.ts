import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AgentConfig {
  id: string
  sessionKey: string
  displayName: string
  role: string
  avatar: string
  gatewayAgentId?: string  // Gateway Agent ID
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentId?: string  // 关联的 Agent ID
}

export interface AgentConnection {
  config: AgentConfig
  ws: WebSocket | null
  isConnected: boolean
  isConnecting: boolean
  messages: ChatMessage[]
  currentAssistantMsgId: string | null
}

export interface ConnectionSettings {
  wsUrl: string
  token: string
  autoConnect: boolean
}

export const useMultiAgentChatStore = defineStore('multiAgentChat', () => {
  // 更新或创建消息（非流式模式，直接显示完整内容）
  function updateOrCreateMessage(agentId: string, role: 'assistant', content: string, runId?: string, streaming: boolean = false) {
    const agent = agents.value[agentId]
    if (!agent) return

    console.log(`[updateOrCreateMessage] [${agentId}] Called with streaming=${streaming}, content length=${content.length}`)

    // 非流式模式，直接更新
    if (runId && runId !== agent.currentAssistantMsgId) {
      agent.currentAssistantMsgId = runId
      agent.messages.push({
        id: `msg-${runId}`,
        role,
        content,
        timestamp: Date.now(),
        agentId
      })
    } else {
      const lastMessage = agent.messages[agent.messages.length - 1]
      if (lastMessage && lastMessage.role === role) {
        lastMessage.content = content
      } else {
        agent.messages.push({
          id: `msg-${Date.now()}`,
          role,
          content,
          timestamp: Date.now(),
          agentId
        })
      }
    }
    saveMessages(agentId)
  }

  // 配置的 Agent 列表 - 与任务指挥页面保持一致
  const agentConfigs: AgentConfig[] = [
    {
      id: 'xiaomu',
      sessionKey: 'agent:ceo:main',
      displayName: '小呦',
      role: '项目统筹',
      avatar: '◈',
      gatewayAgentId: 'agent:ceo:main'
    },
    {
      id: 'xiaoyan',
      sessionKey: 'agent:researcher:main',
      displayName: '研究员',
      role: '调研分析',
      avatar: '🔍',
      gatewayAgentId: 'agent:researcher:main'
    },
    {
      id: 'xiaochan',
      sessionKey: 'agent:pm:main',
      displayName: '产品经理',
      role: '产品设计',
      avatar: '📝',
      gatewayAgentId: 'agent:pm:main'
    },
    {
      id: 'xiaokai',
      sessionKey: 'agent:tech-lead:main',
      displayName: '研发工程师',
      role: '技术开发',
      avatar: '💻',
      gatewayAgentId: 'agent:tech-lead:main'
    },
    {
      id: 'xiaoce',
      sessionKey: 'agent:team-qa:main',
      displayName: '测试员',
      role: '质量检查',
      avatar: '🛡️',
      gatewayAgentId: 'agent:team-qa:main'
    }
  ]

  // 当前选中的 Agent ID
  const selectedAgentId = ref<string>('xiaomu')

  // 设置
  const settings = ref<ConnectionSettings>({
    wsUrl: import.meta.env.VITE_GATEWAY_WS_URL ||
           (import.meta.env.VITE_GATEWAY_WS_PATH ?
             (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + import.meta.env.VITE_GATEWAY_WS_PATH :
             'ws://localhost:3000/ws'),
    token: import.meta.env.VITE_GATEWAY_TOKEN || 'bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70',
    autoConnect: true,
  })

  // 每个 Agent 的连接状态和消息
  const agents = ref<Record<string, AgentConnection>>({})

  // 初始化 Agent 连接
  agentConfigs.forEach(config => {
    agents.value[config.id] = {
      config,
      ws: null,
      isConnected: false,
      isConnecting: false,
      messages: [],
      currentAssistantMsgId: null
    }
  })

  // 事件监听器回调
  type EventListener = (agentId: string, event: string, payload: any) => void
  const eventListeners = ref<EventListener[]>([])

  // 添加/移除事件监听器
  function addEventListener(listener: EventListener) {
    eventListeners.value.push(listener)
  }

  function removeEventListener(listener: EventListener) {
    const index = eventListeners.value.indexOf(listener)
    if (index > -1) {
      eventListeners.value.splice(index, 1)
    }
  }

  // Computed
  const selectedAgent = computed(() => agents.value[selectedAgentId.value])
  const selectedMessages = computed(() => agents.value[selectedAgentId.value]?.messages || [])

  // 连接状态
  const allConnected = computed(() => {
    return agentConfigs.every(config => agents.value[config.id]?.isConnected)
  })
  const anyConnected = computed(() => {
    return agentConfigs.some(config => agents.value[config.id]?.isConnected)
  })

  // 处理连接挑战响应
  async function handleConnectChallenge(agentId: string, payload: { nonce: string; ts: number }) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws || !settings.value.token) {
      console.error('[WebSocket] No token to respond to challenge')
      return
    }

    const encoder = new TextEncoder()
    const keyData = encoder.encode(settings.value.token)
    const messageData = encoder.encode(payload.nonce)

    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await window.crypto.subtle.sign('HMAC', key, messageData)
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const responseMsg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect.challenge_response',
      params: {
        nonce: payload.nonce,
        response: signatureHex
      }
    }

    agent.ws.send(JSON.stringify(responseMsg))
    console.log(`[WebSocket] [${agentId}] Challenge response sent`)
  }

  // 过滤思考内容
  function filterThoughts(text: string): string {
    if (!text) return text

    const THINKING_TAG_RE = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\b[^<>]*>/gi
    const QUICK_TAG_RE = /<\s*\/?\s*(?:think(?:ing)?|thought|antthinking)\b/i

    if (!QUICK_TAG_RE.test(text)) {
      return text
    }

    let result = ""
    let lastIndex = 0
    let inThinking = false

    for (const match of text.matchAll(THINKING_TAG_RE)) {
      const idx = match.index ?? 0
      const isClose = match[1] === "/"

      if (!inThinking) {
        result += text.slice(lastIndex, idx)
        if (!isClose) {
          inThinking = true
        }
      } else if (isClose) {
        inThinking = false
      }
      lastIndex = idx + match[0].length
    }

    if (!inThinking) {
      result += text.slice(lastIndex)
    }

    return result.trimStart()
  }

  // 提取消息文本
  function extractText(payload: any): string | null {
    if (!payload) return null
    if (payload.data) {
      if (typeof payload.data === 'string') {
        const filtered = filterThoughts(payload.data)
        return filtered.trim() ? filtered : null
      }
      if (payload.data.text) {
        const filtered = filterThoughts(payload.data.text)
        return filtered.trim() ? filtered : null
      }
      if (payload.data.content) {
        if (typeof payload.data.content === 'string') {
          const filtered = filterThoughts(payload.data.content)
          return filtered.trim() ? filtered : null
        }
        if (Array.isArray(payload.data.content)) {
          const text = payload.data.content.map((c: any) => c.text || '').join('')
          const filtered = filterThoughts(text)
          return filtered.trim() ? filtered : null
        }
      }
      if (payload.data.delta) {
        const text = payload.data.delta.text || payload.data.delta.content || ''
        const filtered = filterThoughts(text)
        return filtered.trim() ? filtered : null
      }
    }
    return null
  }

  function extractChatText(payload: any): string | null {
    if (!payload?.message) return null
    const msg = payload.message
    if (typeof msg === 'string') {
      const filtered = filterThoughts(msg)
      return filtered.trim() ? filtered : null
    }
    if (msg.text) {
      const filtered = filterThoughts(msg.text)
      return filtered.trim() ? filtered : null
    }
    if (msg.content) {
      if (typeof msg.content === 'string') {
        const filtered = filterThoughts(msg.content)
        return filtered.trim() ? filtered : null
      }
      if (Array.isArray(msg.content)) {
        const text = msg.content.map((c: any) => c.text || '').join('')
        const filtered = filterThoughts(text)
        return filtered.trim() ? filtered : null
      }
    }
    return null
  }

  function addSystemMessage(agentId: string, content: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    agent.messages.push({
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now(),
      agentId
    })
    saveMessages(agentId)
  }

  // 处理 WebSocket 消息
  function handleAgentMessage(agentId: string, msg: any) {
    console.log(`[WebSocket] [${agentId}] Received:`, msg.type, msg.event, msg.payload?.agentId || msg.payload?.sessionKey || '')

    if (msg.type === 'res') {
      console.log(`[WebSocket] [${agentId}] Ignoring response message`)
      return
    }

    if (msg.type === 'event') {
      // 使用 agent 名称匹配，而不是严格的 sessionKey 匹配
      // 因为使用 'agent' 方法发送消息时，Gateway 会创建新的 session
      const payloadSessionKey = extractSessionKeyFromPayload(msg.payload)
      const payloadAgentId = extractAgentIdFromPayload(msg.payload)

      // 从 sessionKey 中提取 agent 名称
      const sessionAgentName = extractAgentNameFromKey(payloadSessionKey || '')
      const currentAgent = agents.value[agentId]
      const myAgentName = extractAgentNameFromKey(currentAgent?.config.sessionKey || '')
      const myGatewayAgentId = currentAgent?.config.gatewayAgentId?.split(':')[1] || ''

      // 检查是否匹配：通过 agent 名称或 gatewayAgentId
      // 消息应该只传递给对应的 Agent
      const isMatch = !payloadSessionKey ||
                      sessionAgentName === myAgentName ||
                      sessionAgentName === myGatewayAgentId ||
                      payloadAgentId === myGatewayAgentId ||
                      payloadAgentId === agentId

      if (!isMatch) {
        console.log(`[WebSocket] [${agentId}] Ignoring message - agent mismatch: sessionAgent=${sessionAgentName}, myAgent=${myAgentName}, myGatewayId=${myGatewayAgentId}`)
        return
      }

      handleEvent(agentId, msg.event, msg.payload)
    }
  }

  // 从 sessionKey 中提取 agent 名称
  // 例如: "agent:ceo:main" -> "ceo", "agent:researcher:main" -> "researcher"
  function extractAgentNameFromKey(key: string): string {
    if (!key) return ''
    const parts = key.split(':')
    // 格式可能是 "agent:ceo:main" 或 "ceo:main" 或直接 "ceo"
    if (parts.length >= 2 && parts[0] === 'agent') {
      return parts[1].toLowerCase()
    }
    if (parts.length >= 1) {
      return parts[0].toLowerCase().replace(/main$/, '').replace(/_main$/, '')
    }
    return key.toLowerCase()
  }

  // 从 payload 中提取 sessionKey
  function extractSessionKeyFromPayload(payload: any): string | null {
    if (!payload) return null
    // 检查多个可能的位置
    if (payload.data?.sessionKey) return payload.data.sessionKey
    if (payload.sessionKey) return payload.sessionKey
    if (payload.context?.sessionKey) return payload.context.sessionKey
    if (payload.runData?.sessionKey) return payload.runData.sessionKey
    return null
  }

  // 从 payload 中提取 agentId
  function extractAgentIdFromPayload(payload: any): string | null {
    if (!payload) return null
    // 检查多个可能的位置
    if (payload.agentId) return payload.agentId
    if (payload.data?.agentId) return payload.data.agentId
    if (payload.agent?.id) return payload.agent.id
    if (payload.context?.agentId) return payload.context.agentId
    return null
  }

  async function handleEvent(agentId: string, event: string, payload: any) {
    console.log(`[Event] [${agentId}]`, event, payload)

    // 通知事件监听器
    eventListeners.value.forEach(listener => {
      try {
        listener(agentId, event, payload)
      } catch (e) {
        console.error('[Event] Listener error:', e)
      }
    })

    // 认证挑战
    if (event === 'connect.challenge') {
      await handleConnectChallenge(agentId, payload)
      return
    }

    // Agent 事件
    if (event === 'agent') {
      handleAgentEvent(agentId, payload)
      return
    }

    // Chat 事件
    if (event === 'chat') {
      handleChatEvent(agentId, payload)
      return
    }

    // Presence 事件 - 移除，避免频繁添加系统消息
    if (event === 'presence') {
      // 不添加系统消息，避免刷屏
      return
    }

    // Health 事件
    if (event === 'health') {
      console.log(`[${agentId}] heartbeat`)
      return
    }

    // Tick 事件
    if (event === 'tick') {
      return
    }
  }

  function handleAgentEvent(agentId: string, payload: any) {
    const agent = agents.value[agentId]
    if (!agent) return

    const stream = payload?.stream
    const runId = payload?.runId

    console.log(`[AgentEvent] [${agentId}] stream=${stream}, runId=${runId}`)

    if (stream === 'assistant') {
      const text = extractText(payload)
      if (text) {
        console.log(`[AgentEvent] [${agentId}] Received assistant text: ${text.substring(0, 50)}...`)
        updateOrCreateMessage(agentId, 'assistant', text, runId)
      }
    } else if (stream === 'lifecycle') {
      const state = payload?.data?.state || payload?.phase
      if (state === 'start') {
        // 开始处理，清空旧消息
        agent.messages = []
      } else if (state === 'error' || payload?.phase === 'error') {
        const error = payload?.data?.error || payload?.error || '未知错误'
        addSystemMessage(agentId, `AI 错误：${error}`)
      }
    } else if (stream === 'tool') {
      // 工具事件处理
      const data = payload?.data || {}
      const phase = data.phase || data.type
      if (phase === 'start' || phase === 'call') {
        console.log(`[${agentId}] Tool call start: ${data.name}`)
      } else if (phase === 'result' || phase === 'complete') {
        console.log(`[${agentId}] Tool call complete: ${data.name}`)
      }
    }
  }

  function handleChatEvent(agentId: string, payload: any) {
    const agent = agents.value[agentId]
    if (!agent) return

    const state = payload?.state
    const runId = payload?.runId

    if (state === 'start') {
      // 开始处理，清空旧消息
      agent.messages = []
    } else if (state === 'delta' || state === 'final' || state === 'committed') {
      const text = extractChatText(payload)
      if (text) {
        updateOrCreateMessage(agentId, 'assistant', text, runId)
      }
    } else if (state === 'error') {
      addSystemMessage(agentId, `错误：${payload?.errorMessage || '未知错误'}`)
    }
  }

  // Actions
  function loadMessages() {
    agentConfigs.forEach(config => {
      const saved = localStorage.getItem(`chat_messages_${config.id}`)
      if (saved) {
        try {
          agents.value[config.id].messages = JSON.parse(saved)
        } catch (e) {
          console.error(`Failed to load messages for ${config.id}:`, e)
        }
      }
    })
  }

  function saveMessages(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    localStorage.setItem(`chat_messages_${agentId}`, JSON.stringify(agent.messages))
  }

  function connect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return

    // 如果已经连接或正在连接，不重复连接
    if (agent.isConnected || agent.isConnecting) {
      console.log(`[WebSocket] [${agentId}] 已连接或正在连接中，跳过`)
      return
    }

    // 关闭旧连接
    if (agent.ws) {
      agent.ws.onopen = null
      agent.ws.onclose = null
      agent.ws.onerror = null
      agent.ws.onmessage = null
      agent.ws.close()
      agent.ws = null
    }

    agent.isConnecting = true
    agent.isConnected = false

    // 构建 WebSocket URL，只使用 token 参数
    const tokenParam = settings.value.token
      ? `?token=${encodeURIComponent(settings.value.token)}`
      : ''
    const wsUrl = `${settings.value.wsUrl}${tokenParam}`

    console.log(`[WebSocket] [${agentId}] Connecting to:`, wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      agent.ws = ws

      ws.onopen = () => {
        console.log(`[WebSocket] [${agentId}] Connected`)
        agent.isConnecting = false
        agent.isConnected = true
        sendConnectRequest(agentId)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleAgentMessage(agentId, msg)
        } catch (e) {
          console.error(`[WebSocket] [${agentId}] Parse error:`, e)
        }
      }

      ws.onclose = (event) => {
        console.log(`[WebSocket] [${agentId}] Closed:`, event.code, event.reason)
        agent.isConnected = false
        agent.isConnecting = false
        agent.ws = null
      }

      ws.onerror = (error) => {
        console.error(`[WebSocket] [${agentId}] Error:`, error)
        agent.isConnecting = false
        agent.isConnected = false
      }
    } catch (e) {
      console.error(`[WebSocket] [${agentId}] Connection error:`, e)
      agent.isConnecting = false
      agent.isConnected = false
    }
  }

  function disconnect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws) return

    agent.ws.close(1000, 'User disconnected')
    agent.ws = null
    agent.isConnected = false
  }

  function connectAll() {
    agentConfigs.forEach(config => {
      connect(config.id)
    })
  }

  function disconnectAll() {
    agentConfigs.forEach(config => {
      disconnect(config.id)
    })
  }

  function sendConnectRequest(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws) return

    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect',
      params: {
        minProtocol: 1,
        maxProtocol: 10,
        client: {
          id: 'webchat',  // 使用标准的 client.id
          displayName: agent.config.displayName,
          version: '1.0.0',
          platform: 'web',
          mode: 'webchat',
        },
        scopes: ['operator.admin', 'operator.write', 'operator.read'],
        caps: ['tool-events'],
        auth: settings.value.token ? { token: settings.value.token } : undefined,
      },
    }
    agent.ws.send(JSON.stringify(msg))
    console.log(`[WebSocket] [${agentId}] Connect request sent (client.id=webchat)`)
  }

  function sendMessage(agentId: string, text: string) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws || !text.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      agentId
    }
    agent.messages.push(userMessage)
    saveMessages(agentId)

    // 使用 'agent' 方法创建新 session 并发送消息（与 Mission-control 一致）
    // 从 gatewayAgentId 提取简短的 agent ID（如 'agent:ceo:main' -> 'ceo'）
    const agentIdShort = agent.config.gatewayAgentId?.split(':')[1] || agentId

    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'agent',
      params: {
        agentId: agentIdShort,
        message: text.trim(),
        idempotencyKey: `ik-${Date.now()}`,
        deliver: false,
      },
    }
    console.log(`[WebSocket] [${agentId}] Sending agent request:`, agentIdShort)
    agent.ws.send(JSON.stringify(msg))
  }

  function clearMessages(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent) return
    agent.messages = []
    saveMessages(agentId)
  }

  function resetChat(agentId: string) {
    clearMessages(agentId)
    const agent = agents.value[agentId]
    if (agent && agent.ws) {
      const msg = {
        type: 'req',
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method: 'chat.send',
        params: {
          sessionKey: agent.config.sessionKey,
          message: '/new',
          idempotencyKey: `ik-${Date.now()}`,
        },
      }
      agent.ws.send(JSON.stringify(msg))
    }
  }

  function selectAgent(agentId: string) {
    selectedAgentId.value = agentId
  }

  function updateSettings(newSettings: Partial<ConnectionSettings>) {
    settings.value = { ...settings.value, ...newSettings }
  }

  return {
    // State
    agents,
    selectedAgentId,
    settings,
    agentConfigs,
    // Computed
    selectedAgent,
    selectedMessages,
    allConnected,
    anyConnected,
    // Actions
    loadMessages,
    connect,
    disconnect,
    connectAll,
    disconnectAll,
    sendMessage,
    clearMessages,
    resetChat,
    selectAgent,
    updateSettings,
    addEventListener,
    removeEventListener,
  }
})
