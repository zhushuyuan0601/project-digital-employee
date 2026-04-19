<template>
  <div class="task-center-2">
    <!-- 顶部标题 -->
    <div class="task-center__header">
      <div class="task-center__title-wrap">
        <div class="task-center__title">
          <h1>任务指挥中心 II</h1>
          <span class="task-center__mode">多 Agent 协作 · Gateway 直连</span>
        </div>
      </div>
      <div class="header-actions">
        <div class="ai-status" :class="`status--${aiStatus}`">
          <span class="status-dot"></span>
          <span class="status-label">
            {{ aiStatusText }}
          </span>
        </div>
        <button type="button" class="btn btn-success btn-sm" @click="handleConnectAll" :disabled="allConnected">
          <span class="btn-icon"><i class="fas fa-plug"></i></span>
          全连
        </button>
        <button type="button" class="btn btn-danger btn-sm" @click="handleDisconnectAll" :disabled="!anyConnected">
          <span class="btn-icon"><i class="fas fa-power-off"></i></span>
          全断
        </button>
        <button type="button" class="btn btn-secondary btn-sm" @click="handleReset">
          <span class="btn-icon"><i class="fas fa-trash-alt"></i></span>
          重置
        </button>
      </div>
    </div>

    <!-- 任务下达区域 -->
    <div class="task-input-section">
      <div class="task-input-row">
        <el-input
          v-model="taskInput"
          placeholder="输入任务内容，直接下发给小呦..."
          type="textarea"
          :rows="2"
          class="task-input"
          @keydown.ctrl.enter="sendTask"
        />
      </div>
      <div class="send-btn-row">
        <button
          type="button"
          class="btn btn-primary btn-lg send-btn-task"
          @click="sendTask"
          :disabled="!taskInput.trim() || !xiaomuConnected"
        >
          <span class="btn-icon"><i class="fas fa-paper-plane"></i></span>
          下发任务
        </button>
        <span class="connection-hint" :class="{ connected: xiaomuConnected }">
          <span class="hint-dot"></span>
          {{ xiaomuConnected ? '小呦已连接' : '小呦未连接' }}
        </span>
      </div>
    </div>

    <!-- 主体内容：侧边栏 + 详情面板 -->
    <div class="main-layout">
      <!-- 左侧：Agent 列表 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="section-title">
            ACTIVE AGENTS
            <span class="agent-count">{{ agentList.length }}</span>
          </div>
        </div>

        <div class="agent-list" ref="agentListRef">
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
                class="agent-card-mini"
                :class="{ active: selectedAgent === agent.id }"
                @click="selectAgent(agent.id)"
              >
                <div class="agent-avatar-mini">
                  <img :src="getAgentIcon(agent.id)" :alt="agent.name" />
                  <span class="status-dot-mini" :class="getAgentStatus(agent.id)"></span>
                </div>
                <div class="agent-info-mini">
                  <div class="agent-name-mini">{{ agent.name }}</div>
                  <div class="agent-role-mini">{{ agent.role }}</div>
                  <div class="status-badge-mini" :class="getAgentStatus(agent.id)">
                    <i class="ri-checkbox-circle-line"></i>
                    {{ getAgentStatusText(agent.id) }}
                  </div>
                </div>
                <span v-if="hasNewFiles(agent.id)" class="new-file-dot" title="有新文件产出"></span>
              </div>
            </template>
            <!-- Hover 详情卡片 -->
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

          <!-- ClaudeCode 动态角色 -->
          <div
            v-if="claudeCodeSessions.length > 0"
            class="agent-card-mini"
            :class="{ active: selectedAgent === 'claude' }"
            @click="selectAgent('claude')"
          >
            <div class="agent-avatar-mini">
              <div class="claude-avatar-small"><i class="fas fa-robot"></i></div>
              <span class="status-dot-mini online"></span>
            </div>
            <div class="agent-info-mini">
              <div class="agent-name-mini">ClaudeCode</div>
              <div class="agent-role-mini">代码执行者 · {{ claudeCodeSessions.length }} 个活跃会话</div>
              <div class="status-badge-mini busy">
                <i class="ri-loader-4-line ri-spin"></i>
                执行中
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详情面板 -->
      <div class="detail-panel">
        <template v-if="selectedAgent && selectedAgent !== 'claude'">
          <!-- 紧凑标题栏 -->
          <div class="detail-topbar">
            <img class="detail-topbar-avatar" :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
            <span class="detail-topbar-name">{{ getAgentName(selectedAgent) }}</span>
            <span class="detail-topbar-role">{{ getAgentRole(selectedAgent) }}</span>
            <div class="detail-topbar-spacer"></div>
            <!-- 产出文件 Tips -->
            <el-popover
              v-if="getAgentFiles(selectedAgent).length > 0"
              trigger="click"
              placement="bottom-end"
              :width="320"
            >
              <template #reference>
                <button class="file-tip-btn" :class="{ 'has-new': hasNewFiles(selectedAgent) }">
                  <i class="ri-folder-zip-line"></i>
                  <span>{{ getAgentFiles(selectedAgent).length }}</span>
                  <span v-if="hasNewFiles(selectedAgent)" class="file-red-dot"></span>
                </button>
              </template>
              <div class="file-dropdown">
                <div
                  v-for="file in getAgentFiles(selectedAgent)"
                  :key="file.name"
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

          <!-- 详情内容：聊天区 -->
          <div class="detail-content">
            <div class="chat-section">
              <div class="chat-container" :ref="(el) => { if (selectedAgent) chatBoxRefs[selectedAgent] = el as HTMLElement | null }">
                <div v-if="(agents[selectedAgent]?.messages.length || 0) === 0" class="chat-empty-hint">
                  <i class="ri-chat-smile-2-line"></i>
                  暂无对话记录
                </div>
                <div
                  v-for="msg in agents[selectedAgent]?.messages"
                  :key="msg.id"
                  class="chat-msg"
                  :class="{ user: msg.role === 'user' }"
                >
                  <div class="msg-avatar">
                    <template v-if="msg.role === 'user'">
                      <i class="ri-user-line"></i>
                    </template>
                    <template v-else>
                      <img :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
                    </template>
                  </div>
                  <div>
                    <div class="msg-bubble" v-html="renderMarkdown(msg.content)"></div>
                    <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ClaudeCode 详情 -->
        <template v-else-if="selectedAgent === 'claude'">
          <div class="detail-topbar">
            <div class="claude-avatar-topbar"><i class="fas fa-robot"></i></div>
            <span class="detail-topbar-name">ClaudeCode</span>
            <span class="detail-topbar-role" style="background: rgba(139, 92, 246, 0.1); color: var(--agent-claude); border-color: rgba(139, 92, 246, 0.2);">代码执行者</span>
            <div class="detail-topbar-spacer"></div>
            <span style="font-size: 11px; color: var(--text-tertiary);">{{ claudeCodeSessions.length }} 个活跃会话</span>
            <div class="status-badge-mini busy">
              <i class="ri-loader-4-line ri-spin"></i>
              执行中
            </div>
          </div>

          <div class="detail-content">
            <div class="chat-section">
              <!-- 会话选择器 -->
              <div class="claude-session-selector">
                <div
                  v-for="session in claudeCodeSessions"
                  :key="session.id"
                  class="session-item"
                  :class="{ active: selectedClaudeSession?.id === session.id }"
                  @click="selectClaudeSession(session)"
                >
                  <span class="session-model-badge">{{ session.model }}</span>
                  <span class="session-name">{{ getSessionDisplayName(session) }}</span>
                  <span class="session-stats">{{ session.tokens }} tokens · {{ session.userMessages }}/{{ session.assistantMessages }}</span>
                </div>
              </div>

              <!-- 消息列表 -->
              <div v-if="selectedClaudeSession" class="claude-chat-container">
                <div class="claude-messages-container" ref="claudeMessagesRef">
                  <div v-if="claudeTranscriptLoading" class="chat-loading">
                    <i class="ri-loader-4-line ri-spin"></i> 加载消息中...
                  </div>
                  <div v-else-if="claudeTranscript.length === 0" class="chat-empty-hint">
                    暂无消息记录
                  </div>
                  <div v-else>
                    <div
                      v-for="(msg, idx) in claudeTranscript"
                      :key="idx"
                      class="chat-msg"
                      :class="{ user: msg.role === 'user' }"
                    >
                      <div class="msg-avatar">
                        <template v-if="msg.role === 'user'">
                          <i class="ri-user-line"></i>
                        </template>
                        <template v-else>
                          <i class="ri-robot-line"></i>
                        </template>
                      </div>
                      <div>
                        <div class="msg-bubble">
                          <template v-for="(part, pidx) in msg.parts" :key="pidx">
                            <div v-if="part.type === 'text'">{{ part.text }}</div>
                            <div v-else-if="part.type === 'thinking'" class="msg-thinking"><i class="ri-brain-line"></i> {{ part.thinking }}</div>
                            <div v-else-if="part.type === 'tool_use'" class="msg-tool">
                              <span class="tool-name"><i class="ri-tools-line"></i> {{ part.name }}</span>
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 发送消息 -->
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

        <!-- 未选中 Agent 的默认提示 -->
        <div v-else class="no-agent-selected">
          <i class="ri-arrow-left-line"></i>
          <span>请在左侧选择一个 Agent 查看详情</span>
        </div>
      </div>
    </div>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewFileItem?.name || '文件预览'"
      width="900px"
      :close-on-click-modal="true"
    >
      <div class="file-preview-container">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Warning, Document } from '@element-plus/icons-vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { AGENT_CONFIG } from '@/simulation'
