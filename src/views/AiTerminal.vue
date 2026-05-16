<template>
  <div class="ai-chat-page">
    <aside class="session-sidebar">
      <div class="session-sidebar__header">
        <div>
          <strong>历史会话</strong>
          <span>{{ tuiSessions.length }} sessions</span>
        </div>
        <button type="button" class="sidebar-icon-btn" title="刷新历史会话" @click="loadTuiSessions">
          <el-icon><Refresh /></el-icon>
        </button>
      </div>

      <button type="button" class="sidebar-new-btn" @click="() => createNewTuiSession()">
        <el-icon><Plus /></el-icon>
        <span>新建会话</span>
      </button>

      <section class="history-list">
        <button
          v-for="session in tuiSessions"
          :key="session.id"
          type="button"
          class="history-item"
          :class="{ active: activeTuiSession?.id === session.id }"
          @click="attachTuiSession(session)"
        >
          <span :class="['history-engine', `history-engine--${session.engine}`]">{{ session.engine }}</span>
          <strong>{{ session.title }}</strong>
          <small>{{ session.cwd }}</small>
          <em>{{ session.status }} · {{ session.clients }} clients · {{ formatSessionTime(session.lastEventAt) }}</em>
        </button>

        <div v-if="tuiSessions.length === 0" class="history-empty">
          暂无历史会话
        </div>
      </section>
    </aside>

    <main class="chat-main">
      <header class="top-nav">
        <div class="terminal-brand">
          <div class="brand-mark">
            <el-icon><Monitor /></el-icon>
          </div>
          <div>
            <strong>AI Command Terminal</strong>
            <span>{{ activeTuiSession ? `${activeTuiSession.engine} · ${activeTuiSession.status}` : '新 TUI 会话' }}</span>
          </div>
        </div>

        <div class="terminal-controls">
          <label class="control-field control-field--engine">
            <span>引擎</span>
            <select v-model="engineDraft" autocomplete="off" @change="handleEngineChange">
              <option value="codex">Codex</option>
              <option value="claude">Claude</option>
            </select>
          </label>

          <label class="control-field control-field--cwd">
            <span>工作目录</span>
            <input
              v-model="cwdDraft"
              name="ai-terminal-cwd"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              placeholder="/Users/lh/git/project-digital-employee"
              @input="handleWorkspaceInput"
            />
          </label>
        </div>

        <div class="top-actions">
          <button type="button" class="new-inline-btn" @click="restartTui">
            重连 TUI
          </button>
          <span :class="['status-badge', statusText]">{{ statusText }}</span>
          <button type="button" class="new-inline-btn" @click="() => createNewTuiSession()">
            <el-icon><Plus /></el-icon>
            新建会话
          </button>
          <button type="button" class="icon-action" :disabled="!activeTuiSession || activeTuiSession.status !== 'running'" @click="killActiveTuiSession">
            <el-icon><Close /></el-icon>
          </button>
          <button type="button" class="icon-action" :disabled="!activeTuiSession" @click="deleteActiveTuiSession">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </header>

      <section class="tui-area">
        <div class="tui-toolbar">
          <span :class="['tui-status', { connected: tuiConnected }]"></span>
          <strong>{{ activeTuiSession?.engine || engineDraft }} TUI</strong>
          <small>{{ activeTuiSession?.cwd || cwdDraft }}</small>
        </div>
        <div ref="tuiRef" class="tui-screen"></div>
      </section>
      <section v-if="false" ref="screenRef" class="chat-area">
        <div v-if="displayItems.length === 0" class="empty-chat">
          <div class="empty-orb">
            <el-icon><Cpu /></el-icon>
          </div>
          <h2>开始一个 AI 命令会话</h2>
          <p>输入 prompt 进入连续上下文；输入 / 查看当前引擎可用命令。</p>
        </div>

        <div class="message-container">
          <template
            v-for="item in displayItems"
            :key="item.id"
          >
            <article
              v-if="item.kind === 'tool'"
              class="tool-event"
            >
              <span class="tool-event__icon">
                <el-icon><Tools /></el-icon>
              </span>
              <span>{{ toolCategoryText(displayToolName(item)) }}</span>
              <strong>{{ displayToolName(item) }}</strong>
              <em v-if="displayToolCount(item) > 1">x{{ displayToolCount(item) }}</em>
              <small>{{ formatEventTime(displayTimestamp(item)) }}</small>
            </article>

            <article
              v-else
              class="message"
              :class="messageClass(displayEvent(item))"
            >
              <div class="message-avatar">{{ avatarText(displayEvent(item)) }}</div>
              <div class="message-content">
                <pre>{{ displayEvent(item).text }}</pre>
              </div>
            </article>
          </template>

          <div v-if="activeSession?.status === 'running'" class="message ai">
            <div class="message-avatar">AI</div>
            <div class="message-content thinking">
              <span>正在运行</span>
              <i></i>
            </div>
          </div>
        </div>
      </section>

      <footer v-if="false" class="input-container">
        <form
          class="input-box"
          autocomplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          @submit.prevent="sendPrompt"
        >
          <div
            v-if="showCommandMenu"
            class="slash-menu"
          >
            <button
              v-for="command in filteredSlashCommands"
              :key="command.id"
              type="button"
              :class="{ selected: filteredSlashCommands[slashSelection]?.id === command.id }"
              @mousedown.prevent="applySlashCommand(command.command)"
            >
              <span :class="['slash-source', `slash-source--${command.source}`]">{{ command.source }}</span>
              <strong>{{ command.command }}</strong>
              <small>{{ command.description }}</small>
            </button>
            <div v-if="filteredSlashCommands.length === 0" class="slash-empty">没有匹配命令</div>
          </div>

          <textarea
            ref="inputRef"
            v-model="promptDraft"
            :disabled="sending || activeSession?.status === 'running'"
            rows="1"
            name="ai-terminal-prompt"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            inputmode="text"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            placeholder="Message AI Command..."
            @keydown.enter.exact.prevent="sendPrompt"
            @keydown.down.prevent="moveSlashSelection(1)"
            @keydown.up.prevent="moveSlashSelection(-1)"
            @keydown.escape.prevent="hideSlashMenu"
            @focus="composerFocused = true"
            @blur="handleComposerBlur"
          ></textarea>

          <div class="input-actions">
            <div class="left-actions">
              <button type="button" class="action-btn" title="Slash commands" @click="promptDraft = '/'">
                <el-icon><Operation /></el-icon>
              </button>
              <button type="button" class="action-btn" title="Status" @click="runLocalStatusCommand">
                <el-icon><DataLine /></el-icon>
              </button>
            </div>
            <button type="submit" class="send-btn" :disabled="sendDisabled">
              <el-icon><Position /></el-icon>
            </button>
          </div>
        </form>
        <div class="footer-note">上下文会保留到 clear；/status 可查看当前会话。</div>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  Close,
  Cpu,
  DataLine,
  Delete,
  Monitor,
  Operation,
  Plus,
  Position,
  Refresh,
  Tools,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  terminalApi,
  type TerminalEngine,
  type TerminalEvent,
  type TerminalSession,
  type TerminalSlashCommand,
  type TerminalTuiSession,
} from '@/api/terminal'

