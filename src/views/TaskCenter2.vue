<template>
  <div class="task-center-2">
    <TaskControlBar
      :ai-status="aiStatus"
      :ai-status-text="aiStatusText"
      :all-connected="allConnected"
      :any-connected="anyConnected"
      :is-light="isLight"
      @toggle-theme="toggleTheme"
      @connect-all="handleConnectAll"
      @disconnect-all="handleDisconnectAll"
      @reset="handleReset"
    />

    <section class="workspace-hero">
      <div class="workspace-hero__copy">
        <p class="workspace-kicker">Task Dispatch / Execution / Review</p>
        <h1>任务指挥中心 II</h1>
        <p class="workspace-desc">把任务派发、执行会话和产出审阅拆成连续工作流，降低一个页面承载多种职责的复杂度。</p>
      </div>
      <div class="workspace-hero__stats">
        <article class="workspace-stat-card">
          <span class="workspace-stat-card__label">在线 Agent</span>
          <strong>{{ connectedAgentCount }}/{{ agentList.length }}</strong>
          <small>{{ busyAgentCount }} 个正在执行</small>
        </article>
        <article class="workspace-stat-card">
          <span class="workspace-stat-card__label">Claude 会话</span>
          <strong>{{ claudeCodeSessions.length }}</strong>
          <small>代码执行与协同窗口</small>
        </article>
        <article class="workspace-stat-card">
          <span class="workspace-stat-card__label">待审成果</span>
          <strong>{{ totalOutputCount }}</strong>
          <small>{{ pendingReviewCount }} 个新增文件待关注</small>
        </article>
      </div>
    </section>

    <div class="workspace-tabs">
      <button
        v-for="stage in workspaceStages"
        :key="stage.key"
        type="button"
        class="workspace-tab"
        :class="{ 'is-active': activeStage === stage.key }"
        @click="setStage(stage.key)"
      >
        <strong>{{ stage.label }}</strong>
        <span>{{ stage.meta }}</span>
      </button>
    </div>

    <div v-if="activeStage === 'review'" class="review-layout">
      <aside class="review-sidebar">
        <div class="review-sidebar__header">
          <div>
            <p class="workspace-kicker">Output Library</p>
            <h3>成果资产库</h3>
          </div>
          <span>{{ totalOutputCount }} 份文件</span>
        </div>

        <div v-if="outputReviewGroups.length === 0" class="review-empty">
          暂无可审阅成果
        </div>

        <div
          v-for="group in outputReviewGroups"
          :key="group.id"
          class="review-group"
        >
          <div class="review-group__header">
            <strong>{{ group.name }}</strong>
            <span>{{ group.files.length }} 项</span>
          </div>
          <button
            v-for="file in group.files"
            :key="reviewFileKey(file)"
            type="button"
            class="review-file"
            :class="{ 'is-active': selectedReviewAgentId === group.id && reviewSelectionKey === reviewFileKey(file) }"
            @click="inspectReviewFile(group.id, file)"
          >
            <i :class="getFileIcon(file.name)"></i>
            <span>{{ file.name }}</span>
            <small>{{ file.mtimeStr || group.role }}</small>
          </button>
        </div>
      </aside>

      <section class="review-preview">
        <div class="review-preview__header">
          <div>
            <p class="workspace-kicker">Output Review</p>
            <h3>{{ previewFileItem?.name || '选择成果开始审阅' }}</h3>
          </div>
          <span class="review-preview__meta">{{ selectedReviewAgentName }}</span>
        </div>

        <div class="review-preview__body">
          <div v-if="previewLoading" class="preview-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载文件中...</span>
          </div>
          <div v-else-if="previewError" class="preview-error">
            <el-icon><Warning /></el-icon>
            <span>{{ previewError }}</span>
          </div>
          <div v-else-if="previewFileItem" class="preview-content preview-content--inline">
            <div v-if="previewContent.type === 'markdown'" class="markdown-rendered" v-html="renderPreviewContent()"></div>
            <pre v-else-if="previewContent.type === 'text'" v-html="escapeHtml(previewContent.content)"></pre>
            <div v-else-if="previewContent.type === 'html'" v-html="previewContent.content"></div>
            <div v-else class="preview-unsupported">
              <el-icon><Document /></el-icon>
              <p>该文件类型暂不支持在线预览</p>
              <p class="hint">{{ previewFileItem?.name }}</p>
              <el-button type="primary" @click="downloadFile">下载文件</el-button>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="ri-folder-open-line"></i>
            <span>从左侧成果列表中选择文件开始审阅</span>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="workspace-layout">
      <aside v-if="activeStage === 'dispatch'" class="dispatch-sidebar">
        <div class="panel-header">
          <div class="panel-title">
            <span>ACTIVE AGENTS</span>
            <strong>{{ agentList.length }}</strong>
          </div>
        </div>

        <div class="agent-list">
          <el-popover
            v-for="agent in agentList"
            :key="agent.id"
            trigger="hover"
            placement="right-start"
            :width="320"
            :show-after="300"
            :hide-after="0"
            popper-class="agent-tip-popper"
          >
            <template #reference>
              <TaskAgentCard
                :name="agent.name"
                :role="agent.role"
                :desc="agent.desc"
                :tags="agent.tags"
                :icon-src="getAgentIcon(agent.id)"
                :active="selectedAgent === agent.id"
                :status-class="getAgentStatus(agent.id)"
                :status-text="getAgentStatusText(agent.id)"
                :message-count="agents[agent.id]?.messages.length || 0"
                @click="selectAgent(agent.id)"
              />
            </template>
            <div class="agent-tip-card">
              <div class="agent-tip-header">
                <img class="agent-tip-avatar" :src="getAgentIcon(agent.id)" :alt="agent.name" />
                <div class="agent-tip-title">
                  <div class="agent-tip-name">{{ agent.name }}</div>
                  <div class="agent-tip-role">{{ getAgentRole(agent.id) }}</div>
                </div>
                <div class="status-badge-mini" :class="getAgentStatus(agent.id)">
                  <i :class="getAgentStatusIcon(agent.id)"></i>
                  {{ getAgentStatusText(agent.id) }}
                </div>
              </div>
              <div class="agent-tip-tags">
                <span class="tag" v-for="tag in agent.tags" :key="tag">{{ tag }}</span>
              </div>
              <div class="agent-tip-desc">{{ agent.desc }}</div>
              <div class="agent-tip-stats">
                <div class="agent-tip-stat">
                  <span class="stat-label">消息</span>
                  <span class="stat-value">{{ agents[agent.id]?.messages.length || 0 }}</span>
                </div>
                <div class="agent-tip-stat">
                  <span class="stat-label">产出文件</span>
                  <span class="stat-value">{{ getAgentFiles(agent.id).length }}</span>
                </div>
                <div class="agent-tip-stat">
                  <span class="stat-label">状态</span>
                  <span class="stat-value">{{ getAgentStatusText(agent.id) }}</span>
                </div>
              </div>
            </div>
          </el-popover>

          <button
            v-if="claudeCodeSessions.length > 0"
            type="button"
            class="claude-card"
            :class="{ 'is-active': selectedAgent === 'claude' }"
            @click="selectAgent('claude')"
          >
            <div class="claude-card__header">
              <div>
                <strong>ClaudeCode</strong>
                <span>代码执行者</span>
              </div>
              <span class="status-badge-mini busy">执行中</span>
            </div>
            <small>{{ claudeCodeSessions.length }} 个活跃会话</small>
          </button>
        </div>
      </aside>

      <aside v-else class="execution-rail">
        <section class="execution-card">
          <div class="execution-card__header">
            <h3>执行对象</h3>
            <span>{{ currentTargetLabel }}</span>
          </div>
          <button
            v-for="agent in agentList"
            :key="agent.id"
            type="button"
            class="execution-agent"
            :class="{ 'is-active': selectedAgent === agent.id }"
            @click="selectAgent(agent.id)"
          >
            <div>
              <strong>{{ agent.name }}</strong>
              <span>{{ getAgentStatusText(agent.id) }}</span>
            </div>
            <small>{{ agents[agent.id]?.messages.length || 0 }} 条消息</small>
          </button>
          <button
            v-if="claudeCodeSessions.length > 0"
            type="button"
            class="execution-agent"
            :class="{ 'is-active': selectedAgent === 'claude' }"
            @click="selectAgent('claude')"
          >
            <div>
              <strong>ClaudeCode</strong>
              <span>{{ claudeCodeSessions.length }} 个活跃会话</span>
            </div>
            <small>执行编排</small>
          </button>
        </section>

        <section class="execution-card">
          <div class="execution-card__header">
            <h3>执行摘要</h3>
            <span>{{ taskElapsedText }}</span>
          </div>
          <div class="execution-metrics">
            <div class="execution-metric">
              <span>连接覆盖</span>
              <strong>{{ connectedAgentCount }}/{{ agentList.length }}</strong>
            </div>
            <div class="execution-metric">
              <span>忙碌 Agent</span>
              <strong>{{ busyAgentCount }}</strong>
            </div>
            <div class="execution-metric">
              <span>成果文件</span>
              <strong>{{ totalOutputCount }}</strong>
            </div>
          </div>
        </section>
      </aside>

      <section class="workstage-main">
        <div v-if="activeStage === 'dispatch'" class="dispatch-brief">
          <article class="dispatch-brief__card">
            <span class="dispatch-brief__label">当前派发对象</span>
            <strong>{{ currentTargetLabel }}</strong>
            <small>{{ currentTargetMeta }}</small>
          </article>
          <article class="dispatch-brief__card">
            <span class="dispatch-brief__label">连通性</span>
            <strong>{{ aiStatusText }}</strong>
            <small>{{ anyConnected ? '可以开始派发任务' : '请先建立 Gateway 连接' }}</small>
          </article>
          <article class="dispatch-brief__card">
            <span class="dispatch-brief__label">成果回流</span>
            <strong>{{ totalOutputCount }} 份</strong>
            <small>{{ pendingReviewCount }} 份新增内容待审阅</small>
          </article>
        </div>

        <div class="detail-panel">
          <template v-if="selectedAgent && selectedAgent !== 'claude'">
            <div class="detail-topbar">
              <div class="detail-topbar__identity">
                <img class="detail-topbar-avatar" :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
                <div>
                  <div class="detail-topbar-name">{{ getAgentName(selectedAgent) }}</div>
                  <div class="detail-topbar-role">{{ getAgentRole(selectedAgent) }}</div>
                </div>
              </div>
              <div class="detail-topbar__actions">
                <el-popover
                  v-if="currentAgentFiles.length > 0"
                  trigger="click"
                  placement="bottom-end"
                  :width="320"
                  popper-class="file-list-popper"
                >
                  <template #reference>
                    <button class="file-tip-btn" :class="{ 'has-new': hasNewFiles(selectedAgent) }">
                      <i class="ri-folder-zip-line"></i>
                      <span>{{ currentAgentFiles.length }}</span>
                      <span v-if="hasNewFiles(selectedAgent)" class="file-red-dot"></span>
                    </button>
                  </template>
                  <div class="file-dropdown">
                    <div
                      v-for="file in currentAgentFiles"
                      :key="reviewFileKey(file)"
                      class="file-dropdown-item"
                      @click="previewFile(file)"
                    >
                      <i :class="getFileIcon(file.name)"></i>
                      <span class="file-dropdown-name">{{ file.name }}</span>
                      <span class="file-dropdown-meta">{{ file.mtimeStr || '' }}</span>
                    </div>
                  </div>
                </el-popover>
                <div class="status-badge-mini" :class="getAgentStatus(selectedAgent)">
                  <i :class="getAgentStatusIcon(selectedAgent)"></i>
                  {{ getAgentStatusText(selectedAgent) }}
                </div>
              </div>
            </div>

            <div class="detail-content">
              <TaskMessagePanel
                v-model="taskInput"
                :messages="currentAgentMessages"
                :agent-name="getAgentName(selectedAgent)"
                :agent-icon="getAgentIcon(selectedAgent)"
                :connected="selectedAgentConnected"
                :placeholder="chatInputPlaceholder"
                @send="sendToSelectedAgent"
              />
            </div>
          </template>

          <template v-else-if="selectedAgent === 'claude'">
            <div class="detail-topbar">
              <div class="detail-topbar__identity">
                <div class="claude-avatar-topbar"><i class="fas fa-robot"></i></div>
                <div>
                  <div class="detail-topbar-name">ClaudeCode</div>
                  <div class="detail-topbar-role">代码执行者</div>
                </div>
              </div>
              <div class="detail-topbar__actions">
                <span class="detail-topbar-meta">{{ claudeCodeSessions.length }} 个活跃会话</span>
                <div class="status-badge-mini busy">
                  <i class="ri-loader-4-line ri-spin"></i>
                  执行中
                </div>
              </div>
            </div>

            <div class="detail-content">
              <div class="claude-shell">
                <div class="claude-session-selector">
                  <button
                    v-for="session in claudeCodeSessions"
                    :key="session.id"
                    type="button"
                    class="session-item"
                    :class="{ active: selectedClaudeSession?.id === session.id }"
                    @click="selectClaudeSession(session)"
                  >
                    <span class="session-model-badge">{{ session.model }}</span>
                    <span class="session-name">{{ getSessionDisplayName(session) }}</span>
                    <span class="session-stats">{{ session.tokens }} tokens · {{ session.userMessages }}/{{ session.assistantMessages }}</span>
                  </button>
                </div>

                <div class="claude-chat-container">
                  <div class="claude-messages-container" ref="claudeMessagesRef">
                    <div v-if="claudeTranscriptLoading" class="chat-loading">
                      <i class="ri-loader-4-line ri-spin"></i> 加载消息中...
                    </div>
                    <div v-else-if="claudeTranscript.length === 0" class="empty-state">
                      <i class="ri-chat-smile-2-line"></i>
                      <span>暂无消息记录</span>
                    </div>
                    <div v-else class="claude-message-stream">
                      <div
                        v-for="(msg, idx) in claudeTranscript"
                        :key="idx"
                        class="chat-msg"
                        :class="{ user: msg.role === 'user' }"
                      >
                        <div class="msg-avatar">
                          <i :class="msg.role === 'user' ? 'ri-user-line' : 'ri-robot-line'"></i>
                        </div>
                        <div class="msg-bubble">
                          <template v-for="(part, pidx) in msg.parts" :key="pidx">
                            <div v-if="part.type === 'text'">{{ part.text }}</div>
                            <div v-else-if="part.type === 'thinking'" class="msg-thinking"><i class="ri-brain-line"></i> {{ part.thinking }}</div>
                            <div v-else-if="part.type === 'tool_use'" class="msg-tool"><i class="ri-tools-line"></i> {{ part.name }}</div>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="claude-input-area">
                    <input
                      v-model="claudeInputMessage"
                      type="text"
                      placeholder="输入消息发送到 ClaudeCode..."
                      class="claude-input"
                      @keydown.enter="sendClaudeMessage"
                      :disabled="claudeSending"
                    />
                    <button
                      type="button"
                      class="send-btn"
                      @click="sendClaudeMessage"
                      :disabled="!claudeInputMessage.trim() || claudeSending"
                    >
                      {{ claudeSending ? '...' : '发送' }}
                    </button>
                  </div>
                  <div v-if="claudeSendError" class="send-error">{{ claudeSendError }}</div>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="empty-state">
            <i class="ri-arrow-left-line"></i>
            <span>请先选择一个执行对象</span>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="showPreviewDialog"
      :title="previewFileItem?.name || '文件预览'"
      width="900px"
      :close-on-click-modal="true"
    >
      <div class="preview-dialog-body">
        <div v-if="previewLoading" class="preview-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载文件中...</span>
        </div>
        <div v-else-if="previewError" class="preview-error">
          <el-icon><Warning /></el-icon>
          <span>{{ previewError }}</span>
        </div>
        <div v-else class="preview-content">
          <div v-if="previewContent.type === 'markdown'" class="markdown-rendered" v-html="renderPreviewContent()"></div>
          <pre v-else-if="previewContent.type === 'text'" v-html="escapeHtml(previewContent.content)"></pre>
          <div v-else-if="previewContent.type === 'html'" v-html="previewContent.content"></div>
          <div v-else class="preview-unsupported">
            <el-icon><Document /></el-icon>
            <p>该文件类型暂不支持在线预览</p>
            <p class="hint">{{ previewFileItem?.name }}</p>
            <el-button type="primary" @click="downloadFile">下载文件</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Loading, Warning } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import TaskAgentCard from '@/components/task-center/TaskAgentCard.vue'
