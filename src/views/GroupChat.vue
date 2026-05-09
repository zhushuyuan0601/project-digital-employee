<template>
  <div class="command-room">
    <aside class="command-sidebar">
      <div class="command-sidebar__hero">
        <div class="hero-mark">群</div>
        <div class="hero-copy">
          <p class="hero-kicker">Group Chat</p>
          <h1 class="hero-title">{{ groupConfig.name }}</h1>
          <p class="hero-desc">{{ groupConfig.description }}</p>
        </div>
      </div>

      <div class="hero-status">
        <span class="status-pill" :class="allConnected ? 'status-pill--online' : anyConnected ? 'status-pill--partial' : 'status-pill--offline'">
          <span class="status-pill__dot"></span>
          {{ allConnected ? '可聊天' : anyConnected ? '回复中' : '连接中' }}
        </span>
        <span class="hero-updated">{{ latestActivityText }}</span>
      </div>

      <div class="conversation-summary">
        <article>
          <span>成员</span>
          <strong>{{ readyAgentCount }}</strong>
        </article>
        <article>
          <span>消息</span>
          <strong>{{ messages.length }}</strong>
        </article>
        <article>
          <span>回复中</span>
          <strong>{{ runtimeStatus?.running || 0 }}</strong>
        </article>
      </div>

      <div class="command-actions">
        <button class="control-btn control-btn--solid" @click="handleConnectAll">
          刷新状态
        </button>
        <button class="control-btn" @click="handleDisconnectAll" :disabled="activeGroupRunIds.length === 0">
          停止回复
        </button>
        <button class="control-btn" @click="confirmClearHistory">
          清除历史
        </button>
      </div>

      <section class="roster-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Members</p>
            <h2>群聊成员</h2>
          </div>
          <span class="panel-count">{{ participatingAgents.length }}</span>
        </div>

        <div class="roster-list">
          <button
            v-for="agent in participatingAgents"
            :key="agent.id"
            type="button"
            class="roster-item"
            @click="appendMention(agent.name)"
          >
            <div class="roster-item__avatar">{{ agent.avatar }}</div>
            <div class="roster-item__body">
              <strong>{{ agent.name }}</strong>
              <span>{{ agentStatusHint(agent.id) }}</span>
            </div>
            <span class="roster-item__status" :class="agentStatusClass(agent.id)">
              {{ agentStatusText(agent.id) }}
            </span>
          </button>
        </div>
      </section>
    </aside>

    <section class="command-stage">
      <header class="stage-header">
        <div class="stage-header__copy">
          <p class="stage-kicker">Conversation</p>
          <h2>持续对话，按需 @ 成员加入讨论</h2>
        </div>
        <div class="stage-header__meta">
          <div class="meta-badge">
            <span>消息</span>
            <strong>{{ messages.length }}</strong>
          </div>
          <div class="meta-badge">
            <span>回复中</span>
            <strong>{{ runtimeStatus?.running || 0 }}</strong>
          </div>
        </div>
      </header>

      <div class="chat-panel">
        <div class="stream-shell">
          <div class="stream-toolbar">
            <div class="stream-toolbar__title">
              <span class="toolbar-dot"></span>
              群聊消息
            </div>
            <div class="stream-toolbar__hint">
              输入 `@姓名` 邀请成员回复
            </div>
          </div>

          <div class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-orbit">
                <span class="empty-orbit__core">开始聊天</span>
              </div>
              <div class="empty-copy">
                <h3>还没有消息</h3>
                <p>直接发送会记录到群聊；使用 `@成员名` 可以让对应成员回复。</p>
              </div>
            </div>

            <div
              v-for="message in messages"
              :key="message.id"
              class="stream-row"
              :class="`stream-row--${message.sender}`"
            >
              <ChatMessageBubble
                :variant="message.sender === 'agent' ? 'assistant' : message.sender === 'system' ? 'system' : 'user'"
                :layout="message.sender === 'user' ? 'right' : 'left'"
                :sender-name="message.senderName"
                :time="formatTime(message.timestamp)"
                :content-html="formatRichText(message.content)"
                :avatar-text="message.sender === 'agent' ? (message.senderAvatar || '◈') : message.sender === 'system' ? '⚙' : '我'"
                :mentions="(message.mentions || []).map(getAgentName)"
              />
            </div>
          </div>
        </div>

        <div class="composer-shell">
          <div class="composer-head">
            <div>
              <p class="panel-kicker">Message</p>
              <h3>发送消息</h3>
            </div>
            <span class="draft-counter">{{ inputContent.trim().length }} 字</span>
          </div>

          <div class="mention-strip">
            <button
              v-for="agent in participatingAgents"
              :key="agent.id"
              type="button"
              class="mention-chip"
              :class="{ 'mention-chip--offline': !agent.isConnected }"
              @click="appendMention(agent.name)"
            >
              <span>{{ agent.avatar }}</span>
              @{{ agent.name }}
            </button>
          </div>

          <div class="composer-box">
            <div v-if="mentionPanelVisible" class="mention-suggest-panel">
              <div class="mention-suggest-panel__head">
                <span>选择成员</span>
                <kbd>↑↓</kbd>
                <kbd>Enter</kbd>
              </div>
              <button
                v-for="(agent, index) in mentionCandidates"
                :key="agent.id"
                type="button"
                class="mention-suggest-item"
                :class="{ 'is-active': index === activeMentionIndex }"
                @mousedown.prevent="selectMentionCandidate(agent)"
                @mouseenter="activeMentionIndex = index"
              >
                <span class="mention-suggest-item__avatar">{{ agent.avatar }}</span>
                <span class="mention-suggest-item__body">
                  <strong>@{{ agent.name }}</strong>
                  <small>{{ agentStatusHint(agent.id) }}</small>
                </span>
                <span class="mention-suggest-item__state" :class="agentStatusClass(agent.id)">
                  {{ agentStatusText(agent.id) }}
                </span>
              </button>
            </div>
            <textarea
              v-model="inputContent"
              class="message-input"
              placeholder="输入消息。使用 @ 成员名 邀请回复。Enter 发送，Shift+Enter 换行。"
              @keydown="handleComposerKeydown"
              @input="handleComposerInput"
              @click="refreshMentionSuggestions"
              @focus="refreshMentionSuggestions"
              rows="6"
              ref="inputRef"
            ></textarea>

            <div class="composer-footer">
              <div class="composer-footnote">
                <span>历史消息会持久化，并自动压缩为长期记忆。</span>
                <span>只显示你和成员的正常对话内容。</span>
              </div>
              <button
                class="send-btn"
                @click="handleSend"
                :disabled="sendDisabled"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useGroupChatStore } from '@/stores/groupChat'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { ElMessage, ElMessageBox } from 'element-plus'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble.vue'