import MarkdownIt from 'markdown-it'

const multiAgentStore = useMultiAgentChatStore()
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})

// Agent 列表配置
const agentList = [
  { id: 'xiaomu', name: '小呦', role: '项目统筹', desc: '项目统筹与任务协调，负责分配任务给其他 Agent 并跟踪进度。', tags: ['项目管理', '任务分配', '进度跟踪'] },
  { id: 'xiaoyan', name: '研究员', role: '调研分析', desc: '深度调研与信息分析，生成调研报告和数据分析结果。', tags: ['调研分析', '数据处理', '报告生成'] },
  { id: 'xiaochan', name: '产品经理', role: '产品设计', desc: '产品需求分析与设计，输出产品方案和功能规格说明。', tags: ['需求分析', '产品设计', '文档编写'] },
  { id: 'xiaokai', name: '研发工程师', role: '技术开发', desc: '代码开发与技术实现，完成功能开发和代码提交。', tags: ['代码开发', '技术实现', 'Git'] },
  { id: 'xiaoce', name: '测试员', role: '质量检查', desc: '代码质量检查与测试，发现 Bug 并输出测试报告。', tags: ['代码审查', '测试', 'Bug 发现'] }
]

// 连接状态
const aiStatus = ref<'connected' | 'disconnected' | 'error'>('connected')
const aiStatusText = computed(() => {
  if (allConnected.value) return '所有 Agent 已连接'
  if (anyConnected.value) return '部分 Agent 已连接'
  return '未连接 Gateway'
})