import TaskControlBar from '@/components/task-center/TaskControlBar.vue'
import TaskMessagePanel from '@/components/task-center/TaskMessagePanel.vue'
import { AGENT_CONFIG } from '@/simulation'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useThemeStore } from '@/stores/theme'

type WorkspaceStage = 'dispatch' | 'execution' | 'review'

interface AgentFile {
  name: string
  content: string
  type: string
  path?: string
  gitUrl?: string
  mtimeStr?: string
}

const route = useRoute()
const router = useRouter()
const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const workspaceStages = [
  { key: 'dispatch', label: '任务创建 / 派发', meta: '选择执行对象、建立上下文并发送指令' },
  { key: 'execution', label: '执行会话', meta: '跟踪 Agent 与 ClaudeCode 的执行链路' },
  { key: 'review', label: '产出审阅', meta: '集中查看文档、代码与阶段性成果' },
] as const

const agentList = [
  { id: 'xiaomu', name: '小呦', role: '项目统筹', desc: '项目统筹与任务协调，负责分配任务给其他 Agent 并跟踪进度。', tags: ['项目管理', '任务分配', '进度跟踪'] },
  { id: 'xiaoyan', name: '研究员', role: '调研分析', desc: '深度调研与信息分析，生成调研报告和数据分析结果。', tags: ['调研分析', '数据处理', '报告生成'] },
  { id: 'xiaochan', name: '产品经理', role: '产品设计', desc: '产品需求分析与设计，输出产品方案和功能规格说明。', tags: ['需求分析', '产品设计', '文档编写'] },
  { id: 'xiaokai', name: '研发工程师', role: '技术开发', desc: '代码开发与技术实现，完成功能开发和代码提交。', tags: ['代码开发', '技术实现', 'Git'] },
  { id: 'xiaoce', name: '测试员', role: '质量检查', desc: '代码质量检查与测试，发现 Bug 并输出测试报告。', tags: ['代码审查', '测试', 'Bug 发现'] },
]

