<template>
  <div class="chat-interface">
    <!-- 设置面板 -->
    <div class="overlay-panel" v-if="showSettings">
      <div class="panel-content">
        <div class="panel-top">
          <h3 class="panel-title">
            <span class="title-icon">⚡</span>
            通讯设置
          </h3>
          <button class="icon-btn" @click="toggleSettings">✕</button>
        </div>
        <div class="form-stack">
          <div class="input-group">
            <label class="input-label">
              <span class="label-icon">◈</span>
              WebSocket 地址
            </label>
            <div class="input-wrapper">
              <span class="input-prefix">></span>
              <input
                v-model="localSettings.wsUrl"
                type="text"
                class="terminal-input"
                placeholder="ws://127.0.0.1:18789"
              />
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">
              <span class="label-icon">◈</span>
              认证令牌
            </label>
            <div class="input-wrapper">
              <span class="input-prefix">></span>
              <input
                v-model="localSettings.token"
                type="text"
                class="terminal-input"
                placeholder="输入认证令牌"
              />
            </div>
          </div>
          <div class="button-row">
            <button class="btn btn-primary" @click="saveSettings">
              <span>✓</span> 保存配置
            </button>
            <button class="btn btn-secondary" @click="toggleSettings">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主聊天界面 - 双 Agent 对话 -->
    <div class="chat-wrapper">
      <!-- 左侧 Agent 切换栏 -->
      <ChatAgentSidebar
        :agents="sidebarAgents"
        @select="switchAgent"
      />

      <!-- 聊天主体区域 -->
      <div class="chat-main">
        <!-- 顶部功能栏 -->
        <div class="top-toolbar">
          <div class="toolbar-left">
            <button
              v-if="!currentAgent?.isConnected"
              class="btn btn-primary btn-sm"
              @click="handleConnect"
              :disabled="currentAgent?.isConnecting"
            >
              <span class="btn-icon">⟳</span>
              {{ currentAgent?.isConnecting ? '连接中...' : '连接' }}
            </button>
            <button
              v-else
              class="btn btn-danger btn-sm"
              @click="handleDisconnect"
            >
              <span class="btn-icon">⏻</span>
              断开
            </button>
            <button class="btn btn-primary btn-sm" @click="handleConnectAll">
              <span class="btn-icon">⬡</span>
              全连
            </button>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary btn-sm" @click="toggleSettings">
              <span class="btn-icon">⚡</span>
              配置
            </button>
            <button class="btn btn-secondary btn-sm" @click="confirmClear">
              <span class="btn-icon">↻</span>
              重置
            </button>
          </div>
        </div>

        <!-- 消息终端 - 通信日志 -->
      <div class="terminal-window" ref="messagesContainer">
        <div class="terminal-header">
          <span class="terminal-label">COMMUNICATION LOG - {{ currentAgentConfig?.displayName }}</span>
          <div class="terminal-controls">
            <span class="control-dot"></span>
            <span class="control-dot"></span>
            <span class="control-dot"></span>
          </div>
        </div>
        <div v-if="currentMessages.length === 0" class="terminal-empty">
          <div class="empty-art">
            <pre class="ascii-art">
  ╔═══════════════════════════════════╗
  ║   {{ currentAgentConfig?.displayName }} - {{ currentAgentConfig?.role }}             ║
  ║   Session: {{ currentAgentConfig?.sessionKey }}
  ║                                   ║
  ║   ▶ 状态：{{ currentAgent?.isConnected ? '已连接' : '等待连接' }}                ║
  ║   ▶ 模式：{{ currentAgent?.isConnected ? '在线办公' : '战术待机' }}                ║
  ╚═══════════════════════════════════╝
            </pre>
          </div>
          <p class="empty-hint">
            <span class="prompt">></span>
            <span>连接网关建立安全通信链路</span>
          </p>
        </div>

        <ChatMessageBubble
          v-for="message in currentMessages"
          :key="message.id"
          :variant="message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user'"
          :layout="message.role === 'user' ? 'right' : 'left'"
          :sender-name="message.role === 'assistant' ? currentAgentConfig?.displayName : message.role === 'system' ? '系统' : '指挥台'"
          :time="formatTime(message.timestamp)"
          :content-html="formatRichText(message.content)"
          :avatar-text="message.role === 'assistant' ? currentAgentConfig?.avatar : message.role === 'system' ? '⚙' : '⌘'"
        />

        <!-- 打字指示器 -->
        <div v-if="currentAgent?.isTyping" class="terminal-line line-assistant typing">
          <div class="line-prefix">
            <span class="line-mark assistant">AI</span>
            <span class="line-time">{{ typingDurationText }}</span>
          </div>
          <div class="line-content">
            <div class="message-card card-assistant">
              <div class="card-indicator"></div>
              <span class="typing-sequence">
                <span class="char">_</span>
                <span class="char">_</span>
                <span class="char blink">█</span>
              </span>
              <span class="typing-label">AI 处理中...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 - 命令输入台 -->
      <div class="input-console">
        <div class="console-decorator">
          <span class="decorator-icon">◈</span>
        </div>
        <div class="console-wrapper">
          <div class="console-prompt">
            <span class="prompt-char">></span>
            <span class="prompt-label">INPUT_COMMAND</span>
          </div>
          <textarea
            v-model="inputMessage"
            class="console-input"
            placeholder="输入指令或消息... (Enter 发送，Shift+Enter 换行)"
            @keydown.enter.exact.prevent="handleSend"
            :disabled="!currentAgent?.isConnected"
            rows="1"
            ref="inputRef"
          ></textarea>
        </div>
        <button
          class="btn-send"
          @click="handleSend"
          :disabled="!inputMessage.trim() || !currentAgent?.isConnected"
        >
          <span class="send-icon">⏵</span>
        </button>
        <div class="console-status" v-if="!currentAgent?.isConnected">
          <span class="status-indicator offline"></span>
          <span>LINK_OFFLINE</span>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { ElMessageBox } from 'element-plus'
