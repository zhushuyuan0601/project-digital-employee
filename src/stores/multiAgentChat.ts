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
      console.log(`[MultiAgentChat] [${agentId}] [msg] 新消息 (runId: ${runId}), 共 ${agent.messages.length} 条`)
    } else {
      const lastMessage = agent.messages[agent.messages.length - 1]
      if (lastMessage && lastMessage.role === role) {
        lastMessage.content = content
      } else {
        const msgId = `msg-${Date.now()}`
        agent.messages.push({
          id: msgId,
          role,
          content,
          timestamp: Date.now(),
          agentId
        })
        console.log(`[MultiAgentChat] [${agentId}] [msg] 新消息 (无runId), 共 ${agent.messages.length} 条`)
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

  // 设置 - 直接连接 Gateway，不走 Vite 代理
  // 这样 Gateway 能正确识别为本地连接，避免 scopes 被清空
  const settings = ref<ConnectionSettings>({
    wsUrl: import.meta.env.VITE_GATEWAY_WS_URL ||
           import.meta.env.VITE_GATEWAY_HOST && import.meta.env.VITE_GATEWAY_PORT ?
             `ws://${import.meta.env.VITE_GATEWAY_HOST}:${import.meta.env.VITE_GATEWAY_PORT}` :
             'ws://127.0.0.1:18789',  // 默认直接连接 Gateway
    token: import.meta.env.VITE_GATEWAY_TOKEN || 'bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70',
    autoConnect: true,
  })

  console.log('[MultiAgentChat] 初始化 - wsUrl:', settings.value.wsUrl, 'hasToken:', !!settings.value.token)

  // 每个 Agent 的连接状态和消息
  const agents = ref<Record<string, AgentConnection>>({})

  // 重连定时器引用
  const reconnectTimers = ref<Record<string, ReturnType<typeof setTimeout>>>({})

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
      console.error(`[MultiAgentChat] [${agentId}] 挑战响应失败 - 缺少 ws 或 token`)
      return
    }

    if (!window.crypto?.subtle) {
      console.warn(`[MultiAgentChat] [${agentId}] window.crypto.subtle 不可用（非安全上下文），跳过挑战响应`)
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
    console.log(`[MultiAgentChat] [${agentId}] 挑战响应已发送`)
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
  // 追踪 request id 对应的方法，用于解析 res 响应
  const pendingRequests = ref<Record<string, { method: string; agentId: string }>>({})

  function handleAgentMessage(agentId: string, msg: any) {
    console.log(`[MultiAgentChat] [${agentId}] handleAgentMessage 入口:`, msg.type, msg.id ? msg.id.slice(0, 30) : '')

    if (msg.type === 'res') {
      // Gateway res 没有 method 字段，通过 request id 匹配
      const pending = pendingRequests.value[msg.id]
      const methodLabel = pending ? pending.method : 'unknown'

      // 所有 res 消息都打印完整详情
      console.log(`[MultiAgentChat] [${agentId}] res [${methodLabel}]:`, JSON.stringify({
        resId: msg.id,
        ok: msg.ok,
        payload: msg.payload,
        error: msg.error,
      }, null, 2))

      if (methodLabel === 'connect' || methodLabel === 'connect.challenge_response') {
        const agent = agents.value[agentId]
        if (!msg.ok) {
          console.error(`[MultiAgentChat] [${agentId}] 连接握手失败! error=`, JSON.stringify(msg.error))
          if (agent) {
            agent.isConnected = false
            agent.isConnecting = false
          }
        } else {
          // connect 握手成功，设置 isConnected = true
          if (agent) {
            agent.isConnected = true
            agent.isConnecting = false
          }
          // 打印服务端实际授予的 scopes（hello-ok 响应）
          const payload = msg.payload || msg.result || {}
          console.log(`[MultiAgentChat] [${agentId}] 连接握手成功 (hello-ok):`, JSON.stringify(payload, null, 2))
          const grantedScopes = payload.scopes || payload.grantedScopes || payload.granted_scopes
          if (grantedScopes) {
            console.log(`[MultiAgentChat] [${agentId}] 服务端授予的 scopes:`, JSON.stringify(grantedScopes))
            if (!grantedScopes.includes('operator.write')) {
              console.error(`[MultiAgentChat] [${agentId}] ⚠️ 缺少 operator.write scope！写入操作将被拒绝。请检查 Gateway token 权限。`)
            }
          }
        }
      } else if (methodLabel === 'agent') {
        if (!msg.ok) {
          console.error(`[MultiAgentChat] [${agentId}] agent 请求失败! error=`, JSON.stringify(msg.error))
        }
      } else if (methodLabel === 'chat.send') {
        if (!msg.ok) {
          console.error(`[MultiAgentChat] [${agentId}] chat.send 请求失败! error=`, JSON.stringify(msg.error))
        }
      }

      // 清理已匹配的 pending
      if (pending) delete pendingRequests.value[msg.id]
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
    console.log(`[MultiAgentChat] [${agentId}] 处理事件:`, event, { stream: payload?.stream, state: payload?.state, runId: payload?.runId })

    // 通知事件监听器
    eventListeners.value.forEach(listener => {
      try {
        listener(agentId, event, payload)
      } catch (e) {
        console.error('[Event] Listener error:', e)
      }
    })

    // 如果已连接成功，忽略 connect.challenge 事件
    // Gateway 在 hello-ok 之后仍会发送 challenge，但此时无需响应
    const agent = agents.value[agentId]
    if (event === 'connect.challenge' && agent?.isConnected) {
      console.log(`[MultiAgentChat] [${agentId}] 已连接成功，忽略 connect.challenge 事件`)
      return
    }

    // 认证挑战（仅在未连接时处理）
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
      return
    }

    // Tick 事件
    if (event === 'tick') {
      return
    }

    // 未知事件
    console.warn(`[MultiAgentChat] [${agentId}] 未处理的事件类型:`, event, JSON.stringify(payload).slice(0, 300))
  }

  function handleAgentEvent(agentId: string, payload: any) {
    const agent = agents.value[agentId]
    if (!agent) return

    const stream = payload?.stream
    const runId = payload?.runId

    if (stream === 'assistant') {
      const text = extractText(payload)
      if (text) {
        console.log(`[MultiAgentChat] [${agentId}] [assistant] 收到回复 (runId: ${runId}):`, text.slice(0, 80))
        updateOrCreateMessage(agentId, 'assistant', text, runId)
      }
    } else if (stream === 'lifecycle') {
      const state = payload?.data?.state || payload?.phase
      console.log(`[MultiAgentChat] [${agentId}] [lifecycle] 状态:`, state)
      if (state === 'start') {
        // 开始处理，清空旧消息
        console.log(`[MultiAgentChat] [${agentId}] [lifecycle] 清空旧消息`)
        agent.messages = []
        saveMessages(agentId)
      } else if (state === 'error' || payload?.phase === 'error') {
        const error = payload?.data?.error || payload?.error || '未知错误'
        console.error(`[MultiAgentChat] [${agentId}] [lifecycle] 错误:`, error)
        addSystemMessage(agentId, `AI 错误：${error}`)
      } else if (state === 'done' || state === 'final') {
        console.log(`[MultiAgentChat] [${agentId}] [lifecycle] 处理完成`)
      }
    } else if (stream === 'tool') {
      // 工具事件处理
      const data = payload?.data || {}
      const phase = data.phase || data.type
      console.log(`[MultiAgentChat] [${agentId}] [tool] 阶段:`, phase, '名称:', data.name || '')
    } else if (stream === 'compaction') {
      console.log(`[MultiAgentChat] [${agentId}] [compaction] 阶段:`, payload?.phase)
    } else if (stream === 'fallback') {
      console.log(`[MultiAgentChat] [${agentId}] [fallback] 阶段:`, payload?.phase)
    } else {
      console.warn(`[MultiAgentChat] [${agentId}] [agent] 未处理的 stream:`, stream)
    }
  }

  function handleChatEvent(agentId: string, payload: any) {
    const agent = agents.value[agentId]
    if (!agent) return

    const state = payload?.state
    const runId = payload?.runId

    if (state === 'start') {
      console.log(`[MultiAgentChat] [${agentId}] [chat] 开始处理 (runId: ${runId})，清空旧消息`)
      // 开始处理，清空旧消息
      agent.messages = []
      saveMessages(agentId)
    } else if (state === 'delta' || state === 'final' || state === 'committed') {
      const text = extractChatText(payload)
      if (text) {
        console.log(`[MultiAgentChat] [${agentId}] [chat] 收到回复 (${state}, runId: ${runId}):`, text.slice(0, 80))
        updateOrCreateMessage(agentId, 'assistant', text, runId)
      }
    } else if (state === 'error') {
      console.error(`[MultiAgentChat] [${agentId}] [chat] 错误:`, payload?.errorMessage || '未知错误')
      addSystemMessage(agentId, `错误：${payload?.errorMessage || '未知错误'}`)
    } else {
      console.warn(`[MultiAgentChat] [${agentId}] [chat] 未处理的 state:`, state)
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

    console.log(`[MultiAgentChat] [${agentId}] 开始连接...`, {
      wsUrl: settings.value.wsUrl,
      hasToken: !!settings.value.token,
      alreadyConnected: agent.isConnected,
      isConnecting: agent.isConnecting
    })

    // 如果已经连接或正在连接，不重复连接
    if (agent.isConnected || agent.isConnecting) {
      console.log(`[MultiAgentChat] [${agentId}] 跳过连接 - 已连接=${agent.isConnected}, 连接中=${agent.isConnecting}`)
      return
    }

    // 清除已有重连定时器
    if (reconnectTimers.value[agentId]) {
      clearTimeout(reconnectTimers.value[agentId])
      delete reconnectTimers.value[agentId]
    }

    // 关闭旧连接
    if (agent.ws) {
      console.log(`[MultiAgentChat] [${agentId}] 关闭旧连接`)
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

    console.log(`[MultiAgentChat] [${agentId}] 正在连接: ${wsUrl.replace(/\?.*/, '?token=***')}`)

    try {
      const ws = new WebSocket(wsUrl)
      agent.ws = ws

      ws.onopen = () => {
        console.log(`[MultiAgentChat] [${agentId}] WebSocket 已打开，等待 connect 握手响应`)
        // 注意：isConnected 在收到 connect 响应 (hello-ok) 后才设置为 true
        agent.isConnecting = false
        sendConnectRequest(agentId)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          console.log(`[MultiAgentChat] [${agentId}] 收到消息:`, msg.type, msg.event || '', msg.method || '')
          handleAgentMessage(agentId, msg)
        } catch (e) {
          console.error(`[MultiAgentChat] [${agentId}] 解析消息失败:`, e)
        }
      }

      ws.onclose = (event) => {
        console.warn(`[MultiAgentChat] [${agentId}] 连接关闭:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        agent.isConnected = false
        agent.isConnecting = false
        agent.ws = null

        // 非用户主动断开时自动重连
        if (event.code !== 1000) {
          scheduleReconnect(agentId)
        }
      }

      ws.onerror = (error) => {
        console.error(`[MultiAgentChat] [${agentId}] WebSocket 错误:`, error)
        agent.isConnecting = false
        agent.isConnected = false
      }
    } catch (e) {
      console.error(`[MultiAgentChat] [${agentId}] 创建连接失败:`, e)
      agent.isConnecting = false
      agent.isConnected = false
    }
  }

  // 重连策略：指数退避，800ms -> 1360ms -> 2312ms -> ... -> 最大 30s
  const reconnectBackoffMs = ref<Record<string, number>>({})

  function scheduleReconnect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent || agent.isConnected || agent.isConnecting) return

    if (!reconnectBackoffMs.value[agentId]) {
      reconnectBackoffMs.value[agentId] = 800
    }

    const delay = reconnectBackoffMs.value[agentId]
    reconnectBackoffMs.value[agentId] = Math.min(delay * 1.7, 30000)

    console.log(`[MultiAgentChat] [${agentId}] ${delay}ms 后自动重连...`)
    reconnectTimers.value[agentId] = setTimeout(() => {
      connect(agentId)
    }, delay)
  }

  function disconnect(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws) return

    agent.ws.close(1000, 'User disconnected')
    agent.ws = null
    agent.isConnected = false
  }

  function connectAll() {
    console.log(`[MultiAgentChat] 全连 - 共 ${agentConfigs.length} 个 Agent`)
    agentConfigs.forEach(config => {
      connect(config.id)
    })
  }

  function disconnectAll() {
    agentConfigs.forEach(config => {
      // 清除重连定时器
      if (reconnectTimers.value[config.id]) {
        clearTimeout(reconnectTimers.value[config.id])
        delete reconnectTimers.value[config.id]
      }
      delete reconnectBackoffMs.value[config.id]
      disconnect(config.id)
    })
  }

  function sendConnectRequest(agentId: string) {
    const agent = agents.value[agentId]
    if (!agent || !agent.ws) return

    // Gateway 协议版本（与服务端保持一致）
    const PROTOCOL_VERSION = 3

    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect',
      params: {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: 'openclaw-control-ui',  // 必须使用这个 ID 才能被识别为 Control UI
          displayName: agent.config.displayName,
          version: '1.0.0',
          platform: 'web',
          mode: 'webchat',
        },
        role: 'operator',  // 必须指定 role，dangerouslyDisableDeviceAuth 只对 operator 生效
        scopes: ['operator.admin', 'operator.write', 'operator.read'],
        caps: ['tool-events'],
        auth: settings.value.token ? { token: settings.value.token } : undefined,
      },
    }
    console.log(`[MultiAgentChat] [${agentId}] 发送连接请求 (protocol v${PROTOCOL_VERSION}):`, JSON.stringify(msg.params.client, null, 2))
    pendingRequests.value[msg.id] = { method: 'connect', agentId }
    agent.ws.send(JSON.stringify(msg))
  }

  function sendMessage(agentId: string, text: string) {
    const agent = agents.value[agentId]
    if (!agent) {
      console.error(`[MultiAgentChat] [${agentId}] sendMessage - Agent 不存在`)
      return
    }

    if (!text.trim()) return

    if (!agent.ws || !agent.isConnected) {
      console.error(`[MultiAgentChat] [${agentId}] sendMessage - 未连接 (ws=${!!agent.ws}, connected=${agent.isConnected})`)
      throw new Error(`${agent.config.displayName} 未连接，请先点击全连按钮`)
    }

    // 检查 WebSocket 就绪状态
    if (agent.ws.readyState !== WebSocket.OPEN) {
      const stateMap: Record<number, string> = { 0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED' }
      console.error(`[MultiAgentChat] [${agentId}] sendMessage - WebSocket 状态不是 OPEN: ${stateMap[agent.ws.readyState] || agent.ws.readyState}`)
      throw new Error(`${agent.config.displayName} 连接未就绪，请重试`)
    }

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
        deliver: true,
      },
    }
    console.log(`[MultiAgentChat] [${agentId}] 发送消息:`, JSON.stringify(msg.params, null, 2))
    pendingRequests.value[msg.id] = { method: 'agent', agentId }
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
      pendingRequests.value[msg.id] = { method: 'chat.send', agentId }
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
