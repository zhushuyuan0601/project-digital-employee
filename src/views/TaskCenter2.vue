<template>
  <div class="task-command-page">
    <TaskControlBar
      :ai-status="aiStatus"
      :ai-status-text="aiStatusText"
      :all-connected="allConnected"
      :any-connected="anyConnected"
      :is-light="isLight"
      :timestamp-text="timestampText"
      :current-user="currentUserLabel"
      @toggle-theme="toggleTheme"
      @connect-all="handleConnectAll"
      @disconnect-all="handleDisconnectAll"
      @reset="handleRefresh"
    />

    <div class="task-command-layout">
      <aside class="task-rail">
        <section class="surface task-create">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">任务入口</p>
              <h2>小呦任务分发</h2>
            </div>
            <span class="agent-pill">ceo</span>
          </div>
          <button class="create-launcher" type="button" @click="createDialog = true">
            <span>
              <i class="ri-add-line"></i>
            </span>
            <strong>新增协作任务</strong>
          </button>
        </section>

        <section class="surface task-list">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">任务队列</p>
              <h2>活跃任务</h2>
            </div>
            <button class="icon-btn" type="button" title="刷新任务" @click="handleRefresh">
              <i class="ri-refresh-line"></i>
            </button>
          </div>

          <div v-if="tasksStore.loading" class="quiet-state">任务加载中...</div>
          <div v-else-if="tasks.length === 0" class="quiet-state">暂无任务，先创建一个协作目标。</div>
          <template v-else>
            <button
              v-for="task in tasks"
              :key="task.id"
              type="button"
              class="task-row"
              :class="{ active: selectedTask?.id === task.id }"
              @click="selectTask(task.id)"
            >
              <div class="task-row__top">
                <strong>{{ task.title }}</strong>
                <span class="status-chip" :class="`status-chip--${task.status}`">{{ statusText(task.status) }}</span>
              </div>
              <div class="task-row__meta">
                <span>{{ task.progress || 0 }}%</span>
                <span>{{ task.completed_subtask_count || completedCount(task) }}/{{ task.subtask_count || task.subtasks?.length || 0 }} 子任务</span>
                <span>{{ formatTime(task.updated_at) }}</span>
              </div>
              <div class="mini-progress">
                <span :style="{ width: `${task.progress || 0}%` }"></span>
              </div>
            </button>
          </template>
        </section>
      </aside>

      <main class="mission-stage">
        <section v-if="selectedTask" class="surface mission-hero">
          <div class="mission-hero__copy">
            <p class="eyebrow">当前任务</p>
            <h1>{{ selectedTask.title }}</h1>
            <p>{{ selectedTask.description }}</p>
          </div>
          <div class="mission-hero__metrics">
            <div>
              <span>进度</span>
              <strong>{{ selectedTask.progress || 0 }}%</strong>
            </div>
            <div>
              <span>子任务</span>
              <strong>{{ completedCount(selectedTask) }}/{{ selectedTask.subtasks.length }}</strong>
            </div>
            <div>
              <span>成果</span>
              <strong>{{ selectedTask.outputs.length }}</strong>
            </div>
          </div>
        </section>

        <section v-if="selectedTask?.subtasks.length" class="surface team-live">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">协作现场</p>
              <h2>团队成员正在处理什么</h2>
            </div>
            <span class="status-chip status-chip--running">{{ selectedTask.subtasks.length }} 名成员</span>
          </div>
          <div class="team-live-grid">
            <button
              v-for="subtask in selectedTask.subtasks"
              :key="subtask.id"
              class="member-card"
              type="button"
              @click="openMemberConversation(subtask)"
            >
              <div class="member-card__top">
                <span class="member-avatar">{{ agentInitial(subtask.assigned_agent_id) }}</span>
                <div>
                  <strong>{{ agentName(subtask.assigned_agent_id) }}</strong>
                  <small>{{ subtask.title }}</small>
                </div>
                <i class="ri-message-3-line"></i>
              </div>
              <div class="member-card__activity">
                <span class="status-chip" :class="`status-chip--${subtask.status}`">{{ subtaskStatusText(subtask.status) }}</span>
                <span>{{ subtask.progress || 0 }}%</span>
              </div>
              <p>{{ latestAgentMessage(subtask.assigned_agent_id) || subtask.description }}</p>
            </button>
          </div>
        </section>

        <section v-if="selectedTask && needsPlan(selectedTask)" class="surface plan-console">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">拆解计划</p>
              <h2>应用小呦返回的 JSON</h2>
            </div>
            <button class="ghost-btn" type="button" @click="fillFromCoordinator">
              <i class="ri-robot-line"></i>
              使用小呦最新回复
            </button>
          </div>
          <textarea
            v-model="planDraft"
            class="field field--plan"
            placeholder="粘贴小呦返回的结构化 JSON，平台会校验并自动派发子任务。"
          ></textarea>
          <div class="plan-actions">
            <span>状态：{{ statusText(selectedTask.status) }}</span>
            <button class="primary-btn" type="button" :disabled="applyingPlan || !planDraft.trim()" @click="applyPlan">
              <i class="ri-node-tree"></i>
              {{ applyingPlan ? '应用中' : '校验并派发' }}
            </button>
          </div>
        </section>

        <section v-if="selectedTask" class="surface subtask-board">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">执行板</p>
              <h2>子任务和负责人</h2>
            </div>
            <button class="ghost-btn" type="button" :disabled="scanningOutputs" @click="scanOutputs">
              <i class="ri-folder-search-line"></i>
              {{ scanningOutputs ? '扫描中' : '扫描成果' }}
            </button>
          </div>

          <div v-if="selectedTask.subtasks.length === 0" class="quiet-state">等待小呦拆解计划。</div>
          <div v-else class="subtask-grid">
            <article v-for="subtask in selectedTask.subtasks" :key="subtask.id" class="subtask-card">
              <div class="subtask-card__head">
                <span class="agent-token">{{ agentName(subtask.assigned_agent_id) }}</span>
                <span class="status-chip" :class="`status-chip--${subtask.status}`">{{ subtaskStatusText(subtask.status) }}</span>
              </div>
              <h3>{{ subtask.title }}</h3>
              <p>{{ subtask.description }}</p>
              <div class="subtask-progress">
                <span :style="{ width: `${subtask.progress || 0}%` }"></span>
              </div>
              <div class="subtask-meta">
                <span>{{ subtask.progress || 0 }}%</span>
                <span>{{ subtask.session_key }}</span>
              </div>
              <p v-if="subtask.error" class="error-line">{{ subtask.error }}</p>
              <div class="subtask-actions">
                <button class="ghost-btn ghost-btn--compact" type="button" @click="retrySubtask(subtask.id)">
                  <i class="ri-restart-line"></i>
                  重试
                </button>
                <button class="ghost-btn ghost-btn--compact" type="button" :disabled="subtask.status === 'completed'" @click="completeSubtask(subtask.id)">
                  <i class="ri-check-line"></i>
                  标记完成
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="!selectedTask" class="surface empty-mission">
          <i class="ri-route-line"></i>
          <h2>选择或创建一个任务</h2>
          <p>平台会把任务交给小呦拆解，再由系统派发给研究、产品、研发和测试 Agent。</p>
        </section>
      </main>

      <aside class="task-inspector">
        <section class="surface">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">事件流</p>
              <h2>真实进度</h2>
            </div>
          </div>
          <div v-if="!selectedTask?.events?.length" class="quiet-state">暂无事件。</div>
          <div v-else class="event-list">
            <div v-for="event in selectedTask.events" :key="event.id" class="event-item">
              <span class="event-dot"></span>
              <div>
                <strong>{{ event.type }}</strong>
                <p>{{ event.message }}</p>
                <small>{{ formatTime(event.created_at) }} · {{ event.agent_id || 'system' }}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="surface outputs-panel">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">成果资产</p>
              <h2>任务归属</h2>
            </div>
          </div>
          <div v-if="!selectedTask?.outputs?.length" class="quiet-state">暂无绑定成果。</div>
          <button
            v-for="output in selectedTask?.outputs || []"
            :key="output.id"
            type="button"
            class="output-row"
            @click="previewOutput(output)"
          >
            <i :class="fileIcon(output.name)"></i>
            <span>{{ output.name }}</span>
            <small>{{ agentName(output.agent_id || '') }}</small>
          </button>
        </section>

        <section v-if="selectedTask" class="surface review-panel">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">汇总验收</p>
              <h2>小呦收口</h2>
            </div>
          </div>
          <textarea v-model="summaryDraft" class="field field--textarea" placeholder="最终验收备注，可留空。"></textarea>
          <div class="review-actions">
            <button class="ghost-btn" type="button" :disabled="!canFinalize" @click="finalizeTask">
              <i class="ri-file-list-3-line"></i>
              请求汇总
            </button>
            <button class="primary-btn" type="button" :disabled="selectedTask.status === 'completed'" @click="completeTask">
              <i class="ri-archive-line"></i>
              验收归档
            </button>
          </div>
          <p v-if="selectedTask.summary" class="summary-text">{{ selectedTask.summary }}</p>
        </section>
      </aside>
    </div>

    <el-dialog v-model="previewDialog" :title="previewFileItem?.name || '成果预览'" width="880px">
      <div v-if="previewLoading" class="preview-state">加载中...</div>
      <div v-else-if="previewError" class="preview-state preview-state--error">{{ previewError }}</div>
      <div v-else-if="previewFileItem" class="preview-content">
        <div v-if="previewType === 'markdown'" class="markdown-rendered" v-html="renderPreview()"></div>
        <pre v-else>{{ previewContent }}</pre>
      </div>
    </el-dialog>

    <el-dialog v-model="createDialog" title="新增协作任务" width="560px" class="task-create-dialog">
      <div class="dialog-create-form">
        <div class="dialog-create-form__head">
          <span class="agent-pill">ceo</span>
          <p>任务会先交给小呦拆解，再由平台通过 WebSocket 派发给执行 Agent。</p>
        </div>
        <label>
          <span>任务标题</span>
          <input v-model="createForm.title" class="field" placeholder="例如：东南亚智能客服上线方案" />
        </label>
        <label>
          <span>任务描述</span>
          <textarea v-model="createForm.description" class="field field--textarea" placeholder="描述目标、背景和期望交付物"></textarea>
        </label>
        <label>
          <span>优先级</span>
          <select v-model="createForm.priority" class="field field--select" aria-label="任务优先级">
            <option value="normal">普通</option>
            <option value="high">高优先级</option>
            <option value="urgent">紧急</option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <button class="ghost-btn" type="button" :disabled="creating" @click="createDialog = false">取消</button>
          <button class="primary-btn" type="button" :disabled="creating || !canCreateTask" @click="createTask">
            <i class="ri-send-plane-line"></i>
            {{ creating ? '创建中' : '创建任务' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="memberDialog" width="760px" class="member-dialog">
      <template #header>
        <div class="member-dialog__header" v-if="activeMemberSubtask">
          <span class="member-avatar">{{ agentInitial(activeMemberSubtask.assigned_agent_id) }}</span>
          <div>
            <p class="eyebrow">成员对话</p>
            <h2>{{ agentName(activeMemberSubtask.assigned_agent_id) }} · {{ activeMemberSubtask.title }}</h2>
          </div>
          <span class="status-chip" :class="`status-chip--${activeMemberSubtask.status}`">{{ subtaskStatusText(activeMemberSubtask.status) }}</span>
        </div>
      </template>
      <div v-if="activeMemberSubtask" class="member-chat-shell">
        <div class="member-task-context">
          <strong>负责内容</strong>
          <p>{{ activeMemberSubtask.description }}</p>
        </div>
        <div class="member-chat-list">
          <div v-if="activeMemberMessages.length === 0" class="quiet-state">暂无对话。派发任务后，这里会显示平台与 OpenClaw 的问答。</div>
          <div
            v-for="message in activeMemberMessages"
            :key="message.id"
            class="chat-bubble"
            :class="`chat-bubble--${message.role}`"
          >
            <div class="chat-bubble__meta">
              <span>{{ message.role === 'user' ? '平台' : message.role === 'assistant' ? agentName(activeMemberSubtask.assigned_agent_id) : '系统' }}</span>
              <small>{{ formatMsTime(message.timestamp) }}</small>
            </div>
            <p>{{ message.content }}</p>
          </div>
        </div>
        <div class="member-followup">
          <textarea v-model="memberFollowupDraft" class="field" placeholder="继续追问这个成员，例如：请补充风险和文件路径"></textarea>
          <button class="primary-btn" type="button" :disabled="sendingMemberFollowup || !memberFollowupDraft.trim()" @click="sendMemberFollowup">
            <i class="ri-send-plane-line"></i>
            {{ sendingMemberFollowup ? '发送中' : '发送追问' }}
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import TaskControlBar from '@/components/task-center/TaskControlBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useTasksStore } from '@/stores/tasks'
import { useThemeStore } from '@/stores/theme'
import { extractChatText, extractText } from '@/utils/gateway-protocol'
import type { Subtask, Task, TaskDispatch, TaskOutput, TaskStatus, SubtaskStatus } from '@/types/task'

const tasksStore = useTasksStore()
const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const route = useRoute()
const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const createForm = reactive({
  title: '',
  description: '',
  priority: 'normal',
})
const createDialog = ref(false)
const creating = ref(false)
const applyingPlan = ref(false)
const scanningOutputs = ref(false)
const planDraft = ref('')
const summaryDraft = ref('')
const currentTimeMs = ref(Date.now())
const previewDialog = ref(false)
const previewFileItem = ref<TaskOutput | null>(null)
const previewContent = ref('')
const previewType = ref('')
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const memberDialog = ref(false)
const activeMemberSubtaskId = ref('')
const memberFollowupDraft = ref('')
const sendingMemberFollowup = ref(false)
let clockTimer: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
type PendingTaskDispatch = { taskId: string; subtaskId: string; agentId: string; sessionKey: string; sentAt: number }
type GatewayTaskEventType = 'start' | 'assistant' | 'final' | 'done' | 'error'
const pendingTaskDispatches = ref<Record<string, PendingTaskDispatch>>({})
const recordedGatewayEvents = new Set<string>()

const tasks = computed(() => tasksStore.tasks)
const selectedTask = computed(() => tasksStore.selectedTask)
const isLight = computed(() => themeStore.isLight)
const allConnected = computed(() => multiAgentStore.allConnected)
const anyConnected = computed(() => multiAgentStore.anyConnected)
const aiStatus = computed<'connected' | 'disconnected' | 'error'>(() => allConnected.value ? 'connected' : anyConnected.value ? 'error' : 'disconnected')
const aiStatusText = computed(() => allConnected.value ? '全部 Agent 在线' : anyConnected.value ? '部分 Agent 在线' : 'Gateway 未连接')
const timestampText = computed(() => new Date(currentTimeMs.value).toLocaleString('zh-CN', { hour12: false }))
const currentUserLabel = computed(() => authStore.user?.username || 'Admin')
const canCreateTask = computed(() => createForm.title.trim().length > 0 && createForm.description.trim().length > 0)
const canFinalize = computed(() => !!selectedTask.value?.subtasks.length && selectedTask.value.subtasks.every(subtask => subtask.status === 'completed'))
const activeMemberSubtask = computed(() => selectedTask.value?.subtasks.find(subtask => subtask.id === activeMemberSubtaskId.value) || null)
const activeMemberMessages = computed(() => {
  const agentId = activeMemberSubtask.value?.assigned_agent_id
  if (!agentId) return []
  return multiAgentStore.agents[agentId]?.messages || []
})

const agentLabels: Record<string, string> = {
  xiaomu: '小呦',
  xiaoyan: '研究员',
  xiaochan: '产品经理',
  xiaokai: '研发工程师',
  xiaoce: '测试员',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  draft: '草稿',
  planning: '拆解中',
  dispatching: '派发中',
  running: '执行中',
  reviewing: '待验收',
  completed: '已完成',
  failed: '异常',
  cancelled: '已取消',
}

const subtaskStatusLabels: Record<SubtaskStatus, string> = {
  pending: '待派发',
  assigned: '已分配',
  running: '执行中',
  blocked: '阻塞',
  completed: '完成',
  failed: '失败',
}

async function handleRefresh() {
  await tasksStore.fetchTasks()
  if (tasksStore.error) ElMessage.error(tasksStore.error)
}

async function selectTask(taskId: string) {
  try {
    await tasksStore.fetchTask(taskId)
    planDraft.value = ''
    summaryDraft.value = selectedTask.value?.summary || ''
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载任务失败')
  }
}

async function createTask() {
  if (!canCreateTask.value || creating.value) return
  creating.value = true
  try {
    const response = await tasksStore.createTask({
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      priority: createForm.priority,
    })
    createForm.title = ''
    createForm.description = ''
    createDialog.value = false
    const sent = await sendCoordinatorDispatch(response.dispatch, 'plan')
    if (sent) {
      ElMessage.success('任务已创建，并已通过 WebSocket 请求小呦拆解')
    } else {
      ElMessage.warning('任务已创建，但 WebSocket 派发失败，请先全连 Agent 后重试')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建任务失败')
  } finally {
    creating.value = false
  }
}

function fillFromCoordinator() {
  const coordinator = multiAgentStore.agents.xiaomu
  const latest = [...(coordinator?.messages || [])].reverse().find(message => message.role === 'assistant' && message.content.includes('{'))
  if (!latest) {
    ElMessage.warning('没有找到小呦最近的 JSON 回复')
    return
  }
  planDraft.value = latest.content
}

async function applyPlan() {
  if (!selectedTask.value || !planDraft.value.trim()) return
  applyingPlan.value = true
  try {
    const response = await tasksStore.applyPlan(selectedTask.value.id, planDraft.value)
    planDraft.value = ''
    const result = await sendSubtaskDispatches(response.dispatches || [])
    if (result.failed > 0) {
      ElMessage.warning(`计划已校验，${result.sent} 个子任务已派发，${result.failed} 个失败：${result.firstError}`)
    } else {
      ElMessage.success(`计划已校验，${result.sent} 个子任务已通过 WebSocket 派发`)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '计划应用失败')
    await tasksStore.fetchTask(selectedTask.value.id)
  } finally {
    applyingPlan.value = false
  }
}

async function retrySubtask(subtaskId: string) {
  try {
    const response = await tasksStore.retrySubtask(subtaskId)
    const result = response.dispatch ? await sendSubtaskDispatch(response.dispatch) : { ok: false, error: '缺少派发指令' }
    if (result.ok) {
      ElMessage.success('子任务已通过 WebSocket 重新派发')
    } else {
      ElMessage.warning(`已生成重试指令，但 WebSocket 派发失败：${result.error}`)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '重试失败')
  }
}

async function completeSubtask(subtaskId: string) {
  try {
    await tasksStore.completeSubtask(subtaskId, '由操作员在任务指挥中心确认完成')
    ElMessage.success('子任务已标记完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新失败')
  }
}

async function scanOutputs() {
  if (!selectedTask.value || scanningOutputs.value) return
  scanningOutputs.value = true
  try {
    await tasksStore.scanOutputs(selectedTask.value.id)
    ElMessage.success('成果扫描完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '成果扫描失败')
  } finally {
    scanningOutputs.value = false
  }
}

async function finalizeTask() {
  if (!selectedTask.value) return
  try {
    const response = await tasksStore.finalizeTask(selectedTask.value.id)
    const sent = await sendCoordinatorDispatch(response.dispatch, 'summary')
    if (sent) {
      ElMessage.success('已通过 WebSocket 请求小呦生成最终汇总')
    } else {
      ElMessage.warning('已生成汇总请求，但 WebSocket 派发失败，请先连接小呦后重试')
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '汇总请求失败')
  }
}

async function completeTask() {
  if (!selectedTask.value) return
  const confirmed = await ElMessageBox.confirm('确认将该任务标记为验收完成并归档？', '验收归档', {
    confirmButtonText: '归档',
    cancelButtonText: '取消',
    type: 'success',
  }).catch(() => false)
  if (!confirmed) return
  try {
    await tasksStore.completeTask(selectedTask.value.id, summaryDraft.value.trim())
    ElMessage.success('任务已归档')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '归档失败')
  }
}

async function previewOutput(output: TaskOutput) {
  previewFileItem.value = output
  previewDialog.value = true
  previewContent.value = ''
  previewType.value = output.type
  previewError.value = null
  if (!output.path) {
    previewContent.value = output.git_url || '该成果没有可预览路径'
    return
  }
  previewLoading.value = true
  try {
    const data = await fetch(`/api/files/content?path=${encodeURIComponent(output.path)}`).then(res => res.json())
    if (!data.success) throw new Error(data.error || '读取失败')
    previewContent.value = data.content || ''
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    previewLoading.value = false
  }
}

function renderPreview() {
  return md.render(previewContent.value)
}

function completedCount(task: Task) {
  return task.subtasks?.filter(subtask => subtask.status === 'completed').length || 0
}

function needsPlan(task: Task) {
  return ['planning', 'dispatching', 'failed'].includes(task.status) && !task.subtasks.length
}

function statusText(status: TaskStatus) {
  return taskStatusLabels[status] || status
}

function subtaskStatusText(status: SubtaskStatus) {
  return subtaskStatusLabels[status] || status
}

function agentName(agentId: string) {
  return agentLabels[agentId] || agentId || '未归属'
}

function agentInitial(agentId: string) {
  return agentName(agentId).slice(0, 1)
}

function latestAgentMessage(agentId: string) {
  const messages = multiAgentStore.agents[agentId]?.messages || []
  return [...messages].reverse().find(message => message.role === 'assistant')?.content || ''
}

function openMemberConversation(subtask: Subtask) {
  activeMemberSubtaskId.value = subtask.id
  memberFollowupDraft.value = ''
  memberDialog.value = true
  multiAgentStore.selectAgent(subtask.assigned_agent_id)
}

async function sendMemberFollowup() {
  const subtask = activeMemberSubtask.value
  const task = selectedTask.value
  if (!subtask || !task || !memberFollowupDraft.value.trim()) return
  sendingMemberFollowup.value = true
  const message = `[OpenClaw Task Follow-up]
taskId: ${task.id}
subTaskId: ${subtask.id}
主任务: ${task.title}
子任务: ${subtask.title}

用户补充/追问:
${memberFollowupDraft.value.trim()}

请基于当前子任务上下文继续回答；如果产生文件，请继续写入任务目录。`
  try {
    multiAgentStore.sendMessage(subtask.assigned_agent_id, message)
    rememberSubtaskDispatch({
      taskId: task.id,
      subtaskId: subtask.id,
      agentId: subtask.assigned_agent_id,
      sessionKey: subtask.session_key,
      message,
    })
    await tasksStore.recordSubtaskDispatchResult(subtask.id, {
      ok: true,
      payload: {
        mode: 'member-followup',
        agentId: subtask.assigned_agent_id,
        sessionKey: subtask.session_key,
      },
    })
    memberFollowupDraft.value = ''
    ElMessage.success('已发送给成员')
  } catch (err) {
    ElMessage.error(toErrorMessage(err))
  } finally {
    sendingMemberFollowup.value = false
  }
}

function loadPendingTaskDispatches() {
  try {
    pendingTaskDispatches.value = JSON.parse(localStorage.getItem('task_center_pending_dispatches') || '{}')
  } catch {
    pendingTaskDispatches.value = {}
  }
}

function persistPendingTaskDispatches() {
  localStorage.setItem('task_center_pending_dispatches', JSON.stringify(pendingTaskDispatches.value))
}

function rememberSubtaskDispatch(dispatch: TaskDispatch) {
  if (!dispatch.subtaskId) return
  pendingTaskDispatches.value[dispatch.agentId] = {
    taskId: dispatch.taskId,
    subtaskId: dispatch.subtaskId,
    agentId: dispatch.agentId,
    sessionKey: dispatch.sessionKey,
    sentAt: Date.now(),
  }
  persistPendingTaskDispatches()
}

function clearSubtaskDispatch(agentId: string, subtaskId: string) {
  if (pendingTaskDispatches.value[agentId]?.subtaskId === subtaskId) {
    delete pendingTaskDispatches.value[agentId]
    persistPendingTaskDispatches()
  }
}

function loadedTasks() {
  const map = new Map<string, Task>()
  tasks.value.forEach(task => map.set(task.id, task))
  if (selectedTask.value) map.set(selectedTask.value.id, selectedTask.value)
  return [...map.values()]
}

function findSubtaskIdFromText(text: string) {
  if (!text) return ''
  const explicit = text.match(/subTaskId\s*[:：]\s*([a-zA-Z0-9_-]+)/i) || text.match(/subtaskId\s*[:：]\s*([a-zA-Z0-9_-]+)/i)
  if (explicit?.[1]) return explicit[1]
  for (const task of loadedTasks()) {
    const match = task.subtasks?.find(subtask => text.includes(subtask.id))
    if (match) return match.id
  }
  return ''
}

function findSubtaskForGatewayEvent(agentId: string, text: string) {
  const textSubtaskId = findSubtaskIdFromText(text)
  if (textSubtaskId) {
    for (const task of loadedTasks()) {
      const subtask = task.subtasks?.find(item => item.id === textSubtaskId)
      if (subtask) return { task, subtaskId: subtask.id }
    }
  }

  const pending = pendingTaskDispatches.value[agentId]
  if (pending) {
    const task = loadedTasks().find(item => item.id === pending.taskId)
    if (task?.subtasks?.some(subtask => subtask.id === pending.subtaskId)) {
      return { task, subtaskId: pending.subtaskId }
    }
    return { task: selectedTask.value || undefined, subtaskId: pending.subtaskId }
  }

  const task = selectedTask.value
  const active = task?.subtasks?.find(subtask =>
    subtask.assigned_agent_id === agentId && ['assigned', 'running', 'blocked'].includes(subtask.status)
  )
  return active ? { task, subtaskId: active.id } : null
}

function gatewayEventKind(event: string, payload: any): GatewayTaskEventType | null {
  if (event === 'chat') {
    if (payload?.state === 'start') return 'start'
    if (payload?.state === 'final' || payload?.state === 'committed') return 'final'
    if (payload?.state === 'error') return 'error'
    if (payload?.state === 'delta') return 'assistant'
  }
  if (event === 'agent') {
    const stream = payload?.stream
    const state = payload?.data?.state || payload?.phase
    if (stream === 'assistant') return 'assistant'
    if (stream === 'lifecycle' && state === 'start') return 'start'
    if (stream === 'lifecycle' && (state === 'done' || state === 'final')) return 'done'
    if (stream === 'lifecycle' && (state === 'error' || payload?.phase === 'error')) return 'error'
  }
  return null
}

function gatewayEventText(event: string, payload: any) {
  if (event === 'chat') return extractChatText(payload) || payload?.errorMessage || ''
  if (event === 'agent') return extractText(payload) || payload?.data?.error || payload?.error || ''
  return ''
}

async function handleTaskGatewayEvent(agentId: string, event: string, payload: any) {
  const eventType = gatewayEventKind(event, payload)
  if (!eventType) return

  const message = gatewayEventText(event, payload)
  const match = findSubtaskForGatewayEvent(agentId, message)
  if (!match?.subtaskId) return

  const runId = payload?.runId || payload?.data?.runId || 'default'
  const eventKey = `${match.subtaskId}:${eventType}:${runId}`
  if (recordedGatewayEvents.has(eventKey)) return
  recordedGatewayEvents.add(eventKey)

  try {
    await tasksStore.recordSubtaskAgentEvent(match.subtaskId, {
      eventType,
      message,
      payload: {
        gatewayEvent: event,
        agentId,
        runId,
        state: payload?.state,
        stream: payload?.stream,
        phase: payload?.phase,
      },
    })
    if (eventType === 'final' || eventType === 'done') {
      clearSubtaskDispatch(agentId, match.subtaskId)
      if (match.task?.id) {
        tasksStore.scanOutputs(match.task.id).catch(() => {})
        window.setTimeout(() => tasksStore.scanOutputs(match.task!.id).catch(() => {}), 2500)
      }
    }
  } catch (err) {
    console.error('[TaskCenter2] 写入 Agent 任务事件失败:', err)
  }
}

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err || 'WebSocket 派发失败')
}

async function sendCoordinatorDispatch(dispatch: TaskDispatch | undefined, phase: 'plan' | 'summary') {
  if (!dispatch) return false
  try {
    multiAgentStore.sendMessage(dispatch.agentId, dispatch.message)
    await tasksStore.recordTaskDispatchResult(dispatch.taskId, {
      phase,
      ok: true,
      payload: {
        agentId: dispatch.agentId,
        sessionKey: dispatch.sessionKey,
        mode: 'frontend-websocket',
      },
    })
    return true
  } catch (err) {
    const error = toErrorMessage(err)
    try {
      await tasksStore.recordTaskDispatchResult(dispatch.taskId, {
        phase,
        ok: false,
        error,
        payload: {
          agentId: dispatch.agentId,
          sessionKey: dispatch.sessionKey,
          mode: 'frontend-websocket',
        },
      })
    } catch (recordErr) {
      console.error('[TaskCenter2] 记录任务派发失败:', recordErr)
    }
    return false
  }
}

async function sendSubtaskDispatch(dispatch: TaskDispatch) {
  try {
    if (!dispatch.subtaskId) throw new Error('缺少子任务 ID')
    multiAgentStore.sendMessage(dispatch.agentId, dispatch.message)
    rememberSubtaskDispatch(dispatch)
    await tasksStore.recordSubtaskDispatchResult(dispatch.subtaskId, {
      ok: true,
      payload: {
        agentId: dispatch.agentId,
        sessionKey: dispatch.sessionKey,
        mode: 'frontend-websocket',
      },
    })
    return { ok: true, error: '' }
  } catch (err) {
    const error = toErrorMessage(err)
    if (dispatch.subtaskId) {
      try {
        await tasksStore.recordSubtaskDispatchResult(dispatch.subtaskId, {
          ok: false,
          error,
          payload: {
            agentId: dispatch.agentId,
            sessionKey: dispatch.sessionKey,
            mode: 'frontend-websocket',
          },
        })
      } catch (recordErr) {
        console.error('[TaskCenter2] 记录子任务派发失败:', recordErr)
      }
    }
    return { ok: false, error }
  }
}

async function sendSubtaskDispatches(dispatches: TaskDispatch[] = []) {
  let sent = 0
  let failed = 0
  let firstError = ''
  for (const dispatch of dispatches) {
    const result = await sendSubtaskDispatch(dispatch)
    if (result.ok) {
      sent += 1
    } else {
      failed += 1
      if (!firstError) firstError = result.error
    }
  }
  return { sent, failed, firstError }
}

function formatTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatMsTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fileIcon(name: string) {
  if (/\.(md|markdown)$/i.test(name)) return 'ri-markdown-line'
  if (/\.(js|ts|vue|py|json|sh)$/i.test(name)) return 'ri-code-s-slash-line'
  if (/\.(docx?|txt)$/i.test(name)) return 'ri-file-text-line'
  return 'ri-file-line'
}

function toggleTheme() {
  themeStore.toggle()
}

function handleConnectAll() {
  multiAgentStore.connectAll()
  ElMessage.success('正在连接所有 Agent')
}

function handleDisconnectAll() {
  multiAgentStore.disconnectAll()
  ElMessage.warning('已断开所有 Agent')
}

onMounted(async () => {
  authStore.restoreSession()
  multiAgentStore.loadMessages()
  loadPendingTaskDispatches()
  multiAgentStore.addEventListener(handleTaskGatewayEvent)
  await handleRefresh()
  if (typeof route.query.task === 'string') {
    await selectTask(route.query.task)
  }
  clockTimer = setInterval(() => {
    currentTimeMs.value = Date.now()
  }, 1000)
  refreshTimer = setInterval(() => {
    if (tasksStore.selectedTaskId) tasksStore.fetchTask(tasksStore.selectedTaskId).catch(() => {})
  }, 10000)
})

onUnmounted(() => {
  multiAgentStore.removeEventListener(handleTaskGatewayEvent)
  if (clockTimer) clearInterval(clockTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.task-command-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.task-command-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 330px) minmax(420px, 1fr) minmax(300px, 360px);
  gap: 20px;
  padding: 20px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(38, 72, 110, 0.16), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
    var(--bg-primary);
}

.task-rail,
.mission-stage,
.task-inspector {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
}

.surface {
  background: color-mix(in srgb, var(--bg-panel) 92%, transparent);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
}

.task-create {
  padding-bottom: 14px;
}

.surface-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.surface-heading h2,
.mission-hero h1,
.subtask-card h3 {
  margin: 0;
  color: var(--text-primary);
  letter-spacing: 0;
}

.surface-heading h2 {
  font-size: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
}

.field {
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 10px 12px;
  font: inherit;
  outline: none;
}

.field + .field {
  margin-top: 10px;
}

.field:focus {
  border-color: var(--color-primary);
}

.field--textarea {
  min-height: 96px;
  resize: vertical;
}

.field--plan {
  min-height: 220px;
  font-family: var(--font-mono);
  font-size: 12px;
  resize: vertical;
}

.field--select {
  min-width: 110px;
}

.create-launcher {
  width: 100%;
  border: 1px solid rgba(var(--color-primary-rgb), 0.38);
  border-radius: 8px;
  min-height: 54px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
  background: rgba(var(--color-primary-rgb), 0.09);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.create-launcher:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary-rgb), 0.7);
  background: rgba(var(--color-primary-rgb), 0.14);
}

