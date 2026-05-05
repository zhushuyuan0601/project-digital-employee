<template>
  <div class="command-room">
    <aside class="command-sidebar">
      <div class="command-sidebar__hero">
        <div class="hero-mark">群</div>
        <div class="hero-copy">
          <p class="hero-kicker">联合态势频道</p>
          <h1 class="hero-title">{{ groupConfig.name }}</h1>
          <p class="hero-desc">{{ groupConfig.description }}</p>
        </div>
      </div>

      <div class="hero-status">
        <span class="status-pill" :class="allConnected ? 'status-pill--online' : anyConnected ? 'status-pill--partial' : 'status-pill--offline'">
          <span class="status-pill__dot"></span>
          {{ allConnected ? 'READY' : anyConnected ? '运行中' : '等待 Runtime' }}
        </span>
        <span class="hero-updated">{{ latestActivityText }}</span>
      </div>

      <div class="metrics-grid">
        <article class="metric-card">
          <span class="metric-label">READY</span>
          <strong class="metric-value">{{ readyAgentCount }}</strong>
          <span class="metric-hint">可接收 @ 指令</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">活跃运行</span>
          <strong class="metric-value">{{ runtimeStatus?.running || 0 }}</strong>
          <span class="metric-hint">Claude Runtime running</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">队列等待</span>
          <strong class="metric-value">{{ runtimeStatus?.queued || 0 }}</strong>
          <span class="metric-hint">等待执行</span>
        </article>
        <article class="metric-card">
          <span class="metric-label">今日完成</span>
          <strong class="metric-value">{{ runtimeStatus?.completedToday || 0 }}</strong>
          <span class="metric-hint">报告型 run</span>
        </article>
      </div>

      <div class="command-actions">
        <button class="control-btn control-btn--solid" @click="handleConnectAll">
          刷新状态
        </button>
        <button class="control-btn" @click="handleDisconnectAll" :disabled="activeGroupRunIds.length === 0">
          停止运行
        </button>
        <button class="control-btn" @click="confirmClear">
          清屏
        </button>
      </div>

      <section class="roster-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">作战成员</p>
            <h2>协同编组</h2>
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
          <p class="stage-kicker">实时群控面板</p>
          <h2>面向任务分派、回执追踪与多 Agent 会商的主频道</h2>
        </div>
        <div class="stage-header__meta">
          <div class="meta-badge">
            <span>消息流</span>
            <strong>{{ messages.length }}</strong>
          </div>
          <div class="meta-badge">
            <span>运行</span>
            <strong>{{ runtimeStatus?.running || 0 }}</strong>
          </div>
        </div>
      </header>

      <div class="stage-body">
        <div class="stream-shell">
          <div class="stream-toolbar">
            <div class="stream-toolbar__title">
              <span class="toolbar-dot"></span>
              指挥席广播流
            </div>
            <div class="stream-toolbar__hint">
              对成员使用 `@姓名` 可定向下达指令
            </div>
          </div>

          <div class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-orbit">
                <span class="empty-orbit__core">作战待命</span>
              </div>
              <div class="empty-copy">
                <h3>频道已建立，等待第一条指令</h3>
                <p>在下方输入框中直接输入，或点击左侧成员卡片快速插入 `@成员名`。</p>
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
              <button
                v-if="message.sender === 'user'"
                type="button"
                class="message-task-btn"
                @click="createTaskFromMessage(message.content)"
              >
                <i class="ri-node-tree"></i>
                转任务
              </button>
            </div>
          </div>
        </div>

        <div class="composer-shell">
          <div class="composer-head">
            <div>
              <p class="panel-kicker">快速派发</p>
              <h3>指挥输入台</h3>
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
            <textarea
              v-model="inputContent"
              class="message-input"
              placeholder="输入群指令，使用 @ 成员名 定向派发。Enter 发送，Shift+Enter 换行。"
              @keydown.enter.exact.prevent="handleSend"
              rows="6"
              ref="inputRef"
            ></textarea>

            <div class="composer-footer">
              <div class="composer-footnote">
                <span>广播消息会保存在本地会话。</span>
                <span>Agent 回复会通过 Claude Runtime 事件流回写频道。</span>
              </div>
              <button
                class="draft-task-btn"
                type="button"
                :disabled="sendDisabled"
                @click="createTaskFromMessage(inputContent)"
              >
                转为任务
              </button>
              <button
                class="send-btn"
                @click="handleSend"
                :disabled="sendDisabled"
              >
                下达指令
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
import { useRouter } from 'vue-router'
import { useGroupChatStore } from '@/stores/groupChat'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { ElMessage, ElMessageBox } from 'element-plus'
import { extractText } from '@/utils/gateway-protocol'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble.vue'
import { useChatFormatting } from '@/composables/useChatFormatting'
import { useTasksStore } from '@/stores/tasks'
import { taskApi } from '@/api/tasks'