import { useChatFormatting } from '@/composables/useChatFormatting'

const groupStore = useGroupChatStore()
const multiAgentStore = useMultiAgentChatStore()
const { formatTime, formatRichText } = useChatFormatting()

const groupConfig = computed(() => groupStore.groupConfig)
const messages = computed(() => groupStore.messages)

const runtimeStatus = ref<{
  healthy: boolean
  running: number
  queued: number
  completedToday: number
  recentRuns?: Array<{ id: string; status: string; task_id?: string | null; agent_id: string }>
} | null>(null)
const streamConnected = ref(false)
const activeRunIds = ref<string[]>([])
const agentRunStates = ref<Record<string, string>>({})
const runBuffers = ref<Record<string, string>>({})
let groupEventSource: EventSource | null = null

const allConnected = computed(() => !!runtimeStatus.value?.healthy)
const anyConnected = computed(() => streamConnected.value || !!runtimeStatus.value?.healthy)

const participatingAgents = computed(() => {
  const agentIds = groupStore.groupConfig.agentIds
  return agentIds.map(id => {
    const agentState = multiAgentStore.agents[id]
    return {
      id,
      name: agentState?.config?.displayName || id,
      avatar: agentState?.config?.avatar || '◈',
      isConnected: true
    }
  })
})

const readyAgentCount = computed(() =>
  participatingAgents.value.filter(agent => agent.isConnected).length
)

const activeGroupRunIds = computed(() => [...new Set(activeRunIds.value)])

const latestActivityText = computed(() => {
  const lastMessage = messages.value[messages.value.length - 1]
  if (!lastMessage) {
    return '尚无群消息'
  }
  return `最近更新 ${formatTime(lastMessage.timestamp)}`
})