import ChatAgentSidebar from '@/components/chat/ChatAgentSidebar.vue'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble.vue'
import { useChatFormatting } from '@/composables/useChatFormatting'

const store = useMultiAgentChatStore()
const { formatTime, formatRichText } = useChatFormatting()

// Agent 配置
const agents = computed(() => store.agentConfigs)

// 当前选中的 Agent ID (使用本地 ref 包装)
const currentAgentId = ref<string>('xiaomu')

// 获取当前 Agent 配置
const currentAgentConfig = computed(() => {
  return store.agentConfigs.find(a => a.id === currentAgentId.value)
})

// 获取当前 Agent 连接状态
const currentAgent = computed(() => {
  return store.agents[currentAgentId.value]
})

// 获取当前消息列表
const currentMessages = computed(() => {
  return store.agents[currentAgentId.value]?.messages || []
})

const sidebarAgents = computed(() =>
  agents.value.map((agent) => ({
    id: agent.id,
    name: agent.displayName,
    role: agent.role,
    avatar: agent.avatar,
    status: getStatusClass(agent.id) as 'connected' | 'connecting' | 'disconnected',
    active: currentAgentId.value === agent.id,
  }))
)

// 打字时长
const typingDurationText = computed(() => {
  const agent = currentAgent.value
  if (!agent || !agent.typingStartTime) return '0 秒'
  const seconds = Math.floor((Date.now() - agent.typingStartTime) / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
})

// 状态
const inputMessage = ref('')
const showSettings = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLElement | null>(null)

// 本地设置副本
const localSettings = ref({ ...store.settings })

// 获取 Agent 状态类名
const getStatusClass = (agentId: string) => {
  const agent = store.agents[agentId]
  if (!agent) return 'disconnected'
  if (agent.isConnected) return 'connected'
  if (agent.isConnecting) return 'connecting'
  return 'disconnected'
}

// 切换 Agent
const switchAgent = (agentId: string) => {
  currentAgentId.value = agentId
  nextTick(() => {
    scrollToBottom()
  })
}

const toggleSettings = () => {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    localSettings.value = { ...store.settings }
  }
}

const saveSettings = () => {
  store.updateSettings(localSettings.value)
  showSettings.value = false
}

const handleConnect = () => {
  store.connect(currentAgentId.value)
}

const handleDisconnect = () => {
  store.disconnect(currentAgentId.value)
}

