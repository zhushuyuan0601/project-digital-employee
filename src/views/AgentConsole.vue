<template>
  <div class="agent-console-page">
    <aside class="console-rail">
      <section class="rail-head">
        <div>
          <p class="eyebrow">Agent Console</p>
          <h1>Agent 实时控制台</h1>
        </div>
        <button class="icon-btn" type="button" title="刷新" @click="refreshAll">
          <i class="ri-refresh-line"></i>
        </button>
      </section>

      <section class="task-picker">
        <label>
          <span>活跃任务</span>
          <select v-model="selectedTaskId" class="field" @change="loadSelectedTaskContext">
            <option value="">选择一个任务</option>
            <option v-for="task in activeTasks" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </select>
        </label>
        <div v-if="selectedTask" class="task-snapshot">
          <div class="task-snapshot__head">
            <strong :title="selectedTask.title">{{ selectedTask.title }}</strong>
            <el-tooltip
              v-if="selectedTaskDescription"
              placement="right"
              popper-class="agent-console-task-tip"
              :show-after="120"
            >
              <template #content>
                <div class="task-tip__content">{{ selectedTaskDescription }}</div>
              </template>
              <button class="task-tip" type="button" aria-label="查看完整任务描述">
                <i class="ri-information-line"></i>
              </button>
            </el-tooltip>
          </div>
          <p v-if="selectedTaskSummary">{{ selectedTaskSummary }}</p>
          <div class="task-snapshot__meta">
            <span>{{ selectedTask.status }}</span>
            <span>{{ selectedTask.progress || 0 }}%</span>
            <span>{{ selectedAgentRuns.length }} runs</span>
          </div>
        </div>
        <div v-else class="quiet-state">请选择一个任务作为控制台上下文。</div>
      </section>

      <section class="agent-picker">
        <div class="section-title">
          <span>本任务 Agent 会话</span>
          <small>{{ taskScopedAgents.length }} 个</small>
        </div>
        <button
          v-for="agent in taskScopedAgents"
          :key="agent.id"
          type="button"
          class="agent-choice"
          :class="{ selected: selectedAgentId === agent.id, busy: agentBusy(agent.id) }"
          @click="selectAgent(agent.id)"
        >
          <span class="agent-avatar">{{ agent.name.slice(0, 1) }}</span>
          <span>
            <strong>{{ agent.name }}</strong>
            <small>{{ taskAgentSubtitle(agent.id) }}</small>
          </span>
        </button>
        <div v-if="selectedTask && taskScopedAgents.length === 0" class="quiet-state">
          当前任务还没有生成执行 Agent。等待小呦拆解或选择其他任务。
        </div>
      </section>
    </aside>

    <main class="chat-shell">
      <header class="chat-header">
        <div class="chat-agent">
          <span class="agent-avatar agent-avatar--large">{{ selectedAgent?.name.slice(0, 1) || '?' }}</span>
          <div>
            <p class="eyebrow">Live Agent Output</p>
            <h2>{{ selectedAgent?.name || '选择 Agent' }}</h2>
            <small>{{ selectedAgent ? taskAgentSubtitle(selectedAgent.id) : '点击左侧本任务 Agent 查看会话' }}</small>
          </div>
        </div>
        <div class="chat-header__actions">
          <span>{{ selectedAgentRuns.length }} runs</span>
          <span>{{ selectedAgentEntries.length }} logs</span>
          <button
            v-if="selectedAgentActiveRun"
            class="ghost-btn"
            type="button"
            :disabled="cancellingRunId === selectedAgentActiveRun.id"
            @click="cancelRun(selectedAgentActiveRun.id)"
          >
            {{ cancellingRunId === selectedAgentActiveRun.id ? '停止中' : '停止运行' }}
          </button>
        </div>
      </header>

      <section ref="chatRef" class="chat-thread">
        <div v-if="!selectedAgent" class="empty-chat">
          <strong>选择一个 Agent 开始查看</strong>
          <p>每个 Agent 都有自己的实时输出页，点击左侧成员即可切换。</p>
        </div>
        <template v-else>
          <div v-if="chatMessages.length === 0" class="empty-chat">
            <strong>{{ selectedAgent.name }} 暂无输出</strong>
            <p>该 Agent 在当前任务中的正式执行与旁路追问会话会显示在这里。</p>
          </div>
          <article
            v-for="message in chatMessages"
            :key="message.id"
            :class="message.sender === 'tool' ? 'chat-tool-event' : ['chat-bubble', `chat-bubble--${message.sender}`]"
          >
            <template v-if="message.sender === 'tool'">
              <span class="chat-tool-event__icon">
                <i :class="toolIcon(message.toolCategory)"></i>
              </span>
              <span>{{ toolCategoryText(message.toolCategory) }}</span>
              <strong>{{ message.toolName }}</strong>
              <em v-if="message.count && message.count > 1">x{{ message.count }}</em>
              <small>{{ formatLogTime(message.timestampMs) }}</small>
            </template>
            <template v-else>
              <div class="chat-bubble__avatar">
                {{ message.sender === 'user' ? '我' : selectedAgent.name.slice(0, 1) }}
              </div>
              <div class="chat-bubble__body">
                <div class="chat-bubble__meta">
                  <strong>{{ message.sender === 'user' ? '我' : selectedAgent.name }}</strong>
                  <span>{{ formatLogTime(message.timestampMs) }}</span>
                  <small v-if="message.runId">{{ shortRunId(message.runId) }}</small>
                </div>
                <div class="chat-markdown" v-html="renderMarkdown(message.content)"></div>
              </div>
            </template>
          </article>
        </template>
      </section>

      <form class="console-composer" @submit.prevent="sendConsoleMessage">
        <textarea
          v-model="draft"
          class="message-box"
          :disabled="sending || !selectedTask || !selectedAgent"
          :placeholder="selectedAgent ? `向 ${selectedAgent.name} 发送当前任务旁路追问` : '先选择本任务 Agent'"
          rows="4"
          @keydown.meta.enter.prevent="sendConsoleMessage"
          @keydown.ctrl.enter.prevent="sendConsoleMessage"
        ></textarea>
        <button class="send-btn" type="submit" :disabled="sendDisabled">
          {{ sending ? '发送中' : selectedAgent ? `发送给 ${selectedAgent.name}` : '发送' }}
        </button>
      </form>
    </main>

    <aside class="terminal-panel">
      <header>
        <div>
          <p class="eyebrow">Key Outputs</p>
          <h2>{{ selectedAgent?.name || 'Agent' }} 关键节点</h2>
        </div>
        <span class="node-count">{{ selectedAgentKeyEntries.length }}</span>
      </header>
      <div ref="terminalRef" class="terminal-screen">
        <section v-if="selectedAgentTaskNodes.length" class="agent-node-list">
          <p>任务节点</p>
          <article v-for="node in selectedAgentTaskNodes" :key="node.id">
            <strong>{{ node.title }}</strong>
            <span>{{ node.status }} · {{ node.progress || 0 }}%</span>
          </article>
        </section>
        <div v-if="selectedAgentKeyEntries.length === 0" class="terminal-empty">暂无关键产出，完整回答请看中间聊天区。</div>
        <article
          v-for="entry in selectedAgentKeyEntries"
          :key="entry.id"
          class="terminal-row"
          :class="`terminal-row--${entry.tone}`"
        >
          <div class="terminal-row__meta">
            <span>{{ formatLogTime(entry.timestampMs) }}</span>
            <strong>{{ entry.label }}</strong>
            <small>{{ shortRunId(entry.runId) }}</small>
          </div>
          <pre>{{ entry.content }}</pre>
        </article>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { taskApi, type AgentDefinition, type AgentRun, type AgentRunLog } from '@/api/tasks'
