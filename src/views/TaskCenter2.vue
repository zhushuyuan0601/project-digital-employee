<template>
  <div class="task-center-2">
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
      @reset="handleReset"
    />

    <div class="main-container">
      <!-- 左侧面板 -->
      <aside class="left-panel">
        <!-- 活跃任务 -->
        <section class="panel task-list-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ri-list-check-2"></i>
              <span>活跃任务</span>
            </div>
            <span class="panel-badge">{{ missionCards.length }}</span>
          </div>
          <div class="panel-content">
            <div
              v-for="mission in missionCards"
              :key="mission.id"
              class="list-item"
              :class="{ active: selectedAgent === mission.agentId }"
              @click="selectAgent(mission.agentId)"
            >
              <div class="list-item__icon">
                <i :class="mission.icon"></i>
              </div>
              <div class="list-item__info">
                <div class="list-item__name">{{ mission.title }}</div>
                <div class="list-item__desc">{{ mission.desc }}</div>
              </div>
              <span class="list-item__status" :class="mission.statusClass">{{ mission.status }}</span>
            </div>
          </div>
        </section>

        <!-- 在线 Agent -->
        <section class="panel agent-list-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ri-group-line"></i>
              <span>在线 Agent</span>
            </div>
            <span class="panel-badge">{{ connectedAgentCount }}/{{ agentList.length }}</span>
          </div>
          <div class="panel-content">
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
                <div
                  class="list-item agent-item"
                  :class="{ active: selectedAgent === agent.id, offline: getAgentStatus(agent.id) === 'offline' }"
                  @click="selectAgent(agent.id)"
                >
                  <div class="agent-avatar">
                    <img :src="getAgentIcon(agent.id)" :alt="agent.name" />
                    <div class="agent-status-dot" :class="getAgentStatus(agent.id)"></div>
                  </div>
                  <div class="list-item__info">
                    <div class="list-item__name">
                      {{ agent.name }}
                      <i v-if="agent.id === 'xiaomu'" class="ri-verified-badge-fill" style="color: var(--color-primary); font-size: 14px;"></i>
                    </div>
                    <div class="list-item__desc">{{ agent.role }}</div>
                  </div>
                </div>
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

            <div
              v-if="claudeCodeSessions.length > 0"
              class="list-item agent-item claude-item"
              :class="{ active: selectedAgent === 'claude' }"
              @click="selectAgent('claude')"
            >
              <div class="agent-avatar claude-avatar">
                <i class="ri-robot-line"></i>
                <div class="agent-status-dot busy"></div>
              </div>
              <div class="list-item__info">
                <div class="list-item__name">ClaudeCode</div>
                <div class="list-item__desc">{{ claudeCodeSessions.length }} 个活跃会话</div>
              </div>
            </div>
          </div>
        </section>
      </aside>

      <!-- 中间面板：对话区域 -->
      <section class="panel middle-panel">
        <template v-if="selectedAgent && selectedAgent !== 'claude'">
          <div class="chat-header">
            <div class="chat-header__agent">
              <div class="agent-avatar agent-avatar--sm">
                <img :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
                <div class="agent-status-dot" :class="getAgentStatus(selectedAgent)"></div>
              </div>
              <div>
                <div class="chat-header__name">{{ getAgentName(selectedAgent) }}</div>
                <div class="chat-header__status">
                  <span class="status-dot-sm" :class="getAgentStatus(selectedAgent)"></span>
                  {{ getAgentStatusText(selectedAgent) }}
                </div>
              </div>
            </div>
            <div class="chat-header__actions">
              <el-popover
                v-if="currentAgentFiles.length > 0"
                trigger="click"
                placement="bottom-end"
                :width="320"
                popper-class="file-list-popper"
              >
                <template #reference>
                  <button class="header-action-btn" :class="{ 'has-new': hasNewFiles(selectedAgent) }">
                    <i class="ri-folder-zip-line"></i>
                    <span>{{ currentAgentFiles.length }}</span>
                    <span v-if="hasNewFiles(selectedAgent)" class="red-dot"></span>
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
              <button class="header-action-btn" @click="toggleTheme" :title="isLight ? '深色模式' : '浅色模式'">
                <el-icon><Sunny v-if="isLight" /><Moon v-else /></el-icon>
              </button>
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
          <div class="chat-header">
            <div class="chat-header__agent">
              <div class="agent-avatar agent-avatar--sm claude-avatar">
                <i class="ri-robot-line"></i>
                <div class="agent-status-dot busy"></div>
              </div>
              <div>
                <div class="chat-header__name">ClaudeCode</div>
                <div class="chat-header__status">
                  <span class="status-dot-sm busy"></span>
                  执行中 · {{ claudeCodeSessions.length }} 个会话
                </div>
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
                  <span class="session-stats">{{ session.tokens }} tokens</span>
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
      </section>

      <!-- 右侧面板 -->
      <aside class="right-panel">
        <!-- 执行状态 -->
        <section class="panel execution-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ri-radar-line"></i>
              <span>执行状态</span>
            </div>
            <span class="panel-badge">{{ connectedAgentCount }}/{{ agentList.length }}</span>
          </div>
          <div class="panel-content">
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
                <span>执行时长</span>
                <strong>{{ taskElapsedText }}</strong>
              </div>
            </div>
            <div class="status-timeline">
              <div
                v-for="item in commandTimeline"
                :key="item.id"
                class="timeline-item"
                :class="[item.state, { active: item.state === 'active', completed: item.state === 'completed' }]"
              >
                <span class="timeline-dot"></span>
                <div class="timeline-time">{{ item.time }}</div>
                <div class="timeline-content">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 成果资产 -->
        <section class="panel output-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ri-folder-open-line"></i>
              <span>成果资产</span>
            </div>
            <span class="panel-badge">{{ totalOutputCount }}</span>
          </div>
          <div class="panel-content">
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
          </div>
        </section>

        <!-- 文件预览 -->
        <section class="panel preview-panel">
          <div class="panel-header">
            <div class="panel-title">
              <i class="ri-file-search-line"></i>
              <span>{{ previewFileItem?.name || '文件预览' }}</span>
            </div>
            <button
              v-if="previewFileItem"
              type="button"
              class="header-action-btn"
              @click="showPreviewDialog = true"
            >
              <i class="ri-fullscreen-line"></i>
            </button>
          </div>

          <div class="panel-content preview-content-area">
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
              <div v-else-if="previewContent.type === 'html'" v-html="sanitizeHtml(previewContent.content)"></div>
              <div v-else class="preview-unsupported">
                <el-icon><Document /></el-icon>
                <p>该文件类型暂不支持在线预览</p>
                <p class="hint">{{ previewFileItem?.name }}</p>
                <el-button type="primary" @click="downloadFile">下载文件</el-button>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="ri-folder-open-line"></i>
              <span>选择成果文件开始审阅</span>
            </div>
          </div>
        </section>
      </aside>
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
          <div v-else-if="previewContent.type === 'html'" v-html="sanitizeHtml(previewContent.content)"></div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Loading, Moon, Sunny, Warning } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import { sanitizeHtml } from '@/utils/sanitize'