const AGENT_TO_ROLE_ID: Record<string, string> = {
  xiaomu: 'ceo',
  xiaoyan: 'researcher',
  xiaochan: 'pm',
  xiaokai: 'tech-lead',
  xiaoce: 'team-qa',
}

const aiStatus = ref<'connected' | 'disconnected' | 'error'>('connected')
const taskInput = ref('')
const selectedAgent = ref<string | null>(null)
const selectedReviewAgentId = ref<string | null>(null)
const showPreviewDialog = ref(false)
const previewFileItem = ref<AgentFile | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewContent = ref({ type: '', content: '' })
const taskStartTime = ref(0)
const taskEndTime = ref(0)
const fileCache = ref<Record<string, { files: AgentFile[]; timestamp: number }>>({})
const fileChangeCount = ref<Record<string, number>>({})
const forceRefresh = ref(0)

const claudeCodeSessions = ref<any[]>([])
const selectedClaudeSession = ref<any>(null)
const claudeTranscript = ref<any[]>([])
const claudeTranscriptLoading = ref(false)
const claudeInputMessage = ref('')
const claudeSending = ref(false)
const claudeSendError = ref('')
const claudeMessagesRef = ref<HTMLElement | null>(null)
let claudeCodePollInterval: ReturnType<typeof setInterval> | null = null

