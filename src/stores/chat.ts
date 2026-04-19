import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface ToolCall {
  id: string
  name: string
  args: any
  status: 'running' | 'completed' | 'error'
  result?: any
  error?: string
}

export interface ConnectionSettings {
  wsUrl: string
  token: string
  sessionKey: string
  autoConnect: boolean
}

export const useChatStore = defineStore('chat', () => {
  // State
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const messages = ref<ChatMessage[]>([])
  const isTyping = ref(false)
  const typingStartTime = ref<number | null>(null)
  const toolCalls = ref<ToolCall[]>([])
  const settings = ref<ConnectionSettings>({
    wsUrl: 'ws://127.0.0.1:18789',
    token: 'bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70',
    sessionKey: 'agent:ceo:main',
    autoConnect: true,
  })

  // 事件监听器回调
  type EventListener = (event: string, payload: any) => void
  const eventListeners = ref<EventListener[]>([])

  // 添加事件监听器
  function addEventListener(listener: EventListener) {
    eventListeners.value.push(listener)
  }

  // 移除事件监听器
  function removeEventListener(listener: EventListener) {
    const index = eventListeners.value.indexOf(listener)
    if (index > -1) {
      eventListeners.value.splice(index, 1)
    }
  }

  // Computed
  const typingDuration = computed(() => {
    if (!typingStartTime.value) return 0
    return Math.floor((Date.now() - typingStartTime.value) / 1000)
  })

  const formattedTypingDuration = computed(() => {
    const seconds = typingDuration.value
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`
    }
    return `${remainingSeconds}秒`
  })

  // 当前 AI 消息的 runId，用于区分不同的消息
  let currentAssistantMsgId: string | null = null

  // 处理连接挑战响应
  async function handleConnectChallenge(payload: { nonce: string; ts: number }) {
    if (!ws.value || !settings.value.token) {
      console.error('[WebSocket] No token to respond to challenge')
      return
    }

    // 使用 HMAC-SHA256 计算签名
    const encoder = new TextEncoder()
    const keyData = encoder.encode(settings.value.token)
    const messageData = encoder.encode(payload.nonce)

    // 导入密钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // 计算签名
    const signature = await crypto.subtle.sign('HMAC', key, messageData)

    // 转换为 hex 字符串
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // 发送挑战响应
    const responseMsg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect.challenge_response',
      params: {
        nonce: payload.nonce,
        response: signatureHex
      }
    }

    ws.value.send(JSON.stringify(responseMsg))
  }

  // Actions
  function loadSettings() {
    const saved = localStorage.getItem('chat_settings')
    if (saved) {
      try {
        settings.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    // 加载保存的对话消息
    loadMessages()
  }

  function saveSettings() {
    localStorage.setItem('chat_settings', JSON.stringify(settings.value))
  }

  function saveMessages() {
    localStorage.setItem('chat_messages', JSON.stringify(messages.value))
  }

  function loadMessages() {
    const saved = localStorage.getItem('chat_messages')
    if (saved) {
      try {
        messages.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load messages:', e)
      }
    }
  }

  function connect() {
    // 先关闭旧连接
    if (ws.value) {
      ws.value.onopen = null
      ws.value.onclose = null
      ws.value.onerror = null
      ws.value.onmessage = null
      ws.value.close()
      ws.value = null
    }

    if (isConnecting.value) return

    // 连接前重置所有状态
    isConnecting.value = true
    isConnected.value = false
    isTyping.value = false
    typingStartTime.value = null

    const tokenParam = settings.value.token
      ? `?token=${encodeURIComponent(settings.value.token)}`
      : ''
    const wsUrl = `${settings.value.wsUrl}${tokenParam}`

    try {
      ws.value = new WebSocket(wsUrl)
      ws.value.onopen = () => {
        isConnecting.value = false
        isConnected.value = true
        // Send connect request
        sendConnectRequest()
      }
      ws.value.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch (e) {
          console.error('[WebSocket] Parse error:', e)
        }
      }
      ws.value.onclose = (event) => {
        isConnected.value = false
        isConnecting.value = false
        isTyping.value = false
        typingStartTime.value = null
        toolCalls.value = []
        ws.value = null
      }
      ws.value.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        isConnecting.value = false
        isConnected.value = false
      }
    } catch (e) {
      console.error('[WebSocket] Connection error:', e)
      isConnecting.value = false
      isConnected.value = false
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close(1000, 'User disconnected')
      ws.value = null
      isConnected.value = false
      isTyping.value = false
      typingStartTime.value = null
      toolCalls.value = []
    }
  }

  function sendConnectRequest() {
    if (!ws.value) return
    const agentIdShort = settings.value.sessionKey.split(':')[1] || 'ceo'
    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect',
      params: {
        minProtocol: 1,
        maxProtocol: 10,
        client: {
          id: 'webchat',
          displayName: agentIdShort,
          version: '1.0.0',
          platform: 'web',
          mode: 'webchat',
        },
        scopes: ['operator.admin', 'operator.write', 'operator.read'],
        caps: ['tool-events'],
        auth: settings.value.token ? { token: settings.value.token } : undefined,
      },
    }
    ws.value.send(JSON.stringify(msg))
  }

  function sendMessage(text: string) {
    if (!ws.value || !text.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }
    messages.value.push(userMessage)
    // 保存消息
    saveMessages()

    // Show typing indicator
    isTyping.value = true
    typingStartTime.value = Date.now()

    // 使用 'agent' 方法创建新 session 并发送消息（与 Mission-control 一致）
    // 从 sessionKey 提取简短的 agent ID（如 'agent:ceo:main' -> 'ceo'）
    const agentIdShort = settings.value.sessionKey.split(':')[1] || 'ceo'

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
    ws.value.send(JSON.stringify(msg))
  }

  function handleMessage(msg: any) {
    if (msg.type === 'res') {
      // Handle response
      return
    }
    if (msg.type === 'event') {
      handleEvent(msg.event, msg.payload)
    }
  }

  async function handleEvent(event: string, payload: any) {
    // 通知所有事件监听器
    eventListeners.value.forEach(listener => {
      try {
        listener(event, payload)
      } catch (e) {
        console.error('[Event] Listener error:', e)
      }
    })

    // Handle connect.challenge event - 认证挑战响应
    if (event === 'connect.challenge') {
      await handleConnectChallenge(payload)
      return
    }

    // Handle agent events
    if (event === 'agent') {
      handleAgentEvent(payload)
      return
    }

    // Handle chat events
    if (event === 'chat') {
      handleChatEvent(payload)
      return
    }

    // Handle presence events - 在线状态更新
    if (event === 'presence') {
      const agents = payload?.agents
      if (Array.isArray(agents)) {
        addSystemMessage(`📱 ${agents.length} 个代理在线`)
      }
      return
    }

    // Handle cron events - 定时任务状态
    if (event === 'cron') {
      // Cron event - ignored
      return
    }

    // Handle device pair events
    if (event === 'device.pair.requested') {
      addSystemMessage(`📱 设备配对请求：${payload?.device?.name || '未知设备'}`)
      return
    }
    if (event === 'device.pair.resolved') {
      const status = payload?.status
      if (status === 'accepted') {
        addSystemMessage(`✅ 设备配对成功：${payload?.device?.name || '未知设备'}`)
      } else if (status === 'rejected' || status === 'timeout') {
        addSystemMessage(`❌ 设备配对失败：${status === 'rejected' ? '已拒绝' : '超时'}`)
      }
      return
    }

    // Handle exec approval events
    if (event === 'exec.approval.requested') {
      addSystemMessage(`🔐 执行审批请求：${payload?.description || '需要批准'}`)
      return
    }
    if (event === 'exec.approval.resolved') {
      const status = payload?.status
      if (status === 'approved') {
        addSystemMessage(`✅ 审批已通过`)
      } else if (status === 'rejected') {
        addSystemMessage(`❌ 审批已被拒绝`)
      }
      return
    }

    // Handle update available events
    if (event === 'update.available') {
      addSystemMessage(`🔔 新版本可用：${payload?.version || 'unknown'}`)
      return
    }

    // Handle health events - 心跳
    if (event === 'health') {
      return
    }

    // Handle tick events - 心跳计时器
    if (event === 'tick') {
      return
    }

    // Unknown event - ignored
  }

  function handleAgentEvent(payload: any) {
    const stream = payload?.stream
    const runId = payload?.runId

    if (stream === 'assistant') {
      const text = extractText(payload)
      if (text) {
        isTyping.value = false
        updateOrCreateMessage('assistant', text, runId)
      }
    } else if (stream === 'lifecycle') {
      const state = payload?.data?.state || payload?.phase
      if (state === 'start') {
        isTyping.value = true
        typingStartTime.value = Date.now()
      } else if (state === 'done' || state === 'final') {
        isTyping.value = false
      } else if (state === 'error' || payload?.phase === 'error') {
        isTyping.value = false
        const error = payload?.data?.error || payload?.error || '未知错误'
        addSystemMessage(`AI 错误：${error}`)
      }
    } else if (stream === 'tool') {
      handleToolEvent(payload)
    } else if (stream === 'compaction') {
      handleCompactionEvent(payload)
    } else if (stream === 'fallback') {
      handleFallbackEvent(payload)
    }
  }

  function handleChatEvent(payload: any) {
    const state = payload?.state
    const runId = payload?.runId

    if (state === 'start') {
      isTyping.value = true
      typingStartTime.value = Date.now()
    } else if (state === 'delta' || state === 'final' || state === 'committed') {
      const text = extractChatText(payload)
      if (text) {
        isTyping.value = false
        updateOrCreateMessage('assistant', text, runId)
      }
    } else if (state === 'error') {
      isTyping.value = false
      addSystemMessage(`错误：${payload?.errorMessage || '未知错误'}`)
    }
  }

  function handleToolEvent(payload: any) {
    const data = payload?.data || {}
    const toolCallId = data.toolCallId || data.id || `tool-${Date.now()}`
    const name = data.name || 'unknown'
    const phase = data.phase || data.type

    if (phase === 'start' || phase === 'call') {
      const args = data.args || data.arguments || {}
      toolCalls.value.push({
        id: toolCallId,
        name,
        args,
        status: 'running',
      })
      // addSystemMessage(`🔧 正在调用工具：${name}`)
    } else if (phase === 'update' || phase === 'streaming') {
      const toolCall = toolCalls.value.find(t => t.id === toolCallId)
      if (toolCall && data.partialResult) {
        toolCall.result = data.partialResult
      }
    } else if (phase === 'result' || phase === 'complete' || phase === 'done') {
      const toolCall = toolCalls.value.find(t => t.id === toolCallId)
      if (toolCall) {
        toolCall.status = 'completed'
        toolCall.result = data.result || data.output || data.response
      }
      // addSystemMessage(`✅ 工具 "${name}" 调用完成`)
    } else if (phase === 'error') {
      const toolCall = toolCalls.value.find(t => t.id === toolCallId)
      if (toolCall) {
        toolCall.status = 'error'
        toolCall.error = data.error || data.errorMessage || '未知错误'
      }
      // addSystemMessage(`❌ 工具 "${name}" 调用失败：${data.error || '未知错误'}`)
    }
  }

  function handleCompactionEvent(payload: any) {
    const phase = payload?.phase
    const data = payload?.data || {}

    if (phase === 'start') {
      addSystemMessage('🔄 正在压缩对话上下文...')
    } else if (phase === 'end' || phase === 'complete') {
      const tokensSaved = data.compactCount || data.tokensSaved || '未知'
      addSystemMessage(`✅ 上下文压缩完成，已优化 ${tokensSaved} tokens`)
    }
  }

  function formatModelLabel(provider?: string, model?: string): string | null {
    if (!model) return null
    if (provider && model.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
      return model
    }
    if (provider) {
      return `${provider}/${model}`
    }
    const slashIndex = model.indexOf('/')
    if (slashIndex > 0) {
      const p = model.slice(0, slashIndex).trim()
      const m = model.slice(slashIndex + 1).trim()
      if (p && m) return `${p}/${m}`
    }
    return model
  }

  function handleFallbackEvent(payload: any) {
    const phase = payload?.phase
    const data = payload?.data || {}
    const selectedModel = formatModelLabel(data.selectedProvider, data.selectedModel)
    const activeModel = formatModelLabel(data.activeProvider, data.activeModel)
    const reason = data.reason || data.reasonSummary || '未知原因'

    if (phase === 'fallback') {
      let attemptsInfo = ''
      if (Array.isArray(data.attempts) && data.attempts.length > 0) {
        attemptsInfo = '，尝试：' + data.attempts.slice(0, 3).map((a: any) => {
          if (typeof a === 'string') return a
          return `${a.provider}/${a.model}: ${a.reason || a.code || 'error'}`
        }).join(', ')
      }
      addSystemMessage(`⚠️ 模型降级：从 ${activeModel || '主模型'} 降级到 ${selectedModel}（原因：${reason}）`)
    } else if (phase === 'cleared') {
      addSystemMessage(`✅ 模型已恢复到：${selectedModel}`)
    }
  }

  // 过滤掉思考内容（与 openclaw 项目保持一致）
  // 支持的标签：<think>, <thinking>, <thought>, <antthinking>
  function filterThoughts(text: string): string {
    if (!text) return text

    // 移除 <think>...</think> 标签及其内容（不区分大小写）
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

    // 如果没有关闭标签，保留剩余内容
    if (!inThinking) {
      result += text.slice(lastIndex)
    }

    return result.trimStart()
  }

  function extractText(payload: any): string | null {
    if (!payload) return null
    if (payload.data) {
      if (typeof payload.data === 'string') return filterThoughts(payload.data)
      if (payload.data.text) return filterThoughts(payload.data.text)
      if (payload.data.content) {
        if (typeof payload.data.content === 'string') return filterThoughts(payload.data.content)
        if (Array.isArray(payload.data.content)) {
          const text = payload.data.content.map((c: any) => c.text || '').join('')
          return filterThoughts(text)
        }
      }
      if (payload.data.delta) {
        const text = payload.data.delta.text || payload.data.delta.content || ''
        return filterThoughts(text)
      }
    }
    return null
  }

  function extractChatText(payload: any): string | null {
    if (!payload?.message) return null
    const msg = payload.message
    if (typeof msg === 'string') return filterThoughts(msg)
    if (msg.text) return filterThoughts(msg.text)
    if (msg.content) {
      if (typeof msg.content === 'string') return filterThoughts(msg.content)
      if (Array.isArray(msg.content)) {
        const text = msg.content.map((c: any) => c.text || '').join('')
        return filterThoughts(text)
      }
    }
    return null
  }

  function updateOrCreateMessage(role: 'assistant', content: string, runId?: string) {
    // 如果有 runId 且与当前不同，则创建新消息
    if (runId && runId !== currentAssistantMsgId) {
      currentAssistantMsgId = runId
      messages.value.push({
        id: `msg-${runId}`,
        role,
        content,
        timestamp: Date.now(),
      })
    } else {
      // 否则更新最后一条同角色消息（流式更新）
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.role === role) {
        lastMessage.content = content
      } else {
        messages.value.push({
          id: `msg-${Date.now()}`,
          role,
          content,
          timestamp: Date.now(),
        })
      }
    }
    // 保存消息
    saveMessages()
  }

  function addSystemMessage(content: string) {
    messages.value.push({
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now(),
    })
    // 保存消息
    saveMessages()
  }

  function clearMessages() {
    messages.value = []
    isTyping.value = false
    typingStartTime.value = null
    toolCalls.value = []
    // 保存到 localStorage
    saveMessages()
  }

  function resetChat() {
    // 清空消息
    clearMessages()
    // 发送 /new 命令到后端
    if (ws.value) {
      const msg = {
        type: 'req',
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method: 'chat.send',
        params: {
          sessionKey: settings.value.sessionKey,
          message: '/new',
          idempotencyKey: `ik-${Date.now()}`,
        },
      }
      ws.value.send(JSON.stringify(msg))
    }
  }

  function updateSettings(newSettings: Partial<ConnectionSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }

  return {
    // State
    ws,
    isConnected,
    isConnecting,
    messages,
    isTyping,
    toolCalls,
    settings,
    eventListeners,
    // Computed
    typingDuration,
    formattedTypingDuration,
    // Actions
    loadSettings,
    saveSettings,
    updateSettings,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    resetChat,
    addSystemMessage,
    addEventListener,
    removeEventListener,
  }
})