const groupStore = useGroupChatStore()
const multiAgentStore = useMultiAgentChatStore()
const tasksStore = useTasksStore()
const router = useRouter()
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
  if (state === 'recent') return '最近完成，可继续 @ 下达指令'
  if (state === 'failed') return '最近运行失败，可重新下达'
  if (state === 'stopped') return '运行已停止，可重新下达'
  return '可直接 @ 下达指令'
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

const createTaskFromMessage = async (content: string) => {
  const description = content.trim()
  if (!description) return
  const plainTitle = description.replace(/@\S+/g, '').trim().slice(0, 32) || '群聊协作任务'
  try {
    const response = await tasksStore.createTask({
      title: plainTitle,
      description,
      priority: 'normal',
    })
    ElMessage.success('已从群聊创建任务')
    router.push({ path: '/task-center-2', query: { task: response.task.id } })
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建任务失败')
  }
}

async function refreshRuntimeStatus() {
  try {
    const response = await taskApi.runtimeStatus()
    runtimeStatus.value = response.status
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
        groupStore.updateAgentReply(agentId, next)
        scrollToBottom()
      } else if (payload.type === 'group.agent.snapshot') {
        if (!agentId || !payload.message) return
        runBuffers.value = { ...runBuffers.value, [runId]: payload.message }
        groupStore.updateAgentReply(agentId, payload.message)
        scrollToBottom()
      } else if (payload.type === 'group.run.queued' || payload.type === 'group.run.started') {
        setAgentRunState(agentId, payload.type === 'group.run.queued' ? 'queued' : 'running')
        groupStore.addSystemMessage(payload.message || 'Claude Runtime 状态更新')
      } else if (payload.type === 'group.run.completed') {
        removeActiveRun(runId)
        setAgentRunState(agentId, 'recent')
        groupStore.addSystemMessage(`${payload.message || '报告已生成'}，可前往任务指挥中心查看：${payload.taskId || ''}`)
        refreshRuntimeStatus()
      } else if (payload.type === 'group.run.failed' || payload.type === 'group.run.cancelled') {
        removeActiveRun(runId)
        setAgentRunState(agentId, payload.type === 'group.run.failed' ? 'failed' : 'stopped')
        groupStore.addSystemMessage(payload.message || 'Claude Runtime 运行结束')
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

const setupMessageListener = () => {
  const listener = (agentId: string, event: string, payload: any) => {
    if (event === 'agent') {
      const stream = payload?.stream
      if (stream === 'assistant') {
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

const handleSend = async () => {
  if (!inputContent.value.trim()) return

  const content = inputContent.value.trim()
  const { mentions, invalidMentions, offlineAgents } = groupStore.handleUserMessage(content)
  fetch('/api/group-chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, sender: 'user' }),
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
        })
      })

      const data = await response.json()

      if (data.success) {
        upsertActiveRun(data.run?.id)
        setAgentRunState(agentId, 'queued')
        multiAgentStore.agents[agentId]?.messages.push({
          id: `msg-${Date.now()}`,
          role: 'user',
          content: content.replace(/@[^\s]+/g, '').trim(),
          timestamp: Date.now(),
          agentId
        })
        groupStore.addSystemMessage(`${agentState.config.displayName} 已进入 Claude Runtime 队列，可在任务指挥中心查看：${data.task?.id || ''}`)
      } else {
        console.error(`[GroupChat] Failed to queue message for ${agentId}:`, data.error)
        groupStore.addSystemMessage(`${agentState.config.displayName} 入队失败：${data.error || '未知错误'}`)
      }
    } catch (err) {
      console.error(`[GroupChat] Send message error to ${agentId}:`, err)
      groupStore.addSystemMessage(`${agentState.config.displayName} 入队失败`)
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

const confirmClear = () => {
  ElMessageBox.confirm('清空群聊消息记录？', '确认', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    groupStore.clearMessages()
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
  ElMessage.success('已请求停止群聊运行任务')
}

let prevLength = 0
const checkScroll = setInterval(() => {
  if (messages.value.length !== prevLength) {
    scrollToBottom()
    prevLength = messages.value.length
  }
}, 500)

const stopAgentWatch = setupAgentStatusWatcher()
const cleanupListener = setupMessageListener()
let cleanupRuntimeStream: (() => void) | null = null

onMounted(() => {
  groupStore.loadMessages()
  refreshRuntimeStatus()
  cleanupRuntimeStream = setupRuntimeEventStream()
  scrollToBottom()
  inputRef.value?.focus()
})

onUnmounted(() => {
  clearInterval(checkScroll)
  stopAgentWatch()
  cleanupListener()
  cleanupRuntimeStream?.()
})
</script>

<style scoped>
.command-room {
  min-height: 100%;
  height: auto;
  display: grid;
  grid-template-columns: minmax(280px, 332px) minmax(0, 1fr);
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 34%),
    radial-gradient(circle at bottom right, color-mix(in oklab, var(--color-secondary) 12%, transparent), transparent 30%),
    var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 28px;
  overflow: visible;
}

.command-sidebar {
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

.metrics-grid {
  display: grid;
  gap: 10px;
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--bg-card) 88%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.metric-label,
.metric-hint,
.panel-count,
.draft-counter {
  color: var(--text-secondary);
}

.metric-label,
.metric-hint {
  font-size: 0.8rem;
}

.metric-value {
  color: var(--text-primary);
  font-size: 1.55rem;
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

.stage-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 16px;
}

.stream-shell {
  min-height: 620px;
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
  min-height: 420px;
  display: grid;
  place-items: center;
  gap: 18px;
  text-align: center;
}

.empty-orbit {
  width: 220px;
  height: 220px;
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
  width: 110px;
  height: 110px;
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

.message-task-btn,
.draft-task-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
}

.message-task-btn {
  min-height: 30px;
  padding: 0 9px;
  margin-top: 20px;
  font-size: 12px;
}

.draft-task-btn {
  width: 100%;
  height: 40px;
  font-weight: 700;
}

.message-task-btn:hover,
.draft-task-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.draft-task-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.composer-shell {
  display: flex;
  flex-direction: column;
  min-height: 620px;
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
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  margin: 0 18px 18px;
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in oklab, var(--bg-base) 78%, transparent);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.message-input {
  flex: 1;
  min-height: 240px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  line-height: 1.7;
  resize: none;
}

.message-input::placeholder {
  color: var(--text-tertiary);
}

.message-input:focus {
  outline: none;
}

.composer-footer {
  display: grid;
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
  width: 100%;
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
    min-height: auto;
    height: auto;
  }

  .command-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border-default);
  }

  .stage-body {
    grid-template-columns: 1fr;
  }

  .stream-shell,
  .composer-shell {
    min-height: auto;
  }

  .composer-box {
    min-height: 280px;
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
    grid-template-columns: 1fr;
  }

  .messages-container {
    padding: 16px;
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
