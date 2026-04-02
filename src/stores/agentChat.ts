import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import type { Agent, AgentStatus } from '@/types/mission-control'
import { AGENT_DISPLAY_CONFIG, MC_AGENT_ROLES, MC_AGENT_CORE_NAMES } from '@/types/mission-control'
import type { ExtendedChatMessage, AgentStats } from '@/api/agent-chat'
import * as agentChatAPI from '@/api/agent-chat'
import { toGatewayAgentName } from '@/api/agent-chat'
import { useGatewayStore } from './gateway'

/**
 * Agent Chat Store
 * 管理 Agent Chat 后端连接、消息获取、工作状态判定
 * 集成 Gateway 实时消息
 */
export const useAgentChatStore = defineStore('agentChat', () => {
  // ========== State ==========
  const agents = ref<Agent[]>([])
  const messages = ref<ExtendedChatMessage[]>([])
  const agentMessages = ref<Record<string, ExtendedChatMessage[]>>({})
  const agentStats = ref<Record<string, AgentStats>>({})
  const agentLastActivity = ref<Record<string, number>>({}) // 记录每个Agent最后活动时间
  const conversations = ref<any[]>([])
  const activeConversation = ref<string | null>(null)

  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const eventSource = ref<EventSource | null>(null)

  // 关注的 Agent 列表
  const targetAgentNames = ref<string[]>([
    MC_AGENT_ROLES.CEO,
    MC_AGENT_ROLES.RESEARCHER,
    MC_AGENT_ROLES.PM,
    MC_AGENT_ROLES.TECH_LEAD,
    MC_AGENT_ROLES.TEAM_QA,
    MC_AGENT_ROLES.CLAUDE_CODE,
  ])

  // 轮询定时器
  let statusCheckTimer: number | null = null
  let messageRefreshTimer: number | null = null

  // ========== Getters ==========

  // 目标 Agents
  const targetAgents = computed(() => {
    return targetAgentNames.value.map(name => {
      const agent = agents.value.find(a => a.name === name)
      const config = AGENT_DISPLAY_CONFIG[name]
      return {
        name,
        displayName: config?.displayName || name,
        roleTag: config?.roleTag || 'Agent',
        icon: config?.icon || '',
        color: config?.color || '#909399',
        description: config?.description || '',
        status: agent?.status || 'offline',
        last_seen: agent?.last_seen || 0,
        isWorking: isAgentWorking(name),
        messages: agentMessages.value[name] || [],
        stats: agentStats.value[name] || {
          message_count: 0,
          token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          tool_calls: 0,
          cost: 0,
          last_message_at: 0,
        },
      }
    })
  })

  // 在线 Agents
  const onlineAgents = computed(() => {
    return agents.value.filter(agent =>
      agent.status === 'idle' || agent.status === 'busy'
    )
  })

  // 工作中的 Agents（20秒内有活动）
  const workingAgents = computed(() => {
    return targetAgents.value.filter(agent => agent.isWorking)
  })

  // ========== Methods ==========

  /**
   * 20秒工作状态判定
   * 如果20秒内有消息输出就是工作状态，无内容输出就空闲状态
   */
  function isAgentWorking(agentName: string): boolean {
    const lastActivity = agentLastActivity.value[agentName]
    if (!lastActivity) return false

    const elapsed = Date.now() - lastActivity
    return elapsed < 20000 // 20秒内
  }

  /**
   * 获取 Agent 显示配置
   */
  function getAgentDisplayConfig(agentName: string) {
    return (
      AGENT_DISPLAY_CONFIG[agentName] || {
        id: 'unknown',
        name: agentName,
        displayName: agentName,
        role: agentName,
        roleTag: 'Agent',
        icon: '',
        color: '#909399',
        description: '未知 Agent',
      }
    )
  }

  /**
   * 获取 Agent 消息
   */
  function getAgentMessages(agentName: string): ExtendedChatMessage[] {
    return agentMessages.value[agentName] || []
  }

  /**
   * 更新 Agent 活动时间
   */
  function updateAgentActivity(agentName: string) {
    agentLastActivity.value[agentName] = Date.now()
  }

  /**
   * 初始化连接
   */
  async function initConnection() {
    if (isConnecting.value || isConnected.value) return

    isConnecting.value = true
    connectionError.value = null

    try {
      // 1. 加载 Agents
      const agentsData = await agentChatAPI.getAgents({ limit: 100 })
      agents.value = agentsData.agents

      // 2. 为目标 Agent 加载消息和统计
      for (const agentName of targetAgentNames.value) {
        await loadAgentMessages(agentName)
      }

      // 3. 建立 SSE 连接
      connectEventSource()

      // 4. 启动状态检查定时器
      startStatusCheck()

      isConnected.value = true
      console.log('[AgentChat] 连接成功')
    } catch (err) {
      connectionError.value = err instanceof Error ? err.message : '连接失败'
      console.error('[AgentChat] 连接失败:', err)
      throw err
    } finally {
      isConnecting.value = false
    }
  }

  /**
   * 加载 Agent 消息
   */
  async function loadAgentMessages(agentName: string, limit: number = 50) {
    try {
      const data = await agentChatAPI.getAgentMessages(agentName, limit)

      // 合并消息（避免重复）
      const existing = agentMessages.value[agentName] || []
      const existingIds = new Set(existing.map(m => m.id))
      const newMessages = data.messages.filter(m => !existingIds.has(m.id))

      agentMessages.value[agentName] = [...existing, ...newMessages].sort(
        (a, b) => a.created_at - b.created_at
      )

      // 更新统计
      if (data.stats) {
        agentStats.value[agentName] = data.stats
      }

      // 更新最后活动时间
      if (data.messages.length > 0) {
        const lastMsg = data.messages[data.messages.length - 1]
        agentLastActivity.value[agentName] = lastMsg.created_at * 1000
      }

      return data.messages
    } catch (err) {
      console.error(`[AgentChat] 加载 ${agentName} 消息失败:`, err)
      return []
    }
  }

  /**
   * 发送消息给 Agent
   * 使用简化名称与 Gateway 通信
   */
  async function sendMessageToAgent(
    agentName: string,
    content: string,
    options?: { forward?: boolean }
  ) {
    try {
      // 将完整名称转换为 Gateway 接受的简化名称
      const gatewayAgentName = toGatewayAgentName(agentName)

      console.log('[AgentChat] 发送消息给:', gatewayAgentName, '(原始:', agentName, ')')

      const result = await agentChatAPI.sendMessage({
        to: gatewayAgentName, // 使用简化名称
        content,
        conversation_id: `agent_${gatewayAgentName}`, // 使用简化名称作为会话 ID
        message_type: 'text',
        forward: options?.forward ?? true,
      })

      // 更新本地消息列表（使用完整的 Agent 名称）
      const existing = agentMessages.value[agentName] || []
      const msgWithFullAgentName = {
        ...result.message,
        from_agent: agentName, // 保持完整名称用于本地显示
        conversation_id: `agent_${agentName}`,
      }
      agentMessages.value[agentName] = [...existing, msgWithFullAgentName]

      // 更新活动时间
      updateAgentActivity(agentName)

      return result
    } catch (err) {
      console.error('[AgentChat] 发送消息失败:', err)
      throw err
    }
  }

  /**
   * 建立 SSE 连接
   */
  function connectEventSource() {
    if (eventSource.value) return

    const es = agentChatAPI.createEventSource()
    eventSource.value = es

    es.onopen = () => {
      console.log('[AgentChat] SSE 连接已建立')
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleServerEvent(data)
      } catch (err) {
        console.error('[AgentChat] 解析 SSE 消息失败:', err)
      }
    }

    es.onerror = (err) => {
      console.error('[AgentChat] SSE 连接错误:', err)
      // 自动重连
      setTimeout(() => {
        eventSource.value = null
        connectEventSource()
      }, 5000)
    }
  }

  /**
   * 处理服务器事件
   */
  function handleServerEvent(event: any) {
    switch (event.type) {
      case 'chat.message':
        handleChatMessage(event.data)
        break
      case 'agent.updated':
        handleAgentUpdate(event.data)
        break
      case 'agent.status_changed':
        handleAgentStatusChange(event.data)
        break
      case 'tool_call':
        handleToolCall(event.data)
        break
      case 'token_usage':
        handleTokenUsage(event.data)
        break
      case 'connected':
        console.log('[AgentChat] 服务器连接确认')
        break
    }
  }

  /**
   * 处理聊天消息
   */
  function handleChatMessage(message: ExtendedChatMessage) {
    const agentName = message.to_agent || message.from_agent
    if (!agentName) return

    const existing = agentMessages.value[agentName] || []
    const exists = existing.some(m => m.id === message.id)

    if (!exists) {
      agentMessages.value[agentName] = [...existing, message].sort(
        (a, b) => a.created_at - b.created_at
      )
      // 更新活动时间
      agentLastActivity.value[agentName] = Date.now()
    }
  }

  /**
   * 处理 Agent 更新
   */
  function handleAgentUpdate(data: any) {
    const index = agents.value.findIndex(a => a.id === data.id || a.name === data.name)
    if (index >= 0) {
      agents.value[index] = { ...agents.value[index], ...data }
    }
  }

  /**
   * 处理 Agent 状态变更
   */
  function handleAgentStatusChange(data: { name: string; status: AgentStatus }) {
    const agent = agents.value.find(a => a.name === data.name)
    if (agent) {
      agent.status = data.status
      agent.last_activity = `Status changed to ${data.status}`
      agent.last_seen = Math.floor(Date.now() / 1000)
    }
  }

  /**
   * 处理工具调用
   */
  function handleToolCall(data: any) {
    const agentName = data.agent
    if (agentName) {
      // 更新统计
      const stats = agentStats.value[agentName]
      if (stats) {
        stats.tool_calls++
      }
      // 更新活动时间
      agentLastActivity.value[agentName] = Date.now()
    }
  }

  /**
   * 处理 Token 使用
   */
  function handleTokenUsage(data: any) {
    const agentName = data.agent
    if (agentName && data.tokens) {
      const stats = agentStats.value[agentName]
      if (stats) {
        stats.token_usage.total_tokens += data.tokens.total || 0
        stats.token_usage.prompt_tokens += data.tokens.prompt || 0
        stats.token_usage.completion_tokens += data.tokens.completion || 0
      }
    }
  }

  /**
   * 启动状态检查定时器
   * 每5秒检查一次工作状态
   */
  function startStatusCheck() {
    if (statusCheckTimer) return

    statusCheckTimer = window.setInterval(() => {
      // 触发状态更新（通过修改 lastActivity 来触发计算属性）
      const now = Date.now()
      for (const agentName of targetAgentNames.value) {
        const lastActivity = agentLastActivity.value[agentName]
        if (lastActivity) {
          // 如果超过20秒没有活动，自动标记为空闲
          if (now - lastActivity > 20000) {
            // 状态会自动通过 isAgentWorking 计算属性更新
          }
        }
      }
    }, 5000)
  }

  /**
   * 刷新消息
   */
  async function refreshMessages() {
    for (const agentName of targetAgentNames.value) {
      await loadAgentMessages(agentName, 20) // 只加载最新的20条
    }
  }

  /**
   * 断开连接
   */
  function disconnect() {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    if (statusCheckTimer) {
      clearInterval(statusCheckTimer)
      statusCheckTimer = null
    }
    isConnected.value = false
  }

  /**
   * 重置状态
   */
  function reset() {
    agents.value = []
    messages.value = []
    agentMessages.value = {}
    agentStats.value = {}
    agentLastActivity.value = {}
    conversations.value = []
    activeConversation.value = null
    disconnect()
  }

  // ========== Gateway 集成 ==========

  /**
   * 从 Gateway 消息同步到 Agent 消息
   * 将 Gateway chatMessages 按照 agentName 分发到对应的 agentMessages
   * 支持多种名称格式匹配：
   *   - agent:ceo:main → ceo
   *   - ceo → ceo
   *   - agent_ceo → ceo
   *   - CEO → ceo (大小写不敏感)
   */
  function syncGatewayMessages(gatewayMessages: any[]) {
    for (const msg of gatewayMessages) {
      // 确定 Agent 名称，尝试多种格式
      const rawAgentName = msg.from_agent || msg.metadata?.agentName || msg.agentName || msg.agent
      if (!rawAgentName) continue

      // 查找匹配的目标 Agent
      const matchedAgentName = findMatchingAgent(rawAgentName)
      if (!matchedAgentName) continue

      // 转换为统一格式
      const normalizedMsg: ExtendedChatMessage = {
        id: msg.id || `gw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversation_id: msg.conversation_id || `agent_${matchedAgentName}`,
        from_agent: matchedAgentName,
        to_agent: msg.to_agent,
        content: msg.content || '',
        message_type: msg.message_type || 'text',
        created_at: msg.created_at || Math.floor(Date.now() / 1000),
        metadata: msg.metadata,
        token_usage: msg.metadata?.token_usage,
        tool_calls: msg.metadata?.tool_calls,
        model: msg.metadata?.model,
        thinking: msg.thinking || msg.reasoning_content || msg.metadata?.thinking,
      }

      // 添加到对应 Agent 的消息列表
      const existing = agentMessages.value[matchedAgentName] || []
      const exists = existing.some(m => m.id === normalizedMsg.id)

      if (!exists) {
        agentMessages.value[matchedAgentName] = [...existing, normalizedMsg].sort(
          (a, b) => a.created_at - b.created_at
        )
        // 更新活动时间
        agentLastActivity.value[matchedAgentName] = Date.now()
      }
    }
  }

  /**
   * 根据 Gateway 消息中的 Agent 名称查找匹配的目标 Agent
   * 支持多种名称格式：
   *   - agent:ceo:main → 匹配 MC_AGENT_ROLES.CEO
   *   - ceo → 匹配 MC_AGENT_ROLES.CEO
   *   - agent_ceo → 匹配 MC_AGENT_ROLES.CEO
   *   - CEO → 匹配 MC_AGENT_ROLES.CEO (大小写不敏感)
   */
  function findMatchingAgent(rawName: string): string | null {
    if (!rawName) return null

    // 提取核心名称
    const normalized = rawName.toLowerCase().trim()
    const extractedName = extractAgentCoreName(normalized)

    // 在目标 Agent 中查找匹配
    for (const agentName of targetAgentNames.value) {
      const agentCoreName = extractAgentCoreName(agentName.toLowerCase())
      if (agentCoreName === extractedName) {
        return agentName
      }
    }

    // 也检查 human 消息（来自用户的）
    if (normalized === 'human' || normalized === 'user' || normalized === 'operator') {
      return null // 不处理用户消息
    }

    return null
  }

  /**
   * 从 Agent 名称中提取核心标识
   * agent:ceo:main → ceo
   * agent:researcher:main → researcher
   * claudecode → claudecode
   */
  function extractAgentCoreName(name: string): string {
    // 移除常见前缀
    let core = name
      .replace(/^agent:/, '')
      .replace(/^agent_/, '')
      .replace(/^agent-/, '')
      .replace(/:main$/, '')
      .replace(/_main$/, '')
      .replace(/-main$/, '')
      .replace(/:primary$/, '')
      .replace(/_primary$/, '')

    // 特殊处理 claudecode
    if (core === 'claudecode' || core === 'claude-code' || core === 'claude_code') {
      return 'claudecode'
    }

    return core
  }

  /**
   * 处理 Gateway tool.stream 事件
   * 将工具调用转换为消息显示
   */
  function handleGatewayToolStream(payload: any) {
    const rawAgentName = payload.agentName || payload.agent
    const matchedAgentName = findMatchingAgent(rawAgentName)
    if (!matchedAgentName) return

    // 创建工具调用消息
    const toolMsg: ExtendedChatMessage = {
      id: payload.id || `tool-${Date.now()}`,
      conversation_id: `agent_${matchedAgentName}`,
      from_agent: matchedAgentName,
      to_agent: null,
      content: `🔧 **${payload.toolName || payload.name}**\n\`\`\`json\n${JSON.stringify(payload.args || {}, null, 2)}\n\`\`\`\n\n**输出:**\n${truncateText(payload.output || '', 500)}`,
      message_type: 'tool_call',
      created_at: payload.timestamp ? Math.floor(payload.timestamp / 1000) : Math.floor(Date.now() / 1000),
      metadata: {
        toolName: payload.toolName,
        toolArgs: payload.args,
        toolOutput: payload.output,
        toolStatus: payload.status,
        durationMs: payload.durationMs,
      },
    }

    // 添加到消息列表
    const existing = agentMessages.value[matchedAgentName] || []
    agentMessages.value[matchedAgentName] = [...existing, toolMsg]

    // 更新活动时间和统计
    agentLastActivity.value[matchedAgentName] = Date.now()
    const stats = agentStats.value[matchedAgentName]
    if (stats) {
      stats.tool_calls++
    }
  }

  /**
   * 根据 session key 映射 Agent
   */
  function mapSessionToAgent(sessionKey: string): string | null {
    if (!sessionKey) return null
    return findMatchingAgent(sessionKey)
  }

  /**
   * 从 Gateway sessions 更新 Agent 状态
   */
  function syncGatewaySessions(sessions: any[]) {
    for (const session of sessions) {
      const rawAgentName = session.agentName || session.agent || session.key
      const matchedAgentName = findMatchingAgent(rawAgentName)
      if (!matchedAgentName) continue

      // 更新活动时间
      if (session.active) {
        agentLastActivity.value[matchedAgentName] = Date.now()
      }

      // 更新 token 统计
      if (session.totalTokens) {
        const stats = agentStats.value[matchedAgentName]
        if (stats) {
          // 累加 tokens（这里使用总 token 数）
          stats.token_usage.total_tokens = Math.max(
            stats.token_usage.total_tokens,
            session.totalTokens || 0
          )
        }
      }
    }
  }

  /**
   * 辅助函数：截断文本
   */
  function truncateText(text: string, maxLength: number): string {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return {
    // State
    agents,
    messages,
    agentMessages,
    agentStats,
    agentLastActivity,
    conversations,
    activeConversation,
    isConnected,
    isConnecting,
    connectionError,
    targetAgentNames,

    // Getters
    targetAgents,
    onlineAgents,
    workingAgents,

    // Actions
    initConnection,
    disconnect,
    loadAgentMessages,
    sendMessageToAgent,
    getAgentMessages,
    getAgentDisplayConfig,
    isAgentWorking,
    updateAgentActivity,
    refreshMessages,
    reset,

    // Gateway 集成
    syncGatewayMessages,
    handleGatewayToolStream,
    syncGatewaySessions,
    findMatchingAgent,
    extractAgentCoreName,
  }
})