const sendDisabled = computed(() => !inputContent.value.trim())

const inputContent = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const mentionQuery = ref('')
const mentionStart = ref(-1)
const mentionEnd = ref(-1)
const activeMentionIndex = ref(0)

const mentionCandidates = computed(() => {
  const query = mentionQuery.value.trim().toLowerCase()
  const candidates = participatingAgents.value.filter((agent) => {
    if (!query) return true
    return agent.name.toLowerCase().includes(query) || agent.id.toLowerCase().includes(query)
  })
  return candidates.slice(0, 5)
})

const mentionPanelVisible = computed(() => mentionStart.value >= 0 && mentionCandidates.value.length > 0)
const noisySystemMessagePattern = /(已进入|开始回复|回复完成|队列|运行结束|运行回复已停止|排队回复已取消|Claude Runtime 状态更新)/

const getAgentName = (agentId: string) => {
  const agent = participatingAgents.value.find(a => a.id === agentId)
  return agent?.name || agentId
}

const agentRuntimeState = (agentId: string) => {
  return agentRunStates.value[agentId] || 'ready'
}

const agentStatusText = (agentId: string) => {
  const labels: Record<string, string> = {
    ready: '就绪',
    queued: '排队中',
    running: '执行中',
    recent: '最近完成',
    failed: '失败',
    stopped: '已停止',
  }
  return labels[agentRuntimeState(agentId)] || '就绪'
}

const agentStatusClass = (agentId: string) => {
  const state = agentRuntimeState(agentId)
  if (state === 'running' || state === 'recent') return 'is-online'
  if (state === 'queued') return 'is-pending'
  if (state === 'failed' || state === 'stopped') return 'is-offline'
  return 'is-ready'
}

const agentStatusHint = (agentId: string) => {
  const state = agentRuntimeState(agentId)
  if (state === 'running') return 'Claude Runtime 正在执行'
  if (state === 'queued') return '已进入 Runtime 队列'
  if (state === 'recent') return '刚刚回复过，可继续 @ 聊天'
  if (state === 'failed') return '上次回复失败，可重新发送'
  if (state === 'stopped') return '回复已停止，可重新发送'
  return '可直接 @ 聊天'
}

const appendMention = (agentName: string) => {
  const token = `@${agentName} `
  if (inputContent.value.includes(token.trim())) {
    inputRef.value?.focus()
    return
  }

  const prefix = inputContent.value && !/\s$/.test(inputContent.value) ? ' ' : ''
  inputContent.value = `${inputContent.value}${prefix}${token}`
  nextTick(() => inputRef.value?.focus())
}

function closeMentionSuggestions() {
  mentionQuery.value = ''
  mentionStart.value = -1
  mentionEnd.value = -1
  activeMentionIndex.value = 0
}

function refreshMentionSuggestions() {
  const input = inputRef.value
  if (!input) return
  const caret = input.selectionStart ?? inputContent.value.length
  const beforeCaret = inputContent.value.slice(0, caret)
  const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/)
  if (!match) {
    closeMentionSuggestions()
    return
  }

  mentionStart.value = beforeCaret.length - match[2].length - 1
  mentionEnd.value = caret
  mentionQuery.value = match[2] || ''
  activeMentionIndex.value = Math.min(activeMentionIndex.value, Math.max(mentionCandidates.value.length - 1, 0))
}

function handleComposerInput() {
  nextTick(() => refreshMentionSuggestions())
}

function selectMentionCandidate(agent = mentionCandidates.value[activeMentionIndex.value]) {
  if (!agent || mentionStart.value < 0) return
  const input = inputRef.value
  const before = inputContent.value.slice(0, mentionStart.value)
  const after = inputContent.value.slice(mentionEnd.value)
  const token = `@${agent.name} `
  inputContent.value = `${before}${token}${after.replace(/^\s*/, '')}`
  const caret = before.length + token.length
  closeMentionSuggestions()
  nextTick(() => {
    input?.focus()
    input?.setSelectionRange(caret, caret)
  })
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.isComposing) return

  if (mentionPanelVisible.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activeMentionIndex.value = (activeMentionIndex.value + 1) % mentionCandidates.value.length
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      activeMentionIndex.value = (activeMentionIndex.value - 1 + mentionCandidates.value.length) % mentionCandidates.value.length
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      selectMentionCandidate()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMentionSuggestions()
      return
    }
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

