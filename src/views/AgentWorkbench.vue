<template>
  <div class="workbench-shell">
    <header class="workbench-titlebar">
      <div class="window-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <button type="button" class="titlebar-icon" title="返回平台" @click="router.push('/task-board')">
        <ArrowLeft />
      </button>
      <div class="titlebar-main">
        <strong>Agent Workbench</strong>
        <span>{{ workspaceName }}</span>
      </div>
      <div class="titlebar-status">
        <span class="status-led" :class="{ live: runningSessions.length > 0 }"></span>
        <span>{{ runningSessions.length ? `${runningSessions.length} running` : 'idle' }}</span>
      </div>
      <button type="button" class="titlebar-icon" title="刷新" @click="refresh">
        <Refresh />
      </button>
      <button type="button" class="titlebar-icon" title="设置">
        <Setting />
      </button>
    </header>

    <div class="workbench-body">
      <aside class="session-sidebar">
        <div class="session-toolbar">
          <div>
            <strong>会话</strong>
            <span>{{ filteredSessions.length }} 个</span>
          </div>
          <button type="button" class="primary-small" :disabled="creating" @click="createSession">
            <Plus />
            新建
          </button>
        </div>

        <div class="sidebar-filters">
          <label class="search-box">
            <Search />
            <input v-model="searchText" type="search" placeholder="搜索会话" />
          </label>
          <select v-model="engineFilter" title="Agent 类型">
            <option value="all">全部引擎</option>
            <option value="claudecode">Claude Code</option>
            <option value="codex">Codex CLI</option>
          </select>
        </div>

        <div class="folder-list">
          <section v-for="group in sessionGroups" :key="group.key" class="folder-group">
            <button type="button" class="folder-row" @click="toggleGroup(group.key)">
              <ArrowDown class="folder-chevron" :class="{ collapsed: collapsedGroups.has(group.key) }" />
              <FolderOpened />
              <span>{{ group.name }}</span>
              <em>{{ group.sessions.length }}</em>
            </button>

            <div v-if="!collapsedGroups.has(group.key)" class="conversation-list">
              <button
                v-for="session in group.sessions"
                :key="session.id"
                type="button"
                class="conversation-card"
                :class="{
                  selected: store.activeSessionId === session.id,
                  open: store.openSessionIds.includes(session.id),
                }"
                @click="store.openSession(session.id)"
              >
                <span class="agent-mark" :class="`agent-mark--${session.engine}`">
                  <Cpu v-if="session.engine === 'claudecode'" />
                  <Connection v-else />
                </span>
                <span class="conversation-main">
                  <strong>{{ session.title || '新会话' }}</strong>
                  <small>{{ engineLabel(session.engine) }} · {{ relativeTime(session.updated_at) }}</small>
                </span>
                <span class="session-state" :class="`session-state--${session.status}`">
                  {{ statusLabel(session.status) }}
                </span>
              </button>
            </div>
          </section>

          <section v-if="!store.loading && filteredSessions.length === 0" class="sidebar-empty">
            <ChatLineRound />
            <strong>没有会话</strong>
            <span>新建一个会话开始编码任务。</span>
          </section>
        </div>
      </aside>

      <main class="conversation-workspace">
        <section class="workspace-strip">
          <div class="open-tabs">
            <button
              v-for="column in store.openColumns"
              :key="`tab-${column.sessionId}`"
              type="button"
              class="open-tab"
              :class="{ active: store.activeSessionId === column.sessionId }"
              @click="store.activeSessionId = column.sessionId"
            >
              <span>{{ sessionTitle(column.sessionId) }}</span>
              <Close @click.stop="store.closeSession(column.sessionId)" />
            </button>
          </div>
          <button type="button" class="ghost-small" @click="createSession">
            <DocumentAdd />
            新会话
          </button>
        </section>

        <section v-if="store.openColumns.length === 0" class="workspace-empty">
          <div class="empty-glyph"><ChatLineRound /></div>
          <strong>打开或创建一个 coding agent 会话</strong>
          <span>左侧管理多会话；中间流式查看消息、工具调用和权限请求。</span>
          <button type="button" class="primary-action" @click="createSession">
            <Plus />
            新建会话
          </button>
        </section>

        <section v-else class="conversation-columns">
          <article
            v-for="column in store.openColumns"
            :key="column.sessionId"
            class="conversation-column"
            :class="{ focused: column.sessionId === store.activeSessionId }"
            @click="store.activeSessionId = column.sessionId"
          >
            <header class="column-header">
              <div class="column-title">
                <span class="agent-mark" :class="`agent-mark--${sessionEngine(column.sessionId)}`">
                  <Cpu v-if="sessionEngine(column.sessionId) === 'claudecode'" />
                  <Connection v-else />
                </span>
                <div>
                  <strong>{{ sessionTitle(column.sessionId) }}</strong>
                  <small>{{ engineName(column.sessionId) }} · {{ sessionProject(column.sessionId) }}</small>
                </div>
              </div>
              <div class="column-actions">
                <span class="stream-chip" :class="{ on: column.streamConnected }">
                  {{ column.streamConnected ? 'stream' : 'offline' }}
                </span>
                <button type="button" title="重新加载" @click.stop="store.openSession(column.sessionId)">
                  <Refresh />
                </button>
                <button type="button" title="关闭" @click.stop="store.closeSession(column.sessionId)">
                  <Close />
                </button>
              </div>
            </header>

            <section class="message-thread">
              <div v-if="column.lastError" class="error-line">
                <Warning />
                <span>{{ column.lastError }}</span>
              </div>

              <template v-for="message in column.messages" :key="message.id">
                <article class="message-turn" :class="`message-turn--${message.role}`">
                  <div class="message-avatar">
                    <span v-if="message.role === 'user'">你</span>
                    <Cpu v-else-if="message.status === 'streaming'" class="spin" />
                    <Cpu v-else />
                  </div>
                  <div class="message-card" :class="{ 'message-card--user': message.role === 'user' }">
                    <div class="message-meta">
                      <strong>{{ message.role === 'user' ? 'User' : message.status === 'streaming' ? '思考' : 'Assistant' }}</strong>
                      <span>{{ formatClock(message.created_at) }}</span>
                    </div>
                    <div
                      v-if="message.content"
                      class="message-markdown"
                      v-html="renderMessage(message.content)"
                    ></div>
                    <div v-else-if="message.status === 'streaming'" class="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <div class="message-actions">
                      <button type="button" title="复制" @click.stop="copyMessage(message.content)"><CopyDocument /></button>
                      <button type="button" title="附件"><Paperclip /></button>
                      <button type="button" title="更多"><MoreFilled /></button>
                    </div>
                  </div>
                </article>

                <details
                  v-if="toolsForTurn(column, message.turn_id).length"
                  class="tool-group"
                  open
                >
                  <summary>
                    <Tools />
                    <span>运行 {{ toolsForTurn(column, message.turn_id).length }} 个工具</span>
                    <em>{{ toolGroupStatus(toolsForTurn(column, message.turn_id)) }}</em>
                  </summary>
                  <article
                    v-for="tool in toolsForTurn(column, message.turn_id)"
                    :key="tool.tool_call_id"
                    class="tool-call"
                  >
                    <header>
                      <span>{{ tool.name }}</span>
                      <em :class="`tool-status--${tool.status}`">{{ tool.status }}</em>
                    </header>
                    <pre v-if="toolPreview(tool)">{{ toolPreview(tool) }}</pre>
                  </article>
                </details>
              </template>

              <div v-if="column.messages.length === 0" class="thread-empty">
                <ChatLineRound />
                <strong>What would you like to build?</strong>
                <span>输入任务后会创建用户消息、启动 runtime，并通过 SSE 接收事件。</span>
              </div>
            </section>

            <section v-if="pendingPermission(column)" class="permission-panel">
              <header>
                <Warning />
                <strong>权限请求</strong>
              </header>
              <p>Agent 请求执行工具调用，需要你确认。</p>
              <div class="permission-actions">
                <button type="button" @click="respondPermission(pendingPermission(column)!.id, 'deny')">拒绝</button>
                <button type="button" class="approve" @click="respondPermission(pendingPermission(column)!.id, 'approve')">允许</button>
              </div>
            </section>

            <footer class="composer">
              <div class="context-bar">
                <button type="button" class="context-pill" title="切换工作目录" @click="changeProjectCwd(column.sessionId)">
                  <Folder />
                  <span>{{ shortProject(sessionProject(column.sessionId)) }}</span>
                  <ArrowDown />
                </button>
                <button type="button" class="context-pill" title="切换模式" @click="cycleMode(column)">
                  <CollectionTag />
                  <span>{{ column.selectedMode }}</span>
                  <ArrowDown />
                </button>
              </div>

              <textarea
                v-model="column.draft"
                :placeholder="sessionStatus(column.sessionId) === 'running' ? `${engineName(column.sessionId)} 正在响应...` : '发送消息给 coding agent...'"
                :disabled="column.sending"
                @keydown.shift.enter.prevent="send(column.sessionId)"
                @keydown.meta.enter.prevent="send(column.sessionId)"
                @keydown.ctrl.enter.prevent="send(column.sessionId)"
              ></textarea>

              <div class="composer-actions">
                <div v-if="column.pendingAttachments.length" class="attachment-strip">
                  <span
                    v-for="attachment in column.pendingAttachments"
                    :key="attachment.path || attachment.name"
                    class="attachment-chip"
                    :title="attachment.path || attachment.name"
                  >
                    <Paperclip />
                    {{ attachment.name }}
                    <button type="button" title="移除附件" @click.stop="removePendingAttachment(column, attachment.path || attachment.name)">
                      <Close />
                    </button>
                  </span>
                </div>
                <button type="button" class="icon-button" title="选择附件" @click="pickAttachments(column)">
                  <Plus />
                </button>
                <select v-model="column.permissionMode" title="权限模式">
                  <option value="bypass">Bypass Permissions</option>
                  <option value="full">Full Access</option>
                  <option value="yolo">YOLO</option>
                </select>
                <select v-model="column.model" title="模型">
                  <option value="">Default</option>
                  <option value="gpt-5.5">GPT-5.5</option>
                  <option value="claude">Claude</option>
                </select>
                <select v-model="column.effort" title="推理强度">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="xhigh">Xhigh</option>
                </select>
                <button
                  v-if="sessionStatus(column.sessionId) === 'running'"
                  type="button"
                  class="stop-button"
                  title="停止"
                  @click="store.cancelSession(column.sessionId)"
                >
                  <SwitchButton />
                </button>
                <button
                  v-else
                  type="button"
                  class="send-button"
                  title="发送"
                  :disabled="(!column.draft.trim() && column.pendingAttachments.length === 0) || column.sending"
                  @click="send(column.sessionId)"
                >
                  <Position />
                </button>
              </div>
            </footer>
          </article>
        </section>
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  ArrowLeft,
  ChatLineRound,
  Close,
  CollectionTag,
  Connection,
  CopyDocument,
  Cpu,
  DocumentAdd,
  Folder,
  FolderOpened,
  MoreFilled,
  Paperclip,
  Plus,
  Position,
  Refresh,
  Search,
  Setting,
  SwitchButton,
  Tools,
  Warning,
} from '@element-plus/icons-vue'
import { workbenchApi, type WorkbenchEngine, type WorkbenchPermission, type WorkbenchSessionStatus, type WorkbenchToolCall } from '@/api/workbench'
import { useAgentWorkbenchStore, type WorkbenchColumnState } from '@/stores/agentWorkbench'
import { renderMarkdown as renderMarkdownContent } from '@/utils/markdown'