import TaskControlBar from '@/components/task-center/TaskControlBar.vue'
import TaskMessagePanel from '@/components/task-center/TaskMessagePanel.vue'
import { AGENT_CONFIG } from '@/simulation'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'

interface AgentFile {
  name: string
  content: string
  type: string
  path?: string
  gitUrl?: string
  mtimeStr?: string
}

const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

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
const previewFileItem = ref<AgentFile | null>(null)
const previewContent = ref<{ type: string; content: string }>({ type: '', content: '' })
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const showPreviewDialog = ref(false)
const fileCache = ref<Record<string, { files: AgentFile[]; timestamp: number }>>({})
const fileChangeCount = ref<Record<string, number>>({})
const taskStartTime = ref<number>(0)
const taskEndTime = ref<number>(0)
const currentTimeMs = ref(Date.now())
const claudeCodeSessions = ref<any[]>([])
const selectedClaudeSession = ref<any>(null)
const claudeTranscript = ref<any[]>([])
const claudeTranscriptLoading = ref(false)
const claudeInputMessage = ref('')
const claudeSending = ref(false)
const claudeSendError = ref('')
const claudeMessagesRef = ref<HTMLElement | null>(null)

let clockTimer: ReturnType<typeof setInterval> | null = null
let claudeCodePollInterval: ReturnType<typeof setInterval> | null = null
let fileRefreshTimer: ReturnType<typeof setInterval> | null = null