const engineDraft = ref<TerminalEngine>('codex')
const cwdDraft = ref('')
const terminalMode = ref<'chat' | 'tui'>('tui')
const promptDraft = ref('')
const sending = ref(false)
const composerFocused = ref(false)
const slashCommands = ref<TerminalSlashCommand[]>([])
const slashSelection = ref(0)
const sessions = ref<TerminalSession[]>([])
const tuiSessions = ref<TerminalTuiSession[]>([])
const activeSession = ref<TerminalSession | null>(null)
const activeTuiSession = ref<TerminalTuiSession | null>(null)
const events = ref<TerminalEvent[]>([])
const screenRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const tuiRef = ref<HTMLElement | null>(null)
const tuiConnected = ref(false)
let eventSource: EventSource | null = null
let tuiSocket: WebSocket | null = null
let tuiTerminal: Terminal | null = null
let tuiFitAddon: FitAddon | null = null

type TerminalDisplayItem =
  | { kind: 'event'; id: string; event: TerminalEvent }
  | { kind: 'tool'; id: string; toolName: string; count: number; timestamp: number }

const visibleEvents = computed(() =>
  events.value.filter((event) =>
    event.type !== 'ping' &&
    event.type !== 'connected' &&
    event.type !== 'turn:start' &&
    event.text
  )
)

const displayItems = computed<TerminalDisplayItem[]>(() => {
  const items: TerminalDisplayItem[] = []
  for (const event of visibleEvents.value) {
    if (event.type === 'tool') {
      const toolName = normalizeToolName(event.text || 'tool')
      const previous = items.at(-1)
      if (previous?.kind === 'tool' && previous.toolName === toolName) {
        previous.count += 1
        previous.timestamp = event.timestamp
        previous.id = `${previous.id}-${event.id || event.timestamp}`
        continue
      }
      items.push({
        kind: 'tool',
        id: event.id || `tool-${event.timestamp}`,
        toolName,
        count: 1,
        timestamp: event.timestamp,
      })
      continue
    }

    if (event.type === 'turn:end' && event.status === 'completed') continue

    const previous = items.at(-1)
    if (
      previous?.kind === 'event' &&
      previous.event.type === 'data' &&
      event.type === 'data' &&
      previous.event.stream === event.stream &&
      previous.event.turnId === event.turnId
    ) {
      previous.event = {
        ...previous.event,
        text: `${previous.event.text || ''}${event.text || ''}`,
        timestamp: event.timestamp,
      }
      previous.id = `${previous.id}-${event.id || event.timestamp}`
      continue
    }

    items.push({
      kind: 'event',
      id: event.id || `${event.type}-${event.timestamp}`,
      event,
    })
  }
  return items
})

