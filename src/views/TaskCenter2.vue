<template>
  <div class="task-center-2">
    <!-- 顶部标题 -->
    <div class="task-center__header">
      <div class="task-center__title">
        <h1>任务指挥中心 II</h1>
        <p>多 Agent 实时协作平台 - Gateway 直连模式</p>
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

    <!-- 主体内容：左右布局 -->
    <div class="task-center__main">
      <!-- 左侧：任务下达 -->
      <div class="task-center__left">
        <div class="task-input-section">
          <div class="section-title">
            <span class="title-icon"><i class="fas fa-edit"></i></span>
            <span>下达任务</span>
          </div>

          <div class="task-input-row">
            <el-input
              v-model="taskInput"
              placeholder="输入任务内容，直接下发给小呦..."
              type="textarea"
              :rows="4"
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

        <!-- 系统提示 -->
        <div class="info-panel">
          <div class="info-title"><i class="fas fa-lightbulb"></i> 使用说明</div>
          <div class="info-content">
            <p>1. 在上方输入框中输入任务内容</p>
            <p>2. 点击「下发任务」发送给小呦（项目统筹）</p>
            <p>3. 小呦会协调其他 Agent 执行任务</p>
            <p>4. 各 Agent 的输出和产出文件显示在右侧</p>
          </div>
        </div>
      </div>

      <!-- 右侧：Agent 状态 + 执行日志 -->
      <div class="task-center__right">
        <div class="agents-list">
          <!-- 小呦 -->
          <div class="agent-panel" :class="[`agent-panel--xiaomu`, { 'is-busy': isAgentBusy('xiaomu') }]" @click="showAgentDetail('xiaomu')">
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img :src="AGENT_CONFIG['xiaomu'].icon" alt="小呦" />
                  <span class="connection-dot" :class="{ connected: agents['xiaomu']?.isConnected }"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">小呦</div>
                  <div class="agent-role-large">项目统筹 · agent:ceo:main</div>
                </div>
              </div>
              <div class="status-badge" :class="`status--${getAgentStatus('xiaomu')}`">
                <span class="status-dot"></span>
                <span class="status-text">{{ getAgentStatus('xiaomu') === 'busy' ? '工作中' : '空闲' }}</span>
              </div>
            </div>
            <div class="agent-log-box" :ref="(el) => logBoxRefs['xiaomu'] = el">
              <div v-if="agents['xiaomu']?.messages.length === 0" class="log-empty">
                <span>暂无输出</span>
              </div>
              <div v-for="msg in agents['xiaomu']?.messages" :key="msg.id" class="log-item" :class="`type-${msg.role}`">
                <div class="log-role">{{ msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '小呦' : '系统' }}</div>
                <div class="log-content" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div class="agent-panel-footer">
              <span class="footer-label">产出文件</span>
              <span class="footer-value">{{ getAgentFiles('xiaomu').length }} 个</span>
            </div>
          </div>

          <!-- 研究员 -->
          <div class="agent-panel" :class="[`agent-panel--xiaoyan`, { 'is-busy': isAgentBusy('xiaoyan') }]" @click="showAgentDetail('xiaoyan')">
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img :src="AGENT_CONFIG['xiaoyan'].icon" alt="研究员" />
                  <span class="connection-dot" :class="{ connected: agents['xiaoyan']?.isConnected }"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">研究员</div>
                  <div class="agent-role-large">调研分析 · agent:researcher:main</div>
                </div>
              </div>
              <div class="status-badge" :class="`status--${getAgentStatus('xiaoyan')}`">
                <span class="status-dot"></span>
                <span class="status-text">{{ getAgentStatus('xiaoyan') === 'busy' ? '工作中' : '空闲' }}</span>
              </div>
            </div>
            <div class="agent-log-box" :ref="(el) => logBoxRefs['xiaoyan'] = el">
              <div v-if="agents['xiaoyan']?.messages.length === 0" class="log-empty">
                <span>暂无输出</span>
              </div>
              <div v-for="msg in agents['xiaoyan']?.messages" :key="msg.id" class="log-item" :class="`type-${msg.role}`">
                <div class="log-role">{{ msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '研究员' : '系统' }}</div>
                <div class="log-content" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div class="agent-panel-footer">
              <span class="footer-label">产出文件</span>
              <span class="footer-value">{{ getAgentFiles('xiaoyan').length }} 个</span>
            </div>
          </div>

          <!-- 产品经理 -->
          <div class="agent-panel" :class="[`agent-panel--xiaochan`, { 'is-busy': isAgentBusy('xiaochan') }]" @click="showAgentDetail('xiaochan')">
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img :src="AGENT_CONFIG['xiaochan'].icon" alt="产品经理" />
                  <span class="connection-dot" :class="{ connected: agents['xiaochan']?.isConnected }"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">产品经理</div>
                  <div class="agent-role-large">产品设计 · agent:pm:main</div>
                </div>
              </div>
              <div class="status-badge" :class="`status--${getAgentStatus('xiaochan')}`">
                <span class="status-dot"></span>
                <span class="status-text">{{ getAgentStatus('xiaochan') === 'busy' ? '工作中' : '空闲' }}</span>
              </div>
            </div>
            <div class="agent-log-box" :ref="(el) => logBoxRefs['xiaochan'] = el">
              <div v-if="agents['xiaochan']?.messages.length === 0" class="log-empty">
                <span>暂无输出</span>
              </div>
              <div v-for="msg in agents['xiaochan']?.messages" :key="msg.id" class="log-item" :class="`type-${msg.role}`">
                <div class="log-role">{{ msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '产品经理' : '系统' }}</div>
                <div class="log-content" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div class="agent-panel-footer">
              <span class="footer-label">产出文件</span>
              <span class="footer-value">{{ getAgentFiles('xiaochan').length }} 个</span>
            </div>
          </div>

          <!-- 研发工程师 -->
          <div class="agent-panel" :class="[`agent-panel--xiaokai`, { 'is-busy': isAgentBusy('xiaokai') }]" @click="showAgentDetail('xiaokai')">
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img :src="AGENT_CONFIG['xiaokai'].icon" alt="研发工程师" />
                  <span class="connection-dot" :class="{ connected: agents['xiaokai']?.isConnected }"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">研发工程师</div>
                  <div class="agent-role-large">技术开发 · agent:tech-lead:main</div>
                </div>
              </div>
              <div class="status-badge" :class="`status--${getAgentStatus('xiaokai')}`">
                <span class="status-dot"></span>
                <span class="status-text">{{ getAgentStatus('xiaokai') === 'busy' ? '工作中' : '空闲' }}</span>
              </div>
            </div>
            <div class="agent-log-box" :ref="(el) => logBoxRefs['xiaokai'] = el">
              <div v-if="agents['xiaokai']?.messages.length === 0" class="log-empty">
                <span>暂无输出</span>
              </div>
              <div v-for="msg in agents['xiaokai']?.messages" :key="msg.id" class="log-item" :class="`type-${msg.role}`">
                <div class="log-role">{{ msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '研发工程师' : '系统' }}</div>
                <div class="log-content" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div class="agent-panel-footer">
              <span class="footer-label">产出文件</span>
              <span class="footer-value">{{ getAgentFiles('xiaokai').length }} 个</span>
            </div>
          </div>

          <!-- 测试员 -->
          <div class="agent-panel" :class="[`agent-panel--xiaoce`, { 'is-busy': isAgentBusy('xiaoce') }]" @click="showAgentDetail('xiaoce')">
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img :src="AGENT_CONFIG['xiaoce'].icon" alt="测试员" />
                  <span class="connection-dot" :class="{ connected: agents['xiaoce']?.isConnected }"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">测试员</div>
                  <div class="agent-role-large">质量检查 · agent:team-qa:main</div>
                </div>
              </div>
              <div class="status-badge" :class="`status--${getAgentStatus('xiaoce')}`">
                <span class="status-dot"></span>
                <span class="status-text">{{ getAgentStatus('xiaoce') === 'busy' ? '工作中' : '空闲' }}</span>
              </div>
            </div>
            <div class="agent-log-box" :ref="(el) => logBoxRefs['xiaoce'] = el">
              <div v-if="agents['xiaoce']?.messages.length === 0" class="log-empty">
                <span>暂无输出</span>
              </div>
              <div v-for="msg in agents['xiaoce']?.messages" :key="msg.id" class="log-item" :class="`type-${msg.role}`">
                <div class="log-role">{{ msg.role === 'user' ? '用户' : msg.role === 'assistant' ? '测试员' : '系统' }}</div>
                <div class="log-content" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
            <div class="agent-panel-footer">
              <span class="footer-label">产出文件</span>
              <span class="footer-value">{{ getAgentFiles('xiaoce').length }} 个</span>
            </div>
          </div>

          <!-- ClaudeCode 动态角色 -->
          <div v-if="claudeCodeSessions.length > 0" class="agent-panel agent-panel--claudecode" :class="{ 'is-busy': claudeCodeSessions.some(s => s.active), 'is-expanded': expandedClaudeSession }">
            <div class="agent-panel-header" @click="toggleClaudePanel">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <div class="claude-avatar"><i class="fas fa-robot"></i></div>
                  <span class="connection-dot connected"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">ClaudeCode</div>
                  <div class="agent-role-large">代码执行者 · {{ claudeCodeSessions.length }} 个活跃会话</div>
                </div>
              </div>
              <div class="status-badge status--busy">
                <span class="status-dot"></span>
                <span class="status-text">执行中</span>
              </div>
              <button type="button" aria-label="展开/收起 Claude 会话" class="expand-btn" @click.stop="toggleClaudePanel">
                <span :class="{ 'expanded': expandedClaudeSession }">▼</span>
              </button>
            </div>

            <!-- 会话选择器 -->
            <div v-if="!expandedClaudeSession" class="claude-session-list">
              <div v-for="session in claudeCodeSessions" :key="session.id"
                   class="claude-session-item-mini"
                   @click="selectClaudeSession(session)">
                <div class="session-mini-header">
                  <span class="session-model-badge">{{ session.model }}</span>
                  <span class="session-name-mini">{{ getSessionDisplayName(session) }}</span>
                </div>
                <div class="session-mini-stats">
                  <span><i class="fas fa-chart-bar"></i> {{ session.tokens }}</span>
                  <span><i class="fas fa-comments"></i> {{ session.userMessages }}/{{ session.assistantMessages }}</span>
                  <span><i class="fas fa-tools"></i> {{ session.toolUses }}</span>
                </div>
              </div>
            </div>

            <!-- 展开的会话详情 -->
            <div v-if="expandedClaudeSession && selectedClaudeSession" class="claude-session-expanded">
              <!-- 会话信息栏 -->
              <div class="session-info-bar">
                <div class="session-info-left">
                  <button type="button" aria-label="返回会话列表" class="back-btn" @click="expandedClaudeSession = false"><i class="fas fa-arrow-left"></i> 返回</button>
                  <span class="session-model-badge">{{ selectedClaudeSession.model }}</span>
                  <span class="session-path-mini">{{ selectedClaudeSession.workingDir }}</span>
                </div>
                <div class="session-info-right">
                  <span class="token-stat">Token: {{ selectedClaudeSession.tokens }}</span>
                  <span class="refresh-btn" @click="refreshClaudeTranscript"><i class="fas fa-sync-alt"></i></span>
                </div>
              </div>

              <!-- 消息列表 -->
              <div class="claude-messages-container" ref="claudeMessagesRef">
                <div v-if="claudeTranscriptLoading" class="transcript-loading">
                  <span>加载消息中...</span>
                </div>
                <div v-else-if="claudeTranscript.length === 0" class="transcript-empty">
                  <span>暂无消息记录</span>
                </div>
                <div v-else class="transcript-messages">
                  <div v-for="(msg, idx) in claudeTranscript" :key="idx"
                       class="transcript-msg"
                       :class="`msg-${msg.role}`">
                    <div class="msg-role-badge">{{ getMessageRoleLabel(msg.role) }}</div>
                    <div class="msg-content">
                      <template v-for="(part, pidx) in msg.parts" :key="pidx">
                        <div v-if="part.type === 'text'" class="msg-text">{{ part.text }}</div>
                        <div v-else-if="part.type === 'thinking'" class="msg-thinking"><i class="fas fa-brain"></i> {{ part.thinking }}</div>
                        <div v-else-if="part.type === 'tool_use'" class="msg-tool">
                          <span class="tool-name"><i class="fas fa-tools"></i> {{ part.name }}</span>
                          <pre class="tool-input">{{ part.input }}</pre>
                        </div>
                        <div v-else-if="part.type === 'tool_result'" class="msg-tool-result" :class="{ 'is-error': part.isError }">
                          <pre>{{ part.content }}</pre>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 发送消息输入框 -->
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

            <div v-if="!expandedClaudeSession" class="agent-panel-footer">
              <span class="footer-label">活跃会话</span>
              <span class="footer-value">{{ claudeCodeSessions.length }} 个 · 点击展开查看详情</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="selectedAgent ? getAgentName(selectedAgent) + ' - 工作详情' : ''"
      width="800px"
      :close-on-click-modal="true"
      @close="handleDialogClose"
    >
      <div v-if="selectedAgent" class="agent-detail-dialog">
        <!-- Agent 信息 -->
        <div class="agent-info-header">
          <div class="agent-avatar-large">
            <img :src="getAgentIcon(selectedAgent)" :alt="getAgentName(selectedAgent)" />
          </div>
          <div class="agent-info-text">
            <h4>{{ getAgentName(selectedAgent) }}</h4>
            <p>{{ getAgentRole(selectedAgent) }}</p>
          </div>
          <div class="status-badge" :class="`status--${getAgentStatus(selectedAgent)}`">
            <span class="status-dot"></span>
            <span class="status-text">{{ getAgentStatus(selectedAgent) === 'busy' ? '工作中' : '空闲' }}</span>
          </div>
        </div>

        <!-- 产出文件 -->
        <div class="detail-section">
          <div class="section-header-with-action">
            <h5><i class="fas fa-folder-open"></i> 产出文件</h5>
            <el-button size="small" type="primary" plain @click="refreshFiles" :loading="refreshing">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <div class="agent-files-list">
            <div
              v-for="file in getAgentFiles(selectedAgent)"
              :key="file.name"
              class="agent-file-item"
            >
              <span class="file-icon" :class="getFileIconClass(file.name)">{{ getFileIcon(file.name) }}</span>
              <span class="file-name">{{ file.name }}</span>
              <a v-if="file.gitUrl" :href="file.gitUrl" target="_blank" class="git-link" title="查看代码仓库">
                <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <el-button size="small" type="primary" plain @click="previewFile(file)">预览</el-button>
            </div>
            <div v-if="getAgentFiles(selectedAgent).length === 0" class="empty-tip">
              暂无产出文件
            </div>
          </div>
        </div>

        <!-- 执行日志 -->
        <div class="detail-section">
          <h5><i class="fas fa-scroll"></i> 执行日志</h5>
          <div class="agent-logs-list">
            <div
              v-for="msg in agents[selectedAgent]?.messages"
              :key="msg.id"
              class="agent-log-item"
              :class="`agent-log-item--${msg.role}`"
            >
              <span class="log-time">{{ formatTime(msg.timestamp) }}</span>
              <span class="log-message">{{ msg.content }}</span>
            </div>
            <div v-if="!agents[selectedAgent]?.messages || agents[selectedAgent]?.messages.length === 0" class="empty-tip">
              暂无执行日志
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

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
          <!-- Markdown 文件 -->
          <div v-if="previewContent.type === 'markdown'" class="markdown-rendered" v-html="renderPreviewContent()"></div>
          <!-- 文本文件 -->
          <pre v-else-if="previewContent.type === 'text'" v-html="escapeHtml(previewContent.content)"></pre>
          <!-- HTML 文件 -->
          <div v-else-if="previewContent.type === 'html'" v-html="previewContent.content"></div>
          <!-- 其他文件显示提示 -->
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
import { Loading, Warning, Document, Refresh } from '@element-plus/icons-vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { AGENT_CONFIG } from '@/simulation'
import MarkdownIt from 'markdown-it'