const lastMessageTime = ref<Record<string, number>>({
  xiaomu: 0,
  xiaoyan: 0,
  xiaochan: 0,
  xiaokai: 0,
  xiaoce: 0,
})

const activeStage = computed<WorkspaceStage>(() => {
  const stage = route.query.stage
  if (stage === 'execution' || stage === 'review') {
    return stage
  }
  return 'dispatch'
})

const agents = computed(() => multiAgentStore.agents)
const allConnected = computed(() => multiAgentStore.allConnected)
const anyConnected = computed(() => multiAgentStore.anyConnected)
const isLight = computed(() => themeStore.isLight)
const aiStatusText = computed(() => {
  if (allConnected.value) return '所有 Agent 已连接'
  if (anyConnected.value) return '部分 Agent 已连接'
  return '未连接 Gateway'
})
const connectedAgentCount = computed(() => agentList.filter(agent => agents.value[agent.id]?.isConnected).length)
const selectedAgentConnected = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return false
  return agents.value[selectedAgent.value]?.isConnected || false
})
const currentAgentMessages = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return []
  return agents.value[selectedAgent.value]?.messages || []
})
const currentAgentFiles = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return []
  return getAgentFiles(selectedAgent.value)
})
const busyAgentCount = computed(() => agentList.filter(agent => getAgentStatus(agent.id) === 'busy').length)
const currentTargetLabel = computed(() => {
  if (selectedAgent.value === 'claude') return 'ClaudeCode'
  return getAgentName(selectedAgent.value || 'xiaomu')
})
const currentTargetMeta = computed(() => {
  if (selectedAgent.value === 'claude') return '代码执行通道'
  return getAgentRole(selectedAgent.value || 'xiaomu')
})
const chatInputPlaceholder = computed(() => {
  if (!selectedAgent.value) return '选择一个 Agent 后开始派发任务...'
  const name = getAgentName(selectedAgent.value)
  if (selectedAgent.value === 'xiaomu') return `输入任务内容，${name} 将负责拆解分配...`
  return `向 ${name} 派发指令...`
})
const outputReviewGroups = computed(() => {
  void forceRefresh.value
  return agentList
    .map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      files: getAgentFiles(agent.id),
    }))
    .filter(group => group.files.length > 0)
})
const totalOutputCount = computed(() => outputReviewGroups.value.reduce((sum, group) => sum + group.files.length, 0))
const pendingReviewCount = computed(() => Object.values(fileChangeCount.value).reduce((sum, count) => sum + count, 0))
const selectedReviewAgentName = computed(() => {
  if (!selectedReviewAgentId.value) return '未选择产出主体'
  return getAgentName(selectedReviewAgentId.value)
})
const reviewSelectionKey = computed(() => reviewFileKey(previewFileItem.value))
const taskElapsedText = computed(() => {
  if (!taskStartTime.value) return '尚未开始派发'
  const end = taskEndTime.value || Date.now()
  const duration = Math.max(0, Math.floor((end - taskStartTime.value) / 1000))
  if (duration < 60) return `${duration}s`
  return `${Math.floor(duration / 60)}m ${duration % 60}s`
})