const sendDisabled = computed(() => sending.value || !promptDraft.value.trim() || activeSession.value?.status === 'running')
const showCommandMenu = computed(() => composerFocused.value && promptDraft.value.trimStart().startsWith('/'))
const slashQuery = computed(() => promptDraft.value.trimStart().slice(1).toLowerCase())
const filteredSlashCommands = computed(() => {
  const query = slashQuery.value
  const allowedSource = activeSession.value?.engine || engineDraft.value
  const commands = slashCommands.value.filter((command) =>
    command.source === 'terminal' || command.source === allowedSource
  )
  if (!query) return commands.slice(0, 18)
  return commands
    .filter((command) => `${command.command} ${command.description} ${command.source}`.toLowerCase().includes(query))
    .slice(0, 18)
})
const statusText = computed(() => {
  if (terminalMode.value === 'tui') return tuiConnected.value ? 'tui' : 'offline'
  const status = activeSession.value?.status || 'idle'
  return {
    idle: 'ready',
    running: 'running',
    failed: 'failed',
    cancelled: 'cancelled',
  }[status] || status
})

function messageClass(event: TerminalEvent) {
  if (event.type === 'prompt') return 'user'
  if (event.stream === 'stderr') return 'system danger'
  if (event.stream === 'system') return 'system'
  return 'ai'
}

function avatarText(event: TerminalEvent) {
  if (event.type === 'prompt') return 'U'
  if (event.stream === 'system') return '$'
  return (activeSession.value?.engine || engineDraft.value).slice(0, 2).toUpperCase()
}

function normalizeToolName(text = '') {
  return text.replace(/^tool:\s*/i, '').trim() || 'tool'
}

function toolCategoryText(toolName = '') {
  if (/command|bash|shell|exec/i.test(toolName)) return '命令'
  if (/read|file|ls|glob|grep/i.test(toolName)) return '读取'
  if (/write|edit|patch/i.test(toolName)) return '写入'
  if (/web|search|fetch/i.test(toolName)) return '联网'
  return '工具'
}

function formatEventTime(timestamp?: number) {
  if (!timestamp) return '--:--:--'
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

function formatSessionTime(value?: string) {
  if (!value) return '--:--'
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function displayToolName(item: TerminalDisplayItem) {
  return item.kind === 'tool' ? item.toolName : ''
}

function displayToolCount(item: TerminalDisplayItem) {
  return item.kind === 'tool' ? item.count : 0
}

function displayTimestamp(item: TerminalDisplayItem) {
  return item.kind === 'tool' ? item.timestamp : item.event.timestamp
}

function displayEvent(item: TerminalDisplayItem) {
  if (item.kind === 'event') return item.event
  return {
    sessionId: activeSession.value?.id || '',
    type: 'system',
    stream: 'system',
    text: '',
    timestamp: item.timestamp,
  } satisfies TerminalEvent
}

function closeStream() {
  eventSource?.close()
  eventSource = null
}

function closeTui() {
  tuiConnected.value = false
  tuiSocket?.close()
  tuiSocket = null
  tuiTerminal?.dispose()
  tuiTerminal = null
  tuiFitAddon = null
}

function isMissingTuiSessionError(err: unknown) {
  return err instanceof Error && /TUI session not found/i.test(err.message)
}

async function createTuiAttachTicket(): Promise<{ sessionId: string; ticket: string }> {
  const activeSession = activeTuiSession.value
  if (!activeSession) throw new Error('TUI 会话不存在')
  let sessionId = activeSession.id
  try {
    const ticket = await terminalApi.createTuiTicket(sessionId)
    return { sessionId, ticket: ticket.ticket }
  } catch (err) {
    if (!isMissingTuiSessionError(err)) throw err
    tuiSessions.value = tuiSessions.value.filter((session) => session.id !== sessionId)
    activeTuiSession.value = null
    const replacementSession = await createNewTuiSession(false)
    if (!replacementSession) throw err
    sessionId = replacementSession.id
    const ticket = await terminalApi.createTuiTicket(sessionId)
    return { sessionId, ticket: ticket.ticket }
  }
}

async function connectTui() {
  closeTui()
  await nextTick()
  if (!tuiRef.value) return
  if (!activeTuiSession.value) {
    await createNewTuiSession(false)
    if (!activeTuiSession.value) return
  }

  const terminal = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: 13,
    lineHeight: 1.35,
    theme: {
      background: '#0a0a0a',
      foreground: '#e0e0e0',
      cursor: '#93c5fd',
      selectionBackground: '#334155',
    },
  })
  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(tuiRef.value)
  fitAddon.fit()
  await nextTick()
  fitAddon.fit()
  tuiTerminal = terminal
  tuiFitAddon = fitAddon

  terminal.writeln(`connecting ${engineDraft.value} tui...`)
  const dims = terminal.cols && terminal.rows
    ? { cols: terminal.cols, rows: terminal.rows }
    : { cols: 120, rows: 36 }
  let attachTicket: Awaited<ReturnType<typeof createTuiAttachTicket>>
  try {
    attachTicket = await createTuiAttachTicket()
  } catch (err) {
    closeTui()
    throw err
  }
  const socket = new WebSocket(terminalApi.buildTuiAttachWebSocketUrl({
    sessionId: attachTicket.sessionId,
    ticket: attachTicket.ticket,
    cols: dims.cols,
    rows: dims.rows,
  }))
  tuiSocket = socket

  terminal.onData((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }))
    }
  })

  socket.addEventListener('open', () => {
    tuiConnected.value = true
    fitAddon.fit()
    socket.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }))
    window.setTimeout(resizeTui, 120)
  })

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(String(event.data))
      if (message.type === 'ready' && message.session) {
        activeTuiSession.value = message.session
        engineDraft.value = message.session.engine
        cwdDraft.value = message.session.cwd
        loadTuiSessions()
      }
      if (message.type === 'data') terminal.write(String(message.data || ''))
      if (message.type === 'error') terminal.writeln(`\r\n[error] ${message.error}`)
      if (message.type === 'exit') {
        terminal.writeln(`\r\n[process exited: ${message.exitCode ?? ''}]`)
        if (activeTuiSession.value?.id === message.sessionId) {
          activeTuiSession.value = null
        }
        loadTuiSessions()
      }
    } catch {
      terminal.write(String(event.data || ''))
    }
  })

  socket.addEventListener('close', () => {
    tuiConnected.value = false
  })

  socket.addEventListener('error', () => {
    tuiConnected.value = false
    terminal.writeln('\r\n[websocket error]')
  })
}