const multiAgentStore = useMultiAgentChatStore()
const md = new MarkdownIt({
  html: false, // 禁用HTML，防止XSS攻击
  linkify: true,
  typographer: true
})

// 连接状态
const aiStatus = ref<'connected' | 'disconnected' | 'error'>('connected')
const aiStatusText = computed(() => {
  if (allConnected.value) return '所有 Agent 已连接'
  if (anyConnected.value) return '部分 Agent 已连接'
  return '未连接 Gateway'
})

// 连接状态计算
const allConnected = computed(() => multiAgentStore.allConnected)
const anyConnected = computed(() => multiAgentStore.anyConnected)

// 任务输入
const taskInput = ref('')
const isSending = ref(false)

// Agent 状态
const agents = computed(() => multiAgentStore.agents)

// 小呦状态
const xiaomuConnected = computed(() => multiAgentStore.agents['xiaomu']?.isConnected || false)

// 详情对话框
const showDetailDialog = ref(false)
const selectedAgent = ref<string | null>(null)

// 文件预览对话框
const showPreviewDialog = ref(false)
const previewFileItem = ref<{ name: string; content: string; type: string } | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewContent = ref<{ type: string; content: string }>({ type: '', content: '' })

// 日志引用 - 每个 Agent 一个
const logBoxRefs = ref<Record<string, HTMLElement | null>>({
  xiaomu: null,
  xiaoyan: null,
  xiaochan: null,
  xiaokai: null,
  xiaoce: null
})