const allConnected = computed(() => multiAgentStore.allConnected)
const anyConnected = computed(() => multiAgentStore.anyConnected)

// 任务输入
const taskInput = ref('')
const isSending = ref(false)

// Agent 状态
const agents = computed(() => multiAgentStore.agents)
const xiaomuConnected = computed(() => multiAgentStore.agents['xiaomu']?.isConnected || false)

// 选中的 Agent
const selectedAgent = ref<string | null>(null)

// 文件预览对话框
const showPreviewDialog = ref(false)
const previewFileItem = ref<{ name: string; content: string; type: string; path?: string; gitUrl?: string } | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewContent = ref<{ type: string; content: string }>({ type: '', content: '' })

// 聊天框 refs
const chatBoxRefs = ref<Record<string, HTMLElement | null>>({})

// 跟踪聊天框用户滚动
const chatUserScrolledUp = ref<Record<string, boolean>>({})

// ClaudeCode 会话数据
const claudeCodeSessions = ref<any[]>([])
let claudeCodePollInterval: ReturnType<typeof setInterval> | null = null

const selectedClaudeSession = ref<any>(null)
const claudeTranscript = ref<any[]>([])
const claudeTranscriptLoading = ref(false)
const claudeInputMessage = ref('')
const claudeSending = ref(false)
const claudeSendError = ref('')
const claudeMessagesRef = ref<HTMLElement | null>(null)

// 任务时间追踪
const taskStartTime = ref<number>(0)
const taskEndTime = ref<number>(0)

// 文件缓存
const fileCache = ref<Record<string, { files: any[]; timestamp: number }>>({})
const forceRefresh = ref(0)
const fileChangeCount = ref<Record<string, number>>({})

// Agent 到角色 ID 的映射
const AGENT_TO_ROLE_ID: Record<string, string> = {
  xiaomu: 'ceo',
  xiaoyan: 'researcher',
  xiaochan: 'pm',
  xiaokai: 'tech-lead',
  xiaoce: 'team-qa'
}