function toggleTheme() {
  themeStore.toggle()
}

function setStage(stage: WorkspaceStage) {
  router.replace({
    path: '/task-center-2',
    query: stage === 'dispatch' ? {} : { stage },
  })
}

function selectAgent(agentId: string) {
  selectedAgent.value = agentId
}

function getAgentName(agentId: string) {
  return agentList.find(agent => agent.id === agentId)?.name || agentId
}

function getAgentRole(agentId: string) {
  const roles: Record<string, string> = {
    xiaomu: '项目统筹 · agent:ceo:main',
    xiaoyan: '调研分析 · agent:researcher:main',
    xiaochan: '产品设计 · agent:pm:main',
    xiaokai: '技术开发 · agent:tech-lead:main',
    xiaoce: '质量检查 · agent:team-qa:main',
  }
  return roles[agentId] || ''
}

function getAgentIcon(agentId: string) {
  return AGENT_CONFIG[agentId]?.icon || ''
}

function isAgentBusy(agentId: string) {
  const agent = agents.value[agentId]
  if (!agent) return false
  return Date.now() - (lastMessageTime.value[agentId] || 0) < 2000
}

function getAgentStatus(agentId: string) {
  if (agentId === 'claude') return 'busy'
  const agent = agents.value[agentId]
  if (!agent?.isConnected) return 'offline'
  if (isAgentBusy(agentId)) return 'busy'
  return 'idle'
}

function getAgentStatusIcon(agentId: string) {
  const status = getAgentStatus(agentId)
  if (status === 'busy') return 'ri-loader-4-line ri-spin'
  if (status === 'offline') return 'ri-cloud-off-line'
  return 'ri-checkbox-circle-line'
}

function getAgentStatusText(agentId: string) {
  const status = getAgentStatus(agentId)
  if (status === 'busy') return '工作中'
  if (status === 'offline') return '未连接'
  return '空闲'
}

function hasNewFiles(agentId: string) {
  return (fileChangeCount.value[agentId] || 0) > 0
}