const router = useRouter()
const store = useAgentWorkbenchStore()
const defaultWorkbenchAgentId = 'coding_workbench'
const searchText = ref('')
const engineFilter = ref<'all' | WorkbenchEngine>('all')
const collapsedGroups = ref(new Set<string>())
const creating = ref(false)

const workspaceName = computed(() => {
  const first = store.sessions.find((session) => session.project_cwd)?.project_cwd
  return first ? shortProject(first) : 'project-digital-employee'
})

const runningSessions = computed(() => store.sessions.filter((session) => session.status === 'running'))

const filteredSessions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return store.sessions.filter((session) => {
    if (engineFilter.value !== 'all' && session.engine !== engineFilter.value) return false
    if (!keyword) return true
    return [session.title, session.agent_id, session.project_cwd, session.engine]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })
})

const sessionGroups = computed(() => {
  const groups = new Map<string, { key: string; name: string; sessions: typeof store.sessions }>()
  for (const session of filteredSessions.value) {
    const key = session.project_cwd || 'default'
    const name = shortProject(key === 'default' ? workspaceName.value : key)
    if (!groups.has(key)) groups.set(key, { key, name, sessions: [] })
    groups.get(key)!.sessions.push(session)
  }
  return [...groups.values()]
})

const modeOptions = ['default', 'plan', 'build', 'review']

