<template>
  <div class="group-chat-interface">
    <!-- 群聊头部 -->
    <div class="group-chat-header">
      <div class="header-left">
        <div class="group-avatar">
          <span class="avatar-icon">◉</span>
        </div>
        <div class="group-info">
          <h2 class="group-title">{{ groupConfig.name }}</h2>
          <div class="group-members">
            <span
              v-for="agent in participatingAgents"
              :key="agent.id"
              class="member-tag"
              :class="agent.isConnected ? 'online' : 'offline'"
              :title="agent.name"
            >
              <span class="member-avatar">{{ agent.avatar }}</span>
              <span class="member-name">{{ agent.name }}</span>
              <span class="member-status"></span>
            </span>
          </div>
        </div>
      </div>
      <div class="header-controls">
        <button class="btn btn-success btn-sm" @click="handleConnectAll" :disabled="allConnected">
          <span class="btn-icon">⬡</span>
          全连
        </button>
        <button class="btn btn-danger btn-sm" @click="handleDisconnectAll" :disabled="!anyConnected">
          <span class="btn-icon">⏻</span>
          全断
        </button>
        <button class="btn btn-secondary btn-sm" @click="confirmClear">
          <span class="btn-icon">↻</span>
          重置
        </button>
      </div>
    </div>

    <!-- 消息区域 -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-art">
          <pre>
  ╔═══════════════════════════════════╗
  ║   群聊会话 - {{ groupConfig.name }}
  ║   成员：{{ participatingAgents.length }} 人
  ║                                   ║
  ║   ▶ 小 U、研究员、产品经理、研发   ║
  ║      工程师已加入群聊              ║
  ║                                   ║
  ║   ▶ 使用 @成员名 发送消息          ║
  ║   ▶ 例：@小 U 你好                 ║
  ╚═══════════════════════════════════╝
          </pre>
        </div>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message-row', 'sender-' + message.sender]"
      >
        <!-- 发送者头像 -->
        <div class="message-avatar">
          <span v-if="message.sender === 'agent'" class="avatar-icon">
            {{ message.senderAvatar || '◈' }}
          </span>
          <span v-else-if="message.sender === 'user'" class="avatar-icon user-avatar">
            👤
          </span>
          <span v-else class="avatar-icon system-avatar">
            ⚙
          </span>
        </div>

        <!-- 消息内容 -->
        <div class="message-content">
          <div class="message-meta">
            <span class="sender-name" :class="'name-' + message.sender">
              {{ message.senderName }}
            </span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text" v-html="formatMessageContent(message.content)"></div>

          <!-- 提及标签 -->
          <div v-if="message.mentions && message.mentions.length > 0" class="mention-tags">
            <span
              v-for="mentionId in message.mentions"
              :key="mentionId"
              class="mention-tag"
            >
              @{{ getAgentName(mentionId) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-wrapper">
        <span class="input-prefix">@</span>
        <textarea
          v-model="inputContent"
          class="message-input"
          placeholder="输入消息，使用 @ 提及成员（如：@小 U 你好）"
          @keydown.enter.exact.prevent="handleSend"
          rows="2"
          ref="inputRef"
        ></textarea>
      </div>
      <button
        class="btn-send"
        @click="handleSend"
        :disabled="!inputContent.trim()"
      >
        <span class="send-icon">⏵</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useGroupChatStore } from '@/stores/groupChat'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { AGENT_CONFIG } from '@/simulation'
import { ElMessageBox } from 'element-plus'

const groupStore = useGroupChatStore()
const multiAgentStore = useMultiAgentChatStore()

const groupConfig = computed(() => groupStore.groupConfig)
const messages = computed(() => groupStore.messages)

// 连接状态
const allConnected = computed(() => multiAgentStore.allConnected)
const anyConnected = computed(() => multiAgentStore.anyConnected)

// 动态获取参与群聊的 Agent（从 groupStore 配置中读取）
const participatingAgents = computed(() => {
  const agentIds = groupStore.groupConfig.agentIds
  const result = agentIds.map(id => {
    const agentState = multiAgentStore.agents[id]
    return {
      id,
      name: agentState?.config?.displayName || id,
      avatar: agentState?.config?.avatar || '◈',
      isConnected: agentState?.isConnected || false
    }
  })
  console.log('[GroupChat] participatingAgents computed:', result)
  return result
})

const inputContent = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLElement | null>(null)

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 格式化消息内容
const formatMessageContent = (content: string) => {
  if (!content) return ''
  let formatted = content
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
  return formatted
}

// 获取 Agent 名称
const getAgentName = (agentId: string) => {
  const agent = participatingAgents.value.find(a => a.id === agentId)
  return agent?.name || agentId
}

// 监听多 Agent Store 的连接状态变化（由于 participatingAgents 是 computed from multiAgentStore，所以自动响应式）
const setupAgentStatusWatcher = () => {
  console.log('[GroupChat] Setting up agent status watcher...')
  // watch participatingAgents 变化，更新 groupStore 内部状态用于消息处理
  return watch(
    () => participatingAgents.value,
    (agents) => {
      console.log('[GroupChat] Agent status changed:', agents)
      agents.forEach(agent => {
        groupStore.updateAgentStatus(agent.id, {
          isConnected: agent.isConnected,
          avatar: agent.avatar,
          displayName: agent.name
        })
      })
    },
    { deep: true, immediate: true }
  )
}

// 监听 Agent 消息并显示到群聊
const setupMessageListener = () => {
  const listener = (agentId: string, event: string, payload: any) => {
    // 只处理 agent 事件
    if (event === 'agent') {
      const stream = payload?.stream
      if (stream === 'assistant') {
        // 提取 AI 回复内容
        const text = extractText(payload)
        if (text) {
          groupStore.updateAgentReply(agentId, text)
          nextTick(() => scrollToBottom())
        }
      }
    }
  }

  multiAgentStore.addEventListener(listener)
  return () => multiAgentStore.removeEventListener(listener)
}

// 提取文本
const extractText = (payload: any): string | null => {
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

// 发送消息
const handleSend = () => {
  if (!inputContent.value.trim()) return

  const content = inputContent.value.trim()
  const { mentions, invalidMentions, offlineAgents } = groupStore.handleUserMessage(content)

  // 向被 @ 的 Agent 发送消息
  mentions.forEach(agentId => {
    const agentState = multiAgentStore.agents[agentId]
    if (agentState?.isConnected && agentState?.ws) {
      multiAgentStore.sendMessage(agentId, content.replace(/@[^\s]+/g, '').trim())
    }
  })

  inputContent.value = ''
  nextTick(() => {
    scrollToBottom()
  })
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 确认重置
const confirmClear = () => {
  ElMessageBox.confirm('清空群聊消息记录？', '确认', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    groupStore.clearMessages()
  }).catch(() => {})
}

// 全连
const handleConnectAll = () => {
  multiAgentStore.connectAll()
}

// 全断
const handleDisconnectAll = () => {
  multiAgentStore.disconnectAll()
}

// 自动滚动
let prevLength = 0
const checkScroll = setInterval(() => {
  if (messages.value.length !== prevLength) {
    scrollToBottom()
    prevLength = messages.value.length
  }
}, 500)

// 生命周期
const stopAgentWatch = setupAgentStatusWatcher()
const cleanupListener = setupMessageListener()

onMounted(() => {
  console.log('[GroupChat] Mounted, participatingAgents:', participatingAgents.value)
  groupStore.loadMessages()
  scrollToBottom()
  // 连接状态由 App.vue 统一管理，页面切换时不断开
})

onUnmounted(() => {
  clearInterval(checkScroll)
  stopAgentWatch()
  cleanupListener()
  // 不断开连接，只清理监听器
})
</script>

<style scoped>
/* ========== 群聊界面 ========== */
.group-chat-interface {
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* ========== 亮色主题 - 群聊界面 ========== */
:root.light-theme .group-chat-interface {
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* ========== 群聊头部 ========== */
.group-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--grid-line);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

/* ========== 亮色主题 - 群聊头部 ========== */
:root.light-theme .group-chat-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.group-avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  border: 1px solid rgba(0, 240, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
}

.avatar-icon {
  font-size: 24px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.6);
}

.user-avatar {
  color: var(--color-secondary);
}

.system-avatar {
  color: var(--text-muted);
  font-size: 20px;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.group-members {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.member-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(30, 58, 95, 0.3);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 6px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  position: relative;
}

/* ========== 亮色主题 - 成员标签 (Feishu 风格) ========== */
:root.light-theme .member-tag {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  font-family: var(--font-sans);
  color: #6b7280;
}

.member-avatar {
  font-size: 12px;
  color: var(--color-primary);
}

/* ========== 亮色主题 - 成员头像 ========== */
:root.light-theme .member-avatar {
  font-size: 13px;
  color: #4f46e5;
}

.member-name {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== 亮色主题 - 成员名称 ========== */
:root.light-theme .member-name {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.member-status {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}

.member-tag.online .member-status {
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

/* ========== 亮色主题 - 在线状态 ========== */
:root.light-theme .member-tag.online .member-status {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.member-tag.offline .member-status {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}

/* ========== 亮色主题 - 离线状态 ========== */
:root.light-theme .member-tag.offline .member-status {
  background: #9ca3af;
  box-shadow: none;
}

/* ========== 消息区域 ========== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #0a0e14;
}

/* ========== 亮色主题 - 消息区域 (Feishu 风格) ========== */
:root.light-theme .messages-container {
  background: #fafbfc;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.empty-art pre {
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-primary-dim);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
}

/* ========== 亮色主题 - 空状态 ========== */
:root.light-theme .empty-state {
  color: #9ca3af;
}

:root.light-theme .empty-art pre {
  color: #d1d5db;
  text-shadow: none;
}

/* ========== 消息行 - Feishu 风格气泡 ========== */
.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  transition: none;
}

.message-row:hover {
  background: transparent;
}

/* ========== 亮色主题 - 消息行 ========== */
:root.light-theme .message-row {
  margin-bottom: 16px;
}

.message-row.sender-user {
  background: rgba(189, 0, 255, 0.05);
  border-left: 2px solid var(--color-secondary);
}

.message-row.sender-agent {
  background: rgba(0, 240, 255, 0.05);
  border-left: 2px solid var(--color-primary);
}

.message-row.sender-system {
  background: rgba(136, 144, 168, 0.05);
  border-left: 2px solid var(--text-muted);
}

/* ========== 亮色主题 - 消息行无边框背景 ========== */
:root.light-theme .message-row.sender-user,
:root.light-theme .message-row.sender-agent,
:root.light-theme .message-row.sender-system {
  background: transparent;
  border-left: none;
  padding: 0;
}

.message-avatar {
  flex-shrink: 0;
}

.message-avatar .avatar-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 8px;
  font-size: 18px;
}

/* ========== 亮色主题 - 头像 (Feishu 风格) ========== */
:root.light-theme .message-avatar .avatar-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border: none;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.message-row.sender-user .avatar-icon {
  background: linear-gradient(135deg, rgba(189, 0, 255, 0.2) 0%, rgba(136, 0, 255, 0.15) 100%);
}

/* ========== 亮色主题 - 用户头像 ========== */
:root.light-theme .message-row.sender-user .avatar-icon {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  color: #4f46e5;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.message-row.sender-system .avatar-icon {
  background: rgba(136, 144, 168, 0.2);
  border-color: rgba(136, 144, 168, 0.3);
}

/* ========== 亮色主题 - 系统头像 ========== */
:root.light-theme .message-row.sender-system .avatar-icon {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.15);
}

.message-content {
  flex: 1;
  min-width: 0;
}

/* ========== 亮色主题 - 消息内容区 ========== */
:root.light-theme .message-content {
  max-width: 600px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

/* ========== 亮色主题 - 消息元数据 ========== */
:root.light-theme .message-meta {
  margin-bottom: 8px;
  gap: 8px;
}

.sender-name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== 亮色主题 - 发送者名称 ========== */
:root.light-theme .sender-name {
  font-size: 14px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.sender-name.name-user {
  color: var(--color-secondary);
}

.sender-name.name-agent {
  color: var(--color-primary);
}

.sender-name.name-system {
  color: var(--text-muted);
}

/* ========== 亮色主题 - 发送者名称颜色 ========== */
:root.light-theme .sender-name.name-user {
  color: #4f46e5;
}

:root.light-theme .sender-name.name-agent {
  color: #2563eb;
}

:root.light-theme .sender-name.name-system {
  color: #6b7280;
}

.message-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 亮色主题 - 消息时间 ========== */
:root.light-theme .message-time {
  font-size: 12px;
  color: #9ca3af;
  font-family: var(--font-sans);
}

.message-text {
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-word;
  font-size: 13px;
}

/* ========== 亮色主题 - 消息文本 (Feishu 气泡风格) ========== */
:root.light-theme .message-text {
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid #e5e6e9;
  border-bottom-left-radius: 4px;
  line-height: 1.6;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: inline-block;
  max-width: 100%;
  color: #1f2329;
}

/* 用户消息气泡在右侧 */
:root.light-theme .message-row.sender-user .message-text {
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  color: #ffffff;
  border: none;
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 16px;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.2);
}

.message-text :deep(.code-block) {
  background: rgba(10, 14, 20, 0.8);
  border: 1px solid rgba(48, 80, 112, 0.5);
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--terminal-cyan);
  border-radius: 6px;
}

/* ========== 亮色主题 - 代码块 ========== */
:root.light-theme .message-text :deep(.code-block) {
  background: #1f2329;
  border: 1px solid #444852;
  color: #e5e6e9;
}

/* 用户气泡内的代码块 */
:root.light-theme .message-row.sender-user .message-text :deep(.code-block) {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
  color: #e0e4ff;
}

.message-text :deep(.inline-code) {
  background: rgba(30, 58, 95, 0.5);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-secondary);
  border-radius: 4px;
  border: 1px solid rgba(189, 0, 255, 0.3);
}

/* ========== 亮色主题 - 行内代码 ========== */
:root.light-theme .message-text :deep(.inline-code) {
  background: #f5f6f7;
  padding: 3px 8px;
  font-size: 12px;
  color: #3370ff;
  border: 1px solid #e5e6e9;
  border-radius: 6px;
}

/* 用户气泡内的行内代码 */
:root.light-theme .message-row.sender-user .message-text :deep(.inline-code) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* ========== 提及标签 ========== */
.mention-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.mention-tag {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-primary);
}

/* ========== 亮色主题 - 提及标签 (Feishu 风格) ========== */
:root.light-theme .mention-tags {
  margin-top: 10px;
}

:root.light-theme .mention-tag {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 11px;
  font-family: var(--font-sans);
  color: #4f46e5;
  padding: 3px 10px;
}

/* 用户气泡内的提及标签 */
:root.light-theme .message-row.sender-user .mention-tags {
  margin-top: 10px;
}

:root.light-theme .message-row.sender-user .mention-tag {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* ========== 输入区域 ========== */
.input-area {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--grid-line);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.02) 0%, rgba(18, 24, 32, 0.95));
}