const handleConnectAll = () => {
  store.connectAll()
}

const handleSend = async () => {
  if (!inputMessage.value.trim() || !currentAgent.value?.isConnected) return

  const messageText = inputMessage.value.trim()
  const agent = store.agents[currentAgentId.value]
  if (!agent) return

  try {
    // 使用完整的 gatewayAgentId 作为 agent 名称（如 agent:ceo:main）
    const targetAgentName = agent.config.gatewayAgentId || agent.config.sessionKey

    // 使用 HTTP API 发送消息（与 Mission-control 一致）
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'human',
        to: targetAgentName,
        content: messageText,
        message_type: 'text',
        conversation_id: targetAgentName
      })
    })

    const data = await response.json()

    if (data.success || data.message) {
      console.log('[Chat] Message sent via HTTP API:', data)
      // 在本地添加用户消息
      store.agents[currentAgentId.value]?.messages.push({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
        agentId: currentAgentId.value
      })
    } else {
      throw new Error(data.error || '发送失败')
    }
  } catch (err) {
    console.error('[Chat] Send message error:', err)
    const message = err instanceof Error ? err.message : '未知错误'
    ElMessageBox.alert('发送失败：' + message, '错误', { type: 'error' })
    return
  }

  inputMessage.value = ''
  nextTick(() => {
    scrollToBottom()
  })
}

const confirmClear = () => {
  ElMessageBox.confirm('Reset conversation and send /new command?', 'Confirm', {
    confirmButtonText: 'RESET',
    cancelButtonText: 'CANCEL',
    type: 'warning'
  }).then(() => {
    store.resetChat(currentAgentId.value)
  }).catch(() => {})
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 监听消息变化自动滚动
let prevMessagesLength = 0
const checkScroll = () => {
  if (currentMessages.value.length !== prevMessagesLength) {
    scrollToBottom()
    prevMessagesLength = currentMessages.value.length
  }
}

const stopWatch = setInterval(checkScroll, 500)

// 监听 Agent 切换，重置计数
watch(currentAgentId, () => {
  prevMessagesLength = currentMessages.value.length
})

onMounted(() => {
  store.loadMessages()
  // 自动连接所有 Agent
  if (store.settings.autoConnect) {
    store.connectAll()
  }
  scrollToBottom()
  if (inputRef.value) {
    (inputRef.value as HTMLTextAreaElement).focus()
  }
})

onUnmounted(() => {
  clearInterval(stopWatch)
  // 保持连接，不断开
  // store.disconnectAll()
})
</script>

<style scoped>
/* ========== AI 员工办公桌风格 ========== */
.chat-interface {
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* ========== 设置面板 ========== */
.overlay-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.panel-content {
  width: 480px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--color-primary-dim);
  padding: 24px;
  box-shadow: var(--shadow-xl), 0 0 40px rgba(0, 240, 255, 0.1);
  border-radius: 12px;
}

.panel-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
}

.title-icon {
  font-size: 16px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 6px;
}

.icon-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 15px rgba(255, 107, 0, 0.3);
}

/* ========== 表单样式 ========== */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.label-icon {
  color: var(--color-primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 12px;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-weight: 700;
  z-index: 1;
}

.terminal-input {
  width: 100%;
  padding: 12px 16px;
  padding-left: 32px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  transition: all 0.2s;
  border-radius: 6px;
}

.terminal-input::placeholder {
  color: var(--text-muted);
}

.terminal-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
}

.button-row {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--grid-line);
}

/* ========== 主聊天布局 - 左侧 Agent 切换栏 ========== */
.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

/* 左侧 Agent 侧边栏 */
.agent-sidebar {
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, rgba(10, 14, 20, 0.8) 100%);
  border-right: 1px solid var(--grid-line);
}