function engineLabel(engine: WorkbenchEngine) {
  return engine === 'codex' ? 'Codex CLI' : 'Claude Code'
}

function preferredAgent(engine: WorkbenchEngine | 'all' = 'all') {
  if (engine === 'all') {
    const defaultAgent = store.agentConfigs.find((agent) => agent.agent_id === defaultWorkbenchAgentId)
    if (defaultAgent) return defaultAgent
  }
  return store.agentConfigs.find((agent) => {
    if (engine !== 'all' && agent.engine !== engine) return false
    if (engine === 'codex') return agent.agent_id === 'codex_workbench'
    return agent.agent_id === defaultWorkbenchAgentId || agent.config_json?.workbenchDefault === true
  }) || store.agentConfigs.find((agent) => engine !== 'all' ? agent.engine === engine : agent.agent_id === defaultWorkbenchAgentId) || store.agentConfigs[0]
}

function statusLabel(status: WorkbenchSessionStatus) {
  const labels: Record<WorkbenchSessionStatus, string> = {
    idle: 'idle',
    running: 'running',
    completed: 'done',
    failed: 'failed',
    cancelled: 'cancelled',
  }
  return labels[status]
}

function sessionTitle(sessionId: string) {
  return store.sessionById(sessionId)?.title || '新会话'
}