// 跟踪每个 Agent 日志框用户是否手动向上滚动过（true = 用户手动向上滚动了，false = 一直在底部）
const userScrolledUp = ref<Record<string, boolean>>({
  xiaomu: false,
  xiaoyan: false,
  xiaochan: false,
  xiaokai: false,
  xiaoce: false
})

// 任务时间追踪
const taskStartTime = ref<number>(0)
const taskEndTime = ref<number>(0)

// ClaudeCode 会话数据
const claudeCodeSessions = ref<any[]>([])
let claudeCodePollInterval: ReturnType<typeof setInterval> | null = null

// ClaudeCode 展开状态
const expandedClaudeSession = ref(false)
const selectedClaudeSession = ref<any>(null)
const claudeTranscript = ref<any[]>([])
const claudeTranscriptLoading = ref(false)
const claudeInputMessage = ref('')
const claudeSending = ref(false)
const claudeSendError = ref('')
const claudeMessagesRef = ref<HTMLElement | null>(null)

// 获取 ClaudeCode 会话
const fetchClaudeCodeSessions = async () => {
  try {
    const response = await fetch('/api/claude-sessions')
    const data = await response.json()
    if (data.success && data.sessions) {
      claudeCodeSessions.value = data.sessions
      console.log('[TaskCenter2] Fetched ClaudeCode sessions:', data.sessions.length)
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to fetch ClaudeCode sessions:', err)
  }
}

// 截断文本
const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 获取会话显示名称
const getSessionDisplayName = (session: any) => {
  if (!session.workingDir) return session.key || session.id
  const parts = session.workingDir.split('/')
  return parts[parts.length - 1] || session.key
}

// 切换 ClaudeCode 面板展开状态
const toggleClaudePanel = () => {
  expandedClaudeSession.value = !expandedClaudeSession.value
  if (!expandedClaudeSession.value) {
    selectedClaudeSession.value = null
    claudeTranscript.value = []
  }
}

// 选择 ClaudeCode 会话
const selectClaudeSession = async (session: any) => {
  selectedClaudeSession.value = session
  expandedClaudeSession.value = true
  await fetchClaudeTranscript(session.id)
}

// 获取 ClaudeCode 会话消息记录
const fetchClaudeTranscript = async (sessionId: string) => {
  claudeTranscriptLoading.value = true
  claudeTranscript.value = []
  try {
    const response = await fetch(`/api/claude-sessions/${sessionId}/transcript?limit=50`)
    const data = await response.json()
    if (data.success && data.messages) {
      claudeTranscript.value = data.messages
      console.log('[TaskCenter2] Fetched transcript:', data.messages.length, 'messages')
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to fetch transcript:', err)
  } finally {
    claudeTranscriptLoading.value = false
  }
}

// 刷新消息记录
const refreshClaudeTranscript = async () => {
  if (selectedClaudeSession.value) {
    await fetchClaudeTranscript(selectedClaudeSession.value.id)
    // 滚动到底部
    nextTick(() => {
      if (claudeMessagesRef.value) {
        claudeMessagesRef.value.scrollTop = claudeMessagesRef.value.scrollHeight
      }
    })
  }
}

// 发送消息到 ClaudeCode 会话
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
      // 延迟刷新消息记录
      setTimeout(() => refreshClaudeTranscript(), 2000)
    } else {
      claudeSendError.value = data.error || '发送失败'
    }
  } catch (err) {
    console.error('[TaskCenter2] Failed to send message:', err)
    claudeSendError.value = '发送失败，请稍后重试'
  } finally {
    claudeSending.value = false
  }
}