import type { Task } from '@/types/task'
import { sanitizeHtml } from '@/utils/sanitize'

type ConsoleEntry = {
  id: string
  runId: string
  agentId: string
  agentName: string
  label: string
  tone: string
  content: string
  timestampMs: number
  sourceType: string
  payload: Record<string, unknown> | null
}

type ChatMessage = {
  id: string
  sender: 'user' | 'agent' | 'tool'
  content: string
  timestampMs: number
  runId: string
  toolName?: string
  toolCategory?: string
  count?: number
}

const tasks = ref<Task[]>([])
const agents = ref<AgentDefinition[]>([])
const selectedTaskId = ref('')
const selectedTask = ref<Task | null>(null)
const runs = ref<AgentRun[]>([])
const logsByRun = ref<Record<string, AgentRunLog[]>>({})
const selectedAgentId = ref('')
const draft = ref('')
const sending = ref(false)
const cancellingRunId = ref('')
const terminalRef = ref<HTMLElement | null>(null)
const chatRef = ref<HTMLElement | null>(null)
let taskEventSource: EventSource | null = null

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

const activeTasks = computed(() => tasks.value.filter(task => !['completed', 'cancelled'].includes(task.status)))
const executableAgents = computed(() => agents.value.filter(agent => agent.enabled))
const taskRuns = computed(() => runs.value.filter(run => run.task_id === selectedTaskId.value))
const taskScopedAgentIds = computed(() => {
  const ids = new Set<string>()
  for (const participant of selectedTask.value?.plan_json?.participants || []) {
    if (participant.needed !== false && participant.agentId) ids.add(participant.agentId)
  }
  for (const node of selectedTask.value?.plan_json?.workflow || []) {
    if (node.assignedAgentId) ids.add(node.assignedAgentId)
  }
  for (const subtask of selectedTask.value?.subtasks || []) {
    if (subtask.assigned_agent_id) ids.add(subtask.assigned_agent_id)
  }
  for (const run of taskRuns.value) {
    if (run.agent_id && run.agent_id !== selectedTask.value?.coordinator_agent_id) ids.add(run.agent_id)
  }
  ids.delete('xiaomu')
  return [...ids]
})
const taskScopedAgents = computed(() => taskScopedAgentIds.value.map((agentId) =>
  agents.value.find(agent => agent.id === agentId) || fallbackAgent(agentId)
))
const selectedAgent = computed(() => taskScopedAgents.value.find(agent => agent.id === selectedAgentId.value) || null)
const selectedAgentRuns = computed(() => taskRuns.value.filter(run => run.agent_id === selectedAgentId.value))
const selectedAgentActiveRun = computed(() => selectedAgentRuns.value.find(run => ['queued', 'running'].includes(run.status)) || null)
const selectedAgentTaskNodes = computed(() => (selectedTask.value?.subtasks || []).filter(subtask => subtask.assigned_agent_id === selectedAgentId.value))
const sendDisabled = computed(() => sending.value || !selectedTask.value || !selectedAgent.value || !draft.value.trim())
const selectedTaskDescription = computed(() => normalizeTaskDescription(selectedTask.value?.description || ''))
const selectedTaskSummary = computed(() => summarizeTaskDescription(selectedTaskDescription.value))