function resizeTui() {
  tuiFitAddon?.fit()
  if (tuiTerminal && tuiSocket?.readyState === WebSocket.OPEN) {
    tuiSocket.send(JSON.stringify({ type: 'resize', cols: tuiTerminal.cols, rows: tuiTerminal.rows }))
  }
}

function restartTui() {
  connectTui().catch((err) => {
    ElMessage.error(err instanceof Error ? err.message : 'TUI 连接失败')
  })
}

async function scrollToBottom() {
  await nextTick()
  if (!screenRef.value) return
  screenRef.value.scrollTop = screenRef.value.scrollHeight
}

function mergeEvent(event: TerminalEvent) {
  if (event.type === 'ping' || event.type === 'connected') return
  if (event.id && events.value.some((item) => item.id === event.id)) return
  events.value = [...events.value, event]
  if (event.type === 'turn:end' && activeSession.value) {
    activeSession.value = {
      ...activeSession.value,
      status: event.status === 'completed' ? 'idle' : 'failed',
      activeTurnId: null,
      lastEventAt: event.createdAt || new Date().toISOString(),
    }
    loadSessions()
  }
  scrollToBottom()
}

function subscribeSession(sessionId: string) {
  closeStream()
  eventSource = new EventSource(terminalApi.buildSessionStreamUrl(sessionId))
  eventSource.onmessage = (message) => {
    try {
      mergeEvent(JSON.parse(message.data) as TerminalEvent)
    } catch (err) {
      console.warn('[AiTerminal] stream parse failed', err)
    }
  }
}

async function loadCapabilities() {
  const response = await terminalApi.getCapabilities()
  if (!cwdDraft.value) cwdDraft.value = response.defaultCwd
  sessions.value = response.activeSessions
}

async function loadSessions() {
  const response = await terminalApi.listSessions()
  sessions.value = response.sessions
  if (activeSession.value) {
    const latest = response.sessions.find((session) => session.id === activeSession.value?.id)
    if (latest) activeSession.value = latest
  }
}

async function loadTuiSessions() {
  const response = await terminalApi.listTuiSessions()
  tuiSessions.value = response.sessions
  if (activeTuiSession.value) {
    const latest = response.sessions.find((session) => session.id === activeTuiSession.value?.id)
    if (latest) activeTuiSession.value = latest
  }
}