.create-launcher span {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #08111f;
  background: var(--color-primary);
  flex: 0 0 auto;
}

.create-launcher strong {
  font-size: 14px;
  letter-spacing: 0;
}

.create-actions,
.plan-actions,
.review-actions,
.subtask-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.primary-btn,
.ghost-btn,
.icon-btn {
  border: 1px solid var(--border-default);
  border-radius: 6px;
  min-height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #08111f;
  font-weight: 700;
}

.ghost-btn:hover,
.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dialog-create-form {
  display: grid;
  gap: 14px;
}

.dialog-create-form__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

.dialog-create-form__head p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-create-form label {
  display: grid;
  gap: 7px;
}

.dialog-create-form label > span {
  color: var(--text-secondary);
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.task-create-dialog .el-dialog) {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

:deep(.task-create-dialog .el-dialog__title) {
  color: var(--text-primary);
}

:deep(.task-create-dialog .el-dialog__body) {
  padding-top: 10px;
}

.ghost-btn--compact {
  min-height: 30px;
  padding: 0 9px;
  font-size: 12px;
}

.icon-btn {
  width: 34px;
  padding: 0;
}

.agent-pill,
.agent-token,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  min-height: 24px;
  padding: 0 10px;
  font-size: 12px;
  white-space: nowrap;
}