// 获取消息角色标签
const getMessageRoleLabel = (role: string) => {
  switch (role) {
    case 'user': return '<i class="fas fa-user"></i> 用户'
    case 'assistant': return '<i class="fas fa-robot"></i> Claude'
    case 'system': return '<i class="fas fa-cog"></i> 系统'
    default: return role
  }
}

// Agent 到角色 ID 的映射
const AGENT_TO_ROLE_ID: Record<string, string> = {
  xiaomu: 'ceo',
  xiaoyan: 'researcher',
  xiaochan: 'pm',
  xiaokai: 'tech-lead',
  xiaoce: 'team-qa'
}

// 渲染 Markdown
const renderMarkdown = (content: string) => {
  if (!content) return ''
  return md.render(content)
}

// 渲染预览内容
const renderPreviewContent = () => {
  if (previewContent.value.type === 'markdown') {
    return md.render(previewContent.value.content)
  }
  return previewContent.value.content
}

// 转义 HTML（用于纯文本显示）
const escapeHtml = (content: string) => {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 记录每个 Agent 最后收到消息的时间
const lastMessageTime = ref<Record<string, number>>({
  xiaomu: 0,
  xiaoyan: 0,
  xiaochan: 0,
  xiaokai: 0,
  xiaoce: 0
})

// 判断 Agent 是否忙碌（正在输出内容）
const isAgentBusy = (agentId: string) => {
  const agent = agents.value[agentId]
  if (!agent) return false

  // 检查是否在最近 2 秒内收到过消息
  const lastTime = lastMessageTime.value[agentId] || 0
  const now = Date.now()
  if (now - lastTime < 2000) return true

  return false
}

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

// 获取 Agent 状态
const getAgentStatus = (agentId: string) => {
  const agent = agents.value[agentId]
  if (!agent?.isConnected) return 'offline'
  if (isAgentBusy(agentId)) return 'busy'
  return 'idle'
}

// 从指定路径扫描产出文件（调用后端 API）
const getAgentFiles = (agentId: string) => {
  const roleId = AGENT_TO_ROLE_ID[agentId]
  if (!roleId) return []

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  // 使用缓存避免重复请求
  const cacheKey = `files_${agentId}_${dateStr}`
  const cached = fileCache.value[cacheKey]
  if (cached && Date.now() - cached.timestamp < 5000) {
    console.log(`[TaskCenter2] Cache hit for ${agentId}, files:`, cached.files.length)
    return cached.files
  }

  // 如果是首次请求，触发 API 调用并强制刷新
  const agent = agents.value[agentId]
  if (!agent || !agent.messages) return []

  // 调用后端 API 获取文件列表 - 不传时间范围，避免过滤掉文件
  const endTime = taskEndTime.value > 0 ? taskEndTime.value : Date.now()
  console.log(`[TaskCenter2] Fetching files for ${agentId}, roleId=${roleId}, startTime=${taskStartTime.value}, endTime=${endTime}`)

  fetch(`/api/files/role?roleId=${roleId}&date=${dateStr}`)
    .then(res => res.json())
    .then(data => {
      console.log(`[TaskCenter2] Fetched files for ${agentId}:`, data)
      if (data.success && data.files) {
        // 更新缓存
        fileCache.value[cacheKey] = {
          files: data.files.map((f: any) => ({
            name: f.name,
            content: '',
            type: f.type,
            path: f.path,
            icon: f.icon,
            mtime: f.mtime,
            mtimeStr: f.mtimeStr
          })),
          timestamp: Date.now()
        }

        // 如果是 tech-lead，添加 git URL
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

        // 强制触发 Vue 响应式更新
        forceRefresh.value++
        console.log(`[TaskCenter2] Updated cache for ${agentId}, files:`, fileCache.value[cacheKey].files.length)
      } else if (data.files && data.files.length === 0) {
        // 空文件列表也缓存
        console.log(`[TaskCenter2] No files found for ${agentId}`)
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

  // 返回缓存或空数组
  return fileCache.value[cacheKey]?.files || []
}

// 文件缓存
const fileCache = ref<Record<string, { files: any[]; timestamp: number }>>({})

// 强制刷新计数器（用于触发 Vue 响应式更新）
const forceRefresh = ref(0)

// 刷新状态
const refreshing = ref(false)

// 刷新文件列表
const refreshFiles = () => {
  if (!selectedAgent.value) return

  const roleId = AGENT_TO_ROLE_ID[selectedAgent.value]
  if (!roleId) return

  const dateStr = new Date().toISOString().split('T')[0]
  const cacheKey = `files_${selectedAgent.value}_${dateStr}`

  // 清除缓存
  if (fileCache.value[cacheKey]) {
    delete fileCache.value[cacheKey]
  }

  refreshing.value = true

  // 重新获取文件
  fetch(`/api/files/role?roleId=${roleId}&date=${dateStr}`)
    .then(res => res.json())
    .then(data => {
      refreshing.value = false
      if (data.success && data.files) {
        fileCache.value[cacheKey] = {
          files: data.files.map((f: any) => ({
            name: f.name,
            content: '',
            type: f.type,
            path: f.path,
            icon: f.icon,
            mtime: f.mtime,
            mtimeStr: f.mtimeStr
          })),
          timestamp: Date.now()
        }
        forceRefresh.value++
        ElMessage.success(`已刷新 ${data.files.length} 个文件`)
      }
    })
    .catch(err => {
      refreshing.value = false
      console.error('[TaskCenter2] Refresh files error:', err)
      ElMessage.error('刷新失败：' + err.message)
    })
}

// 获取 Agent 名称
const getAgentName = (agentId: string) => {
  const names: Record<string, string> = {
    xiaomu: '小呦',
    xiaoyan: '研究员',
    xiaochan: '产品经理',
    xiaokai: '研发工程师',
    xiaoce: '测试员'
  }
  return names[agentId] || agentId
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

// 获取 Agent 图标
const getAgentIcon = (agentId: string) => {
  return AGENT_CONFIG[agentId]?.icon || ''
}

// 获取文件图标
const getFileIcon = (fileName: string) => {
  if (/\.(md|markdown)$/i.test(fileName)) return '<i class="fas fa-file-code"></i>'
  if (/\.txt$/i.test(fileName)) return '<i class="fas fa-file-alt"></i>'
  if (/\.html?$/i.test(fileName)) return '<i class="fas fa-globe"></i>'
  if (/\.docx?$/i.test(fileName)) return '<i class="fas fa-file-word"></i>'
  if (/\.pptx?$/i.test(fileName)) return '<i class="fas fa-file-powerpoint"></i>'
  if (/\.xlsx?$/i.test(fileName)) return '<i class="fas fa-file-excel"></i>'
  return '<i class="fas fa-file"></i>'
}

// 获取文件图标样式类
const getFileIconClass = (fileName: string) => {
  if (/\.(md|markdown)$/i.test(fileName)) return 'icon-markdown'
  if (/\.txt$/i.test(fileName)) return 'icon-text'
  if (/\.html?$/i.test(fileName)) return 'icon-html'
  if (/\.docx?$/i.test(fileName)) return 'icon-word'
  if (/\.pptx?$/i.test(fileName)) return 'icon-ppt'
  return ''
}

// 显示 Agent 详情
const showAgentDetail = (agentId: string) => {
  selectedAgent.value = agentId
  showDetailDialog.value = true
}

// 关闭对话框
const handleDialogClose = () => {
  selectedAgent.value = null
}

// 预览文件
const previewFile = (file: { name: string; content: string; type: string; path?: string }) => {
  previewFileItem.value = file
  previewLoading.value = true
  previewError.value = null
  showPreviewDialog.value = true

  // 如果有路径，从后端 API 获取文件内容
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
    // 使用本地内容
    previewLoading.value = false
    previewContent.value = {
      type: file.type,
      content: file.content
    }
  }
}

// 下载文件
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

  // 记录任务开始时间
  taskStartTime.value = Date.now()
  taskEndTime.value = 0

  try {
    // 使用 HTTP API 发送消息（与 Mission-control 一致）
    // 使用完整的 agent 名称作为 sessionKey
    const targetAgentName = 'agent:ceo:main'  // 小呦的完整 agent 名称

    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'human',
        to: targetAgentName,
        content: taskInput.value.trim(),
        message_type: 'text',
        conversation_id: targetAgentName
      })
    })

    const data = await response.json()

    if (data.success || data.message) {
      console.log('[TaskCenter2] Message sent via HTTP API:', data)
      // 在本地添加用户消息
      multiAgentStore.agents['xiaomu']?.messages.push({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: taskInput.value.trim(),
        timestamp: Date.now(),
        agentId: 'xiaomu'
      })
      ElMessage.success('任务已发送给小呦')
    } else {
      throw new Error(data.error || '发送失败')
    }
  } catch (err) {
    console.error('[TaskCenter2] Send message error:', err)
    ElMessage.error('发送失败：' + err.message)
  } finally {
    // 清空输入
    setTimeout(() => {
      taskInput.value = ''
      isSending.value = false
    }, 500)
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

// 重置 - 清空所有会话内容
const handleReset = () => {
  ElMessageBox.confirm('确定要清空所有 Agent 的会话内容吗？此操作不可恢复。', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 记录任务结束时间
    taskEndTime.value = Date.now()

    // 清空每个 Agent 的消息
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      multiAgentStore.clearMessages(agentId)
      lastMessageTime.value[agentId] = 0
    })
    ElMessage.success('已清空所有会话内容')
  }).catch(() => {
    // 用户取消
  })
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