const agents = computed(() => multiAgentStore.agents)
const isLight = computed(() => themeStore.isLight)
const lastMessageTime = ref<Record<string, number>>({})

const connectedAgentCount = computed(() =>
  agentList.filter(agent => agents.value[agent.id]?.isConnected).length,
)
const busyAgentCount = computed(() =>
  agentList.filter(agent => isAgentBusy(agent.id)).length,
)
const anyConnected = computed(() => connectedAgentCount.value > 0)
const allConnected = computed(() => connectedAgentCount.value === agentList.length)
const aiStatusText = computed(() => {
  if (aiStatus.value === 'connected') return '节点运行正常'
  if (aiStatus.value === 'error') return '连接异常'
  return '未连接'
})
const timestampText = computed(() =>
  new Date(currentTimeMs.value).toLocaleString('zh-CN', { hour12: false }),
)
const currentUserLabel = computed(() => authStore.user?.username || 'Admin')
const selectedAgentConnected = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return false
  return !!agents.value[selectedAgent.value]?.isConnected
})
const currentAgentMessages = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return []
  return agents.value[selectedAgent.value]?.messages || []
})
const currentAgentFiles = computed(() => {
  if (!selectedAgent.value || selectedAgent.value === 'claude') return []
  return getAgentFiles(selectedAgent.value)
})
const chatInputPlaceholder = computed(() => {
  if (!selectedAgent.value) return '请先选择一个 Agent'
  if (!selectedAgentConnected.value) return `${getAgentName(selectedAgent.value)} 未连接`
  return `向 ${getAgentName(selectedAgent.value)} 下发任务指令...`
})
const totalOutputCount = computed(() =>
  outputReviewGroups.value.reduce((sum, group) => sum + group.files.length, 0),
)
const pendingReviewCount = computed(() => {
  let count = 0
  for (const agentId of Object.keys(AGENT_TO_ROLE_ID)) {
    count += fileChangeCount.value[agentId] || 0
  }
  return count
})
const outputReviewGroups = computed(() => {
  const groups: { id: string; name: string; role: string; files: AgentFile[] }[] = []
  for (const agent of agentList) {
    const files = getAgentFiles(agent.id)
    if (files.length > 0) {
      groups.push({ id: agent.id, name: agent.name, role: agent.role, files })
    }
  }
  return groups
})
const currentTargetLabel = computed(() => {
  if (!selectedAgent.value) return '未选择'
  if (selectedAgent.value === 'claude') return 'ClaudeCode'
  return getAgentName(selectedAgent.value)
})
const reviewSelectionKey = computed(() => reviewFileKey(previewFileItem.value))
const taskElapsedText = computed(() => {
  if (!taskStartTime.value) return '尚未开始派发'
  const end = taskEndTime.value || Date.now()
  const duration = Math.max(0, Math.floor((end - taskStartTime.value) / 1000))
  if (duration < 60) return `${duration}s`
  return `${Math.floor(duration / 60)}m ${duration % 60}s`
})
const missionCards = computed(() => [
  {
    id: 'xiaomu',
    agentId: 'xiaomu',
    title: '任务创建 / 派发',
    desc: `当前对象 ${getAgentName('xiaomu')}`,
    icon: 'ri-send-plane-line',
    status: selectedAgent.value === 'xiaomu' ? '进行中' : taskStartTime.value ? '已准备' : '待处理',
    statusClass: selectedAgent.value === 'xiaomu' ? 'running' : taskStartTime.value ? 'standby' : 'queued',
  },
  {
    id: 'execution',
    agentId: selectedAgent.value || 'xiaomu',
    title: '执行会话',
    desc: `跟踪 ${busyAgentCount.value} 个忙碌 Agent`,
    icon: 'ri-pulse-line',
    status: busyAgentCount.value > 0 ? '执行中' : '待命',
    statusClass: busyAgentCount.value > 0 ? 'running' : 'standby',
  },
  {
    id: 'review',
    agentId: selectedAgent.value || 'xiaomu',
    title: '成果审阅',
    desc: `${totalOutputCount.value} 份成果已回流`,
    icon: 'ri-file-list-3-line',
    status: pendingReviewCount.value > 0 ? '待审阅' : totalOutputCount.value > 0 ? '已同步' : '空',
    statusClass: pendingReviewCount.value > 0 ? 'queued' : totalOutputCount.value > 0 ? 'standby' : 'muted',
  },
])
const commandTimeline = computed(() => [
  {
    id: 'connect',
    time: anyConnected.value ? '在线' : '离线',
    title: '连接与握手',
    desc: anyConnected.value ? `${connectedAgentCount.value} 个 Agent 已建立 Gateway 链路` : '等待建立 Gateway 连接',
    state: allConnected.value ? 'completed' : anyConnected.value ? 'active' : 'pending',
  },
  {
    id: 'dispatch',
    time: taskStartTime.value ? new Date(taskStartTime.value).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--',
    title: '任务派发',
    desc: taskStartTime.value ? `当前派发对象：${currentTargetLabel.value}` : '选择 Agent 并下发任务指令',
    state: taskStartTime.value ? 'completed' : 'pending',
  },
  {
    id: 'execute',
    time: busyAgentCount.value > 0 ? `${busyAgentCount.value} busy` : 'idle',
    title: '执行跟踪',
    desc: selectedAgent.value === 'claude'
      ? `ClaudeCode 正在处理会话`
      : `${currentTargetLabel.value} 当前${getAgentStatusText(selectedAgent.value || 'xiaomu')}`,
    state: busyAgentCount.value > 0 || selectedAgent.value === 'claude' ? 'active' : 'pending',
  },
  {
    id: 'review',
    time: `${totalOutputCount.value} files`,
    title: '成果回流',
    desc: previewFileItem.value ? `正在审阅 ${previewFileItem.value.name}` : '等待选择成果文件进行审阅',
    state: previewFileItem.value ? 'active' : totalOutputCount.value > 0 ? 'completed' : 'pending',
  },
])