.agent-sidebar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(10, 14, 20, 0.6);
  border: 1px solid rgba(48, 80, 112, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.agent-sidebar-item:hover {
  background: rgba(30, 58, 95, 0.4);
  border-color: rgba(0, 240, 255, 0.3);
}

.agent-sidebar-item.active {
  background: rgba(0, 240, 255, 0.1);
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
}

.sidebar-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 8px;
  font-size: 18px;
  color: var(--color-primary);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

.sidebar-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.sidebar-name {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-role {
  font-size: 8px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: center;
}

.sidebar-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all 0.3s;
}

.sidebar-status.connected {
  background: var(--color-success);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
  animation: pulse-status 2s infinite;
}

.sidebar-status.connecting {
  background: var(--color-warning);
  animation: pulse-status 1s infinite;
}

.sidebar-status.disconnected {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}

/* 聊天主体区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ========== 顶部工具栏 ========== */
.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  border-bottom: 1px solid var(--grid-line);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

/* 按钮高度调整 */
.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

/* ========== 原 Agent 切换标签页样式已移至左侧 ========== */
/* ========== 原聊天头部样式已移除 ========== */

/* ========== 终端窗口 ========== */
.terminal-window {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #0a0e14;
  font-family: var(--font-mono);
  border: 1px solid var(--grid-line);
  border-top: none;
}

/* ========== 亮色主题 - 终端窗口 ========== */
:root.light-theme .terminal-window {
  background: #f5f6f7;
  border: none;
  border-radius: 12px;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(30, 58, 95, 0.3);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 6px;
}

/* ========== 亮色主题 - 终端头部 ========== */
:root.light-theme .terminal-header {
  background: #ffffff;
  border: 1px solid #e5e6e9;
  border-radius: 10px;
  padding: 10px 14px;
}

.terminal-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* ========== 亮色主题 - 终端标签 ========== */
:root.light-theme .terminal-label {
  font-size: 12px;
  font-weight: 600;
  color: #646a73;
  font-family: var(--font-sans);
  text-transform: none;
  letter-spacing: 0;
}

.terminal-controls {
  display: flex;
  gap: 6px;
}

.control-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(136, 144, 168, 0.3);
  border: 1px solid rgba(136, 144, 168, 0.5);
}

/* ========== 亮色主题 - 控制点 ========== */
:root.light-theme .control-dot {
  background: #c2c8d1;
  border: none;
}

.terminal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.ascii-art {
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-primary-dim);
  margin-bottom: 24px;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
}

/* ========== 亮色主题 - ASCII 艺术 ========== */
:root.light-theme .ascii-art {
  color: #dee0e3;
  text-shadow: none;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
}

/* ========== 亮色主题 - 空提示 ========== */
:root.light-theme .empty-hint {
  font-family: var(--font-sans);
  color: #8f959e;
}

.prompt {
  color: var(--color-primary);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

/* ========== 亮色主题 - 提示符 ========== */
:root.light-theme .prompt {
  color: #6b7280;
  text-shadow: none;
}

/* ========== 消息行 ========== */
.terminal-line {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  border-radius: 6px;
}

.terminal-line:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* ========== 亮色主题 - 消息行 ========== */
:root.light-theme .terminal-line {
  padding: 0;
  background: transparent;
  border-left: none;
  margin-bottom: 20px;
}

:root.light-theme .terminal-line:hover {
  background: transparent;
}

.line-user {
  border-left-color: transparent;
  border-right-color: var(--color-secondary);
  background: rgba(189, 0, 255, 0.05);
  flex-direction: row-reverse;
}

/* ========== 亮色主题 - 用户消息行 ========== */
:root.light-theme .line-user {
  background: transparent;
  border-right: none;
}

.line-user .line-mark {
  color: var(--color-secondary);
}

/* ========== 亮色主题 - 用户标记 ========== */
:root.light-theme .line-user .line-mark {
  color: #4f46e5;
}

.line-assistant {
  border-left-color: var(--color-primary);
  background: rgba(0, 240, 255, 0.05);
}

/* ========== 亮色主题 - AI 消息行 ========== */
:root.light-theme .line-assistant {
  background: transparent;
  border-left: none;
}

.line-assistant .line-mark {
  color: var(--color-primary);
}

/* ========== 亮色主题 - AI 标记 ========== */
:root.light-theme .line-assistant .line-mark {
  color: #2563eb;
}

.line-system {
  border-left-color: var(--text-muted);
  background: rgba(136, 144, 168, 0.05);
}

/* ========== 亮色主题 - 系统消息行 ========== */
:root.light-theme .line-system {
  background: transparent;
  border-left: none;
}

.line-system .line-mark {
  color: var(--text-muted);
}

/* ========== 亮色主题 - 系统标记 ========== */
:root.light-theme .line-system .line-mark {
  color: #6b7280;
}

/* 用户消息在右侧的布局 */
.line-content-right {
  display: flex;
  flex-direction: row-reverse;
  max-width: 70%;
  margin-left: auto;
}

.line-prefix-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 70px;
  align-items: flex-end;
  text-align: right;
}