// 监听消息变化，自动滚动日志（仅当用户没有向上滚动时才滚动）
watch(
  () => [
    agents.value['xiaomu']?.messages.length,
    agents.value['xiaoyan']?.messages.length,
    agents.value['xiaochan']?.messages.length,
    agents.value['xiaokai']?.messages.length
  ],
  () => {
    nextTick(() => {
      nextTick(() => {
        // 滚动每个 Agent 的日志框到底部显示最新消息（仅当用户没有手动向上滚动时）
        const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
        agentIds.forEach(agentId => {
          const logBox = logBoxRefs.value[agentId]
          if (logBox && !userScrolledUp.value[agentId]) {
            logBox.scrollTop = logBox.scrollHeight // 滚动到底部
          }
        })
      })
    })
  }
)

// 监听每个 Agent 日志框的滚动事件，检测用户是否手动向上滚动
onMounted(() => {
  multiAgentStore.loadMessages()
  console.log('[TaskCenter2] Mounted, allConnected:', allConnected.value)

  // 初始化滚动到底部
  nextTick(() => {
    nextTick(() => {
      const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
      agentIds.forEach(agentId => {
        const logBox = logBoxRefs.value[agentId]
        if (logBox) {
          logBox.scrollTop = logBox.scrollHeight
        }
      })
    })
  })

  // 添加滚动事件监听器
  nextTick(() => {
    const agentIds = ['xiaomu', 'xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
    agentIds.forEach(agentId => {
      const logBox = logBoxRefs.value[agentId]
      if (logBox) {
        logBox.addEventListener('scroll', () => {
          // 检测用户是否手动向上滚动（距离顶部有一定距离，且不在底部）
          const threshold = 50
          const isAtBottom = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight <= threshold
          // 如果不在底部，说明用户向上滚动了
          userScrolledUp.value[agentId] = !isAtBottom
        })
      }
    })
  })

  // 初始获取 ClaudeCode 会话
  fetchClaudeCodeSessions()

  // 每 5 秒轮询一次 ClaudeCode 会话
  claudeCodePollInterval = setInterval(fetchClaudeCodeSessions, 5000)
})

// 组件卸载时清理轮询
onUnmounted(() => {
  if (claudeCodePollInterval) {
    clearInterval(claudeCodePollInterval)
    claudeCodePollInterval = null
  }
})
</script>

<style scoped>
.task-center-2 {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.task-center__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.task-center__title h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 10px rgba(74, 157, 156, 0.3);
  letter-spacing: 0.1em;
  margin: 0;
}

.task-center__title p {
  font-size: 12px;
  color: var(--color-secondary);
  margin: 4px 0 0 0;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ai-status.status--connected {
  background: rgba(91, 168, 140, 0.1);
  border-color: var(--color-success);
  color: var(--color-success);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.ai-status.status--connected .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(91, 168, 140, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-status.status--connected .status-label {
  color: var(--color-success);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.task-center__main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.task-center__left {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
}

.task-center__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--color-primary), var(--color-secondary));
}

.section-title .title-icon {
  font-size: 20px;
}

.section-title span:last-child {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* 任务输入区域 */
.task-input-section {
  flex: 1;
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  padding: 12px 16px;
}

.task-input-row {
  margin-bottom: 10px;
}

.task-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  resize: none;
}

.task-input :deep(.el-textarea__inner):focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(74, 157, 156, 0.1);
}

.send-btn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.send-btn-task {
  flex: 1;
}

.connection-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
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
  box-shadow: 0 0 6px rgba(91, 168, 140, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

/* 信息面板 */
.info-panel {
  width: min(280px, 100%);
  flex-shrink: 0;
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  padding: 12px 16px;
}

.info-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Agent 列表 */
.agents-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .agents-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .task-center__header {
    flex-direction: column;
    gap: 16px;
  }

  .task-center__left {
    flex-direction: column;
  }

  .info-panel {
    width: 100%;
  }
}

.agent-panel {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  contain: layout paint;
}

.agent-panel:hover {
  border-color: rgba(74, 157, 156, 0.25);
  box-shadow: 0 0 10px rgba(74, 157, 156, 0.08);
}

.agent-panel.is-busy {
  border-color: rgba(255, 107, 50, 0.5);
  box-shadow: 0 0 20px rgba(255, 107, 50, 0.2);
  animation: busy-glow 2s ease-in-out infinite;
  will-change: box-shadow;
}

@keyframes busy-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 50, 0.2); }
  50% { box-shadow: 0 0 30px rgba(255, 107, 50, 0.4); }
}

