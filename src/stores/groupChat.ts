import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_GROUP_CHAT_AGENT_IDS } from '@/config/agents'
import { getDefaultGatewayConnectionSettings } from '@/config/gateway'

// 群聊消息
export interface GroupChatMessage {
  id: string
  content: string
  sender: 'user' | 'agent' | 'system'
  senderId?: string // agent id 或 'user'
  senderName: string
  senderAvatar?: string
  timestamp: number
  mentions?: string[] // 被 @ 的 agent ids
}

// 群聊配置
export interface GroupChatConfig {
  id: string
  name: string
  description: string
  agentIds: string[] // 参与的 agent ids
}

export const useGroupChatStore = defineStore('groupChat', () => {
  // 群聊配置 - 与任务指挥页面保持一致，包含所有 Agent
  const groupConfig: GroupChatConfig = {
    id: 'group-main',
    name: '作战指挥群',
    description: '多 Agent 协同作战群聊',
    agentIds: [...DEFAULT_GROUP_CHAT_AGENT_IDS]
  }

  // 群聊消息
  const messages = ref<GroupChatMessage[]>([])

  // Agent 连接状态（从外部注入）
  const agentConnections = ref<Record<string, { isConnected: boolean; avatar: string; displayName: string }>>({})

  // 设置
  const settings = ref(getDefaultGatewayConnectionSettings())

  // 计算属性：获取所有参与的 Agent
  const participatingAgents = computed(() => {
    return groupConfig.agentIds.map(id => {
      const conn = agentConnections.value[id]
      return {
        id,
        name: conn?.displayName || id,
        avatar: conn?.avatar || '◈',
        isConnected: conn?.isConnected || false
      }
    })
  })

  // 更新 Agent 连接状态
  function updateAgentStatus(agentId: string, status: { isConnected: boolean; avatar: string; displayName: string }) {
    agentConnections.value[agentId] = status
  }

  // 解析消息中的 @mention
  function parseMentions(content: string): { mentions: string[]; cleanedContent: string } {
    const mentions: string[] = []
    const mentionRegex = /@([^\s]+)/g
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1]
      // 查找匹配的 agent
      const agent = participatingAgents.value.find(a =>
        a.name.includes(mentionedName) || mentionedName.includes(a.name)
      )
      if (agent) {
        mentions.push(agent.id)
      }
    }

    // 清理 @mention 标记（可选：保留显示）
    const cleanedContent = content.replace(/@([^\s]+)/g, (m, name) => {
      const agent = participatingAgents.value.find(a =>
        a.name.includes(name) || name.includes(a.name)
      )
      return agent ? '' : m // 只移除有效的 @mention
    }).trim()

    return { mentions, cleanedContent }
  }

  // 添加消息
  function addMessage(message: Omit<GroupChatMessage, 'id' | 'timestamp'>) {
    const newMessage: GroupChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    }
    messages.value.push(newMessage)
    saveMessages()
    return newMessage
  }

  // 添加系统消息
  function addSystemMessage(content: string) {
    return addMessage({
      content,
      sender: 'system',
      senderName: 'System'
    })
  }

  // 处理用户发送的消息
  function handleUserMessage(content: string) {
    const { mentions } = parseMentions(content)

    // 如果没有 @ 任何人，添加普通用户消息
    if (mentions.length === 0) {
      addMessage({
        content,
        sender: 'user',
        senderId: 'user',
        senderName: '我'
      })
      return { mentions: [] as string[], invalidMentions: [] as string[], offlineAgents: [] as string[] }
    }

    // 分离有效和无效的 @
    const validMentions: string[] = []
    const invalidMentions: string[] = []
    const offlineAgents: string[] = []

    mentions.forEach(agentId => {
      const agent = participatingAgents.value.find(a => a.id === agentId)
      if (agent) {
        if (agent.isConnected) {
          validMentions.push(agentId)
        } else {
          offlineAgents.push(agentId)
        }
      } else {
        invalidMentions.push(agentId)
      }
    })

    // 添加用户消息（显示 @ 信息）
    addMessage({
      content,
      sender: 'user',
      senderId: 'user',
      senderName: '我',
      mentions: validMentions
    })

    // 为未上线的 Agent 添加系统提示
    offlineAgents.forEach(agentId => {
      const agent = participatingAgents.value.find(a => a.id === agentId)
      if (agent) {
        addSystemMessage(`${agent.name} 未上线`)
      }
    })

    // 为无效的 @ 添加系统提示
    invalidMentions.forEach(name => {
      addSystemMessage(`@${name} 不是有效的群成员`)
    })

    return { mentions: validMentions, invalidMentions, offlineAgents }
  }

  // 更新或添加 Agent 回复（支持流式更新）
  function updateAgentReply(agentId: string, content: string) {
    const agent = participatingAgents.value.find(a => a.id === agentId)
    if (!agent) return

    // 查找最后一条同 Agent 的消息
    const lastMessage = messages.value.slice().reverse().find(m =>
      m.sender === 'agent' && m.senderId === agentId
    )

    if (lastMessage) {
      // 更新现有消息（流式追加）
      lastMessage.content = content
      lastMessage.timestamp = Date.now()
    } else {
      // 创建新消息
      addMessage({
        content,
        sender: 'agent',
        senderId: agentId,
        senderName: agent.name,
        senderAvatar: agent.avatar
      })
    }
    saveMessages()
  }

  // 本地存储
  function saveMessages() {
    localStorage.setItem(`groupchat_messages_${groupConfig.id}`, JSON.stringify(messages.value))
  }

  function loadMessages() {
    const saved = localStorage.getItem(`groupchat_messages_${groupConfig.id}`)
    if (saved) {
      try {
        messages.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load group chat messages:', e)
      }
    }
  }

  function clearMessages() {
    messages.value = []
    saveMessages()
  }

  return {
    // State
    groupConfig,
    messages,
    settings,
    // Getters
    participatingAgents,
    // Actions
    updateAgentStatus,
    handleUserMessage,
    updateAgentReply,
    addSystemMessage,
    loadMessages,
    clearMessages
  }
})