const selectedAgentEntries = computed(() => selectedAgentRuns.value
  .flatMap(run => formatRunEntries(run, logsByRun.value[run.id] || []))
  .sort((a, b) => a.timestampMs - b.timestampMs))

const selectedAgentKeyEntries = computed(() => selectedAgentEntries.value.filter(isKeyOutputEntry))

const chatMessages = computed<ChatMessage[]>(() => {
  const messages: ChatMessage[] = []
  for (const run of selectedAgentRuns.value.slice().sort((a, b) => Number(a.created_at || 0) - Number(b.created_at || 0))) {
    const entries = formatRunEntries(run, logsByRun.value[run.id] || [])
    for (const entry of entries) {
      if (entry.sourceType === 'user') {
        messages.push({
          id: `user-${entry.id}`,
          sender: 'user',
          content: entry.content,
          timestampMs: entry.timestampMs,
          runId: run.id,
        })
        continue
      }
      if (entry.sourceType === 'assistant') {
        messages.push({
          id: `agent-${entry.id}`,
          sender: 'agent',
          content: entry.content,
          timestampMs: entry.timestampMs,
          runId: run.id,
        })
        continue
      }
      if (entry.sourceType === 'tool') {
        const toolName = entryToolName(entry)
        const toolCategory = entryToolCategory(entry)
        const previous = messages.at(-1)
        if (previous?.sender === 'tool' && previous.runId === run.id && previous.toolName === toolName) {
          previous.count = (previous.count || 1) + 1
          previous.timestampMs = entry.timestampMs
          previous.id = `${previous.id}-${entry.id}`
          continue
        }
        messages.push({
          id: `tool-${entry.id}`,
          sender: 'tool',
          content: entry.content,
          timestampMs: entry.timestampMs,
          runId: run.id,
          toolName,
          toolCategory,
          count: 1,
        })
      }
    }
  }
  return messages.sort((a, b) => a.timestampMs - b.timestampMs)
})