.agent-panel--xiaomu { background: linear-gradient(to right, rgba(91, 168, 140, 0.15) 0%, transparent 4px); }
.agent-panel--xiaoyan { background: linear-gradient(to right, rgba(212, 121, 74, 0.15) 0%, transparent 4px); }
.agent-panel--xiaochan { background: linear-gradient(to right, rgba(107, 123, 168, 0.15) 0%, transparent 4px); }
.agent-panel--xiaokai { background: linear-gradient(to right, rgba(74, 157, 156, 0.15) 0%, transparent 4px); }
.agent-panel--xiaoce { background: linear-gradient(to right, rgba(255, 77, 79, 0.15) 0%, transparent 4px); }

.agent-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--grid-line);
}

.agent-info-large {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar-large {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.agent-avatar-large img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--grid-line);
}

.connection-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-tertiary);
  border: 2px solid var(--bg-surface);
}

.connection-dot.connected {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(91, 168, 140, 0.4);
}

.agent-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name-large {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-role-large {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
}

.status-badge.status--idle {
  background: rgba(91, 168, 140, 0.1);
}

.status-badge.status--idle .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(91, 168, 140, 0.4);
}

.status-badge.status--busy {
  background: rgba(212, 121, 74, 0.12);
}

.status-badge.status--busy .status-dot {
  background: var(--color-warning);
  box-shadow: 0 0 6px rgba(212, 121, 74, 0.4);
  animation: pulse 1s ease-in-out infinite;
}

.status-badge.status--offline {
  background: rgba(136, 144, 168, 0.1);
}

.status-badge.status--offline .status-dot {
  background: var(--text-tertiary);
}

.status-text {
  font-weight: 600;
  color: var(--text-secondary);
}

.status-badge.status--idle .status-text {
  color: var(--color-success);
}

.status-badge.status--busy .status-text {
  color: var(--color-warning);
}

.status-badge.status--offline .status-text {
  color: var(--text-tertiary);
}

/* 日志框 */
.agent-log-box {
  height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-log-box::-webkit-scrollbar {
  width: 6px;
}

.agent-log-box::-webkit-scrollbar-track {
  background: transparent;
}

.agent-log-box::-webkit-scrollbar-thumb {
  background: var(--color-primary-dim);
  border-radius: 3px;
}

.log-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 12px;
}

.log-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--bg-surface);
  border-radius: 6px;
  border: 1px solid var(--border-default);
}

.log-item.type-user {
  border-color: var(--color-secondary);
  background: rgba(107, 123, 168, 0.05);
}

.log-item.type-assistant {
  border-color: var(--color-primary);
  background: rgba(74, 157, 156, 0.05);
}

.log-item.type-system {
  border-color: var(--text-muted);
  background: rgba(136, 144, 168, 0.05);
}

.log-role {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-content {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
  word-break: break-word;
}

.log-content :deep(p) {
  margin: 4px 0;
}

.log-content :deep(pre) {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--grid-line);
  padding: 8px 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 6px 0;
}

.log-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 11px;
}

.log-content :deep(strong) {
  color: var(--color-primary);
}

/* 正在输入指示器 */
.log-item.typing-indicator {
  border-left-color: var(--color-primary);
  background: rgba(74, 157, 156, 0.05);
}

.typing-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.typing-text {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: 8px;
}

@keyframes typing-bounce {
  0%, 40%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  20% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Agent 面板底部 */
.agent-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-surface);
  border-top: 1px solid var(--grid-line);
  font-size: 11px;
}

.footer-label {
  color: var(--text-tertiary);
}

.footer-value {
  color: var(--color-primary);
  font-weight: 600;
  font-family: var(--font-mono);
}

/* Agent 详情对话框 */
.agent-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header-with-action h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-header-with-action .el-button {
  padding: 4px 8px;
}

.agent-info-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-surface);
  border-radius: 12px;
  border: 1px solid var(--grid-line);
}

.agent-info-header .agent-avatar-large {
  width: 60px;
  height: 60px;
}

.agent-info-header .agent-avatar-large img {
  border-radius: 50%;
}

.agent-info-text {
  flex: 1;
}

.agent-info-text h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.agent-info-text p {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-section h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--grid-line);
}

.agent-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  transition: all 0.2s;
}

.agent-file-item:hover {
  border-color: var(--color-primary);
  background: rgba(74, 157, 156, 0.05);
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.file-icon.icon-markdown { color: var(--color-primary); }
.file-icon.icon-text { color: var(--text-secondary); }
.file-icon.icon-html { color: var(--color-warning); }
.file-icon.icon-word { color: #2b579a; }
.file-icon.icon-ppt { color: #d24726; }

.git-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.git-link:hover {
  color: var(--color-primary);
}

.github-icon {
  width: 18px;
  height: 18px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-logs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.agent-log-item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-surface);
  border-radius: 6px;
  font-size: 12px;
}

.agent-log-item--user {
  background: rgba(107, 123, 168, 0.05);
  border: 1px solid var(--color-secondary);
}

.agent-log-item--assistant {
  background: rgba(74, 157, 156, 0.05);
  border: 1px solid var(--color-primary);
}

.agent-log-item--system {
  background: rgba(136, 144, 168, 0.05);
  border: 1px solid var(--text-muted);
}

.log-time {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.log-message {
  color: var(--text-primary);
  line-height: 1.5;
}

.empty-tip {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 12px;
}

/* 文件预览 */
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
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--grid-line);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  max-height: 500px;
  overflow-y: auto;
}

/* Markdown 渲染样式 */
.preview-content .markdown-rendered {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
}

.preview-content .markdown-rendered :deep(h1),
.preview-content .markdown-rendered :deep(h2),
.preview-content .markdown-rendered :deep(h3),
.preview-content .markdown-rendered :deep(h4),
.preview-content .markdown-rendered :deep(h5),
.preview-content .markdown-rendered :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-primary);
}

.preview-content .markdown-rendered :deep(h1) {
  font-size: 24px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--grid-line);
}

.preview-content .markdown-rendered :deep(h2) {
  font-size: 20px;
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--grid-line);
}

.preview-content .markdown-rendered :deep(h3) {
  font-size: 16px;
}