function toggleTheme() {
  themeStore.toggle()
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
  return fileCache.value[cacheKey]?.files || []
}

async function refreshAgentFiles(agentId: string) {
  const roleId = AGENT_TO_ROLE_ID[agentId]
  if (!roleId) return

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const cacheKey = `files_${agentId}_${dateStr}`
  const cached = fileCache.value[cacheKey]
  if (cached && Date.now() - cached.timestamp < 5000) return

  try {
    const res = await fetch(`/api/files/role?roleId=${roleId}&date=${dateStr}`)
    const data = await res.json()
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

      fileCache.value[cacheKey] = { files: newFiles, timestamp: Date.now() }
    } else if (Array.isArray(data.files) && data.files.length === 0) {
      fileCache.value[cacheKey] = { files: [], timestamp: Date.now() }
    }
  } catch (err) {
    console.error('[TaskCenter2] Fetch files error:', err)
  }
}

async function refreshAllAgentFiles() {
  await Promise.all(Object.keys(AGENT_TO_ROLE_ID).map(id => refreshAgentFiles(id)))
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
  if (/\.(md|markdown)$/i.test(fileName)) return 'ri-file-code-line'
  if (/\.txt$/i.test(fileName)) return 'ri-file-text-line'
  if (/\.html?$/i.test(fileName)) return 'ri-html5-fill'
  if (/\.docx?$/i.test(fileName)) return 'ri-file-word-line'
  if (/\.pptx?$/i.test(fileName)) return 'ri-file-ppt-line'
  if (/\.xlsx?$/i.test(fileName)) return 'ri-file-excel-line'
  return 'ri-file-line'
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
  if (selectedAgent.value && selectedAgent.value !== 'claude') {
    selectedReviewAgentId.value = selectedAgent.value
    fileChangeCount.value[selectedAgent.value] = 0
  }
  loadPreviewFile(file, true)
}