async function refreshRuntimeStatus() {
  try {
    const response = await fetch('/api/group-chat/status')
    const data = await response.json()
    runtimeStatus.value = data.status
  } catch (err) {
    console.warn('[GroupChat] Runtime status failed:', err)
    runtimeStatus.value = {
      healthy: false,
      running: 0,
      queued: 0,
      completedToday: 0,
      recentRuns: [],
    }
  }
}

function upsertActiveRun(runId?: string | null) {
  if (!runId) return
  if (!activeRunIds.value.includes(runId)) {
    activeRunIds.value = [...activeRunIds.value, runId]
  }
}

function removeActiveRun(runId?: string | null) {
  if (!runId) return
  activeRunIds.value = activeRunIds.value.filter(id => id !== runId)
}

function setAgentRunState(agentId?: string | null, state = 'ready') {
  if (!agentId) return
  agentRunStates.value = {
    ...agentRunStates.value,
    [agentId]: state,
  }
}

function setupRuntimeEventStream() {
  groupEventSource?.close()
  groupEventSource = new EventSource('/api/group-chat/events/stream')
  groupEventSource.onopen = () => {
    streamConnected.value = true
  }
  groupEventSource.onerror = () => {
    streamConnected.value = false
  }
  groupEventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      if (payload.type === 'connected' || payload.type === 'ping') return
      const agentId = payload.agentId
      const runId = payload.runId || ''
      if (runId) upsertActiveRun(runId)

      if (payload.type === 'group.agent.delta') {
        if (!agentId || !payload.message) return
        const next = `${runBuffers.value[runId] || ''}${payload.message}`
        runBuffers.value = { ...runBuffers.value, [runId]: next }
        groupStore.updateAgentReply(agentId, next, runId)
        scrollToBottom()
      } else if (payload.type === 'group.agent.snapshot') {
        if (!agentId || !payload.message) return
        runBuffers.value = { ...runBuffers.value, [runId]: payload.message }
        groupStore.updateAgentReply(agentId, payload.message, runId)
        scrollToBottom()
      } else if (payload.type === 'group.run.queued' || payload.type === 'group.run.started') {
        setAgentRunState(agentId, payload.type === 'group.run.queued' ? 'queued' : 'running')
      } else if (payload.type === 'group.run.completed') {
        removeActiveRun(runId)
        setAgentRunState(agentId, 'recent')
        refreshRuntimeStatus()
      } else if (payload.type === 'group.run.failed' || payload.type === 'group.run.cancelled') {
        removeActiveRun(runId)
        setAgentRunState(agentId, payload.type === 'group.run.failed' ? 'failed' : 'stopped')
        refreshRuntimeStatus()
      }
    } catch (err) {
      console.warn('[GroupChat] Failed to parse runtime event:', err)
    }
  }
  return () => {
    groupEventSource?.close()
    groupEventSource = null
    streamConnected.value = false
  }
}