.preview-content .markdown-rendered :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content .markdown-rendered :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.preview-content .markdown-rendered :deep(a):hover {
  text-decoration: underline;
}

.preview-content .markdown-rendered :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  font-family: var(--font-mono);
  background: rgba(110, 118, 129, 0.2);
  border-radius: 6px;
}

.preview-content .markdown-rendered :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  border: 1px solid var(--grid-line);
}

.preview-content .markdown-rendered :deep(pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border-radius: 0;
}

.preview-content .markdown-rendered :deep(blockquote) {
  padding: 0 1em;
  color: var(--text-secondary);
  border-left: 0.25em solid var(--grid-line);
  margin: 0;
  margin-bottom: 16px;
}

.preview-content .markdown-rendered :deep(ul),
.preview-content .markdown-rendered :deep(ol) {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.preview-content .markdown-rendered :deep(li) {
  margin-top: 0.25em;
}

.preview-content .markdown-rendered :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--grid-line);
  border: 0;
}

.preview-content .markdown-rendered :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
  overflow: auto;
}

.preview-content .markdown-rendered :deep(table th),
.preview-content .markdown-rendered :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--grid-line);
}

.preview-content .markdown-rendered :deep(table tr) {
  background-color: var(--bg-surface);
}

.preview-content .markdown-rendered :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
  border-radius: 6px;
}

.preview-content pre :deep(code) {
  font-family: var(--font-mono);
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

.preview-unsupported .hint {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 亮色主题样式 - 飞书风格 ========== */
:root.light-theme .task-center__header {
  border-bottom-color: #dee0e3;
}

:root.light-theme .task-center__title h1 {
  color: #1f2329;
  font-weight: 600;
  text-shadow: none;
}

:root.light-theme .task-center__title p {
  color: #8f959e;
}

:root.light-theme .ai-status {
  background: #ffffff;
  border-color: #dee0e3;
}

:root.light-theme .ai-status.status--connected {
  background: rgba(0, 179, 101, 0.08);
  border-color: #00b365;
  color: #00b365;
}

:root.light-theme .status-dot {
  background: #c2c8d1;
}

:root.light-theme .ai-status.status--connected .status-dot {
  background: #00b365;
  box-shadow: 0 0 8px rgba(0, 179, 101, 0.4);
}

:root.light-theme .status-label {
  color: #646a73;
}

:root.light-theme .ai-status.status--connected .status-label {
  color: #00b365;
}

:root.light-theme .section-title {
  color: #1f2329;
}

:root.light-theme .section-title::before {
  background: linear-gradient(180deg, #3370ff, #4d82ff);
}

:root.light-theme .section-title span:last-child {
  color: #1f2329;
  font-weight: 600;
}

:root.light-theme .task-input-section {
  background: #ffffff;
  border-color: #dee0e3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .task-input :deep(.el-textarea__inner) {
  background: #ffffff;
  border-color: #dee0e3;
  color: #1f2329;
}

:root.light-theme .task-input :deep(.el-textarea__inner):focus {
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
}

:root.light-theme .send-btn-task {
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  border: none;
  color: #ffffff;
  box-shadow:
    0 2px 8px rgba(51, 112, 255, 0.3),
    0 1px 3px rgba(51, 112, 255, 0.15);
}

:root.light-theme .send-btn-task:hover:not(:disabled) {
  background: linear-gradient(135deg, #2860e1 0%, #3370ff 100%);
  box-shadow:
    0 4px 12px rgba(51, 112, 255, 0.35),
    0 2px 6px rgba(51, 112, 255, 0.2);
  transform: translateY(-1px);
}

:root.light-theme .connection-hint {
  color: #8f959e;
}

:root.light-theme .connection-hint.connected {
  color: #00b365;
}

:root.light-theme .agent-status-section {
  background: #ffffff;
  border-color: #dee0e3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .agent-card {
  background: #ffffff;
  border-color: #dee0e3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:root.light-theme .agent-card__header {
  border-bottom-color: #f5f6f7;
}

:root.light-theme .agent-card__name {
  color: #1f2329;
  font-weight: 600;
}

:root.light-theme .agent-card__id {
  color: #8f959e;
}

:root.light-theme .agent-card__icon {
  background: linear-gradient(135deg, rgba(51, 112, 255, 0.08) 0%, rgba(77, 130, 255, 0.06) 100%);
  border-color: #e8ecf1;
}

:root.light-theme .status-badge {
  background: rgba(0, 179, 101, 0.08);
  border-color: #00b365;
  color: #00b365;
}

:root.light-theme .status-badge .status-dot {
  background: #00b365;
  box-shadow: 0 0 8px rgba(0, 179, 101, 0.4);
}

:root.light-theme .agent-card__body {
  border-bottom-color: #f5f6f7;
}

:root.light-theme .detail-label {
  color: #8f959e;
}

:root.light-theme .detail-value {
  color: #646a73;
}

:root.light-theme .agent-logs {
  background: #fafbfc;
  border-top-color: #f5f6f7;
}

:root.light-theme .log-entry {
  color: #646a73;
}

:root.light-theme .execution-progress {
  background: #ffffff;
  border-color: #dee0e3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .progress-title {
  color: #1f2329;
  font-weight: 600;
}

:root.light-theme .progress-value {
  color: #3370ff;
  font-weight: 600;
}

:root.light-theme .phase-item {
  background: #ffffff;
  border-color: #dee0e3;
  color: #646a73;
}

:root.light-theme .phase-item.active {
  background: rgba(51, 112, 255, 0.08);
  border-color: #3370ff;
  color: #1f2329;
}

:root.light-theme .complete-card {
  background: #ffffff;
  border-color: #dee0e3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

:root.light-theme .complete-icon {
  color: #00b365;
}

:root.light-theme .complete-card h3 {
  color: #00b365;
  font-weight: 600;
}

:root.light-theme .complete-card p {
  color: #646a73;
}

:root.light-theme .stat-label {
  color: #8f959e;
}

:root.light-theme .stat-value {
  color: #1f2329;
  font-weight: 600;
}

:root.light-theme .preview-content {
  background: #ffffff;
  border-color: #dee0e3;
}

:root.light-theme .preview-content .markdown-rendered {
  color: #646a73;
}

:root.light-theme .preview-content .markdown-rendered :deep(h1),
:root.light-theme .preview-content .markdown-rendered :deep(h2),
:root.light-theme .preview-content .markdown-rendered :deep(h3) {
  color: #1f2329;
  font-weight: 600;
  border-bottom-color: #dee0e3;
}

:root.light-theme .preview-content .markdown-rendered :deep(code) {
  background: #f5f6f7;
  border-color: #dee0e3;
  color: #646a73;
}

:root.light-theme .preview-content .markdown-rendered :deep(pre) {
  background: #1f2329;
  border-color: #444852;
}

:root.light-theme .preview-content .markdown-rendered :deep(blockquote) {
  color: #646a73;
  border-left-color: #dee0e3;
}

:root.light-theme .preview-content .markdown-rendered :deep(table th),
:root.light-theme .preview-content .markdown-rendered :deep(table td) {
  border-color: #dee0e3;
}

:root.light-theme .preview-content .markdown-rendered :deep(table tr) {
  background-color: #ffffff;
}

:root.light-theme .preview-unsupported {
  color: #c2c8d1;
}

:root.light-theme .preview-unsupported .hint {
  color: #c2c8d1;
}

:root.light-theme :deep(.el-dialog) {
  background: #ffffff;
  border-radius: 16px;
}

:root.light-theme :deep(.el-dialog__header) {
  border-bottom-color: #dee0e3;
}

:root.light-theme :deep(.el-dialog__title) {
  color: #1f2329;
  font-weight: 600;
}

:root.light-theme :deep(.el-dialog__body) {
  color: #646a73;
}

:root.light-theme :deep(.el-textarea__inner) {
  background: #ffffff;
  border-color: #dee0e3;
  color: #1f2329;
}

:root.light-theme :deep(.el-textarea__inner):focus {
  border-color: #3370ff;
  box-shadow: 0 0 0 2px rgba(51, 112, 255, 0.1);
}

:root.light-theme :deep(.el-input__wrapper) {
  background: #ffffff;
  box-shadow: 0 0 0 1px #dee0e3 inset;
}

:root.light-theme :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3370ff inset;
}

:root.light-theme :deep(.el-input__inner) {
  color: #1f2329;
}

:root.light-theme :deep(.el-select-dropdown__item.selected) {
  color: #3370ff;
  font-weight: 600;
}

:root.light-theme :deep(.el-button--primary) {
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  border: none;
}

:root.light-theme :deep(.el-button--success) {
  background: #00b365;
  border: none;
}

:root.light-theme :deep(.el-button--danger) {
  background: #ff4d4f;
  border: none;
}

/* ========== 日志项样式 - 飞书风格 ========== */
:root.light-theme .log-item {
  background: #ffffff;
  border-radius: 8px;
  border-left: 3px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .log-item.type-user {
  border-left-color: #6aa1ff;
  background: rgba(106, 161, 255, 0.06);
}

:root.light-theme .log-item.type-assistant {
  border-left-color: #3370ff;
  background: rgba(51, 112, 255, 0.06);
}

:root.light-theme .log-item.type-system {
  border-left-color: #c2c8d1;
  background: rgba(194, 200, 209, 0.06);
}

:root.light-theme .log-role {
  color: #8f959e;
  font-weight: 600;
}

:root.light-theme .log-content {
  color: #1f2329;
}

:root.light-theme .log-content :deep(p) {
  color: #1f2329;
}

:root.light-theme .log-content :deep(strong) {
  color: #3370ff;
  font-weight: 600;
}

:root.light-theme .log-content :deep(pre) {
  background: #f5f6f7;
  border-color: #dee0e3;
}

:root.light-theme .log-content :deep(code) {
  background: #f5f6f7;
  border-color: #e5e6e9;
  color: #646a73;
}

:root.light-theme .log-item.typing-indicator {
  border-left-color: #3370ff;
  background: rgba(51, 112, 255, 0.06);
}

:root.light-theme .typing-dot {
  background: #3370ff;
}

:root.light-theme .log-empty {
  color: #c2c8d1;
}

/* ClaudeCode 动态角色样式 */
.agent-panel--claudecode {
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
}

.agent-panel--claudecode:hover {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
}

.agent-panel--claudecode.is-busy {
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 25px rgba(139, 92, 246, 0.3);
  animation: claude-busy-glow 2s ease-in-out infinite;
  will-change: box-shadow;
}

@keyframes claude-busy-glow {
  0%, 100% { box-shadow: 0 0 25px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.5); }
}

.claude-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid var(--grid-line);
}

.claude-log-box {
  background: rgba(139, 92, 246, 0.05);
}

.claude-session-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.session-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-icon {
  font-size: 14px;
}

.session-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-model {
  font-size: 10px;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
}

.session-details {
  display: flex;
  gap: 16px;
}

.session-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
}

.detail-label {
  color: var(--text-tertiary);
}

.detail-value {
  color: var(--color-primary);
  font-weight: 600;
  font-family: var(--font-mono);
}

.session-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-tertiary);
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
}