// 选择 Agent
const selectAgent = (agentId: string) => {
  selectedAgent.value = agentId
}

// 检查是否有新文件
const hasNewFiles = (agentId: string) => {
  return (fileChangeCount.value[agentId] || 0) > 0
}

// 获取 Agent 状态
const getAgentStatus = (agentId: string) => {
  if (agentId === 'claude') return 'busy'
  const agent = agents.value[agentId]
  if (!agent?.isConnected) return 'offline'
  if (isAgentBusy(agentId)) return 'busy'
  return 'idle'
}

// 获取 Agent 状态图标
const getAgentStatusIcon = (agentId: string) => {
  const status = getAgentStatus(agentId)
  if (status === 'busy') return 'ri-loader-4-line ri-spin'
  if (status === 'offline') return 'ri-cloud-off-line'
  return 'ri-checkbox-circle-line'
}

// 获取 Agent 状态文本
const getAgentStatusText = (agentId: string) => {
  const status = getAgentStatus(agentId)
  if (status === 'busy') return '工作中'
  if (status === 'offline') return '未连接'
  return '空闲'
}

// 判断 Agent 是否忙碌
const isAgentBusy = (agentId: string) => {
  const agent = agents.value[agentId]
  if (!agent) return false
  const lastTime = lastMessageTime.value[agentId] || 0
  const now = Date.now()
  return now - lastTime < 2000
}

// 获取 Agent 名称
const getAgentName = (agentId: string) => {
  const a = agentList.find(a => a.id === agentId)
  return a?.name || agentId
}

// 获取 Agent 角色
const getAgentRole = (agentId: string) => {
  const roles: Record<string, string> = {
    xiaomu: '项目统筹 · agent:ceo:main',
    xiaoyan: '调研分析 · agent:researcher:main',
    xiaochan: '产品设计 · agent:pm:main',
    xiaokai: '技术开发 · agent:tech-lead:main',
    xiaoce: '质量检查 · agent:team-qa:main'
  }
  return roles[agentId] || ''
}

// 获取 Agent 描述
const getAgentDesc = (agentId: string) => {
  const a = agentList.find(a => a.id === agentId)
  return a?.desc || ''
}

// 获取 Agent 标签
const getAgentTags = (agentId: string) => {
  const a = agentList.find(a => a.id === agentId)
  return a?.tags || []
}

// 获取 Agent 图标
const getAgentIcon = (agentId: string) => {
  return AGENT_CONFIG[agentId]?.icon || ''
}

// 获取 Agent 文件
const getAgentFiles = (agentId: string) => {
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
        const newFiles = data.files.map((f: any) => ({
          name: f.name,
          content: '',
          type: f.type,
          path: f.path,
          icon: f.icon,
          mtime: f.mtime,
          mtimeStr: f.mtimeStr
        }))

        // 检测新文件
        const oldCount = cached?.files.length || 0
        if (oldCount > 0 && newFiles.length > oldCount) {
          fileChangeCount.value[agentId] = (fileChangeCount.value[agentId] || 0) + (newFiles.length - oldCount)
        }

        fileCache.value[cacheKey] = {
          files: newFiles,
          timestamp: Date.now()
        }

        if (agentId === 'xiaokai' && data.gitUrl) {
          const gitFile = fileCache.value[cacheKey].files.find((f: any) => f.name === '代码仓库')
          if (!gitFile) {
            fileCache.value[cacheKey].files.push({
              name: '代码仓库',
              content: '代码已提交到仓库',
              type: 'code',
              gitUrl: data.gitUrl
            })
          }
        }

        forceRefresh.value++
      } else if (data.files && data.files.length === 0) {
        fileCache.value[cacheKey] = {
          files: [],
          timestamp: Date.now()
        }
        forceRefresh.value++
      }
    })
    .catch(err => {
      console.error('[TaskCenter2] Fetch files error:', err)
    })

  return fileCache.value[cacheKey]?.files || []
}

// 记录每个 Agent 最后收到消息的时间
const lastMessageTime = ref<Record<string, number>>({
  xiaomu: 0,
  xiaoyan: 0,
  xiaochan: 0,
  xiaokai: 0,
  xiaoce: 0
})

// 监听消息变化，更新最后消息时间
watch(
  () => agents.value,
  () => {
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      const agent = agents.value[agentId]
      if (agent && agent.messages.length > 0) {
        const lastMsg = agent.messages[agent.messages.length - 1]
        lastMessageTime.value[agentId] = lastMsg.timestamp
      }
    })
  },
  { deep: true, immediate: true }
)