function inspectReviewFile(agentId: string, file: AgentFile) {
  selectedReviewAgentId.value = agentId
  fileChangeCount.value[agentId] = 0
  loadPreviewFile(file, false)
}

function downloadFile() {
  if (!previewFileItem.value) return
  const blob = new Blob([previewContent.value.content], { type: 'text/plain' })
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

Object.keys(AGENT_TO_ROLE_ID).forEach(agentId => {
  watch(
    () => agents.value[agentId]?.messages?.length,
    () => {
      const agent = agents.value[agentId]
      if (agent?.messages?.length) {
        lastMessageTime.value[agentId] = agent.messages[agent.messages.length - 1].timestamp
      }
    },
    { immediate: true },
  )
})

watch(
  outputReviewGroups,
  (groups) => {
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
  authStore.restoreSession()
  multiAgentStore.loadMessages()
  if (!selectedAgent.value) {
    selectedAgent.value = 'xiaomu'
  }
  clockTimer = setInterval(() => {
    currentTimeMs.value = Date.now()
  }, 1000)
  fetchClaudeCodeSessions()
  claudeCodePollInterval = setInterval(fetchClaudeCodeSessions, 5000)
  refreshAllAgentFiles()
  fileRefreshTimer = setInterval(refreshAllAgentFiles, 10000)
})

onUnmounted(() => {
  if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
  if (claudeCodePollInterval) {
    clearInterval(claudeCodePollInterval)
    claudeCodePollInterval = null
  }
  if (fileRefreshTimer) {
    clearInterval(fileRefreshTimer)
    fileRefreshTimer = null
  }
})
</script>

<style scoped>
.task-center-2 {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 主体布局 */
.main-container {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 24px;
  gap: 24px;
  background-image:
    radial-gradient(circle at 50% 0%, rgba(var(--color-primary-rgb), 0.06) 0%, transparent 50%),
    linear-gradient(rgba(var(--color-primary-rgb), 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.02) 1px, transparent 1px);
  background-size: auto, 28px 28px, 28px 28px;
}

/* 左侧面板 */
.left-panel {
  width: 25%;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 中间面板 */
.middle-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 右侧面板 */
.right-panel {
  width: 25%;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 面板通用样式 */
.panel {
  background: rgba(18, 23, 33, 0.85);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  position: relative;
}

.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--color-cyan), var(--color-primary));
  opacity: 0.8;
  z-index: 1;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title i {
  color: var(--color-primary);
  font-size: 18px;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.task-list-panel,
.agent-list-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 列表项 */
.list-item {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-item:last-child {
  margin-bottom: 0;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.list-item.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.2);
  box-shadow: inset 4px 0 0 var(--color-primary);
}

.list-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.list-item__info {
  flex: 1;
  min-width: 0;
}

.list-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-item__desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.list-item__status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.list-item__status.running {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
}

.list-item__status.standby {
  color: var(--color-success);
  background: rgba(46, 160, 67, 0.1);
  border: 1px solid rgba(46, 160, 67, 0.3);
}

.list-item__status.queued {
  color: var(--color-warning);
  background: rgba(210, 153, 34, 0.1);
  border: 1px solid rgba(210, 153, 34, 0.3);
}

.list-item__status.muted {
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

/* Agent 头像 */
.agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid rgba(var(--color-primary-rgb), 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.agent-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.agent-avatar--sm {
  width: 32px;
  height: 32px;
}

.agent-avatar.claude-avatar {
  background: rgba(163, 113, 247, 0.15);
  border-color: rgba(163, 113, 247, 0.3);
  color: var(--agent-claude);
  font-size: 18px;
}

.agent-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-success);
  border: 2px solid rgba(18, 23, 33, 0.9);
  box-shadow: 0 0 5px var(--color-success);
}

.agent-status-dot.busy {
  background: var(--color-warning);
  box-shadow: 0 0 5px var(--color-warning);
}

.agent-status-dot.offline {
  background: var(--color-error);
  box-shadow: 0 0 5px var(--color-error);
}

.agent-item.offline {
  opacity: 0.5;
}

.claude-item {
  border-color: rgba(163, 113, 247, 0.2);
  background: rgba(163, 113, 247, 0.06);
}

.claude-item.is-active,
.claude-item.active {
  background: rgba(163, 113, 247, 0.12);
  border-color: rgba(163, 113, 247, 0.3);
  box-shadow: inset 4px 0 0 var(--agent-claude);
}

/* 中间对话区域 */
.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(var(--color-primary-rgb), 0.03);
}

.chat-header__agent {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 15px;
}

.chat-header__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-success);
}