.line-prefix-right .line-time {
  color: var(--text-muted);
}

.line-prefix-right .line-mark.user {
  color: var(--color-secondary);
}

/* ========== 亮色主题 - 用户前缀 ========== */
:root.light-theme .line-prefix-right {
  min-width: 50px;
}

:root.light-theme .line-prefix-right .line-time {
  color: #9ca3af;
  font-size: 11px;
}

:root.light-theme .line-prefix-right .line-mark.user {
  color: #4f46e5;
  font-size: 11px;
  font-weight: 600;
}

.line-prefix {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 70px;
}

/* ========== 亮色主题 - 前缀 ========== */
:root.light-theme .line-prefix {
  min-width: 50px;
  gap: 6px;
}

.line-mark {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* ========== 亮色主题 - 标记 ========== */
:root.light-theme .line-mark {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: none;
  font-family: var(--font-sans);
}

.line-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 亮色主题 - 时间 ========== */
:root.light-theme .line-time {
  font-size: 11px;
  color: #9ca3af;
  font-family: var(--font-sans);
}

.line-content {
  flex: 1;
  display: flex;
  gap: 8px;
}

/* ========== 亮色主题 - 内容区 ========== */
:root.light-theme .line-content {
  gap: 12px;
}

/* 消息卡片 */
.message-card {
  flex: 1;
  background: rgba(18, 24, 32, 0.8);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  position: relative;
  overflow: hidden;
}

/* ========== 亮色主题 - 消息卡片 (Feishu 风格) ========== */
:root.light-theme .message-card {
  background: #ffffff;
  border: 1px solid #e5e6e9;
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .card-user {
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.2);
}

:root.light-theme .card-assistant {
  background: #ffffff;
  border: 1px solid #e5e6e9;
}

:root.light-theme .card-system {
  background: #f5f6f7;
  border: 1px solid #e5e6e9;
}

.message-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.5;
}

/* ========== 亮色主题 - 移除卡片顶部装饰 ========== */
:root.light-theme .message-card::before {
  display: none;
}

.card-user::before {
  background: linear-gradient(90deg, transparent, var(--color-secondary), transparent);
}

.card-assistant::before {
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
}

.card-system::before {
  background: linear-gradient(90deg, transparent, var(--text-muted), transparent);
}

.card-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

/* ========== 亮色主题 - 卡片指示器 ========== */
:root.light-theme .card-indicator {
  opacity: 0.3;
}

:root.light-theme .card-user .card-indicator {
  background: #ffffff;
}

.message-body {
  flex: 1;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-word;
  font-size: 13px;
}

/* ========== 亮色主题 - 消息文本 ========== */
:root.light-theme .message-body {
  font-size: 14px;
  line-height: 1.7;
}

:root.light-theme .card-user .message-body {
  color: #ffffff;
}

/* 代码块样式 */
:deep(.code-block) {
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
:root.light-theme .message-card :deep(.code-block) {
  background: #1f2329;
  border: 1px solid #444852;
  color: #e5e6e9;
}

:deep(.inline-code) {
  background: rgba(30, 58, 95, 0.5);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-secondary);
  border-radius: 4px;
  border: 1px solid rgba(189, 0, 255, 0.3);
}

/* ========== 亮色主题 - 行内代码 ========== */
:root.light-theme .message-card :deep(.inline-code) {
  background: #f5f6f7;
  padding: 3px 8px;
  font-size: 12px;
  color: #3370ff;
  border: 1px solid #e5e6e9;
  border-radius: 6px;
}

/* 用户气泡内的行内代码 */
:root.light-theme .card-user :deep(.inline-code) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* ========== 打字指示器 ========== */
.typing {
  opacity: 0.8;
}