.path-icon {
  font-size: 10px;
}

.path-value {
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-prompt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.prompt-label {
  color: var(--text-tertiary);
  font-size: 10px;
}

.prompt-value {
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ClaudeCode 会话列表样式 */
.claude-session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.claude-session-item-mini {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.claude-session-item-mini:hover {
  background: rgba(139, 92, 246, 0.15);
  transform: translateX(2px);
}

.session-mini-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-model-badge {
  font-size: 10px;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
}

.session-name-mini {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-mini-stats {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: var(--text-tertiary);
}

/* ClaudeCode 展开面板样式 */
.agent-panel--claudecode.is-expanded {
  grid-column: span 2;
  min-height: 500px;
}

.claude-session-expanded {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.session-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.1);
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
}

.session-info-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
}

.session-path-mini {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-info-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-stat {
  font-size: 10px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.refresh-btn {
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.refresh-btn:hover {
  opacity: 1;
}

.expand-btn {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 10px;
  transition: transform 0.3s ease;
}

.expand-btn span {
  display: inline-block;
  transition: transform 0.3s ease;
}

.expand-btn span.expanded {
  transform: rotate(180deg);
}

/* 消息容器样式 */
.claude-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: rgba(0, 0, 0, 0.1);
}

.transcript-loading,
.transcript-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.transcript-messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transcript-msg {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}

.transcript-msg.msg-user {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.transcript-msg.msg-assistant {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.transcript-msg.msg-system {
  background: rgba(100, 100, 100, 0.15);
  border: 1px solid rgba(100, 100, 100, 0.3);
}

.msg-role-badge {
  font-size: 9px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  font-weight: 600;
}

.msg-content {
  color: var(--text-primary);
}

.msg-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-thinking {
  color: var(--text-tertiary);
  font-style: italic;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 4px 0;
}

.msg-tool {
  margin: 4px 0;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.tool-name {
  font-size: 10px;
  color: #f59e0b;
  font-weight: 600;
}

.tool-input {
  margin-top: 4px;
  font-size: 9px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
}

.msg-tool-result {
  margin: 4px 0;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 100px;
  overflow-y: auto;
}

.msg-tool-result.is-error {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
}

/* 输入区域样式 */
.claude-input-area {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.claude-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s ease;
}

.claude-input:focus {
  border-color: #8b5cf6;
}

.claude-input::placeholder {
  color: var(--text-tertiary);
}

.claude-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-error {
  padding: 6px 12px;
  font-size: 10px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .status-dot,
  .connection-dot,
  .typing-dot {
    animation: none !important;
  }

  .agent-panel.is-busy,
  .agent-panel--claudecode.is-busy {
    animation: none !important;
  }
}
</style>
