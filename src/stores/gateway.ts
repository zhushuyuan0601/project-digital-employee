/**
 * Gateway WebSocket 客户端
 * 用于连接 OpenClaw Gateway 获取实时数据
 */

import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import {
  cacheDeviceToken,
  clearDeviceIdentity,
} from '@/lib/device-identity'
import {
  clearGatewayToken as clearStoredGatewayToken,
  getGatewayBaseWsUrl,
  getGatewayToken,
  setGatewayToken as persistGatewayToken,
} from '@/config/gateway'

// Gateway 协议版本
const PROTOCOL_VERSION = 3
const PING_INTERVAL_MS = 30000
const MAX_MISSED_PONGS = 3

/**
 * 获取存储的 Gateway Token
 */
export function getStoredToken(): string {
  return getGatewayToken()
}

/**
 * 存储 Gateway Token
 */
export function setGatewayToken(token: string): void {
  persistGatewayToken(token)
}

/**
 * 清除 Gateway Token
 */
export function clearGatewayToken(): void {
  clearStoredGatewayToken()
}

// WebSocket 实例
let ws: WebSocket | null = null
let pingInterval: number | null = null
let reconnectTimeout: number | null = null
let reconnectAttempts = 0
let missedPongs = 0
let handshakeComplete = false
let tokenOnlyFallback = false

// Token 配置对话框回调
let onTokenDialogNeeded: (() => void) | null = null

export function setTokenDialogCallback(callback: () => void) {
  onTokenDialogNeeded = callback
}

function showTokenDialogNeeded() {
  if (onTokenDialogNeeded) {
    onTokenDialogNeeded()
  }
}