function agentName(agentId = '') {
  return agents.value.find(agent => agent.id === agentId)?.name || agentId || 'system'
}

function fallbackAgent(agentId: string): AgentDefinition {
  return {
    id: agentId,
    name: agentId,
    roleName: '任务 Agent',
    description: '该 Agent 来自当前任务计划或运行记录。',
    boundary: '',
    runtimeAgentId: agentId,
    roleId: agentId,
    capabilities: [],
    allowedTools: [],
    inputContract: [],
    outputContract: [],
    riskLevel: 'medium',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 999,
    coordinator: false,
  }
}

function shortRunId(runId = '') {
  if (!runId) return '--'
  return runId.length > 18 ? `${runId.slice(0, 10)}...${runId.slice(-5)}` : runId
}

function formatLogTime(ms = Date.now()) {
  return new Date(ms).toLocaleTimeString('zh-CN', { hour12: false })
}

function normalizeTaskDescription(description = '') {
  return description.replace(/\s+/g, ' ').trim()
}

function summarizeTaskDescription(description = '') {
  if (!description) return ''
  const summaryLimit = 86
  return description.length > summaryLimit ? `${description.slice(0, summaryLimit)}...` : description
}

function renderMarkdown(content = '') {
  return sanitizeHtml(md.render(content || ''))
}

function entryToolName(entry: ConsoleEntry) {
  const payloadName = typeof entry.payload?.toolName === 'string' ? entry.payload.toolName.trim() : ''
  if (payloadName) return payloadName
  return entry.content.split('：').at(-1)?.trim() || 'Tool'
}

function entryToolCategory(entry: ConsoleEntry) {
  return typeof entry.payload?.toolCategory === 'string' ? entry.payload.toolCategory : ''
}

function toolCategoryText(category = '') {
  const labels: Record<string, string> = {
    read: '读取',
    write: '写入',
    edit: '编辑',
    command: '命令',
    search: '搜索',
    web: '联网',
  }
  return labels[category] || '工具'
}

function toolIcon(category = '') {
  const icons: Record<string, string> = {
    read: 'ri-file-search-line',
    write: 'ri-file-edit-line',
    edit: 'ri-edit-2-line',
    command: 'ri-terminal-box-line',
    search: 'ri-search-line',
    web: 'ri-global-line',
  }
  return icons[category] || 'ri-tools-line'
}

function logTone(type = '') {
  if (['error', 'agent.error'].includes(type)) return 'danger'
  if (['result', 'done', 'agent.done', 'agent.console.completed', 'output', 'code.assets'].includes(type)) return 'success'
  if (['tool', 'agent.tool', 'assistant.delta', 'assistant.snapshot', 'user'].includes(type)) return 'progress'
  if (['queue', 'start', 'system', 'cancelled'].includes(type)) return 'muted'
  return 'neutral'
}

function logLabel(type = '') {
  const labels: Record<string, string> = {
    user: 'USER',
    queue: 'QUEUE',
    start: 'START',
    system: 'SYSTEM',
    tool: 'TOOL',
    'assistant.delta': 'CLAUDE',
    'assistant.snapshot': 'CLAUDE',
    result: 'RESULT',
    done: 'DONE',
    error: 'ERROR',
    output: 'OUTPUT',
    'code.assets': 'ASSETS',
    cancelled: 'CANCELLED',
    'agent.console.completed': 'DONE',
    'agent.done': 'DONE',
  }
  return labels[type] || type.toUpperCase()
}