// 自动滚动聊天到底部
const scrollChatToBottom = (agentId: string) => {
  nextTick(() => {
    const chatBox = chatBoxRefs.value[agentId]
    if (chatBox && !chatUserScrolledUp.value[agentId]) {
      chatBox.scrollTop = chatBox.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动聊天
watch(
  () => [
    agents.value['xiaomu']?.messages.length,
    agents.value['xiaoyan']?.messages.length,
    agents.value['xiaochan']?.messages.length,
    agents.value['xiaokai']?.messages.length,
    agents.value['xiaoce']?.messages.length
  ],
  () => {
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => scrollChatToBottom(agentId))
  }
)

// 渲染 Markdown
const renderMarkdown = (content: string) => {
  if (!content) return ''
  return md.render(content)
}

const renderPreviewContent = () => {
  if (previewContent.value.type === 'markdown') {
    return md.render(previewContent.value.content)
  }
  return previewContent.value.content
}

const escapeHtml = (content: string) => {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 获取文件图标
const getFileIcon = (fileName: string) => {
  if (/\.(md|markdown)$/i.test(fileName)) return 'fas fa-file-code'
  if (/\.txt$/i.test(fileName)) return 'fas fa-file-alt'
  if (/\.html?$/i.test(fileName)) return 'fas fa-globe'
  if (/\.docx?$/i.test(fileName)) return 'fas fa-file-word'
  if (/\.pptx?$/i.test(fileName)) return 'fas fa-file-powerpoint'
  if (/\.xlsx?$/i.test(fileName)) return 'fas fa-file-excel'
  return 'fas fa-file'
}

// 预览文件
const previewFile = (file: { name: string; content: string; type: string; path?: string }) => {
  previewFileItem.value = file
  previewLoading.value = true
  previewError.value = null
  showPreviewDialog.value = true

  if (file.path) {
    fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`)
      .then(res => res.json())
      .then(data => {
        previewLoading.value = false
        if (data.success) {
          previewContent.value = {
            type: file.type,
            content: data.content
          }
        } else {
          previewError.value = data.error || '读取文件失败'
        }
      })
      .catch(err => {
        previewLoading.value = false
        previewError.value = '读取文件失败：' + err.message
      })
  } else {
    previewLoading.value = false
    previewContent.value = {
      type: file.type,
      content: file.content
    }
  }
}

const downloadFile = () => {
  if (!previewFileItem.value) return
  const blob = new Blob([previewFileItem.value.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = previewFileItem.value.name
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('文件已开始下载')
}

// 发送任务给小呦
const sendTask = async () => {
  if (!taskInput.value.trim()) return
  if (!xiaomuConnected.value) {
    ElMessage.warning('小呦未连接，请先点击全连按钮')
    return
  }

  isSending.value = true
  taskStartTime.value = Date.now()
  taskEndTime.value = 0

  const content = taskInput.value.trim()

  try {
    multiAgentStore.sendMessage('xiaomu', content)
    ElMessage.success('任务已发送给小呦')
    taskInput.value = ''
  } catch (err) {
    console.error('[TaskCenter2] Send message error:', err)
    ElMessage.error('发送失败：' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    isSending.value = false
  }
}

// 全连
const handleConnectAll = () => {
  multiAgentStore.connectAll()
  aiStatus.value = 'connected'
  ElMessage.success('正在连接所有 Agent...')
}

// 全断
const handleDisconnectAll = () => {
  multiAgentStore.disconnectAll()
  aiStatus.value = 'disconnected'
  ElMessage.warning('已断开所有 Agent 连接')
}

// 重置
const handleReset = () => {
  ElMessageBox.confirm('确定要清空所有 Agent 的会话内容吗？此操作不可恢复。', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    taskEndTime.value = Date.now()
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      multiAgentStore.clearMessages(agentId)
      lastMessageTime.value[agentId] = 0
    })
    ElMessage.success('已清空所有会话内容')
  }).catch(() => {})
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取 ClaudeCode 会话
const fetchClaudeCodeSessions = async () => {
  try {
    const response = await fetch('/api/claude-sessions')
    const data = await response.json()
    if (data.success && data.sessions) {
      claudeCodeSessions.value = data.sessions
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to fetch ClaudeCode sessions:', err)
  }
}

const getSessionDisplayName = (session: any) => {
  if (!session.workingDir) return session.key || session.id
  const parts = session.workingDir.split('/')
  return parts[parts.length - 1] || session.key
}

const selectClaudeSession = async (session: any) => {
  selectedClaudeSession.value = session
  await fetchClaudeTranscript(session.id)
}

const fetchClaudeTranscript = async (sessionId: string) => {
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

const refreshClaudeTranscript = async () => {
  if (selectedClaudeSession.value) {
    await fetchClaudeTranscript(selectedClaudeSession.value.id)
  }
}

const sendClaudeMessage = async () => {
  if (!claudeInputMessage.value.trim() || !selectedClaudeSession.value || claudeSending.value) return

  claudeSending.value = true
  claudeSendError.value = ''

  try {
    const response = await fetch(`/api/claude-sessions/${selectedClaudeSession.value.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: claudeInputMessage.value.trim() })
    })

    const data = await response.json()
    if (data.success) {
      claudeInputMessage.value = ''
      setTimeout(() => refreshClaudeTranscript(), 2000)
    } else {
      claudeSendError.value = data.error || '发送失败'
    }
  } catch (err) {
    claudeSendError.value = '发送失败，请稍后重试'
  } finally {
    claudeSending.value = false
  }
}

onMounted(() => {
  multiAgentStore.loadMessages()

  // 默认选中第一个 Agent
  if (!selectedAgent.value) {
    selectedAgent.value = 'xiaomu'
  }

  // 初始化聊天滚动
  nextTick(() => {
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      chatUserScrolledUp.value[agentId] = false
    })
  })

  // 添加聊天框滚动事件监听
  nextTick(() => {
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      const chatBox = chatBoxRefs.value[agentId]
      if (chatBox) {
        chatBox.addEventListener('scroll', () => {
          const threshold = 50
          const isAtBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight <= threshold
          chatUserScrolledUp.value[agentId] = !isAtBottom
        })
      }
    })
  })

  // ClaudeCode 会话
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
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px 12px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header */
.task-center__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 2px 0 8px;
  border-bottom: 1px solid color-mix(in oklab, var(--border-subtle) 84%, transparent);
  flex-shrink: 0;
}