.status-dot-sm {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-dot-sm.busy {
  background: var(--color-warning);
  box-shadow: 0 0 8px var(--color-warning);
}

.status-dot-sm.offline {
  background: var(--color-error);
  box-shadow: 0 0 8px var(--color-error);
}

.chat-header__actions {
  display: flex;
  gap: 8px;
}

.header-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  position: relative;
}

.header-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.header-action-btn.has-new {
  border-color: rgba(210, 153, 34, 0.4);
}

.red-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-warning);
}

.detail-content {
  flex: 1;
  min-height: 0;
}

/* 执行状态面板 */
.execution-metrics {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.execution-metric {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--text-secondary);
  font-size: 13px;
}

.execution-metric strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

/* 时间线 */
.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}

.status-timeline::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 5px;
  width: 2px;
  background: rgba(255, 255, 255, 0.08);
}

.timeline-item {
  position: relative;
  padding: 0 0 18px 16px;
}

.timeline-dot {
  position: absolute;
  left: -19px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.12);
  z-index: 2;
}

.timeline-item.completed .timeline-dot {
  border-color: var(--color-success);
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(46, 160, 67, 0.4);
}

.timeline-item.active .timeline-dot {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 0 0 10px rgba(88, 166, 255, 0.45);
}

.timeline-item.active::before {
  content: '';
  position: absolute;
  left: -23px;
  top: 1px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(88, 166, 255, 0.16);
  animation: pulse 2s infinite;
  z-index: 1;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

.timeline-time {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-bottom: 6px;
}

.timeline-content {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.025);
}

.timeline-content strong {
  color: var(--text-primary);
  font-size: 13px;
}

.timeline-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.timeline-item.active .timeline-content {
  border-color: rgba(var(--color-primary-rgb), 0.2);
  background: rgba(var(--color-primary-rgb), 0.05);
}

/* 成果资产 */
.review-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: var(--text-secondary);
  font-size: 13px;
}

.review-group {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 12px;
}

.review-group:last-child {
  margin-bottom: 0;
}

.review-group__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.review-group__header strong {
  color: var(--text-primary);
  font-size: 13px;
}

.review-group__header span {
  color: var(--text-secondary);
  font-size: 12px;
}

.review-file {
  width: 100%;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
}

.review-file:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
}

.review-file.is-active {
  background: rgba(var(--color-primary-rgb), 0.14);
}

.review-file small {
  color: var(--text-secondary);
  font-size: 11px;
}

/* 文件预览 */
.preview-content-area {
  overflow: auto;
}