const setupAgentStatusWatcher = () => {
  return watch(
    () => participatingAgents.value,
    (agents) => {
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

const handleSend = async () => {
  if (!inputContent.value.trim()) return

  const content = inputContent.value.trim()
  const { mentions, invalidMentions, offlineAgents } = groupStore.handleUserMessage(content)
  fetch('/api/group-chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, sender: 'user', senderId: 'user', senderName: '我' }),
  }).catch(() => null)
  if (invalidMentions.length > 0 || offlineAgents.length > 0) {
    console.warn('[GroupChat] ignored mentions', { invalidMentions, offlineAgents })
  }

  for (const agentId of mentions) {
    const agentState = multiAgentStore.agents[agentId]
    if (!agentState) continue

    try {
      const response = await fetch(`/api/group-chat/agents/${encodeURIComponent(agentId)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.replace(/@[^\s]+/g, '').trim(),
          roomId: groupConfig.value.id,
        })
      })

      const data = await response.json()

      if (data.success) {
        upsertActiveRun(data.run?.id)
        setAgentRunState(agentId, 'queued')
      } else {
        console.error(`[GroupChat] Failed to queue message for ${agentId}:`, data.error)
        ElMessage.error(`${agentState.config.displayName} 入队失败：${data.error || '未知错误'}`)
      }
    } catch (err) {
      console.error(`[GroupChat] Send message error to ${agentId}:`, err)
      ElMessage.error(`${agentState.config.displayName} 入队失败`)
    }
  }

  inputContent.value = ''
  nextTick(() => {
    scrollToBottom()
    inputRef.value?.focus()
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function loadServerMessages() {
  try {
    const response = await fetch(`/api/group-chat/messages?roomId=${encodeURIComponent(groupConfig.value.id)}&limit=120`)
    const data = await response.json()
    if (data.success && Array.isArray(data.messages)) {
      const normalized = data.messages.map((message: any) => ({
        id: String(message.id),
        content: String(message.content || ''),
        sender: message.sender === 'agent' || message.sender === 'system' ? message.sender : 'user',
        senderId: message.senderId,
        senderName: message.senderName || (message.sender === 'agent' ? getAgentName(message.senderId || '') : '我'),
        senderAvatar: message.sender === 'agent'
          ? participatingAgents.value.find(agent => agent.id === message.senderId)?.avatar
          : undefined,
        timestamp: Number(message.timestamp || Date.now()),
        runId: message.runId,
      })).filter((message: any) => !(message.sender === 'system' && noisySystemMessagePattern.test(message.content)))
      if (normalized.length > 0) {
        groupStore.setMessages(normalized)
      }
    }
  } catch (err) {
    console.warn('[GroupChat] Load server messages failed:', err)
  }
}

const confirmClearHistory = () => {
  ElMessageBox.confirm('清除当前群聊的历史消息、压缩记忆和成员会话？运行中的回复也会被停止。', '清除历史会话', {
    confirmButtonText: '清除历史',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await handleDisconnectAll()
    groupStore.clearMessages()
    runBuffers.value = {}
    agentRunStates.value = {}
    await fetch(`/api/group-chat/messages?roomId=${encodeURIComponent(groupConfig.value.id)}`, { method: 'DELETE' }).catch(() => null)
    await refreshRuntimeStatus()
    ElMessage.success('历史会话已清除')
  }).catch(() => {})
}

const handleConnectAll = () => {
  refreshRuntimeStatus()
  ElMessage.success('Claude Runtime 状态已刷新')
}

const handleDisconnectAll = async () => {
  const runIds = activeGroupRunIds.value
  if (!runIds.length) return
  await Promise.all(runIds.map(runId =>
    fetch(`/api/group-chat/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }).catch(() => null)
  ))
  activeRunIds.value = []
  agentRunStates.value = Object.fromEntries(Object.keys(agentRunStates.value).map(agentId => [agentId, 'stopped']))
  await refreshRuntimeStatus()
  ElMessage.success('已请求停止正在生成的回复')
}

let prevLength = 0
const checkScroll = setInterval(() => {
  if (messages.value.length !== prevLength) {
    scrollToBottom()
    prevLength = messages.value.length
  }
}, 500)

const stopAgentWatch = setupAgentStatusWatcher()
let cleanupRuntimeStream: (() => void) | null = null

onMounted(() => {
  groupStore.loadMessages()
  loadServerMessages()
  refreshRuntimeStatus()
  cleanupRuntimeStream = setupRuntimeEventStream()
  scrollToBottom()
  inputRef.value?.focus()
})

onUnmounted(() => {
  clearInterval(checkScroll)
  stopAgentWatch()
  cleanupRuntimeStream?.()
})
</script>

<style scoped>
.command-room {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 332px) minmax(0, 1fr);
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 34%),
    radial-gradient(circle at bottom right, color-mix(in oklab, var(--color-secondary) 12%, transparent), transparent 30%),
    var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 28px;
  overflow: hidden;
}

.command-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 20px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-panel) 88%, transparent), color-mix(in oklab, var(--bg-base) 96%, transparent));
  border-right: 1px solid var(--border-default);
}

.command-sidebar__hero {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.hero-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: color-mix(in oklab, var(--color-primary) 18%, var(--bg-card));
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 24%, transparent);
}

.hero-copy {
  display: grid;
  gap: 6px;
}

.hero-kicker,
.panel-kicker,
.stage-kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.hero-title,
.panel-heading h2,
.composer-head h3 {
  margin: 0;
  color: var(--text-primary);
}