.task-center__title-wrap {
  min-width: 0;
}

.task-center__title h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin: 0;
}

.task-center__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.task-center__mode {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-primary-bg) 80%, transparent);
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 999px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  font-size: 11px;
  white-space: nowrap;
}

.ai-status.status--connected {
  background: var(--badge-bg-idle);
  border-color: var(--color-success);
  color: var(--color-success);
}

.ai-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.ai-status.status--connected .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success-glow);
  animation: pulse 1.5s ease-in-out infinite;
}

.ai-status .status-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-status.status--connected .status-label {
  color: var(--color-success);
}

/* Task Input Area */
.task-input-section {
  flex-shrink: 0;
  background: var(--bg-panel);
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 10px;
}

.task-input-row {
  margin-bottom: 8px;
}

.task-input :deep(.el-textarea__inner) {
  background: var(--gray-900);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  resize: none;
}

.task-input :deep(.el-textarea__inner):focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.send-btn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.send-btn-task {
  flex: 1;
}

.connection-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.connection-hint.connected {
  color: var(--color-success);
}

.connection-hint .hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.connection-hint.connected .hint-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success-glow);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
}

/* Main Layout: Sidebar + Detail */
.main-layout {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

/* Sidebar */
.sidebar {
  width: 300px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

.sidebar-header {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-header .section-title {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 3px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-header .section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border-subtle), transparent);
}

.sidebar-header .agent-count {
  background: rgba(255, 255, 255, 0.08);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.agent-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 400px;
}

.agent-list::-webkit-scrollbar {
  width: 4px;
}
.agent-list::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

.agent-card-mini {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  min-height: 70px;
}

.agent-card-mini:hover {
  background: rgba(255, 255, 255, 0.06);
}

.agent-card-mini.active {
  background: rgba(0, 229, 153, 0.06);
  border-color: rgba(0, 229, 153, 0.25);
  box-shadow: 0 2px 16px rgba(0, 229, 153, 0.08);
}

.agent-card-mini.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-success);
  border-radius: 0 3px 3px 0;
}

.agent-avatar-mini {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid var(--border-subtle);
  position: relative;
  overflow: hidden;
}