.agent-pill,
.agent-token {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.task-row {
  width: 100%;
  display: block;
  text-align: left;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  padding: 12px;
  cursor: pointer;
}

.task-row + .task-row {
  margin-top: 10px;
}

.task-row.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.55);
}

.task-row__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.task-row__top strong {
  font-size: 14px;
  line-height: 1.35;
}

.task-row__meta,
.subtask-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.mini-progress,
.subtask-progress {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-card);
  margin-top: 10px;
}

.mini-progress span,
.subtask-progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.status-chip {
  color: var(--text-secondary);
  background: var(--bg-card);
}

.status-chip--running,
.status-chip--reviewing {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.status-chip--completed {
  color: var(--color-success);
  background: rgba(46, 160, 67, 0.14);
}

.status-chip--failed,
.status-chip--blocked {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.12);
}

.status-chip--planning,
.status-chip--dispatching,
.status-chip--assigned {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.14);
}

.mission-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: start;
}

.mission-hero h1 {
  font-size: 26px;
}

.mission-hero p {
  color: var(--text-secondary);
  margin: 10px 0 0;
  line-height: 1.65;
}

.mission-hero__metrics {
  display: grid;
  grid-template-columns: repeat(3, 88px);
  gap: 10px;
}

.mission-hero__metrics div {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px;
  background: var(--bg-card);
}