function isKeyOutputEntry(entry: ConsoleEntry) {
  if (entry.sourceType === 'assistant' || entry.sourceType === 'user' || entry.sourceType === 'tool') return false
  if (['queue', 'start', 'system', 'agent.tool', 'assistant.delta', 'assistant.snapshot'].includes(entry.sourceType)) return false
  if (entry.sourceType === 'result' && isGenericRuntimeResult(entry.content)) return false
  return ['done', 'agent.done', 'agent.console.completed', 'result', 'error', 'agent.error', 'output', 'code.assets', 'cancelled'].includes(entry.sourceType)
}

function isGenericRuntimeResult(content = '') {
  return /Claude Code\s*返回成功结果/.test(content.trim())
}

function formatRunEntries(run: AgentRun, logs: AgentRunLog[]): ConsoleEntry[] {
  const entries: ConsoleEntry[] = []
  for (const log of logs) {
    const content = String(log.message || '').trim()
    if (!content) continue
    const isAssistant = log.type === 'assistant.delta' || log.type === 'assistant.snapshot'
    const previous = entries.at(-1)
    if (isAssistant && previous?.sourceType === 'assistant' && previous.runId === run.id) {
      previous.content = log.type === 'assistant.snapshot'
        ? mergeAssistantContent(previous.content, content)
        : `${previous.content}${content}`
      previous.timestampMs = Number(log.created_at_ms || previous.timestampMs)
      continue
    }
    entries.push({
      id: `log-${log.id}`,
      runId: run.id,
      agentId: run.agent_id,
      agentName: agentName(run.agent_id),
      label: logLabel(log.type),
      tone: logTone(log.type),
      content,
      timestampMs: Number(log.created_at_ms || Number(log.created_at || 0) * 1000 || Date.now()),
      sourceType: log.type === 'user' ? 'user' : isAssistant ? 'assistant' : log.type,
      payload: log.payload_json && typeof log.payload_json === 'object' ? log.payload_json : null,
    })
  }
  return entries
}

function mergeAssistantContent(previous: string, snapshot: string) {
  if (!previous) return snapshot
  if (snapshot.includes(previous)) return snapshot
  if (previous.includes(snapshot)) return previous
  return snapshot.length >= previous.length ? snapshot : previous
}

function selectAgent(agentId: string) {
  selectedAgentId.value = agentId
  scrollPanelsToBottom()
}

function agentBusy(agentId: string) {
  return taskRuns.value.some(run => run.agent_id === agentId && ['queued', 'running'].includes(run.status))
}

function agentStatusText(agentId: string) {
  const active = taskRuns.value.find(run => run.agent_id === agentId && ['queued', 'running'].includes(run.status))
  if (active) return active.status === 'queued' ? '排队中' : '运行中'
  const latest = taskRuns.value.find(run => run.agent_id === agentId)
  return latest?.status || '待命'
}

function taskAgentSubtitle(agentId: string) {
  const nodeCount = (selectedTask.value?.subtasks || []).filter(subtask => subtask.assigned_agent_id === agentId).length
  const runCount = taskRuns.value.filter(run => run.agent_id === agentId).length
  return `${agentName(agentId)} · ${agentStatusText(agentId)} · ${nodeCount} 节点 · ${runCount} 会话`
}

async function refreshAll() {
  const [taskResponse, agentResponse] = await Promise.all([
    taskApi.listTasks({ limit: 80 }),
    taskApi.listAgents({ includeCoordinator: true }),
  ])
  tasks.value = taskResponse.tasks
  agents.value = agentResponse.agents
  if (!selectedTaskId.value && activeTasks.value[0]) {
    selectedTaskId.value = activeTasks.value[0].id
  }
  if (selectedTaskId.value) await loadSelectedTaskContext()
}

async function loadSelectedTaskContext() {
  closeTaskStream()
  logsByRun.value = {}
  if (!selectedTaskId.value) {
    selectedTask.value = null
    runs.value = []
    return
  }
  const [taskResponse, runResponse] = await Promise.all([
    taskApi.getTask(selectedTaskId.value, { includeEvents: true, eventLimit: 120 }),
    taskApi.listRuns({ taskId: selectedTaskId.value, limit: 120 }),
  ])
  selectedTask.value = taskResponse.task
  runs.value = runResponse.runs
  await Promise.all(runs.value.map(run => fetchRunLogs(run.id)))
  if (!taskScopedAgentIds.value.includes(selectedAgentId.value)) {
    selectedAgentId.value = taskScopedAgentIds.value[0] || ''
  }
  openTaskStream(selectedTaskId.value)
  scrollPanelsToBottom()
}