function sessionEngine(sessionId: string): WorkbenchEngine {
  return store.sessionById(sessionId)?.engine || 'claudecode'
}

function engineName(sessionId: string) {
  return engineLabel(sessionEngine(sessionId))
}

function sessionProject(sessionId: string) {
  return store.sessionById(sessionId)?.project_cwd || workspaceName.value
}

function sessionStatus(sessionId: string) {
  return store.sessionById(sessionId)?.status || 'idle'
}

function shortProject(value: string) {
  const normalized = value.replace(/\\/g, '/')
  return normalized.split('/').filter(Boolean).pop() || normalized || 'workspace'
}

function relativeTime(value: number | null) {
  if (!value) return '--'
  const diff = Math.max(0, Date.now() - value * 1000)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function formatClock(value: number | null) {
  if (!value) return ''
  return new Date(value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toolsForTurn(column: WorkbenchColumnState, turnId: string | null) {
  if (!turnId) return []
  return column.toolCalls.filter((tool) => tool.turn_id === turnId)
}

function toolGroupStatus(tools: WorkbenchToolCall[]) {
  if (tools.some((tool) => tool.status === 'running')) return 'running'
  if (tools.some((tool) => tool.status === 'failed')) return 'failed'
  return 'done'
}

function toolPreview(tool: WorkbenchToolCall) {
  if (tool.error) return tool.error
  if (tool.content) return tool.content
  if (tool.output_json) return JSON.stringify(tool.output_json, null, 2)
  if (tool.input_json) return JSON.stringify(tool.input_json, null, 2)
  return ''
}

function pendingPermission(column: WorkbenchColumnState): WorkbenchPermission | null {
  return column.permissions.find((permission) => permission.status === 'pending') || null
}

function renderMessage(content: string) {
  return renderMarkdownContent(content || '', { profile: 'chat' })
}

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedGroups.value = next
}

async function changeProjectCwd(sessionId: string) {
  const current = store.sessionById(sessionId)?.project_cwd || sessionProject(sessionId)
  try {
    const selected = await workbenchApi.selectDirectory({ defaultPath: current })
    const selectedPath = selected.path
    const currentSession = store.sessionById(sessionId)
    const column = store.columns[sessionId]
    const hasHistory = Boolean(column?.messages.length || column?.toolCalls.length || column?.attachments.length)
    if (hasHistory) {
      const preferred = store.agentConfigs.find((agent) => agent.agent_id === currentSession?.agent_id) || preferredAgent(currentSession?.engine || 'all')
      const created = await store.createSession({
        title: `新编码会话 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        agentId: currentSession?.agent_id || preferred?.agent_id || defaultWorkbenchAgentId,
        engine: currentSession?.engine || preferred?.engine || 'claudecode',
        projectCwd: selectedPath,
        model: currentSession?.model || preferred?.default_model || undefined,
        mode: currentSession?.mode || 'default',
      })
      store.closeSession(sessionId)
      await store.openSession(created.id)
      ElMessage.success('已为新目录创建空会话')
      return
    }

    const response = await workbenchApi.updateSession(sessionId, { projectCwd: selectedPath })
    store.sessions = store.sessions.map((session) => session.id === response.session.id ? response.session : session)
    if (column) {
      column.messages = []
      column.toolCalls = []
      column.attachments = []
      column.permissions = []
      column.lastError = null
    }
    ElMessage.success('工作目录已更新')
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新工作目录失败'
    if (!message.includes('No directory selected')) ElMessage.error(message)
  }
}

async function cycleMode(column: WorkbenchColumnState) {
  const index = modeOptions.indexOf(column.selectedMode)
  const nextMode = modeOptions[(index + 1) % modeOptions.length]
  column.selectedMode = nextMode
  try {
    const response = await workbenchApi.updateSession(column.sessionId, { mode: nextMode })
    store.sessions = store.sessions.map((session) => session.id === response.session.id ? response.session : session)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新模式失败')
  }
}

async function refresh() {
  await Promise.all([store.loadAgentConfigs(), store.loadSessions()])
}

async function createSession() {
  if (creating.value) return
  creating.value = true
  try {
    const preferred = preferredAgent(engineFilter.value)
    await store.createSession({
      title: `新编码会话 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      agentId: preferred?.agent_id || defaultWorkbenchAgentId,
      engine: preferred?.engine || (engineFilter.value === 'codex' ? 'codex' : 'claudecode'),
      projectCwd: preferred?.default_cwd || undefined,
      model: preferred?.default_model || undefined,
    })
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建会话失败')
  } finally {
    creating.value = false
  }
}

async function send(sessionId: string) {
  try {
    await store.sendMessage(sessionId)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '发送失败')
  }
}

async function pickAttachments(column: WorkbenchColumnState) {
  try {
    const response = await workbenchApi.selectFiles({
      defaultPath: sessionProject(column.sessionId),
      multiple: true,
    })
    const existing = new Set(column.pendingAttachments.map((item) => item.path || item.name))
    const additions = response.files
      .filter((file) => !existing.has(file.path))
      .map((file) => ({
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType: file.mimeType || undefined,
      }))
    column.pendingAttachments = [...column.pendingAttachments, ...additions]
  } catch (err) {
    const message = err instanceof Error ? err.message : '选择附件失败'
    if (!message.includes('No file selected')) ElMessage.error(message)
  }
}

function removePendingAttachment(column: WorkbenchColumnState, key: string) {
  column.pendingAttachments = column.pendingAttachments.filter((attachment) => (attachment.path || attachment.name) !== key)
}

async function respondPermission(permissionId: number, decision: 'approve' | 'deny') {
  try {
    const response = await workbenchApi.respondPermission(permissionId, { decision })
    const column = store.columns[response.permission.session_id]
    if (column) {
      column.permissions = column.permissions.map((permission) => permission.id === response.permission.id ? response.permission : permission)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '权限响应失败')
  }
}

async function copyMessage(content: string) {
  if (!content) return
  await navigator.clipboard?.writeText(content)
  ElMessage.success('已复制')
}

onMounted(refresh)

onUnmounted(() => {
  store.closeAllStreams()
})
</script>

<style scoped>
.workbench-shell,
.workbench-shell * {
  box-sizing: border-box;
}

.workbench-shell {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: 34px minmax(0, 1fr);
  overflow: hidden;
  background: #08090b;
  color: #e5e7eb;
  font-size: 13px;
}

.workbench-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border-bottom: 1px solid #24262b;
  padding: 0 10px;
  background: #111216;
  color: #c7c9d1;
  user-select: none;
}

.window-dots {
  display: flex;
  gap: 6px;
  padding: 0 8px 0 2px;
}

.window-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.window-dots span:nth-child(1) { background: #ff5f57; }
.window-dots span:nth-child(2) { background: #febc2e; }
.window-dots span:nth-child(3) { background: #28c840; }

.titlebar-icon,
.primary-small,
.ghost-small,
.conversation-card,
.folder-row,
.open-tab,
.icon-button,
.send-button,
.stop-button,
.context-pill,
.primary-action,
.message-actions button,
.permission-actions button,
.column-actions button {
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.titlebar-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 6px;
  background: transparent;
  color: #8b8f99;
}

.titlebar-icon:hover {
  background: #24262c;
  color: #f4f4f5;
}

.titlebar-icon svg,
.primary-small svg,
.ghost-small svg,
.primary-action svg,
.agent-mark svg,
.folder-row svg,
.search-box svg,
.column-actions svg,
.context-pill svg,
.icon-button svg,
.send-button svg,
.stop-button svg,
.message-actions svg,
.permission-panel svg,
.empty-glyph svg,
.thread-empty svg {
  width: 14px;
  height: 14px;
}

.titlebar-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
}

.titlebar-main strong {
  color: #f4f4f5;
  font-size: 13px;
}

.titlebar-main span,
.titlebar-status {
  color: #8b8f99;
  font-size: 12px;
}

.titlebar-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
}

.status-led {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52525b;
}

.status-led.live {
  background: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
}

	.workbench-body {
	  display: grid;
	  grid-template-columns: 292px minmax(0, 1fr);
	  min-height: 0;
	  overflow: hidden;
	}
	
	.session-sidebar {
	  display: flex;
	  min-width: 0;
	  min-height: 0;
	  flex-direction: column;
	  background: #141519;
	}

.session-sidebar {
  border-right: 1px solid #24262b;
}

.session-toolbar {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #24262b;
  padding: 8px 12px;
}

.session-toolbar div {
  min-width: 0;
}

.session-toolbar strong {
  display: block;
  color: #f4f4f5;
  font-size: 13px;
}

.session-toolbar span {
  color: #8b8f99;
  font-size: 11px;
}

.primary-small,
.ghost-small,
.primary-action {
  display: inline-flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  padding: 0 10px;
  background: #f97316;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.primary-small:disabled,
.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ghost-small {
  background: #202228;
  color: #c7c9d1;
}

.sidebar-filters {
  display: grid;
  gap: 8px;
  border-bottom: 1px solid #202226;
  padding: 10px;
}

.search-box {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 8px;
  border: 1px solid #292b32;
  border-radius: 8px;
  padding: 0 9px;
  background: #0d0e12;
  color: #71717a;
}

.search-box input,
.sidebar-filters select,
.composer select,
.composer textarea {
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #d4d4d8;
  font: inherit;
}

.search-box input {
  width: 100%;
}

.sidebar-filters select {
  height: 30px;
  border: 1px solid #292b32;
  border-radius: 8px;
  padding: 0 8px;
  background: #0d0e12;
  color: #a1a1aa;
}

.folder-list {
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.folder-group + .folder-group {
  margin-top: 8px;
}

.folder-row {
  display: grid;
  grid-template-columns: 14px 16px minmax(0, 1fr) auto;
  width: 100%;
  align-items: center;
  gap: 6px;
  height: 28px;
  border-radius: 7px;
  padding: 0 6px;
  background: transparent;
  color: #9ca3af;
  text-align: left;
}

.folder-row:hover {
  background: #202228;
}

.folder-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-row em {
  border-radius: 7px;
  padding: 1px 6px;
  background: #2a1d14;
  color: #fb923c;
  font-style: normal;
  font-size: 11px;
}

.folder-chevron {
  transition: transform 0.16s ease;
}

.folder-chevron.collapsed {
  transform: rotate(-90deg);
}

.conversation-list {
  display: grid;
  gap: 3px;
  padding: 2px 0 0 19px;
}

.conversation-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  border-radius: 8px;
  padding: 7px 8px;
  background: transparent;
  text-align: left;
}

.conversation-card:hover,
.conversation-card.open {
  background: #202228;
}

.conversation-card.selected {
  background: #332116;
  box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.24);
}

.agent-mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 7px;
  background: #162033;
  color: #60a5fa;
}

.agent-mark--codex {
  background: #301d12;
  color: #fb923c;
}

.conversation-main {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.conversation-main strong,
.open-tab span,
.column-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-main strong {
  color: #e4e4e7;
  font-size: 12px;
}

.conversation-main small {
  overflow: hidden;
  color: #71717a;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-state {
  border-radius: 999px;
  padding: 2px 6px;
  background: #27272a;
  color: #a1a1aa;
  font-size: 10px;
}

.session-state--running {
  background: #3b2b12;
  color: #facc15;
}

.session-state--failed {
  background: #3b1018;
  color: #fb7185;
}

.session-state--completed {
  background: #10251a;
  color: #4ade80;
}

.sidebar-empty,
.thread-empty,
.workspace-empty {
  display: grid;
  place-items: center;
  gap: 8px;
  color: #71717a;
  text-align: center;
}

.sidebar-empty {
  padding: 40px 18px;
}

.sidebar-empty svg,
.thread-empty svg {
  width: 24px;
  height: 24px;
  color: #52525b;
}

.conversation-workspace {
  display: grid;
  grid-template-rows: 40px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #08090b;
}

.workspace-strip {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #24262b;
  padding: 6px 10px;
  background: #0d0e12;
}

.open-tabs {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 6px;
  overflow: auto;
}

.open-tab {
  display: inline-flex;
  max-width: 220px;
  height: 28px;
  align-items: center;
  gap: 8px;
  border-radius: 7px;
  padding: 0 8px 0 10px;
  background: #1a1c21;
  color: #a1a1aa;
  font-size: 12px;
}

.open-tab.active {
  background: #2b1d14;
  color: #fed7aa;
}

.open-tab svg {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
}

.workspace-empty {
  align-content: center;
  padding: 24px;
}

.empty-glyph {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 1px solid #292b32;
  border-radius: 14px;
  background: #111216;
  color: #fb923c;
}

.workspace-empty strong,
.thread-empty strong {
  color: #e5e7eb;
  font-size: 15px;
}

.primary-action {
  height: 32px;
  margin-top: 4px;
  min-width: 118px;
}

.conversation-columns {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.conversation-column {
  display: grid;
  grid-template-rows: 50px minmax(0, 1fr) auto auto;
  flex: 0 0 clamp(440px, 47vw, 680px);
  min-width: 420px;
  min-height: 0;
  border-right: 1px solid #24262b;
  background: #090a0d;
}

.conversation-column.focused {
  box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.25);
}

.column-header {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #24262b;
  padding: 9px 12px;
}

.column-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.column-title div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.column-title strong {
  color: #f4f4f5;
}

.column-title small {
  overflow: hidden;
  color: #71717a;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.column-actions button,
.message-actions button,
.icon-button,
.send-button,
.stop-button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: transparent;
  color: #8b8f99;
}

.column-actions button:hover,
.message-actions button:hover,
.icon-button:hover {
  background: #202228;
  color: #f4f4f5;
}

.stream-chip {
  border-radius: 999px;
  padding: 3px 7px;
  background: #1f1f23;
  color: #71717a;
  font-size: 10px;
}

.stream-chip.on {
  background: #10251a;
  color: #4ade80;
}

.message-thread {
  min-height: 0;
  overflow-y: auto;
  padding: 18px 18px 22px;
}

.error-line,
.permission-panel {
  display: flex;
  gap: 8px;
  border: 1px solid #7f1d1d;
  border-radius: 9px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #2a1013;
  color: #fecaca;
}

.error-line svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.message-turn {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.message-turn--user {
  grid-template-columns: minmax(0, 1fr) 28px;
}

.message-turn--user .message-avatar {
  grid-column: 2;
  grid-row: 1;
}

.message-turn--user .message-card {
  grid-column: 1;
  justify-self: end;
}

.message-avatar {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  background: #181a20;
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 800;
}

.message-avatar svg {
  width: 15px;
  height: 15px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message-card {
  position: relative;
  min-width: 0;
  max-width: 100%;
  color: #d4d4d8;
}

.message-card--user {
  max-width: min(78%, 520px);
  border: 1px solid #292b32;
  border-radius: 12px;
  padding: 10px 12px;
  background: #1a1c21;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: #71717a;
  font-size: 11px;
}

.message-meta strong {
  color: #a1a1aa;
  font-size: 12px;
}

.message-markdown {
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.65;
}

.message-markdown :deep(*) {
  max-width: 100%;
}

.message-markdown :deep(p) {
  margin: 0 0 10px;
}

.message-markdown :deep(p:last-child),
.message-markdown :deep(ul:last-child),
.message-markdown :deep(ol:last-child),
.message-markdown :deep(pre:last-child) {
  margin-bottom: 0;
}

.message-markdown :deep(ul),
.message-markdown :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.message-markdown :deep(code) {
  border-radius: 5px;
  padding: 1px 4px;
  background: #181a20;
  color: #fed7aa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.message-markdown :deep(pre) {
  overflow: auto;
  border: 1px solid #24262b;
  border-radius: 9px;
  margin: 10px 0;
  padding: 12px;
  background: #0f1014;
}

.message-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  color: #d4d4d8;
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 7px;
  opacity: 0.72;
}

.message-actions button {
  width: 22px;
  height: 22px;
}

.message-actions svg {
  width: 12px;
  height: 12px;
}

.typing-dots {
  display: inline-flex;
  gap: 5px;
  padding: 8px 0;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #71717a;
  animation: pulse 1.2s ease-in-out infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes pulse {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

.tool-group {
  margin: -6px 0 16px 38px;
  border: 1px solid #24262b;
  border-radius: 10px;
  background: #111216;
}

.tool-group summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 10px;
  color: #c7c9d1;
  font-size: 12px;
  list-style: none;
}

.tool-group summary::-webkit-details-marker {
  display: none;
}

.tool-group summary em {
  margin-left: auto;
  color: #fb923c;
  font-style: normal;
}

.tool-call {
  border-top: 1px solid #24262b;
  padding: 8px 10px 10px;
}

.tool-call header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.tool-call header span {
  color: #f4f4f5;
  font-size: 12px;
}

.tool-call header em {
  margin-left: auto;
  color: #8b8f99;
  font-style: normal;
  font-size: 11px;
}

.tool-status--failed { color: #fb7185 !important; }
.tool-status--completed { color: #4ade80 !important; }
.tool-status--running { color: #facc15 !important; }

.tool-call pre {
  max-height: 190px;
  overflow: auto;
  border-radius: 8px;
  margin: 8px 0 0;
  padding: 10px;
  background: #090a0d;
  color: #a1a1aa;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.thread-empty {
  height: 100%;
  align-content: center;
  padding: 40px;
}

.permission-panel {
  display: grid;
  margin: 0 12px 10px;
  border-color: #713f12;
  background: #241909;
  color: #fde68a;
}

.permission-panel header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-panel p {
  margin: 0;
  color: #d6d3d1;
  font-size: 12px;
}

.permission-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.permission-actions button {
  height: 28px;
  border-radius: 7px;
  padding: 0 10px;
  background: #292524;
  color: #e7e5e4;
}

.permission-actions .approve {
  background: #f97316;
  color: #fff;
}

.composer {
  margin: 0 12px 12px;
  border: 1px solid #2b2d35;
  border-radius: 12px;
  background: #101115;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.22);
}

.context-bar {
  display: flex;
  min-width: 0;
  gap: 7px;
  overflow: hidden;
  padding: 8px 9px 0;
}

.context-pill {
  display: inline-flex;
  min-width: 0;
  height: 26px;
  align-items: center;
  gap: 5px;
  border-radius: 8px;
  padding: 0 8px;
  background: #181a20;
  color: #a1a1aa;
  font-size: 11px;
}

.context-pill span {
  overflow: hidden;
  max-width: 130px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer textarea {
  display: block;
  width: 100%;
  min-height: 66px;
  max-height: 190px;
  resize: vertical;
  padding: 12px 12px 7px;
  color: #f4f4f5;
  line-height: 1.5;
}

.composer-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  padding: 0 9px 9px;
}

.attachment-strip {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  gap: 6px;
  overflow-x: auto;
}

.attachment-chip {
  display: inline-flex;
  min-width: 0;
  max-width: 180px;
  height: 28px;
  flex: 0 1 auto;
  align-items: center;
  gap: 5px;
  border: 1px solid #2b2d35;
  border-radius: 8px;
  padding: 0 5px 0 8px;
  background: #181a20;
  color: #d4d4d8;
  font-size: 11px;
}

.attachment-chip > svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.attachment-chip button {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 5px;
  color: #8b8f99;
}

.attachment-chip button:hover {
  background: #2b2d35;
  color: #f4f4f5;
}

.composer select {
  max-width: 150px;
  height: 28px;
  border-radius: 8px;
  padding: 0 7px;
  color: #a1a1aa;
  font-size: 11px;
}

.composer select:hover {
  background: #181a20;
}

.send-button,
.stop-button {
  flex: 0 0 auto;
  margin-left: auto;
  background: #f97316;
  color: #fff;
}

.stop-button {
  background: #7f1d1d;
  color: #fecaca;
}

@media (max-width: 1200px) {
  .workbench-body {
    grid-template-columns: 270px minmax(0, 1fr);
  }

  .conversation-column {
    flex-basis: clamp(420px, 68vw, 620px);
  }
}

@media (max-width: 760px) {
  .workbench-body {
    grid-template-columns: 1fr;
  }

  .session-sidebar {
    display: none;
  }

  .conversation-column {
    flex-basis: 100%;
    min-width: 100%;
  }

  .composer-actions select {
    display: none;
  }
}
</style>