async function createNewTuiSession(attach = true): Promise<TerminalTuiSession | null> {
  try {
    const response = await terminalApi.createTuiSession({
      engine: engineDraft.value,
      cwd: cwdDraft.value,
      title: `${engineDraft.value}-${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
      cols: tuiTerminal?.cols || 120,
      rows: tuiTerminal?.rows || 36,
    })
    activeTuiSession.value = response.session
    engineDraft.value = response.session.engine
    cwdDraft.value = response.session.cwd
    tuiSessions.value = [response.session, ...tuiSessions.value.filter((session) => session.id !== response.session.id)]
    if (attach) await connectTui()
    return response.session
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建 TUI 会话失败')
    return null
  }
}

async function attachTuiSession(session: TerminalTuiSession) {
  activeTuiSession.value = session
  engineDraft.value = session.engine
  cwdDraft.value = session.cwd
  await connectTui()
}

async function deleteActiveTuiSession() {
  if (!activeTuiSession.value) return
  try {
    const sessionId = activeTuiSession.value.id
    await terminalApi.deleteTuiSession(sessionId)
    closeTui()
    activeTuiSession.value = null
    tuiSessions.value = tuiSessions.value.filter((session) => session.id !== sessionId)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除 TUI 会话失败')
  }
}

async function killActiveTuiSession() {
  if (!activeTuiSession.value || tuiSocket?.readyState !== WebSocket.OPEN) return
  tuiSocket.send(JSON.stringify({ type: 'kill' }))
  await loadTuiSessions()
}

async function createNewSession() {
  try {
    const response = await terminalApi.createSession({
      engine: engineDraft.value,
      cwd: cwdDraft.value,
      title: `${engineDraft.value}-${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
    })
    activeSession.value = response.session
    events.value = response.events || []
    sessions.value = [response.session, ...sessions.value.filter((session) => session.id !== response.session.id)]
    subscribeSession(response.session.id)
    await nextTick()
    inputRef.value?.focus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建会话失败')
  }
}

async function ensureSession() {
  if (activeSession.value) return activeSession.value
  await createNewSession()
  if (!activeSession.value) throw new Error('会话创建失败')
  return activeSession.value
}

function handleEngineChange() {
  if (terminalMode.value === 'tui') return
  if (activeSession.value && activeSession.value.engine !== engineDraft.value) {
    activeSession.value = null
    events.value = []
    closeStream()
  }
}

function handleWorkspaceInput() {
  if (terminalMode.value === 'tui') return
  if (activeSession.value && activeSession.value.cwd !== cwdDraft.value) {
    activeSession.value = null
    events.value = []
    closeStream()
  }
}

async function sendPrompt() {
  if (sendDisabled.value) return
  sending.value = true
  const prompt = promptDraft.value.trim()
  try {
    const selectedSlashCommand = filteredSlashCommands.value[slashSelection.value]
    const exactSlashCommand = slashCommands.value.some((command) => command.command === prompt)
    const isNativeCommand = prompt.startsWith('/codex ') || prompt.startsWith('/claude ') || prompt === '/codex' || prompt === '/claude'
    const isEngineCommand = prompt.startsWith('/engine ')
    const isKnownLocalCommand = ['/clear', '/new', '/stop', '/help', '/status'].includes(prompt) || isEngineCommand
    if (showCommandMenu.value && selectedSlashCommand && !exactSlashCommand && !isNativeCommand && !isKnownLocalCommand) {
      applySlashCommand(selectedSlashCommand.command)
      return
    }

    if (prompt === '/clear') {
      promptDraft.value = ''
      await clearActiveSession()
      return
    }
    if (prompt === '/new') {
      promptDraft.value = ''
      await createNewSession()
      return
    }
    if (prompt === '/stop') {
      promptDraft.value = ''
      await stopActiveSession()
      return
    }
    if (prompt === '/help') {
      promptDraft.value = ''
      appendLocalHelp(prompt)
      return
    }
    if (prompt === '/status') {
      promptDraft.value = ''
      appendLocalStatus(prompt)
      return
    }
    if (isBuiltinInteractiveCommand(prompt)) {
      promptDraft.value = ''
      appendLocalNotice(`${prompt} 是 ${activeSession.value?.engine || engineDraft.value} 交互内置命令；当前网页终端已提供命令提示，但该命令还没有本地对话框实现。`)
      return
    }
    if (prompt.startsWith('/engine ')) {
      const nextEngine = prompt.split(/\s+/)[1] as TerminalEngine
      if (nextEngine === 'codex' || nextEngine === 'claude') {
        engineDraft.value = nextEngine
        promptDraft.value = ''
        return
      }
    }

    const session = await ensureSession()
    promptDraft.value = ''
    const response = prompt.startsWith('/codex') || prompt.startsWith('/claude')
      ? await terminalApi.runCommand(session.id, prompt)
      : await terminalApi.sendTurn(session.id, prompt)
    activeSession.value = response.session
    await nextTick()
    inputRef.value?.focus()
  } catch (err) {
    promptDraft.value = prompt
    ElMessage.error(err instanceof Error ? err.message : '发送失败')
  } finally {
    sending.value = false
  }
}

function appendLocalHelp(commandText = '') {
  if (commandText) appendLocalPrompt(commandText)
  const allowedSource = activeSession.value?.engine || engineDraft.value
  const helpText = slashCommands.value
    .filter((command) => command.source === 'terminal' || command.source === allowedSource)
    .slice(0, 80)
    .map((command) => `${command.command.padEnd(24)} ${command.description}`)
    .join('\n')
  appendLocalNotice(helpText || '暂无命令', commandText ? `local-help-${Date.now()}` : undefined)
}

function appendLocalStatus(commandText = '') {
  if (commandText) appendLocalPrompt(commandText)
  const session = activeSession.value
  const text = session
    ? [
        `engine: ${session.engine}`,
        `status: ${session.status}`,
        `turns: ${session.turnCount}`,
        `cwd: ${session.cwd}`,
        `session: ${session.id}`,
      ].join('\n')
    : `engine: ${engineDraft.value}\nstatus: no active session\ncwd: ${cwdDraft.value}`
  appendLocalNotice(text, commandText ? `local-status-${Date.now()}` : undefined)
}

function runLocalStatusCommand() {
  appendLocalStatus('/status')
}

function appendLocalPrompt(text: string) {
  const sessionId = activeSession.value?.id || 'local'
  events.value = [
    ...events.value,
    {
      id: `local-prompt-${Date.now()}`,
      sessionId,
      type: 'prompt',
      stream: 'stdin',
      text,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    },
  ]
}

function appendLocalNotice(text: string, eventId = `local-notice-${Date.now()}`) {
  const sessionId = activeSession.value?.id || 'local'
  events.value = [
    ...events.value,
    {
      id: eventId,
      sessionId,
      type: 'system',
      stream: 'system',
      text,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    },
  ]
  scrollToBottom()
}

function isBuiltinInteractiveCommand(prompt: string) {
  const command = prompt.split(/\s+/)[0]
  const engine = activeSession.value?.engine || engineDraft.value
  return slashCommands.value.some((item) =>
    item.source === engine &&
    item.command === command &&
    !item.command.startsWith(`/${engine}`)
  )
}

function applySlashCommand(command: string) {
  promptDraft.value = command.endsWith(' ') ? command : `${command} `
  slashSelection.value = 0
  nextTick(() => inputRef.value?.focus())
}

function moveSlashSelection(offset: number) {
  if (!showCommandMenu.value || filteredSlashCommands.value.length === 0) return
  const next = slashSelection.value + offset
  slashSelection.value = (next + filteredSlashCommands.value.length) % filteredSlashCommands.value.length
  const command = filteredSlashCommands.value[slashSelection.value]
  if (command) applySlashCommand(command.command)
}

function hideSlashMenu() {
  if (promptDraft.value.trim() === '/') {
    promptDraft.value = ''
  }
  composerFocused.value = false
}

function handleComposerBlur() {
  window.setTimeout(() => {
    composerFocused.value = false
  }, 120)
}

async function clearActiveSession() {
  if (!activeSession.value || activeSession.value.status === 'running') return
  try {
    const response = await terminalApi.clearSession(activeSession.value.id)
    activeSession.value = response.session
    events.value = response.events || []
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '清空失败')
  }
}