.agent-avatar-mini img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.claude-avatar-small {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.status-dot-mini {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  bottom: 1px;
  right: 1px;
  border: 2px solid var(--bg-panel);
}

.status-dot-mini.online,
.status-dot-mini.idle {
  background: var(--color-success);
}

.status-dot-mini.busy {
  background: var(--color-accent);
}

.status-dot-mini.offline {
  background: var(--text-tertiary);
}

.agent-info-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.agent-name-mini {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-role-mini {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-badge-mini {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  font-family: var(--font-mono);
}

.status-badge-mini.idle {
  background: rgba(139, 146, 165, 0.12);
  color: var(--text-secondary);
  border: 1px solid rgba(139, 146, 165, 0.15);
}

.status-badge-mini.busy {
  background: rgba(251, 146, 60, 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(251, 146, 60, 0.2);
}

.status-badge-mini.offline {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 新文件红点提示 */
.new-file-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  box-shadow: 0 0 8px var(--color-error);
  animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

/* Detail Panel */
.detail-panel {
  flex: 1;
  background: var(--bg-panel);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}

/* Compact Topbar (replaces old detail-header) */
.detail-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.detail-topbar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--border-subtle);
  flex-shrink: 0;
}

.detail-topbar-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-topbar-role {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-cyan);
  background: rgba(34, 211, 238, 0.1);
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.detail-topbar-spacer {
  flex: 1;
}

/* Agent Hover Tip Card */
.agent-tip-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.agent-tip-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-tip-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--border-subtle);
  flex-shrink: 0;
}

.agent-tip-title {
  flex: 1;
  min-width: 0;
}

.agent-tip-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.agent-tip-role {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-cyan);
}

.agent-tip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.agent-tip-tags .tag {
  padding: 2px 7px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.agent-tip-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.agent-tip-stats {
  display: flex;
  gap: 14px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.agent-tip-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.claude-avatar-large {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.claude-avatar-topbar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  flex-shrink: 0;
}

/* 产出文件 Tips 按钮 */
.file-tip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.file-tip-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.file-tip-btn.has-new {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: var(--color-error);
}

.file-red-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-error);
  box-shadow: 0 0 6px var(--color-error);
  animation: pulse-red 1.5s ease-in-out infinite;
}

/* 文件下拉面板 */
.file-dropdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.file-dropdown::-webkit-scrollbar {
  width: 4px;
}
.file-dropdown::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

.file-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: var(--text-primary);
}

.file-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.file-dropdown-item i {
  font-size: 14px;
  color: var(--color-primary);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.file-dropdown-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
}

.file-dropdown-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

/* Detail Content: Full width chat */
.detail-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Chat section: full width */
.chat-section {
  flex: 1;
  padding: 12px 20px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Module Title */
.module-title {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-title i {
  color: var(--color-success);
  font-size: 16px;
}

/* Chat Container */
.chat-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 8px;
}

.chat-container::-webkit-scrollbar {
  width: 4px;
}
.chat-container::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

.chat-empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-tertiary);
  font-size: 14px;
}

.chat-empty-hint i {
  font-size: 40px;
  opacity: 0.5;
}

.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* Chat Messages */
.chat-msg {
  display: flex;
  gap: 12px;
  max-width: 90%;
}

.chat-msg.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
  font-size: 14px;
  color: var(--text-secondary);
}

.chat-msg.user .msg-avatar {
  background: rgba(0, 229, 153, 0.1);
  color: var(--color-success);
  border-color: rgba(0, 229, 153, 0.3);
}

.msg-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.msg-bubble {
  background: var(--bg-surface);
  padding: 12px 16px;
  border-radius: 0 12px 12px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  word-break: break-word;
}

.chat-msg.user .msg-bubble {
  background: rgba(0, 229, 153, 0.08);
  border-radius: 12px 0 12px 12px;
  border-color: rgba(0, 229, 153, 0.2);
}

.msg-bubble :deep(p) {
  margin: 4px 0;
}

.msg-bubble :deep(pre) {
  background: var(--gray-900);
  padding: 8px 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 6px 0;
  font-size: 11px;
}

.msg-bubble :deep(code) {
  font-family: var(--font-mono);
  font-size: 11px;
  background: rgba(110, 118, 129, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
}

.msg-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-family: var(--font-mono);
}

.chat-msg.user .msg-time {
  text-align: right;
}