export const useGatewayStore = defineStore('gateway', () => {
  // ========== State ==========
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const latency = ref<number | null>(null)
  const reconnectAttemptCount = ref(0)
  const lastMessageAt = ref<Date | null>(null)

  // Gateway 数据
  const sessions = ref<any[]>([])
  const agents = ref<Record<string, any>>({})
  const logs = ref<any[]>([])
  const chatMessages = ref<any[]>([])
  const notifications = ref<any[]>([])
  const execApprovals = ref<any[]>([])
  const tokenUsage = ref<any[]>([])

  // ========== Getters ==========
  const connectionStatus = computed(() => {
    if (isConnected.value) return 'connected'
    if (isConnecting.value) return 'connecting'
    return 'disconnected'
  })

  const activeSessions = computed(() => {
    return sessions.value.filter(s => s.active)
  })

  // ========== Actions ==========

  /**
   * 生成请求ID
   */
  let requestIdCounter = 0
  function nextRequestId(): string {
    requestIdCounter += 1
    return `mc-${requestIdCounter}-${Date.now()}`
  }

  /**
   * 构建 WebSocket URL
   * 直接连接 Gateway，不走 Vite 代理
   * 这样 Gateway 能正确识别为本地连接，避免 scopes 被清空
   */
  function buildWebSocketUrl(): string {
    return getGatewayBaseWsUrl()
  }

  /**
   * 发送连接握手（仅使用 token 认证）
   */
  async function sendConnectHandshake(_nonce?: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const token = getStoredToken()

    tokenOnlyFallback = true

    // 检查是否有 token
    if (!token) {
      console.error('[Gateway] No token available. Please configure Gateway Token.')
      connectionError.value = '需要配置 Gateway Token'
      ws.close(4001, 'Token required')
      return
    }

    const connectRequest = {
      type: 'req',
      method: 'connect',
      id: nextRequestId(),
      params: {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: 'openclaw-control-ui',  // 必须使用这个 ID 才能被识别为 Control UI
          displayName: 'Unicom Mission Control',
          version: '1.0.0',
          platform: 'web',
          mode: 'webchat',
          instanceId: `mc-${Date.now()}`
        },
        role: 'operator',  // 必须指定 role，dangerouslyDisableDeviceAuth 只对 operator 生效
        scopes: ['operator.admin', 'operator.write', 'operator.read'],
        caps: ['tool-events'],
        auth: { token },
      }
    }

    ws.send(JSON.stringify(connectRequest))
  }

  /**
   * 启动心跳
   */
  function startHeartbeat() {
    stopHeartbeat()

    pingInterval = window.setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !handshakeComplete) return

      if (missedPongs >= MAX_MISSED_PONGS) {
        console.warn('[Gateway] Missed too many pongs, reconnecting...')
        ws.close(4000, 'Heartbeat timeout')
        return
      }

      missedPongs++
      const pingFrame = {
        type: 'req',
        method: 'ping',
        id: nextRequestId()
      }

      try {
        ws.send(JSON.stringify(pingFrame))
      } catch (err) {
        console.error('[Gateway] Ping failed:', err)
      }
    }, PING_INTERVAL_MS)
  }

  /**
   * 停止心跳
   */
  function stopHeartbeat() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
    missedPongs = 0
  }

  /**
   * 处理 Gateway 帧
   */
  function handleGatewayFrame(frame: any) {
    lastMessageAt.value = new Date()

    // 处理连接挑战
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      sendConnectHandshake(frame.payload?.nonce)
      return
    }

    // 处理连接响应
    if (frame.type === 'res' && frame.ok && !handshakeComplete) {
      handshakeComplete = true
      reconnectAttempts = 0
      isConnected.value = true
      isConnecting.value = false
      reconnectAttemptCount.value = 0

      // 打印服务端实际授予的 scopes（hello-ok 响应）
      const result = frame.result || frame.payload || {}
      console.log('[Gateway] 连接握手成功 (hello-ok):', JSON.stringify(result, null, 2))
      const grantedScopes = result.scopes || result.grantedScopes || result.granted_scopes
      if (grantedScopes) {
        console.log('[Gateway] 服务端授予的 scopes:', JSON.stringify(grantedScopes))
        if (!grantedScopes.includes('operator.write')) {
          console.error('[Gateway] ⚠️ 缺少 operator.write scope！写入操作将被拒绝。请检查 Gateway token 权限。')
        }
      }

      // 缓存设备令牌
      if (result.deviceToken) {
        cacheDeviceToken(result.deviceToken)
      }

      startHeartbeat()
      return
    }

    // 处理 pong
    if (frame.type === 'res' && frame.id?.startsWith('ping-')) {
      missedPongs = 0
      return
    }

    // 处理 agent 方法的响应
    if (frame.type === 'res' && frame.ok && frame.result) {
      // agent 方法返回 runId 和 sessionId
      if (frame.result.runId || frame.result.sessionId) {
        // Agent invoked
      }

      // chat.send 方法返回状态
      if (frame.result.status) {
        // Chat send status
      }

      return
    }

    // 处理错误
    if (frame.type === 'res' && !frame.ok) {
      const errorMsg = frame.error?.message || JSON.stringify(frame.error)

      // 忽略 ping 方法的错误（Gateway 可能不支持）
      if (frame.id?.startsWith('ping-') || errorMsg.includes('unknown method: ping')) {
        missedPongs = 0 // 重置 missedPongs，避免触发重连
        return
      }

      console.error('[Gateway] Error:', errorMsg)
      connectionError.value = errorMsg

      // 检查是否需要回退到仅令牌模式
      const isDeviceIdentityError = errorMsg.toLowerCase().includes('device identity') ||
                                    errorMsg.toLowerCase().includes('secure context')

      if (isDeviceIdentityError && !tokenOnlyFallback && !handshakeComplete) {
        tokenOnlyFallback = true
        clearDeviceIdentity()

        // 关闭当前连接并重试
        if (ws) {
          ws.close(4002, 'Retrying with token-only authentication')
        }
      }
      return
    }

    // 处理事件
    if (frame.type === 'event') {
      handleGatewayEvent(frame.event, frame.payload, frame.seq)
    }
  }

  /**
   * 处理 Gateway 事件
   */
  function handleGatewayEvent(event: string, payload: any, _seq?: number) {
    switch (event) {
      case 'tick':
        // 会话快照更新
        if (payload?.snapshot?.sessions) {
          sessions.value = payload.snapshot.sessions.map((session: any, index: number) => ({
            id: session.key || `session-${index}`,
            key: session.key || '',
            kind: session.kind || 'unknown',
            age: formatAge(session.updatedAt),
            model: session.model || '',
            tokens: `${session.totalTokens || 0}/${session.contextTokens || 0}`,
            flags: session.flags || [],
            active: isActive(session.updatedAt),
            startTime: session.startTime,
            lastActivity: session.updatedAt,
            messageCount: session.messageCount,
            cost: session.cost,
            // 多种来源提取 Agent 名称
            agentName: session.agentName || session.agent || extractAgentFromKey(session.key) || '',
          }))
        }
        break

      case 'health':
        // 健康检查事件
        break

      case 'agent':
        // Agent 流事件 - 处理 thinking, assistant, lifecycle 等
        handleAgentStreamEvent(payload)
        break

      case 'chat':
        // 聊天消息事件
        handleChatEvent(payload)
        break

      case 'log':
        // 日志消息
        if (payload) {
          logs.value.unshift({
            id: payload.id || `log-${Date.now()}-${Math.random()}`,
            timestamp: payload.timestamp || Date.now(),
            level: payload.level || 'info',
            source: payload.source || 'gateway',
            session: payload.session,
            message: payload.message || '',
            data: payload.extra || payload.data
          })
          // 限制日志数量
          if (logs.value.length > 500) {
            logs.value = logs.value.slice(0, 500)
          }
        }
        break

      case 'chat.message':
        // 实时聊天消息
        if (payload) {
          chatMessages.value.push({
            id: payload.id || `msg-${Date.now()}`,
            conversation_id: payload.conversation_id,
            from_agent: payload.from_agent,
            to_agent: payload.to_agent,
            content: payload.content,
            message_type: payload.message_type || 'text',
            metadata: payload.metadata,
            created_at: payload.created_at || Math.floor(Date.now() / 1000),
          })
        }
        break

      case 'tool.stream':
        // 工具调用流
        if (payload) {
          handleToolStreamEvent(payload)
        }
        break

      case 'exec.approval':
        // 执行批准请求
        if (payload?.id) {
          execApprovals.value.push({
            id: payload.id,
            sessionId: payload.sessionKey || payload.sessionId || '',
            agentName: payload.agentName || payload.agentId,
            toolName: payload.toolName || payload.name || 'unknown',
            toolArgs: payload.args || payload.toolArgs || {},
            command: payload.command,
            risk: payload.risk || 'medium',
            createdAt: payload.createdAtMs || payload.createdAt || Date.now(),
            status: 'pending'
          })
        }
        break

      case 'token_usage':
        // Token 使用统计
        if (payload) {
          tokenUsage.value.push({
            model: payload.model,
            sessionId: payload.sessionId,
            date: new Date().toISOString(),
            inputTokens: payload.inputTokens || 0,
            outputTokens: payload.outputTokens || 0,
            totalTokens: payload.totalTokens || 0,
            cost: payload.cost || 0
          })
        }
        break

      case 'context.compaction':
        // 上下文压缩通知
        notifications.value.unshift({
          id: Date.now(),
          recipient: 'operator',
          type: 'info',
          title: 'Context Compaction',
          message: payload?.message || `Session context compacted (${payload?.percentage || '?'}% reduced)`,
          created_at: Math.floor(Date.now() / 1000)
        })
        break

      case 'model.fallback':
        // 模型降级通知
        notifications.value.unshift({
          id: Date.now(),
          recipient: 'operator',
          type: 'warning',
          title: 'Model Fallback',
          message: payload?.message || `Fell back from ${payload?.from || '?'} to ${payload?.to || '?'}`,
          created_at: Math.floor(Date.now() / 1000)
        })
        break

      default:
        // Unknown event - ignored
    }
  }

  /**
   * 处理 Agent 流事件
   * stream 类型: lifecycle, assistant, thinking, tool, tool_use, tool_result
   */
  function handleAgentStreamEvent(payload: any) {
    if (!payload) return

    const { stream, data, sessionKey, runId, seq } = payload
    const agentName = extractAgentFromKey(sessionKey) || 'agent'

    switch (stream) {
      case 'lifecycle':
        // 生命周期事件 (start, end)
        if (data?.phase === 'start') {
          // Agent 开始处理
          updateAgentStreaming(agentName, true, runId)
        } else if (data?.phase === 'end') {
          // Agent 处理完成
          updateAgentStreaming(agentName, false, null)
        }
        break

      case 'assistant':
        // 助手回复流
        if (data?.delta || data?.text) {
          appendAgentMessage(agentName, {
            type: 'text',
            text: data.delta || data.text,
            runId,
            seq,
          })
        }
        break

      case 'thinking':
        // 思考过程
        if (data?.delta || data?.thinking) {
          appendAgentMessage(agentName, {
            type: 'thinking',
            thinking: data.delta || data.thinking,
            runId,
            seq,
          })
        }
        break

      case 'tool':
        // 工具调用 (Gateway 的 tool stream)
        if (payload) {
          const phase = payload.phase || data?.phase
          const toolName = payload.name || data?.name
          const toolCallId = payload.toolCallId || data?.toolCallId
          const meta = payload.meta || data?.meta
          const isError = payload.isError ?? data?.isError ?? false
          const output = payload.output || data?.output

          appendAgentMessage(agentName, {
            type: 'tool_use',
            id: toolCallId,
            name: toolName,
            input: meta || '',
            output: output,
            isError: isError,
            phase: phase,
            runId,
            seq,
          })
        }
        break

      case 'tool_use':
        // 工具使用 (其他格式)
        if (data) {
          appendAgentMessage(agentName, {
            type: 'tool_use',
            id: data.id,
            name: data.name,
            input: typeof data.input === 'string' ? data.input : JSON.stringify(data.input, null, 2),
            runId,
            seq,
          })
        }
        break

      case 'tool_result':
        // 工具结果
        if (data) {
          appendAgentMessage(agentName, {
            type: 'tool_result',
            toolUseId: data.toolUseId,
            content: data.content,
            isError: data.isError,
            runId,
            seq,
          })
        }
        break

      default:
        // Unknown stream type - ignored
    }
  }

  /**
   * 处理 Chat 事件
   */
  function handleChatEvent(payload: any) {
    if (!payload) return

    const { sessionKey, message } = payload
    const agentName = extractAgentFromKey(sessionKey) || 'agent'

    if (message && message.content) {
      // 解析消息内容
      const contentParts = parseMessageContent(message.content)

      for (const part of contentParts) {
        appendAgentMessage(agentName, {
          ...part,
          role: message.role,
          timestamp: message.timestamp,
        })
      }
    }
  }

  /**
   * 解析消息内容
   */
  function parseMessageContent(content: any): any[] {
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }]
    }

    if (Array.isArray(content)) {
      return content.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text || '' }
        }
        if (part.type === 'thinking') {
          return { type: 'thinking', thinking: part.thinking || part.text || '' }
        }
        if (part.type === 'tool_use' || part.type === 'tool_result') {
          return {
            type: 'tool_use',
            id: part.id,
            name: part.name,
            input: typeof part.input === 'string' ? part.input : JSON.stringify(part.input, null, 2),
            output: part.content || part.output,
            isError: part.is_error || part.isError,
          }
        }
        return { type: 'text', text: JSON.stringify(part) }
      })
    }

    return [{ type: 'text', text: JSON.stringify(content) }]
  }

  /**
   * 处理工具流事件
   */
  function handleToolStreamEvent(payload: any) {
    if (!payload) return

    const { agentName, toolName, args, output, status } = payload
    const agent = agentName || 'agent'

    appendAgentMessage(agent, {
      type: 'tool_use',
      name: toolName,
      input: args ? JSON.stringify(args, null, 2) : '',
      output: output,
      status: status,
    })
  }

  /**
   * 追加 Agent 消息到消息流
   */
  function appendAgentMessage(agentName: string, messagePart: any) {
    // 查找或创建 Agent 的消息缓冲区
    const existingMsg = agentStreamBuffer[agentName]

    if (existingMsg && messagePart.seq !== undefined) {
      // 流式更新 - 合并或追加
      if (messagePart.type === 'text' && existingMsg.currentText !== undefined) {
        existingMsg.currentText += messagePart.text
        existingMsg.parts.push(messagePart)
      } else if (messagePart.type === 'thinking' && existingMsg.currentThinking !== undefined) {
        existingMsg.currentThinking += messagePart.thinking
      } else {
        // 新的消息部分
        existingMsg.parts.push(messagePart)
      }
    } else {
      // 新消息
      agentStreamBuffer[agentName] = {
        agentName,
        runId: messagePart.runId,
        parts: [messagePart],
        currentText: messagePart.type === 'text' ? messagePart.text : '',
        currentThinking: messagePart.type === 'thinking' ? messagePart.thinking : '',
        startedAt: Date.now(),
      }
    }

    // 通知 UI 更新
    lastMessageAt.value = new Date()
  }

  /**
   * 更新 Agent 流状态
   */
  function updateAgentStreaming(agentName: string, streaming: boolean, runId: string | null) {
    if (streaming) {
      activeStreams[agentName] = { runId, startedAt: Date.now() }
    } else {
      delete activeStreams[agentName]
    }
  }

  /**
   * 连接到 Gateway
   */
  function connect() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    const token = getStoredToken()
    if (!token) {
      console.error('[Gateway] No token configured')
      connectionError.value = '请先配置 Gateway Token'
      showTokenDialogNeeded()
      return
    }

    isConnecting.value = true
    connectionError.value = null

    const url = buildWebSocketUrl()

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        // WebSocket opened
      }

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data)
          handleGatewayFrame(frame)
        } catch (err) {
          console.error('[Gateway] Failed to parse message:', err)
        }
      }

      ws.onclose = () => {
        isConnected.value = false
        isConnecting.value = false
        handshakeComplete = false
        stopHeartbeat()

        if (reconnectAttempts < 10) {
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 15000)
          reconnectAttempts++
          reconnectAttemptCount.value = reconnectAttempts

          reconnectTimeout = window.setTimeout(() => {
            connect()
          }, timeout)
        } else {
          connectionError.value = 'Max reconnection attempts reached'
        }
      }

      ws.onerror = (error) => {
        console.error('[Gateway] WebSocket error:', error)
        connectionError.value = 'WebSocket error'
      }

    } catch (err) {
      console.error('[Gateway] Failed to connect:', err)
      isConnecting.value = false
      connectionError.value = 'Failed to initialize connection'
    }
  }

  /**
   * 断开连接
   */
  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    stopHeartbeat()

    if (ws) {
      ws.close(1000, 'Manual disconnect')
      ws = null
    }

    handshakeComplete = false
    tokenOnlyFallback = false
    isConnected.value = false
    isConnecting.value = false
    reconnectAttempts = 0
    reconnectAttemptCount.value = 0
  }

  /**
   * 发送消息到 Gateway
   */
  function sendMessage(message: any): boolean {
    if (ws?.readyState === WebSocket.OPEN && handshakeComplete) {
      ws.send(JSON.stringify(message))
      return true
    }
    return false
  }

  /**
   * 发送聊天消息到指定 Session
   */
  function sendChatMessage(sessionKey: string, message: string, _from: string = 'human'): boolean {
    return sendMessage({
      type: 'req',
      method: 'chat.send',
      id: nextRequestId(),
      params: {
        sessionKey,
        message,
        idempotencyKey: `mc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
    })
  }

  /**
   * 发送聊天消息到指定 Agent（创建新 session）
   */
  function sendChatToAgent(agentId: string, message: string, from: string = 'human'): boolean {
    return sendMessage({
      type: 'req',
      method: 'agent',
      id: nextRequestId(),
      params: {
        agentId,
        message: `Message from ${from}: ${message}`,
        idempotencyKey: `mc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        deliver: true,
      }
    })
  }

  /**
   * 批准执行请求
   */
  function approveExec(approvalId: string, decision: 'approve' | 'deny') {
    return sendMessage({
      type: 'req',
      method: 'exec.approval.resolve',
      id: nextRequestId(),
      params: {
        id: approvalId,
        decision
      }
    })
  }

  /**
   * 清理日志
   */
  function clearLogs() {
    logs.value = []
  }

  /**
   * 清理通知
   */
  function clearNotifications() {
    notifications.value = []
  }

  // Agent 流缓冲区 - 使用 reactive 对象以便 Vue 正确追踪变化
  const agentStreamBuffer = reactive<Record<string, any>>({})
  const activeStreams = reactive<Record<string, any>>({})

  return {
    // State
    isConnected,
    isConnecting,
    connectionError,
    latency,
    reconnectAttemptCount,
    lastMessageAt,
    sessions,
    agents,
    logs,
    chatMessages,
    notifications,
    execApprovals,
    tokenUsage,
    // 流式消息缓冲区
    agentStreamBuffer,
    activeStreams,

    // Getters
    connectionStatus,
    activeSessions,

    // Actions
    connect,
    disconnect,
    sendMessage,
    sendChatMessage,
    sendChatToAgent,
    approveExec,
    clearLogs,
    clearNotifications
  }
})

// Helper functions
function formatAge(timestamp: number): string {
  if (!timestamp) return '-'
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function isActive(timestamp: number): boolean {
  if (!timestamp) return false
  return Date.now() - timestamp < 60 * 60 * 1000 // 1小时内活跃
}

/**
 * 从 session key 中提取 Agent 名称
 * session key 格式可能是:
 *   - "agent:ceo:main" → "ceo"
 *   - "ceo:main" → "ceo"
 *   - "claudecode" → "claudecode"
 */
function extractAgentFromKey(key: string): string {
  if (!key) return ''
  const normalized = key.toLowerCase().trim()
  let agentName = normalized
    .replace(/^agent:/, '')
    .replace(/^agent_/, '')
    .replace(/^agent-/, '')
    .replace(/:main$/, '')
    .replace(/_main$/, '')
    .replace(/-main$/, '')
    .replace(/:primary$/, '')
    .replace(/_primary$/, '')

  // 特殊处理
  if (agentName === 'claudecode' || agentName === 'claude-code' || agentName === 'claude_code') {
    return 'claudecode'
  }

  return agentName
}