async function stopActiveSession() {
  if (!activeSession.value || activeSession.value.status !== 'running') return
  try {
    const response = await terminalApi.stopSession(activeSession.value.id)
    activeSession.value = response.session
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '停止失败')
  }
}

onMounted(async () => {
  try {
    await loadCapabilities()
    await loadTuiSessions()
    if (tuiSessions.value[0]) {
      activeTuiSession.value = tuiSessions.value[0]
      engineDraft.value = tuiSessions.value[0].engine
      cwdDraft.value = tuiSessions.value[0].cwd
      await connectTui()
    } else {
      await createNewTuiSession(true)
    }
    window.addEventListener('resize', resizeTui)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载终端失败')
  }
})

onUnmounted(() => {
  closeStream()
  closeTui()
  window.removeEventListener('resize', resizeTui)
})
</script>

<style scoped>
.ai-chat-page {
  --chat-bg: #0a0a0a;
  --chat-panel: #141414;
  --chat-element: #1f1f1f;
  --chat-element-hover: #2a2a2a;
  --chat-text: #e0e0e0;
  --chat-muted: #888888;
  --chat-border: #2a2a2a;
  --chat-accent: #3b82f6;
  --chat-accent-hover: #2563eb;
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 24px);
  overflow: hidden;
  background: var(--chat-bg);
  color: var(--chat-text);
}

.message-avatar {
  display: grid;
  place-items: center;
  color: white;
  background: linear-gradient(135deg, var(--chat-accent), #8b5cf6);
}

.session-sidebar {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  padding: 18px 14px;
  border-right: 1px solid var(--chat-border);
  background: #0d0d0d;
}

.session-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.session-sidebar__header strong,
.session-sidebar__header span {
  display: block;
}

.session-sidebar__header strong {
  color: var(--chat-text);
  font-size: 15px;
  line-height: 1.25;
}

.session-sidebar__header span {
  margin-top: 3px;
  color: var(--chat-muted);
  font-size: 12px;
}

.sidebar-icon-btn,
.sidebar-new-btn,
.history-item {
  border: 0;
  border-radius: 8px;
}

.sidebar-icon-btn {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--chat-muted);
  background: var(--chat-element);
}

.sidebar-icon-btn:hover {
  color: var(--chat-text);
  background: var(--chat-element-hover);
}