.mission-hero__metrics span {
  display: block;
  color: var(--text-tertiary);
  font-size: 12px;
}

.mission-hero__metrics strong {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 20px;
}

.team-live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.member-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px;
  background: color-mix(in srgb, var(--bg-card) 88%, var(--color-primary) 5%);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  min-height: 154px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.member-card:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary-rgb), 0.62);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.member-card__top {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #08111f;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  font-weight: 800;
  flex: 0 0 auto;
}

.member-card strong,
.member-dialog__header h2 {
  color: var(--text-primary);
  letter-spacing: 0;
}

.member-card small {
  display: block;
  margin-top: 3px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-card__activity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.member-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.subtask-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.subtask-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 14px;
  background: var(--bg-card);
}

.subtask-card__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.subtask-card h3 {
  font-size: 15px;
}

.subtask-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.error-line {
  color: var(--color-error) !important;
}

.event-list,
.outputs-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 10px;
}

.event-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--color-primary);
}

.event-item strong {
  color: var(--text-primary);
  font-size: 12px;
}

.event-item p {
  margin: 3px 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.event-item small {
  color: var(--text-tertiary);
}

.output-row {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  text-align: left;
}

.output-row small {
  color: var(--text-tertiary);
}

.summary-text {
  margin: 12px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
}

.quiet-state,
.empty-mission {
  color: var(--text-secondary);
  line-height: 1.6;
}

.empty-mission {
  margin: auto;
  text-align: center;
  max-width: 480px;
}

.empty-mission i {
  font-size: 42px;
  color: var(--color-primary);
}

.preview-state {
  color: var(--text-secondary);
  padding: 24px;
}

.preview-state--error {
  color: var(--color-error);
}

.preview-content {
  max-height: 70vh;
  overflow: auto;
}

.preview-content pre {
  white-space: pre-wrap;
  color: var(--text-primary);
}

:deep(.member-dialog .el-dialog) {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.member-dialog__header {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding-right: 28px;
}

.member-dialog__header h2 {
  margin: 2px 0 0;
  font-size: 17px;
}

.member-chat-shell {
  display: grid;
  gap: 12px;
}

.member-task-context {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 12px;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.member-task-context strong {
  display: block;
  color: var(--text-primary);
  font-size: 13px;
}

.member-task-context p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.55;
}

.member-chat-list {
  min-height: 260px;
  max-height: 46vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-primary) 82%, transparent);
}

.chat-bubble {
  max-width: 86%;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--bg-card);
}

.chat-bubble--user {
  align-self: flex-end;
  border-color: rgba(var(--color-primary-rgb), 0.45);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.chat-bubble--assistant {
  align-self: flex-start;
}

.chat-bubble--system {
  align-self: center;
  max-width: 94%;
  color: var(--text-tertiary);
}

.chat-bubble__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.chat-bubble__meta span {
  color: var(--text-primary);
  font-weight: 700;
}

.chat-bubble p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.member-followup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.member-followup textarea {
  min-height: 70px;
  resize: vertical;
}

@media (max-width: 1180px) {
  .task-command-layout {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .task-inspector {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .task-command-layout {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .task-rail,
  .mission-stage,
  .task-inspector {
    overflow: visible;
  }

  .task-inspector {
    display: flex;
  }

  .mission-hero {
    grid-template-columns: 1fr;
  }

  .mission-hero__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .member-followup {
    grid-template-columns: 1fr;
  }

  .member-followup .primary-btn {
    width: 100%;
  }
}
</style>