/* ========== 亮色主题 - 打字指示器 ========== */
:root.light-theme .typing {
  opacity: 1;
}

.typing-sequence {
  display: flex;
  align-items: center;
  gap: 2px;
}

.char {
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 14px;
}

/* ========== 亮色主题 - 打字字符 ========== */
:root.light-theme .char {
  color: #6366f1;
}

.blink {
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.typing-label {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  font-family: var(--font-mono);
}

/* ========== 亮色主题 - 打字标签 ========== */
:root.light-theme .typing-label {
  color: #9ca3af;
  font-family: var(--font-sans);
}

/* ========== 输入控制台 ========== */
.input-console {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--grid-line);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.02) 0%, rgba(18, 24, 32, 0.95));
  position: relative;
}

/* ========== 亮色主题 - 输入控制台 (Feishu 风格) ========== */
:root.light-theme .input-console {
  background: #ffffff;
  border-top: 1px solid #e5e6e9;
  padding: 12px 16px;
  gap: 12px;
}

.input-console::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-primary-dim), transparent);
}

/* ========== 亮色主题 - 移除装饰线 ========== */
:root.light-theme .input-console::before {
  display: none;
}

.console-decorator {
  display: flex;
  align-items: center;
  padding: 8px;
  background: rgba(30, 58, 95, 0.3);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 6px;
}

/* ========== 亮色主题 - 控制台装饰器 ========== */
:root.light-theme .console-decorator {
  background: #f5f6f7;
  border: 1px solid #e5e6e9;
  border-radius: 10px;
  padding: 8px 12px;
}

.decorator-icon {
  font-size: 16px;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

/* ========== 亮色主题 - 装饰图标 ========== */
:root.light-theme .decorator-icon {
  color: #8f959e;
  text-shadow: none;
  font-size: 14px;
}

.console-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10, 14, 20, 0.8);
  border: 1px solid rgba(48, 80, 112, 0.4);
  border-radius: 8px;
  padding: 4px 12px;
}

/* ========== 亮色主题 - 控制台包装器 ========== */
:root.light-theme .console-wrapper {
  background: #ffffff;
  border: 1px solid #e5e6e9;
  border-radius: 12px;
  padding: 10px 14px;
  transition: all 0.2s;
}

:root.light-theme .console-wrapper:focus-within {
  background: #ffffff;
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
}

.console-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prompt-char {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
}

/* ========== 亮色主题 - 提示字符 ========== */
:root.light-theme .prompt-char {
  color: #3370ff;
  text-shadow: none;
  font-size: 14px;
  font-weight: 600;
}

.prompt-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ========== 亮色主题 - 提示标签 ========== */
:root.light-theme .prompt-label {
  font-size: 12px;
  color: #c2c8d1;
  font-family: var(--font-sans);
  text-transform: none;
  letter-spacing: 0;
}

.console-input {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: none;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  resize: none;
  max-height: 120px;
  min-height: 24px;
  transition: all 0.2s;
}

/* ========== 亮色主题 - 控制台输入 ========== */
:root.light-theme .console-input {
  font-family: var(--font-sans);
  font-size: 14px;
  color: #1f2329;
  line-height: 1.5;
}

.console-input::placeholder {
  color: var(--text-muted);
}

/* ========== 亮色主题 - 占位符 ========== */
:root.light-theme .console-input::placeholder {
  color: #c2c8d1;
}

.console-input:focus {
  outline: none;
}

.console-input:disabled {
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

/* ========== 亮色主题 - 发送按钮 (Feishu 风格) ========== */
:root.light-theme .btn-send {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(51, 112, 255, 0.3),
    0 1px 3px rgba(51, 112, 255, 0.15);
}

:root.light-theme .btn-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #2860e1 0%, #3370ff 100%);
  box-shadow:
    0 4px 12px rgba(51, 112, 255, 0.35),
    0 2px 6px rgba(51, 112, 255, 0.2);
  transform: translateY(-1px);
}

:root.light-theme .btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #e5e6e9;
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

.console-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid rgba(255, 51, 102, 0.3);
  border-radius: 6px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  background: var(--color-error);
  border-radius: 50%;
}

.status-indicator.offline {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}
</style>