.hero-title {
  font-size: 1.7rem;
  line-height: 1.1;
}

.hero-desc {
  margin: 0;
  max-width: 26ch;
  color: var(--text-secondary);
  line-height: 1.6;
}

.hero-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-card) 84%, var(--bg-base));
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.status-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill--online {
  color: var(--color-success);
}

.status-pill--partial {
  color: var(--color-warning);
}

.status-pill--offline {
  color: var(--color-error);
}

.hero-updated {
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.conversation-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.conversation-summary article {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  background: color-mix(in oklab, var(--bg-card) 88%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.conversation-summary span,
.panel-count,
.draft-counter {
  color: var(--text-secondary);
}

.conversation-summary span {
  font-size: 0.8rem;
}

.conversation-summary strong {
  color: var(--text-primary);
  font-size: 1.25rem;
  line-height: 1;
}

.command-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.control-btn {
  height: 42px;
  border: 0;
  border-radius: 14px;
  background: color-mix(in oklab, var(--bg-card) 92%, transparent);
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.control-btn--solid {
  background: color-mix(in oklab, var(--color-primary) 20%, var(--bg-card));
}

.control-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.roster-panel,
.composer-shell,
.stream-shell {
  min-height: 0;
  border-radius: 24px;
  background: color-mix(in oklab, var(--bg-panel) 92%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.roster-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-heading,
.composer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
}

.roster-list {
  display: grid;
  gap: 10px;
  padding: 0 12px 12px;
  overflow-y: auto;
}

.roster-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 0;
  border-radius: 16px;
  background: color-mix(in oklab, var(--bg-base) 74%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--border-default) 88%, transparent);
  text-align: left;
}

.roster-item__avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in oklab, var(--color-primary) 16%, var(--bg-card));
  color: var(--text-primary);
}

.roster-item__body {
  display: grid;
  gap: 2px;
}

.roster-item__body strong {
  color: var(--text-primary);
}

.roster-item__body span,
.roster-item__status {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.roster-item__status.is-online {
  color: var(--color-success);
}

.roster-item__status.is-ready {
  color: var(--color-primary);
}

.roster-item__status.is-pending {
  color: var(--color-warning);
}

.roster-item__status.is-offline {
  color: var(--color-error);
}

.command-stage {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 22px;
  gap: 16px;
}

.stage-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 4px 2px 0;
}

.stage-header__copy {
  display: grid;
  gap: 6px;
}

.stage-header__copy h2 {
  margin: 0;
  max-width: 40ch;
  color: var(--text-primary);
  font-size: 1.45rem;
  line-height: 1.3;
}

.stage-header__meta {
  display: flex;
  gap: 10px;
}

.meta-badge {
  min-width: 90px;
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--bg-card) 86%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.meta-badge span {
  color: var(--text-secondary);
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.meta-badge strong {
  color: var(--text-primary);
  font-size: 1.2rem;
}

.chat-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stream-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stream-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  box-shadow: inset 0 -1px 0 var(--border-default);
}

.stream-toolbar__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-weight: 600;
}

.toolbar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
}

.stream-toolbar__hint {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state {
  flex: 1;
  min-height: 280px;
  display: grid;
  place-items: center;
  gap: 18px;
  text-align: center;
}

.empty-orbit {
  width: 160px;
  height: 160px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, color-mix(in oklab, var(--color-primary) 18%, transparent) 0 24%, transparent 25%),
    radial-gradient(circle, color-mix(in oklab, var(--color-primary) 10%, transparent) 0 60%, transparent 61%);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 16%, transparent);
}

.empty-orbit__core {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-card) 92%, transparent);
  color: var(--text-primary);
  font-weight: 700;
}

.empty-copy {
  display: grid;
  gap: 8px;
}

.empty-copy h3,
.empty-copy p {
  margin: 0;
}

.empty-copy h3 {
  color: var(--text-primary);
}

.empty-copy p {
  max-width: 40ch;
  color: var(--text-secondary);
  line-height: 1.7;
}

.stream-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.stream-row--user {
  justify-content: flex-end;
}

.stream-row :deep(.chat-message-bubble) {
  width: 100%;
}

.stream-row :deep(.chat-message-bubble__body) {
  max-width: min(44rem, calc(100% - 52px));
}