.sidebar-new-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  margin-bottom: 14px;
  color: var(--chat-text);
  background: rgba(59, 130, 246, 0.16);
}

.sidebar-new-btn:hover {
  background: rgba(59, 130, 246, 0.24);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.history-list::-webkit-scrollbar,
.chat-area::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-thumb,
.chat-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--chat-border);
}

.history-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 8px;
  width: 100%;
  min-width: 0;
  padding: 10px;
  color: var(--chat-muted);
  text-align: left;
  background: transparent;
}

.history-item:hover,
.history-item.active {
  color: var(--chat-text);
  background: var(--chat-element);
}

.history-item.active {
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.32);
}

.history-engine {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: start;
  min-width: 48px;
  height: 22px;
  border-radius: 999px;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.16);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.history-engine--claude {
  color: #d8b4fe;
  background: rgba(147, 51, 234, 0.18);
}

.history-item strong,
.history-item small,
.history-item em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item strong {
  color: inherit;
  font-size: 13px;
  line-height: 1.35;
}

.history-item small {
  grid-column: 1 / -1;
  color: var(--chat-muted);
  font-size: 12px;
}

.history-item em {
  grid-column: 1 / -1;
  color: #666;
  font-size: 11px;
  font-style: normal;
}

.history-empty {
  display: grid;
  min-height: 120px;
  place-items: center;
  color: var(--chat-muted);
  font-size: 13px;
}

.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  height: calc(100vh - 24px);
  background: var(--chat-bg);
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 86px;
  padding: 12px 32px;
  border-bottom: 1px solid var(--chat-border);
  background: rgba(10, 10, 10, 0.86);
  backdrop-filter: blur(10px);
}

.terminal-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(59, 130, 246, 0.24);
  border-radius: 8px;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.12);
}

.terminal-brand strong,
.terminal-brand span {
  display: block;
}

.terminal-brand strong {
  overflow: hidden;
  color: var(--chat-text);
  font-size: 15px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-brand span {
  margin-top: 3px;
  overflow: hidden;
  color: var(--chat-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-controls {
  display: grid;
  grid-template-columns: 132px minmax(240px, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.control-field {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.control-field span {
  color: var(--chat-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.control-field input,
.control-field select {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--chat-border);
  border-radius: 8px;
  color: var(--chat-text);
  background: var(--chat-element);
  outline: none;
}

.control-field input {
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.new-inline-btn,
.icon-action {
  height: 36px;
  border: 0;
  border-radius: 8px;
  color: var(--chat-muted);
  background: transparent;
}

.new-inline-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  color: var(--chat-text);
  background: var(--chat-element);
  white-space: nowrap;
}

.icon-action {
  display: grid;
  place-items: center;
  width: 36px;
}

.new-inline-btn:hover,
.icon-action:hover:not(:disabled) {
  color: var(--chat-text);
  background: var(--chat-element);
}

.icon-action:disabled {
  opacity: 0.45;
}

.status-badge {
  padding: 6px 9px;
  border: 1px solid var(--chat-border);
  border-radius: 999px;
  color: var(--chat-muted);
  font-size: 12px;
}

.status-badge.running {
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.35);
}

.status-badge.failed {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.35);
}

.status-badge.tui {
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.35);
}

.status-badge.offline {
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.35);
}

.chat-area {
  min-height: 0;
  overflow: auto;
  padding: 40px 0;
}

.tui-area {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding: 18px 20px 20px;
  overflow: hidden;
}

.tui-toolbar {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  min-height: 32px;
  margin-bottom: 10px;
  color: var(--chat-muted);
}

.tui-toolbar strong {
  color: var(--chat-text);
  text-transform: uppercase;
}

.tui-toolbar small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tui-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #71717a;
}

.tui-status.connected {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
}

.tui-screen {
  min-height: 0;
  overflow: hidden;
  padding: 10px;
  border: 1px solid var(--chat-border);
  border-radius: 10px;
  background: #050505;
}

.tui-screen :deep(.xterm) {
  height: 100%;
}

.tui-screen :deep(.xterm-viewport) {
  overflow-y: auto;
}

.message-container {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
}

.empty-chat {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 52vh;
  color: var(--chat-muted);
  text-align: center;
}

.empty-orb {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 16px;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, var(--chat-accent), #8b5cf6);
  font-size: 28px;
}

.empty-chat h2 {
  margin: 0 0 8px;
  color: var(--chat-text);
  font-size: 24px;
}

.empty-chat p {
  margin: 0;
}

.message {
  display: flex;
  gap: 18px;
  max-width: 100%;
}

.message.user {
  flex-direction: row-reverse;
}

.message.system {
  opacity: 0.88;
}

.message-avatar {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
}

.message.system .message-avatar {
  background: #202020;
}

.message.danger .message-avatar {
  background: #7f1d1d;
}

.message-content {
  max-width: calc(100% - 54px);
  color: var(--chat-text);
  font-size: 15px;
  line-height: 1.65;
}

.message.user .message-content {
  padding: 14px 18px;
  border-radius: 14px;
  background: var(--chat-element);
}

.message.ai .message-content,
.message.system .message-content {
  padding-top: 5px;
}

.message-content pre {
  min-width: 0;
  max-width: 100%;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: var(--font-sans);
}

.message.system .message-content pre {
  color: var(--chat-muted);
  font-family: var(--font-mono);
  font-size: 13px;
}

.thinking {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--chat-muted);
}

.thinking i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chat-accent);
  animation: pulse-dot 1s ease-in-out infinite;
}

