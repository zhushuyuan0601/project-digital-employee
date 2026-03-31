// TaskCenter Gateway 通信 Store
// 真实连接模式：实际建立 WebSocket 连接到 Gateway
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Agent 连接配置
export interface AgentConnection {
  id: string // 前端 Agent ID: xiaomu
  gatewayAgentId: string // Gateway Agent ID: ceo
  name: string
  ws: WebSocket | null
  isConnected: boolean
  isConnecting: boolean
  sessionKey: string
}

// 任务消息
export interface TaskMessage {
  id: string
  agentId: string
  type: 'task_assigned' | 'task_started' | 'task_progress' | 'task_completed' | 'task_error' | 'log'
  content: string
  timestamp: number
  data?: any
}

// Gateway 配置
const GATEWAY_CONFIG = {
  wsUrl: 'ws://127.0.0.1:18789',
  token: 'bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70',
}

// 模拟模式开关 - 设置为 false 启用真实连接
const SIMULATION_MODE = false

export const useTaskGatewayStore = defineStore('taskGateway', () => {
  // 状态 - 四个 Agent 连接配置
  const connections = ref<Record<string, AgentConnection>>({
    xiaomu: {
      id: 'xiaomu',
      gatewayAgentId: 'ceo',
      name: '小呦',
      ws: null,
      isConnected: false,
      isConnecting: false,
      sessionKey: 'agent:ceo:main'
    },
    xiaokai: {
      id: 'xiaokai',
      gatewayAgentId: 'tech-lead',
      name: '研发工程师',
      ws: null,
      isConnected: false,
      isConnecting: false,
      sessionKey: 'agent:tech-lead:main'
    },
    xiaochan: {
      id: 'xiaochan',
      gatewayAgentId: 'pm',
      name: '产品经理',
      ws: null,
      isConnected: false,
      isConnecting: false,
      sessionKey: 'agent:pm:main'
    },
    xiaoyan: {
      id: 'xiaoyan',
      gatewayAgentId: 'researcher',
      name: '研究员',
      ws: null,
      isConnected: false,
      isConnecting: false,
      sessionKey: 'agent:researcher:main'
    }
  })

  // 消息日志
  const messages = ref<TaskMessage[]>([])
  const taskQueue = ref<Array<{ agentId: string; content: string }>>([])

  // 计算属性
  const allConnected = computed(() => {
    return Object.values(connections.value).every(c => c.isConnected)
  })

  const anyConnected = computed(() => {
    return Object.values(connections.value).some(c => c.isConnected)
  })

  const xiaomuConnected = computed(() => {
    return connections.value.xiaomu?.isConnected || false
  })

  const getAgentConnection = computed(() => (agentId: string) => {
    return connections.value[agentId]
  })

  // 事件监听器
  type MessageListener = (message: TaskMessage) => void
  const messageListeners = ref<MessageListener[]>([])

  function addMessageListener(listener: MessageListener) {
    messageListeners.value.push(listener)
  }

  function removeMessageListener(listener: MessageListener) {
    const index = messageListeners.value.indexOf(listener)
    if (index > -1) {
      messageListeners.value.splice(index, 1)
    }
  }

  // 添加消息
  function addMessage(message: Omit<TaskMessage, 'id' | 'timestamp'>) {
    const newMessage: TaskMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    }
    messages.value.unshift(newMessage)
    // 通知所有监听器
    messageListeners.value.forEach(listener => {
      try {
        listener(newMessage)
      } catch (e) {
        console.error('[TaskGateway] Message listener error:', e)
      }
    })
    return newMessage
  }

  // 发送连接请求
  function sendConnectRequest(agentId: string) {
    const conn = connections.value[agentId]
    if (!conn.ws) return

    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'connect',
      params: {
        minProtocol: 1,
        maxProtocol: 10,
        client: {
          id: 'webchat',
          displayName: 'Web Chat',
          version: '1.0.0',
          platform: 'web',
          mode: 'webchat',
        },
        scopes: ['operator.admin', 'operator.write', 'operator.read'],
        caps: ['tool-events'],
        auth: GATEWAY_CONFIG.token ? { token: GATEWAY_CONFIG.token } : undefined,
      },
    }
    conn.ws?.send(JSON.stringify(msg))
    console.log(`[TaskGateway:${agentId}] 发送连接请求`)
  }

  // 发送消息到指定 Agent（模拟模式下直接返回成功）
  function sendMessageToAgent(agentId: string, content: string) {
    if (SIMULATION_MODE) {
      console.log(`[TaskGateway:${agentId}] 模拟发送消息：${content.substring(0, 50)}...`)
      return true
    }

    const conn = connections.value[agentId]
    if (!conn.ws || !conn.isConnected) {
      console.error(`[TaskGateway:${agentId}] 未连接，无法发送消息`)
      return false
    }

    // 使用 'agent' 方法创建新 session 并发送消息（与 Mission-control 一致）
    const msg = {
      type: 'req',
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method: 'agent',
      params: {
        agentId: conn.gatewayAgentId,
        message: content,
        idempotencyKey: `ik-${Date.now()}`,
        deliver: false,
      },
    }
    conn.ws.send(JSON.stringify(msg))
    console.log(`[TaskGateway:${agentId}] 发送 agent 请求: ${conn.gatewayAgentId}`)
    return true
  }

  // 分配任务到 Agent
  function assignTaskToAgent(agentId: string, taskDescription: string) {
    addMessage({
      agentId,
      type: 'task_assigned',
      content: `分配任务：${taskDescription}`
    })
    return sendMessageToAgent(agentId, taskDescription)
  }

  // 处理接收到的消息
  function handleMessage(agentId: string, msg: any) {
    console.log(`[TaskGateway:${agentId}] 收到消息:`, msg)

    if (msg.type === 'res') {
      // 响应消息
      return
    }

    if (msg.type === 'event') {
      handleEvent(agentId, msg.event, msg.payload)
    }
  }

  // 处理事件
  async function handleEvent(agentId: string, event: string, payload: any) {
    // connect.challenge 事件 - 认证挑战响应
    if (event === 'connect.challenge') {
      await handleConnectChallenge(agentId, payload)
      return
    }

    // agent 事件
    if (event === 'agent') {
      handleAgentEvent(agentId, payload)
      return
    }

    // chat 事件
    if (event === 'chat') {
      handleChatEvent(agentId, payload)
      return
    }

    // error 事件
    if (event === 'error') {
      addMessage({
        agentId,
        type: 'task_error',
        content: payload?.message || payload?.error || '未知错误',
        data: payload
      })
      return
    }
  }

  // 处理连接挑战响应
  async function handleConnectChallenge(agentId: string, payload: { nonce: string; ts: number }) {
    console.log(`[TaskGateway:${agentId}] Received challenge:`, payload)

    const conn = connections.value[agentId]
    if (!conn?.ws || !GATEWAY_CONFIG.token) {
      console.error(`[TaskGateway:${agentId}] No token to respond to challenge`)
      return
    }

    // 使用 HMAC-SHA256 计算签名
    const encoder = new TextEncoder()
    const keyData = encoder.encode(GATEWAY_CONFIG.token)
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

    conn.ws.send(JSON.stringify(responseMsg))
    console.log(`[TaskGateway:${agentId}] Challenge response sent`)
  }

  // 处理 agent 事件
  function handleAgentEvent(agentId: string, payload: any) {
    const stream = payload?.stream
    const data = payload?.data || {}

    if (stream === 'assistant') {
      // AI 回复内容
      const text = extractText(payload)
      if (text) {
        addMessage({
          agentId,
          type: 'task_progress',
          content: text
        })
      }
    } else if (stream === 'lifecycle') {
      const state = data.state || payload?.phase
      if (state === 'start') {
        addMessage({
          agentId,
          type: 'task_started',
          content: '开始执行任务'
        })
      } else if (state === 'done' || state === 'final') {
        addMessage({
          agentId,
          type: 'task_completed',
          content: '任务执行完成'
        })
      } else if (state === 'error') {
        const error = data.error || payload?.error || '未知错误'
        addMessage({
          agentId,
          type: 'task_error',
          content: `执行错误：${error}`
        })
      }
    } else if (stream === 'tool') {
      handleToolEvent(agentId, data)
    }
  }

  // 处理 chat 事件
  function handleChatEvent(agentId: string, payload: any) {
    const state = payload?.state
    if (state === 'start') {
      addMessage({
        agentId,
        type: 'task_started',
        content: '开始执行任务'
      })
    } else if (state === 'delta' || state === 'final' || state === 'committed') {
      const text = extractChatText(payload)
      if (text) {
        addMessage({
          agentId,
          type: 'task_progress',
          content: text
        })
      }
    } else if (state === 'error') {
      addMessage({
        agentId,
        type: 'task_error',
        content: payload?.errorMessage || '执行错误'
      })
    }
  }

  // 处理工具事件
  function handleToolEvent(agentId: string, data: any) {
    const phase = data.phase || data.type
    const toolName = data.name || 'unknown'

    if (phase === 'start' || phase === 'call') {
      addMessage({
        agentId,
        type: 'log',
        content: `调用工具：${toolName}`
      })
    } else if (phase === 'result' || phase === 'complete') {
      addMessage({
        agentId,
        type: 'log',
        content: `工具完成：${toolName}`
      })
    } else if (phase === 'error') {
      addMessage({
        agentId,
        type: 'task_error',
        content: `工具错误：${data.error || '未知错误'}`
      })
    }
  }

  // 提取文本
  function extractText(payload: any): string | null {
    if (!payload?.data) return null
    if (typeof payload.data === 'string') return payload.data
    if (payload.data.text) return payload.data.text
    if (payload.data.content) {
      if (typeof payload.data.content === 'string') return payload.data.content
      if (Array.isArray(payload.data.content)) {
        return payload.data.content.map((c: any) => c.text || '').join('')
      }
    }
    return null
  }

  // 提取 chat 文本
  function extractChatText(payload: any): string | null {
    if (!payload?.message) return null
    const msg = payload.message
    if (typeof msg === 'string') return msg
    if (msg.text) return msg.text
    if (msg.content) {
      if (typeof msg.content === 'string') return msg.content
      if (Array.isArray(msg.content)) {
        return msg.content.map((c: any) => c.text || '').join('')
      }
    }
    return null
  }

  // 连接到单个 Agent（模拟模式下直接返回已连接）
  function connectAgent(agentId: string) {
    if (SIMULATION_MODE) {
      console.log(`[TaskGateway:${agentId}] 模拟模式：Agent 已连接`)
      const conn = connections.value[agentId]
      if (conn) {
        conn.isConnected = true
        conn.isConnecting = false
      }
      return
    }

    const conn = connections.value[agentId]
    if (!conn || conn.isConnected || conn.isConnecting) {
      return
    }

    conn.isConnecting = true

    try {
      const wsUrl = `${GATEWAY_CONFIG.wsUrl}?token=${encodeURIComponent(GATEWAY_CONFIG.token)}`
      console.log(`[TaskGateway:${agentId}] 连接 Gateway: ${wsUrl}`)

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log(`[TaskGateway:${agentId}] 连接成功`)
        conn.isConnected = true
        conn.isConnecting = false
        sendConnectRequest(agentId)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(agentId, msg)
        } catch (e) {
          console.error(`[TaskGateway:${agentId}] 消息解析错误:`, e)
        }
      }

      ws.onclose = (event) => {
        console.log(`[TaskGateway:${agentId}] 连接关闭:`, event.code, event.reason)
        conn.isConnected = false
        conn.isConnecting = false
        conn.ws = null
      }

      ws.onerror = (error) => {
        console.error(`[TaskGateway:${agentId}] 连接错误:`, error)
        conn.isConnecting = false
        conn.isConnected = false
      }

      conn.ws = ws
    } catch (e) {
      console.error(`[TaskGateway:${agentId}] 连接失败:`, e)
      conn.isConnecting = false
      conn.isConnected = false
    }
  }

  // 断开单个 Agent
  function disconnectAgent(agentId: string) {
    const conn = connections.value[agentId]
    if (!conn || !conn.ws) return

    conn.ws.onopen = null
    conn.ws.onclose = null
    conn.ws.onerror = null
    conn.ws.onmessage = null
    conn.ws.close(1000, 'User disconnected')
    conn.ws = null
    conn.isConnected = false
    conn.isConnecting = false
  }

  // 连接所有 Agent（模拟模式下所有 Agent 都显示已连接）
  function connectAll() {
    if (SIMULATION_MODE) {
      Object.keys(connections.value).forEach(agentId => {
        const conn = connections.value[agentId]
        if (conn) {
          conn.isConnected = true
          conn.isConnecting = false
        }
      })
      console.log('[TaskGateway] 模拟模式：所有 Agent 已连接')
      return
    }
    // 真实模式：连接所有 4 个 Agent
    connectAgent('xiaomu')
    connectAgent('xiaokai')
    connectAgent('xiaochan')
    connectAgent('xiaoyan')
  }

  // 断开所有 Agent（模拟模式下保持连接状态）
  function disconnectAll() {
    if (SIMULATION_MODE) {
      // 模拟模式：断开所有连接
      Object.keys(connections.value).forEach(agentId => {
        const conn = connections.value[agentId]
        if (conn) {
          conn.isConnected = false
          conn.isConnecting = false
        }
      })
      console.log('[TaskGateway] 已断开所有 Agent 连接')
      return
    }
    // 真实模式：断开所有 4 个 Agent
    disconnectAgent('xiaomu')
    disconnectAgent('xiaokai')
    disconnectAgent('xiaochan')
    disconnectAgent('xiaoyan')
    console.log('[TaskGateway] 已断开所有 Agent 连接')
  }

  // 重置连接（模拟模式下不清空消息）
  function resetAll() {
    if (!SIMULATION_MODE) {
      disconnectAll()
    }
    messages.value = []
    taskQueue.value = []
  }

  return {
    // State
    connections,
    messages,
    taskQueue,
    // Getters
    allConnected,
    anyConnected,
    xiaomuConnected,
    getAgentConnection,
    // Actions
    addMessageListener,
    removeMessageListener,
    addMessage,
    connectAgent,
    disconnectAgent,
    connectAll,
    disconnectAll,
    resetAll,
    sendMessageToAgent,
    assignTaskToAgent
  }
})