.composer-shell {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
}

.mention-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 16px;
}

.mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-base) 74%, transparent);
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.mention-chip--offline {
  opacity: 0.55;
}

.composer-box {
  position: relative;
  display: flex;
  min-height: 0;
  flex-direction: column;
  margin: 0 18px 18px;
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in oklab, var(--bg-base) 78%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.mention-suggest-panel {
  position: absolute;
  z-index: 8;
  top: 12px;
  left: 12px;
  right: 12px;
  display: grid;
  gap: 6px;
  max-height: 270px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-panel) 96%, transparent), color-mix(in oklab, var(--bg-card) 92%, transparent));
  border: 1px solid color-mix(in oklab, var(--color-primary) 24%, var(--border-default));
  box-shadow:
    0 18px 50px color-mix(in oklab, #000 36%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 8%, transparent);
}

.mention-suggest-panel__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 6px;
  color: var(--text-tertiary);
  font-size: 0.74rem;
}

.mention-suggest-panel__head span {
  margin-right: auto;
}

.mention-suggest-panel__head kbd {
  min-width: 24px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  padding: 0 6px;
  border-radius: 6px;
  background: color-mix(in oklab, var(--bg-base) 72%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.68rem;
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.mention-suggest-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.mention-suggest-item:hover,
.mention-suggest-item.is-active {
  background: color-mix(in oklab, var(--color-primary) 16%, var(--bg-base));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-primary) 28%, transparent);
}

.mention-suggest-item__avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: color-mix(in oklab, var(--color-primary) 18%, var(--bg-card));
  color: var(--text-primary);
}

.mention-suggest-item__body {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.mention-suggest-item__body strong,
.mention-suggest-item__body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-suggest-item__body strong {
  font-size: 0.9rem;
}

.mention-suggest-item__body small,
.mention-suggest-item__state {
  color: var(--text-secondary);
  font-size: 0.74rem;
}

.mention-suggest-item__state.is-online,
.mention-suggest-item__state.is-ready {
  color: var(--color-primary);
}

.mention-suggest-item__state.is-pending {
  color: var(--color-warning);
}

.mention-suggest-item__state.is-offline {
  color: var(--color-error);
}

.message-input {
  min-height: 96px;
  max-height: 180px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  line-height: 1.7;
  resize: vertical;
}

.message-input::placeholder {
  color: var(--text-tertiary);
}

.message-input:focus {
  outline: none;
}

.composer-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding-top: 14px;
  box-shadow: inset 0 1px 0 var(--border-default);
}

.composer-footnote {
  display: grid;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.send-btn {
  min-width: 112px;
  height: 48px;
  border: 0;
  border-radius: 16px;
  background: color-mix(in oklab, var(--color-primary) 24%, var(--bg-card));
  color: var(--text-primary);
  font-weight: 700;
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

:root.light-theme .command-room {
  background:
    radial-gradient(circle at top left, oklch(0.95 0.03 250 / 0.8), transparent 34%),
    radial-gradient(circle at bottom right, oklch(0.94 0.02 30 / 0.75), transparent 30%),
    oklch(0.985 0.004 250);
}

:root.light-theme .command-sidebar,
:root.light-theme .roster-panel,
:root.light-theme .composer-shell,
:root.light-theme .stream-shell {
  background: rgba(255, 255, 255, 0.86);
}

@media (max-width: 1180px) {
  .command-room {
    grid-template-columns: 1fr;
  }

  .command-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border-default);
  }

  .stream-shell,
  .composer-shell {
    min-height: auto;
  }

  .composer-box {
    min-height: 0;
  }
}

@media (max-width: 720px) {
  .command-stage {
    padding: 14px;
  }

  .command-sidebar {
    padding: 16px;
  }

  .stage-header,
  .stream-toolbar,
  .panel-heading,
  .composer-head,
  .hero-status {
    flex-direction: column;
    align-items: flex-start;
  }

  .stage-header__meta,
  .command-actions {
    width: 100%;
  }

  .command-actions,
  .conversation-summary {
    grid-template-columns: 1fr;
  }

  .messages-container {
    padding: 16px;
  }

  .composer-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .send-btn {
    width: 100%;
  }

  .composer-box,
  .mention-strip {
    margin-left: 14px;
    margin-right: 14px;
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