function getAgentFiles(agentId: string): AgentFile[] {
  const roleId = AGENT_TO_ROLE_ID[agentId]
  if (!roleId) return []

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const cacheKey = `files_${agentId}_${dateStr}`
  const cached = fileCache.value[cacheKey]
  if (cached && Date.now() - cached.timestamp < 5000) {
    return cached.files
  }

  const agent = agents.value[agentId]
  if (!agent || !agent.messages) return []

  fetch(`/api/files/role?roleId=${roleId}&date=${dateStr}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.files) {
        const newFiles: AgentFile[] = data.files.map((file: any) => ({
          name: file.name,
          content: '',
          type: file.type,
          path: file.path,
          gitUrl: file.gitUrl,
          mtimeStr: file.mtimeStr,
        }))

        const oldCount = cached?.files.length || 0
        if (oldCount > 0 && newFiles.length > oldCount) {
          fileChangeCount.value[agentId] = (fileChangeCount.value[agentId] || 0) + (newFiles.length - oldCount)
        }

        if (agentId === 'xiaokai' && data.gitUrl && !newFiles.find(file => file.name === '代码仓库')) {
          newFiles.push({
            name: '代码仓库',
            content: '代码已提交到仓库',
            type: 'text',
            gitUrl: data.gitUrl,
          })
        }

        fileCache.value[cacheKey] = {
          files: newFiles,
          timestamp: Date.now(),
        }
        forceRefresh.value += 1
      } else if (Array.isArray(data.files) && data.files.length === 0) {
        fileCache.value[cacheKey] = {
          files: [],
          timestamp: Date.now(),
        }
        forceRefresh.value += 1
      }
    })
    .catch(err => {
      console.error('[TaskCenter2] Fetch files error:', err)
    })

  return fileCache.value[cacheKey]?.files || []
}

function reviewFileKey(file?: AgentFile | null) {
  if (!file) return ''
  return file.path || file.gitUrl || file.name
}

function renderPreviewContent() {
  return previewContent.value.type === 'markdown'
    ? md.render(previewContent.value.content)
    : previewContent.value.content
}

function escapeHtml(content: string) {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getFileIcon(fileName: string) {
  if (/\.(md|markdown)$/i.test(fileName)) return 'fas fa-file-code'
  if (/\.txt$/i.test(fileName)) return 'fas fa-file-alt'
  if (/\.html?$/i.test(fileName)) return 'fas fa-globe'
  if (/\.docx?$/i.test(fileName)) return 'fas fa-file-word'
  if (/\.pptx?$/i.test(fileName)) return 'fas fa-file-powerpoint'
  if (/\.xlsx?$/i.test(fileName)) return 'fas fa-file-excel'
  return 'fas fa-file'
}

function loadPreviewFile(file: AgentFile, openDialog = true) {
  previewFileItem.value = file
  previewLoading.value = true
  previewError.value = null
  previewContent.value = { type: '', content: '' }
  showPreviewDialog.value = openDialog

  if (file.path) {
    fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`)
      .then(res => res.json())
      .then(data => {
        previewLoading.value = false
        if (data.success) {
          previewContent.value = {
            type: file.type,
            content: data.content,
          }
        } else {
          previewError.value = data.error || '读取文件失败'
        }
      })
      .catch(err => {
        previewLoading.value = false
        previewError.value = `读取文件失败：${err.message}`
      })
  } else {
    previewLoading.value = false
    previewContent.value = {
      type: file.type,
      content: file.content,
    }
  }
}

function previewFile(file: AgentFile) {
  loadPreviewFile(file, true)
}

function inspectReviewFile(agentId: string, file: AgentFile) {
  selectedReviewAgentId.value = agentId
  loadPreviewFile(file, false)
}