/* ========== 亮色主题 - 输入区域 (Feishu 风格) ========== */
:root.light-theme .input-area {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 12px 16px;
  gap: 12px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10, 14, 20, 0.8);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
}

/* ========== 亮色主题 - 输入框包装器 ========== */
:root.light-theme .input-wrapper {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 14px;
  transition: all 0.2s;
}

:root.light-theme .input-wrapper:focus-within {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-prefix {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

/* ========== 亮色主题 - 输入前缀 ========== */
:root.light-theme .input-prefix {
  color: #6b7280;
  text-shadow: none;
  font-size: 14px;
}

.message-input {
  flex: 1;
  padding: 8px;
  background: transparent;
  border: none;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  resize: none;
  transition: all 0.2s;
}

/* ========== 亮色主题 - 消息输入框 ========== */
:root.light-theme .message-input {
  font-family: var(--font-sans);
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

.message-input::placeholder {
  color: var(--text-muted);
}

/* ========== 亮色主题 - 占位符 ========== */
:root.light-theme .message-input::placeholder {
  color: #9ca3af;
}

.message-input:focus {
  outline: none;
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 8px;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

/* ========== 亮色主题 - 发送按钮 (突出、不透明) ========== */
:root.light-theme .btn-send {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(99, 102, 241, 0.3),
    0 1px 3px rgba(99, 102, 241, 0.15);
}

:root.light-theme .btn-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  box-shadow:
    0 4px 12px rgba(99, 102, 241, 0.35),
    0 2px 6px rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

:root.light-theme .btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #e5e7eb;
  box-shadow: none;
}

.btn-send:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.2);
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  font-size: 18px;
}

/* ========== 亮色主题 - 发送图标 ========== */
:root.light-theme .send-icon {
  font-size: 16px;
}

/* ========== 按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
}

.btn-icon {
  font-size: 14px;
  line-height: 1;
}

.btn-primary {
  background: rgba(0, 240, 255, 0.15);
  border-color: rgba(0, 240, 255, 0.3);
  color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: rgba(0, 240, 255, 0.25);
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
}

.btn-success {
  background: rgba(0, 255, 136, 0.15);
  border-color: rgba(0, 255, 136, 0.3);
  color: var(--color-success);
}

.btn-success:hover:not(:disabled) {
  background: rgba(0, 255, 136, 0.25);
  border-color: var(--color-success);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
}

.btn-danger {
  background: rgba(255, 51, 102, 0.15);
  border-color: rgba(255, 51, 102, 0.3);
  color: var(--color-error);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(255, 51, 102, 0.25);
  border-color: var(--color-error);
  box-shadow: 0 0 15px rgba(255, 51, 102, 0.3);
}

.btn-secondary {
  background: rgba(136, 144, 168, 0.15);
  border-color: rgba(136, 144, 168, 0.3);
  color: var(--text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(136, 144, 168, 0.25);
  border-color: var(--text-secondary);
  box-shadow: 0 0 15px rgba(136, 144, 168, 0.3);
}
</style>