async function fetchRunLogs(runId: string) {
  const response = await taskApi.listRunLogs(runId, { limit: 500 })
  logsByRun.value = {
    ...logsByRun.value,
    [runId]: response.logs,
  }
}

function upsertRun(run: AgentRun) {
  runs.value = [run, ...runs.value.filter(item => item.id !== run.id)]
}

function appendRunLog(log: AgentRunLog) {
  const current = logsByRun.value[log.run_id] || []
  if (current.some(item => item.id === log.id)) return
  logsByRun.value = {
    ...logsByRun.value,
    [log.run_id]: [...current, log].slice(-700),
  }
}

async function sendConsoleMessage() {
  if (sendDisabled.value || !selectedTask.value || !selectedAgent.value) return
  sending.value = true
  try {
    const response = await taskApi.sendAgentConsoleMessage({
      taskId: selectedTask.value.id,
      agentIds: [selectedAgent.value.id],
      content: draft.value.trim(),
    })
    draft.value = ''
    selectedTask.value = response.task
    for (const run of response.runs) {
      upsertRun(run)
      await fetchRunLogs(run.id)
    }
    ElMessage.success(`已发送给 ${selectedAgent.value.name}`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发送失败')
  } finally {
    sending.value = false
  }
}

async function cancelRun(runId: string) {
  cancellingRunId.value = runId
  try {
    const response = await taskApi.cancelRun(runId)
    upsertRun(response.run)
    await fetchRunLogs(runId)
    ElMessage.success('已停止运行')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '停止失败')
  } finally {
    cancellingRunId.value = ''
  }
}

function openTaskStream(taskId: string) {
  taskEventSource = new EventSource(`/api/tasks/${encodeURIComponent(taskId)}/events/stream`)
  taskEventSource.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data) as Record<string, any>
      if (data.type === 'connected' || data.type === 'ping') return
      if (data.type === 'agent.log' && data.log) {
        appendRunLog(data.log as AgentRunLog)
        scrollPanelsToBottom()
        return
      }
      const runId = typeof data.runId === 'string' ? data.runId : ''
      if (runId && ['agent.run.queued', 'agent.start', 'agent.error', 'agent.cancelled', 'agent.console.completed', 'workflow.node.completed', 'agent.done'].includes(String(data.type))) {
        const runResponse = await taskApi.listRuns({ taskId, limit: 120 })
        runs.value = runResponse.runs
      }
    } catch (err) {
      console.warn('[AgentConsole] stream parse failed', err)
    }
  }
}

function closeTaskStream() {
  taskEventSource?.close()
  taskEventSource = null
}

async function scrollPanelsToBottom() {
  await nextTick()
  if (terminalRef.value) terminalRef.value.scrollTop = terminalRef.value.scrollHeight
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
}

watch([selectedAgentEntries, chatMessages], () => scrollPanelsToBottom(), { flush: 'post' })

onMounted(() => {
  refreshAll().catch(err => ElMessage.error(err instanceof Error ? err.message : '加载控制台失败'))
})

onUnmounted(() => {
  closeTaskStream()
})
</script>

<style scoped>
.agent-console-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) clamp(260px, 16vw, 340px);
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding: 16px;
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), transparent 34%),
    var(--bg-base);
}

.console-rail,
.chat-shell,
.terminal-panel {
  min-height: 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-panel) 94%, transparent);
  overflow: hidden;
}

.console-rail,
.chat-shell,
.terminal-panel {
  display: flex;
  flex-direction: column;
}

.rail-head,
.chat-header,
.terminal-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-default);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
  color: var(--text-primary);
}

h1 {
  font-size: 20px;
}

h2 {
  font-size: 18px;
}

.icon-btn,
.ghost-btn,
.send-btn {
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
}

.icon-btn {
  width: 34px;
  height: 34px;
}

.ghost-btn {
  min-height: 30px;
  padding: 0 10px;
}