function downloadFile() {
  if (!previewFileItem.value) return
  const blob = new Blob([previewFileItem.value.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = previewFileItem.value.name
  anchor.click()
  URL.revokeObjectURL(url)
  ElMessage.success('文件已开始下载')
}

async function sendToSelectedAgent() {
  if (!taskInput.value.trim() || !selectedAgent.value) return
  if (!selectedAgentConnected.value) {
    ElMessage.warning(`${getAgentName(selectedAgent.value)} 未连接，请先点击全连按钮`)
    return
  }

  taskStartTime.value = Date.now()
  taskEndTime.value = 0
  const content = taskInput.value.trim()

  try {
    multiAgentStore.sendMessage(selectedAgent.value, content)
    ElMessage.success(`任务已派发给 ${getAgentName(selectedAgent.value)}`)
    taskInput.value = ''
  } catch (err) {
    ElMessage.error(`派发失败：${err instanceof Error ? err.message : '未知错误'}`)
  }
}

function handleConnectAll() {
  multiAgentStore.connectAll()
  aiStatus.value = 'connected'
  ElMessage.success('正在连接所有 Agent...')
}

function handleDisconnectAll() {
  multiAgentStore.disconnectAll()
  aiStatus.value = 'disconnected'
  ElMessage.warning('已断开所有 Agent 连接')
}

function handleReset() {
  ElMessageBox.confirm('确定要清空所有 Agent 的会话内容吗？此操作不可恢复。', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    taskEndTime.value = Date.now()
    Object.keys(AGENT_TO_ROLE_ID).forEach(agentId => {
      multiAgentStore.clearMessages(agentId)
      lastMessageTime.value[agentId] = 0
      fileChangeCount.value[agentId] = 0
    })
    ElMessage.success('已清空所有会话内容')
  }).catch(() => {})
}

async function fetchClaudeCodeSessions() {
  try {
    const response = await fetch('/api/claude-sessions')
    const data = await response.json()
    if (data.success && data.sessions) {
      claudeCodeSessions.value = data.sessions
      if (!selectedClaudeSession.value && data.sessions.length > 0) {
        selectedClaudeSession.value = data.sessions[0]
      }
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to fetch ClaudeCode sessions:', err)
  }
}

function getSessionDisplayName(session: any) {
  if (!session.workingDir) return session.key || session.id
  const parts = session.workingDir.split('/')
  return parts[parts.length - 1] || session.key
}

async function selectClaudeSession(session: any) {
  selectedClaudeSession.value = session
  await fetchClaudeTranscript(session.id)
}

async function fetchClaudeTranscript(sessionId: string) {
  claudeTranscriptLoading.value = true
  claudeTranscript.value = []
  try {
    const response = await fetch(`/api/claude-sessions/${sessionId}/transcript?limit=50`)
    const data = await response.json()
    if (data.success && data.messages) {
      claudeTranscript.value = data.messages
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to fetch transcript:', err)
  } finally {
    claudeTranscriptLoading.value = false
    nextTick(() => {
      if (claudeMessagesRef.value) {
        claudeMessagesRef.value.scrollTop = claudeMessagesRef.value.scrollHeight
      }
    })
  }
}

async function refreshClaudeTranscript() {
  if (selectedClaudeSession.value) {
    await fetchClaudeTranscript(selectedClaudeSession.value.id)
  }
}

async function sendClaudeMessage() {
  if (!claudeInputMessage.value.trim() || !selectedClaudeSession.value || claudeSending.value) return
  claudeSending.value = true
  claudeSendError.value = ''

  try {
    const response = await fetch(`/api/claude-sessions/${selectedClaudeSession.value.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: claudeInputMessage.value.trim() }),
    })
    const data = await response.json()
    if (data.success) {
      claudeInputMessage.value = ''
      setTimeout(() => refreshClaudeTranscript(), 2000)
    } else {
      claudeSendError.value = data.error || '发送失败'
    }
  } catch {
    claudeSendError.value = '发送失败，请稍后重试'
  } finally {
    claudeSending.value = false
  }
}

watch(
  () => agents.value,
  () => {
    Object.keys(AGENT_TO_ROLE_ID).forEach(agentId => {
      const agent = agents.value[agentId]
      if (agent?.messages?.length) {
        lastMessageTime.value[agentId] = agent.messages[agent.messages.length - 1].timestamp
      }
    })
  },
  { deep: true, immediate: true },
)

watch(
  [activeStage, outputReviewGroups],
  ([stage, groups]) => {
    if (stage !== 'review') return
    if (groups.length === 0) {
      selectedReviewAgentId.value = null
      previewFileItem.value = null
      previewContent.value = { type: '', content: '' }
      return
    }

    const currentExists = groups.some(group =>
      group.id === selectedReviewAgentId.value &&
      group.files.some(file => reviewFileKey(file) === reviewSelectionKey.value),
    )

    if (!currentExists) {
      inspectReviewFile(groups[0].id, groups[0].files[0])
    }
  },
  { immediate: true, deep: true },
)

onMounted(() => {
  multiAgentStore.loadMessages()
  if (!selectedAgent.value) {
    selectedAgent.value = 'xiaomu'
  }
  fetchClaudeCodeSessions()
  claudeCodePollInterval = setInterval(fetchClaudeCodeSessions, 5000)
})

onUnmounted(() => {
  if (claudeCodePollInterval) {
    clearInterval(claudeCodePollInterval)
    claudeCodePollInterval = null
  }
})
</script>

<style scoped>
.task-center-2 {
  display: grid;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 0 16px 16px;
}

.workspace-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
  gap: 16px;
  padding: 22px 24px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.16), transparent 30%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(22, 27, 34, 0.96));
  border: 1px solid var(--border-default);
}

.workspace-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.workspace-hero h1 {
  margin: 0;
  font-size: 30px;
  color: var(--text-primary);
}

.workspace-desc {
  margin: 12px 0 0;
  max-width: 48rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.workspace-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.workspace-stat-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.56);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.workspace-stat-card__label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.workspace-stat-card strong {
  font-size: 28px;
  color: var(--text-primary);
}

.workspace-stat-card small {
  color: var(--text-secondary);
}

.workspace-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.workspace-tab {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid var(--border-default);
  border-radius: 18px;
  background: var(--bg-panel);
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
}

.workspace-tab strong {
  color: var(--text-primary);
  font-size: 15px;
}

.workspace-tab span {
  font-size: 12px;
}

.workspace-tab.is-active {
  border-color: color-mix(in oklab, var(--color-primary) 50%, var(--border-default));
  background: color-mix(in oklab, var(--color-primary) 10%, var(--bg-panel));
}

.workspace-layout,
.review-layout {
  display: grid;
  gap: 16px;
  min-height: 0;
  flex: 1;
}

.workspace-layout {
  grid-template-columns: 320px minmax(0, 1fr);
}

.review-layout {
  grid-template-columns: 340px minmax(0, 1fr);
}

.dispatch-sidebar,
.execution-rail,
.review-sidebar,
.detail-panel,
.review-preview {
  min-height: 0;
  border-radius: 22px;
  border: 1px solid var(--border-default);
  background: var(--bg-panel);
  overflow: hidden;
}

.panel-header,
.review-sidebar__header,
.review-preview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-default);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.panel-title strong {
  color: var(--text-primary);
  font-size: 18px;
  letter-spacing: normal;
}

.agent-list,
.review-sidebar {
  overflow-y: auto;
}

.claude-card,
.execution-agent,
.review-file {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.claude-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-default);
}

.claude-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.claude-card strong {
  display: block;
  color: var(--text-primary);
}

.claude-card span,
.claude-card small {
  color: var(--text-secondary);
}

.claude-card.is-active {
  background: rgba(99, 102, 241, 0.12);
}

.execution-rail {
  display: grid;
  gap: 16px;
  align-content: start;
  padding: 16px;
}

.execution-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.execution-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.execution-card__header h3,
.review-sidebar__header h3,
.review-preview__header h3 {
  margin: 0;
  color: var(--text-primary);
}

.execution-card__header span,
.review-sidebar__header span,
.review-preview__meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.execution-agent {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.execution-agent div {
  display: grid;
  gap: 2px;
}

.execution-agent strong {
  color: var(--text-primary);
}

.execution-agent span,
.execution-agent small {
  color: var(--text-secondary);
}

.execution-agent.is-active {
  background: rgba(99, 102, 241, 0.14);
}

.execution-metrics {
  display: grid;
  gap: 10px;
}

.execution-metric {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.execution-metric strong {
  color: var(--text-primary);
}

.workstage-main {
  display: grid;
  gap: 16px;
  min-height: 0;
}

.dispatch-brief {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dispatch-brief__card {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--border-default);
  background: var(--bg-panel);
}

.dispatch-brief__label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.dispatch-brief__card strong {
  color: var(--text-primary);
  font-size: 18px;
}

.dispatch-brief__card small {
  color: var(--text-secondary);
}

.detail-panel {
  display: flex;
  flex-direction: column;
}

.detail-topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-default);
}

.detail-topbar__identity,
.detail-topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-topbar-avatar,
.claude-avatar-topbar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(99, 102, 241, 0.12);
  color: var(--text-primary);
}

.detail-topbar-avatar {
  object-fit: cover;
}

.detail-topbar-name {
  font-weight: 700;
  color: var(--text-primary);
}

.detail-topbar-role,
.detail-topbar-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-content,
.review-preview__body,
.preview-dialog-body {
  flex: 1;
  min-height: 0;
}

.file-tip-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--text-primary);
  cursor: pointer;
}

.file-tip-btn.has-new {
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.35);
}

.file-red-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
}

.file-dropdown {
  display: grid;
  gap: 6px;
}

.file-dropdown-item {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
}

.file-dropdown-item:hover {
  background: rgba(99, 102, 241, 0.08);
}

.file-dropdown-name {
  color: var(--text-primary);
}

.file-dropdown-meta {
  font-size: 12px;
  color: var(--text-tertiary);
}

.claude-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  padding: 16px;
}

.claude-session-selector {
  display: grid;
  gap: 10px;
  align-content: start;
}

.session-item {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  text-align: left;
  cursor: pointer;
}

.session-item.active {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.34);
}

.session-model-badge {
  font-size: 11px;
  color: var(--text-tertiary);
}

.session-name {
  color: var(--text-primary);
  font-weight: 600;
}

.session-stats {
  font-size: 12px;
  color: var(--text-secondary);
}

.claude-chat-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--border-default);
  border-radius: 16px;
  overflow: hidden;
}

.claude-messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.claude-message-stream {
  display: grid;
  gap: 14px;
}

.chat-msg {
  display: flex;
  gap: 12px;
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.12);
  color: var(--text-primary);
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 720px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-primary);
  line-height: 1.6;
}

.msg-thinking,
.msg-tool {
  color: var(--text-secondary);
  font-size: 13px;
}

.claude-input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-default);
}

.claude-input {
  flex: 1;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  padding: 12px 14px;
}

.send-btn {
  min-width: 88px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.send-error {
  padding: 0 16px 16px;
  color: var(--color-error);
  font-size: 12px;
}

.review-group {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-default);
}

.review-group__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.review-group__header strong {
  color: var(--text-primary);
}

.review-group__header span,
.review-file small {
  color: var(--text-secondary);
  font-size: 12px;
}

.review-file {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
}

.review-file.is-active {
  background: rgba(99, 102, 241, 0.14);
}

.review-preview {
  display: flex;
  flex-direction: column;
}

.review-preview__body {
  overflow: auto;
  padding: 20px;
}

.preview-loading,
.preview-error,
.empty-state,
.review-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  color: var(--text-secondary);
}

.preview-error {
  color: var(--color-error);
}

.preview-content pre {
  margin: 0;
  padding: 18px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.72);
  color: var(--text-primary);
  overflow: auto;
  white-space: pre-wrap;
}

.markdown-rendered {
  color: var(--text-primary);
  line-height: 1.8;
}

.markdown-rendered :deep(h1),
.markdown-rendered :deep(h2),
.markdown-rendered :deep(h3) {
  margin-top: 0;
  color: var(--text-primary);
}

.markdown-rendered :deep(code) {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.12);
}

.markdown-rendered :deep(pre) {
  padding: 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.72);
  overflow: auto;
}

.preview-unsupported {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 24px;
  color: var(--text-secondary);
}

.status-badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-tertiary);
}

.status-badge-mini.idle {
  color: var(--color-success);
  background: rgba(46, 160, 67, 0.12);
}

.status-badge-mini.busy {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.12);
}

.status-badge-mini.offline {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.12);
}

@media (max-width: 1280px) {
  .workspace-hero {
    grid-template-columns: 1fr;
  }

  .workspace-hero__stats {
    grid-template-columns: 1fr;
  }

  .workspace-layout,
  .review-layout,
  .claude-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .workspace-tabs,
  .dispatch-brief {
    grid-template-columns: 1fr;
  }

  .task-center-2 {
    padding: 0 12px 12px;
  }
}
</style>