.preview-loading,
.preview-error,
.empty-state {
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
  border-radius: 8px;
  background: rgba(7, 12, 20, 0.82);
  color: var(--text-primary);
  overflow: auto;
  white-space: pre-wrap;
  font-size: 13px;
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
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.12);
}

.markdown-rendered :deep(pre) {
  padding: 16px;
  border-radius: 8px;
  background: rgba(7, 12, 20, 0.82);
  overflow: auto;
}

.preview-unsupported {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 24px;
  color: var(--text-secondary);
}

.preview-unsupported .hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.preview-dialog-body {
  min-height: 300px;
  max-height: 70vh;
  overflow: auto;
}

/* 文件下拉 */
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
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-dropdown-item:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
}

.file-dropdown-name {
  color: var(--text-primary);
  font-size: 13px;
}

.file-dropdown-meta {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* Claude 会话 */
.claude-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
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
  padding: 12px;
  border: 1px solid rgba(163, 113, 247, 0.14);
  border-radius: 8px;
  background: rgba(163, 113, 247, 0.06);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.session-item.active {
  background: rgba(163, 113, 247, 0.14);
  border-color: rgba(163, 113, 247, 0.34);
}

.session-model-badge {
  font-size: 11px;
  color: var(--text-tertiary);
}

.session-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
}

.session-stats {
  font-size: 12px;
  color: var(--text-secondary);
}

.claude-chat-container {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid rgba(163, 113, 247, 0.16);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(10, 14, 21, 0.88);
}

.claude-messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(163, 113, 247, 0.12);
  color: var(--text-primary);
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 720px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  line-height: 1.6;
  font-size: 13px;
}

.chat-msg.user .msg-bubble {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: white;
}

.msg-thinking,
.msg-tool {
  color: var(--text-secondary);
  font-size: 12px;
}

.claude-input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid rgba(163, 113, 247, 0.14);
}

.claude-input {
  flex: 1;
  border: 1px solid rgba(163, 113, 247, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  padding: 10px 14px;
  font-size: 13px;
}

.claude-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  min-width: 80px;
  border: 0;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--agent-claude), #7c3aed);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:hover {
  opacity: 0.9;
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

/* Agent 提示卡片 */
.agent-tip-card {
  display: grid;
  gap: 12px;
}

.agent-tip-header {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.agent-tip-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.agent-tip-title {
  min-width: 0;
}

.agent-tip-name {
  color: var(--text-primary);
  font-weight: 700;
}

.agent-tip-role {
  color: var(--text-secondary);
  font-size: 12px;
}

.agent-tip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-secondary);
  font-size: 11px;
}

.agent-tip-desc {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.agent-tip-stats {
  display: flex;
  gap: 16px;
}

.agent-tip-stat {
  display: grid;
  gap: 4px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.stat-value {
  color: var(--text-primary);
  font-weight: 600;
}

.status-badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(46, 160, 67, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(46, 160, 67, 0.2);
}

.status-badge-mini.busy {
  color: var(--color-warning);
  background: rgba(210, 153, 34, 0.1);
  border-color: rgba(210, 153, 34, 0.2);
}

.status-badge-mini.offline {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.2);
}

.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  color: var(--text-secondary);
}

.output-panel,
.execution-panel,
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 滚动条 */
.panel-content::-webkit-scrollbar,
.claude-messages-container::-webkit-scrollbar,
.preview-content-area::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.panel-content::-webkit-scrollbar-track,
.claude-messages-container::-webkit-scrollbar-track,
.preview-content-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

.panel-content::-webkit-scrollbar-thumb,
.claude-messages-container::-webkit-scrollbar-thumb,
.preview-content-area::-webkit-scrollbar-thumb {
  background: rgba(var(--color-primary-rgb), 0.2);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.claude-messages-container::-webkit-scrollbar-thumb:hover,
.preview-content-area::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--color-primary-rgb), 0.4);
}
</style>