.task-picker,
.agent-picker {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-default);
}

.task-picker label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.field,
.message-box {
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  outline: none;
}

.field {
  height: 36px;
  padding: 0 10px;
}

.task-snapshot {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.task-snapshot strong {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-snapshot p,
.quiet-state,
.terminal-empty,
.empty-chat {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.task-snapshot__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 8px;
  align-items: center;
}

.task-snapshot p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.task-tip {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--text-secondary);
  cursor: help;
}

:global(.agent-console-task-tip) {
  max-width: min(380px, 78vw);
}

:global(.agent-console-task-tip .task-tip__content) {
  width: min(340px, 72vw);
  max-height: 280px;
  overflow: auto;
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.65;
  white-space: normal;
}

.task-snapshot__meta,
.chat-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-snapshot__meta span,
.chat-header__actions span {
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 11px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 12px;
}

.section-title small {
  color: var(--text-tertiary);
}

.agent-choice {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.agent-choice.selected {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.24);
}

.agent-choice.busy .agent-avatar {
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.16);
}

.agent-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-cyan));
  color: white;
  font-weight: 800;
}

.agent-avatar--large {
  width: 42px;
  height: 42px;
  border-radius: 10px;
}

.agent-choice small,
.chat-agent small {
  display: block;
  margin-top: 3px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-agent {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.chat-thread {
  display: grid;
  align-content: start;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: 18px;
  overflow: auto;
}

.empty-chat {
  align-self: center;
  justify-self: center;
  max-width: 360px;
  padding: 24px;
  border: 1px dashed var(--border-default);
  border-radius: 8px;
  text-align: center;
}

.empty-chat strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.chat-bubble {
  display: grid;
  grid-template-columns: 34px minmax(0, 0.78fr);
  gap: 10px;
  align-items: start;
}

.chat-bubble--user {
  grid-template-columns: minmax(0, 0.78fr) 34px;
  justify-content: end;
}

.chat-bubble--user .chat-bubble__avatar {
  grid-column: 2;
  background: var(--color-primary);
}

.chat-bubble--user .chat-bubble__body {
  grid-column: 1;
  grid-row: 1;
  background: rgba(var(--color-primary-rgb), 0.14);
  border-color: rgba(var(--color-primary-rgb), 0.32);
}

.chat-bubble__avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.chat-bubble__body {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.chat-bubble__meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--text-tertiary);
  font-size: 11px;
}

.chat-bubble__meta strong {
  color: var(--text-primary);
}

.chat-tool-event {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 7px;
  align-items: center;
  justify-self: center;
  max-width: min(520px, 92%);
  padding: 7px 10px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.22);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 82%, rgba(var(--color-primary-rgb), 0.16));
  color: var(--text-secondary);
  font-size: 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.14);
}

.chat-tool-event__icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.18);
  color: var(--color-primary);
}

.chat-tool-event strong {
  overflow: hidden;
  max-width: 160px;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-tool-event em {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-style: normal;
  font-weight: 800;
}

.chat-tool-event small {
  color: var(--text-tertiary);
}

.chat-markdown {
  margin-top: 7px;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.chat-markdown :deep(*) {
  max-width: 100%;
}

.chat-markdown :deep(p) {
  margin: 7px 0;
}

.chat-markdown :deep(p:first-child),
.chat-markdown :deep(ul:first-child),
.chat-markdown :deep(ol:first-child),
.chat-markdown :deep(pre:first-child),
.chat-markdown :deep(blockquote:first-child) {
  margin-top: 0;
}

.chat-markdown :deep(p:last-child),
.chat-markdown :deep(ul:last-child),
.chat-markdown :deep(ol:last-child),
.chat-markdown :deep(pre:last-child),
.chat-markdown :deep(blockquote:last-child) {
  margin-bottom: 0;
}

.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3),
.chat-markdown :deep(h4) {
  margin: 12px 0 7px;
  color: var(--text-primary);
  line-height: 1.3;
  letter-spacing: 0;
}

.chat-markdown :deep(h1) {
  font-size: 18px;
}

.chat-markdown :deep(h2) {
  font-size: 16px;
}

.chat-markdown :deep(h3),
.chat-markdown :deep(h4) {
  font-size: 14px;
}

.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.chat-markdown :deep(li + li) {
  margin-top: 4px;
}

.chat-markdown :deep(a) {
  color: var(--color-primary);
}

.chat-markdown :deep(strong) {
  color: var(--text-primary);
}

.chat-markdown :deep(code) {
  border: 1px solid var(--border-default);
  border-radius: 5px;
  padding: 2px 5px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.chat-markdown :deep(pre) {
  overflow: auto;
  margin: 10px 0;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.24);
}

.chat-markdown :deep(pre code) {
  display: block;
  border: 0;
  padding: 0;
  background: transparent;
  white-space: pre;
}

.chat-markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 10px;
  border-left: 3px solid var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--text-secondary);
}