.msg-thinking {
  color: var(--text-tertiary);
  font-style: italic;
  padding: 6px 10px;
  background: var(--bg-panel);
  border-radius: 6px;
  margin: 4px 0;
  font-size: 12px;
}

.msg-tool {
  margin: 4px 0;
  padding: 8px 10px;
  background: var(--bg-panel);
  border-radius: 6px;
  font-size: 12px;
}

.tool-name {
  font-size: 11px;
  color: var(--color-warning);
  font-weight: 600;
}

/* File List */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-card {
  background: var(--bg-surface);
  padding: 12px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-subtle);
  transition: all 0.2s ease;
  cursor: pointer;
}

.file-card:hover {
  border-color: var(--text-secondary);
  background: var(--bg-card);
  transform: translateX(2px);
}

.file-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.file-icon.icon-markdown { background: rgba(52, 211, 153, 0.1); color: var(--color-primary); }
.file-icon.icon-text { background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }
.file-icon.icon-html { background: rgba(251, 146, 60, 0.1); color: var(--color-warning); }
.file-icon.icon-word { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.file-icon.icon-ppt { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.file-action {
  color: var(--text-tertiary);
  font-size: 18px;
  padding: 6px;
  transition: color 0.2s;
}

.file-card:hover .file-action {
  color: var(--text-primary);
}

.file-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* Execution Overview (legacy, kept for compatibility) */
.exec-overview {
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border-subtle);
}

.exec-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}

.exec-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.exec-value {
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.exec-value.idle { color: var(--color-success); }
.exec-value.busy { color: var(--color-accent); }
.exec-value.offline { color: var(--text-tertiary); }

.exec-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exec-stat {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.exec-stat-label {
  color: var(--text-secondary);
}

.exec-stat-value {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-weight: 600;
}

/* ClaudeCode Session Selector */
.claude-session-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
  max-height: 200px;
  overflow-y: auto;
}

.session-item {
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-item:hover {
  background: var(--bg-card);
}

.session-item.active {
  border-color: var(--agent-claude);
  background: rgba(139, 92, 246, 0.08);
}

.session-model-badge {
  font-size: 10px;
  color: var(--agent-claude);
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  flex-shrink: 0;
}

.session-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-stats {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.claude-chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.claude-messages-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
}

.claude-messages-container::-webkit-scrollbar {
  width: 4px;
}

.claude-messages-container::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

/* ClaudeCode Input Area */
.claude-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.claude-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
}

.claude-input:focus {
  border-color: var(--agent-claude);
}

.claude-input::placeholder {
  color: var(--text-tertiary);
}

.send-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--agent-claude) 0%, var(--color-primary) 100%);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-primary-glow);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-error {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
}

/* No Agent Selected */
.no-agent-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 14px;
}

/* File Preview */
.file-preview-container {
  min-height: 400px;
}

.preview-loading,
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.preview-error {
  color: var(--color-error);
}

.preview-content pre {
  background: var(--gray-950);
  border: none;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  max-height: 500px;
  overflow-y: auto;
}

.preview-content .markdown-rendered {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
}

.preview-content .markdown-rendered :deep(h1),
.preview-content .markdown-rendered :deep(h2),
.preview-content .markdown-rendered :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--color-primary);
}

.preview-content .markdown-rendered :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content .markdown-rendered :deep(code) {
  padding: 0.2em 0.4em;
  font-size: 85%;
  font-family: var(--font-mono);
  background: rgba(110, 118, 129, 0.2);
  border-radius: 6px;
}

.preview-content .markdown-rendered :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  background-color: var(--gray-950);
  border-radius: 6px;
}

.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.preview-unsupported .el-icon {
  font-size: 48px;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    max-height: 200px;
  }

  .agent-list {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .agent-card-mini {
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .task-center-2 {
    padding: 0 12px 20px;
    height: auto;
  }

  .task-center__header,
  .send-btn-row {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .task-center__title {
    align-items: flex-start;
  }

  .connection-hint {
    justify-content: flex-start;
  }

  .detail-topbar {
    flex-wrap: wrap;
  }
}
</style>

<style>
/* Popover rendered outside scoped component — needs global style */
.agent-tip-popper.el-popper {
  background: var(--bg-panel) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: 14px !important;
  box-shadow: var(--shadow-md) !important;
  padding: 14px !important;
}

.agent-tip-popper .el-popper__arrow::before {
  background: var(--bg-panel) !important;
  border-color: var(--border-subtle) !important;
}
</style>