.tool-event {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 7px;
  align-items: center;
  width: fit-content;
  max-width: min(520px, 92%);
  margin: -6px auto;
  padding: 6px 10px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 999px;
  color: var(--chat-muted);
  background: rgba(31, 31, 31, 0.9);
  font-size: 12px;
}

.tool-event__icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.18);
}

.tool-event strong {
  overflow: hidden;
  max-width: 180px;
  color: var(--chat-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-event em {
  padding: 2px 6px;
  border-radius: 999px;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.18);
  font-style: normal;
  font-weight: 700;
}

.tool-event small {
  color: #666;
}

.input-container {
  display: grid;
  justify-items: center;
  padding: 24px 40px 34px;
  background: linear-gradient(to top, var(--chat-bg) 60%, transparent);
}

.input-box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 860px;
  padding: 15px;
  border: 1px solid var(--chat-border);
  border-radius: 16px;
  background: var(--chat-element);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
}

.input-box:focus-within {
  border-color: #5b6473;
}

.input-box textarea {
  width: 100%;
  min-height: 48px;
  max-height: 200px;
  padding: 0;
  border: 0;
  color: var(--chat-text);
  background: transparent;
  resize: vertical;
  outline: none;
  font-size: 16px;
  line-height: 1.55;
}

.input-box textarea::placeholder {
  color: var(--chat-muted);
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left-actions {
  display: flex;
  gap: 8px;
}

.action-btn,
.send-btn {
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
}

.action-btn {
  width: 34px;
  height: 34px;
  color: var(--chat-muted);
  background: transparent;
}

.action-btn:hover {
  color: var(--chat-text);
  background: var(--chat-element-hover);
}

.send-btn {
  width: 36px;
  height: 36px;
  color: white;
  background: var(--chat-accent);
}

.send-btn:hover:not(:disabled) {
  background: var(--chat-accent-hover);
}

.send-btn:disabled {
  opacity: 0.45;
}

.footer-note {
  margin-top: 14px;
  color: var(--chat-muted);
  font-size: 12px;
  text-align: center;
}

.slash-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 8;
  display: grid;
  gap: 4px;
  max-height: min(430px, 48vh);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--chat-border);
  border-radius: 14px;
  background: #151515;
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.54);
}

.slash-menu button {
  display: grid;
  grid-template-columns: 82px minmax(160px, max-content) minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--chat-muted);
  text-align: left;
  background: transparent;
}

.slash-menu button:hover,
.slash-menu button.selected {
  border-color: var(--chat-accent);
  background: rgba(59, 130, 246, 0.12);
}

.slash-source {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  height: 23px;
  border-radius: 999px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.15);
  font-size: 11px;
}

.slash-source--terminal {
  color: #86efac;
  background: rgba(34, 197, 94, 0.15);
}

.slash-source--claude {
  color: #d8b4fe;
  background: rgba(147, 51, 234, 0.16);
}

.slash-menu strong {
  color: var(--chat-text);
  white-space: nowrap;
}

.slash-menu small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slash-empty {
  padding: 10px;
  color: var(--chat-muted);
}

@keyframes pulse-dot {
  50% {
    opacity: 0.35;
    transform: scale(0.72);
  }
}

@media (max-width: 1100px) {
  .ai-chat-page {
    grid-template-columns: 248px minmax(0, 1fr);
  }

  .top-nav {
    grid-template-columns: 1fr auto;
    align-items: start;
    padding-left: 20px;
    padding-right: 20px;
  }

  .terminal-controls {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .input-container {
    padding-left: 20px;
    padding-right: 20px;
  }
}

@media (max-width: 820px) {
  .ai-chat-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: auto;
  }

  .session-sidebar {
    grid-template-rows: auto auto;
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--chat-border);
  }

  .history-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(220px, 74vw);
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
  }

  .chat-main {
    min-height: 720px;
  }

  .top-nav {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px 14px;
  }

  .terminal-controls {
    grid-template-columns: 1fr;
    grid-column: auto;
    grid-row: auto;
  }

  .top-actions {
    justify-content: space-between;
  }

  .message-container {
    padding: 0 14px;
  }

  .input-container {
    padding: 16px 14px 22px;
  }

  .slash-menu button {
    grid-template-columns: 72px minmax(96px, max-content);
  }

  .slash-menu small {
    grid-column: 1 / -1;
  }
}
</style>