.chat-markdown :deep(table) {
  display: block;
  overflow: auto;
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

.chat-markdown :deep(th),
.chat-markdown :deep(td) {
  border: 1px solid var(--border-default);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}

.chat-markdown :deep(th) {
  background: rgba(var(--color-primary-rgb), 0.09);
}

.terminal-screen {
  display: grid;
  align-content: start;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  padding: 14px 12px 14px 22px;
}

.terminal-screen::before {
  content: "";
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 17px;
  width: 1px;
  background: linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.38), rgba(255, 255, 255, 0.06));
}

.agent-node-list {
  position: relative;
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.agent-node-list p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agent-node-list article {
  display: grid;
  gap: 4px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 9px;
  background: color-mix(in srgb, var(--bg-card) 84%, transparent);
}

.agent-node-list strong {
  color: var(--text-primary);
  font-size: 12px;
}

.agent-node-list span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.terminal-row {
  position: relative;
  min-width: 0;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px;
  background: color-mix(in srgb, var(--bg-card) 86%, transparent);
}

.terminal-row::before {
  content: "";
  position: absolute;
  top: 14px;
  left: -11px;
  width: 9px;
  height: 9px;
  border: 2px solid var(--bg-panel);
  border-radius: 50%;
  background: var(--border-default);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.04);
}

.terminal-row--success {
  border-color: color-mix(in srgb, var(--color-success) 36%, var(--border-default));
}

.terminal-row--success::before {
  background: var(--color-success);
}

.terminal-row--danger {
  border-color: color-mix(in srgb, var(--color-danger) 42%, var(--border-default));
}

.terminal-row--danger::before {
  background: var(--color-danger);
}

.terminal-row--progress {
  border-color: color-mix(in srgb, var(--color-primary) 38%, var(--border-default));
}

.terminal-row--progress::before {
  background: var(--color-primary);
}

.terminal-row--muted::before {
  background: var(--text-tertiary);
}

.terminal-row__meta {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  color: var(--text-tertiary);
  font-size: 11px;
}

.terminal-row__meta strong {
  justify-self: start;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  color: var(--text-secondary);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.terminal-row__meta small {
  grid-column: 1 / -1;
  overflow: hidden;
  color: var(--text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-row pre {
  max-height: 112px;
  overflow: auto;
  margin-top: 8px;
  padding: 8px 9px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-secondary);
  font-size: 11px;
}

.node-count {
  min-width: 26px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  text-align: center;
}

pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.55;
}

.console-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}

.message-box {
  resize: vertical;
  min-height: 76px;
  max-height: 160px;
  padding: 10px;
  line-height: 1.5;
}

.send-btn {
  min-height: 38px;
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-inverse);
  font-weight: 700;
}

button:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 1280px) {
  .agent-console-page {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .terminal-panel {
    grid-column: 1 / -1;
    min-height: 420px;
  }
}

@media (max-width: 760px) {
  .agent-console-page {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .console-rail,
  .chat-shell,
  .terminal-panel {
    min-height: 420px;
  }

  .console-composer {
    grid-template-columns: 1fr;
  }

  .chat-bubble,
  .chat-bubble--user {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .chat-bubble--user {
    grid-template-columns: minmax(0, 1fr) 34px;
  }

  .chat-tool-event {
    grid-auto-flow: row;
    grid-auto-columns: auto;
    justify-items: center;
    border-radius: 8px;
    text-align: center;
  }
}
</style>
