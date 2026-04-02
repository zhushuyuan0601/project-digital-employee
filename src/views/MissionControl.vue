<template>
  <div class="task-center-2">
    <!-- 顶部标题 -->
    <div class="task-center__header">
      <div class="task-center__title">
        <h1>Mission Control</h1>
        <p>团队智能体实时监控中心 - Gateway 直连模式</p>
      </div>
      <div class="header-actions">
        <div class="ai-status" :class="gateway.isConnected ? 'status--connected' : 'status--disconnected'">
          <span class="status-dot"></span>
          <span class="status-label">{{ gateway.isConnected ? '已连接' : '未连接' }}</span>
        </div>
        <button class="btn btn-secondary btn-sm" @click="showTokenDialog = true">
          <span class="btn-icon">🔑</span>
          Token
        </button>
      </div>
    </div>

    <!-- 主体内容：左右布局 -->
    <div class="task-center__main">
      <!-- 左侧：任务下达 -->
      <div class="task-center__left">
        <div class="task-input-section">
          <div class="section-title">
            <span class="title-icon">📝</span>
            <span>下达任务</span>
          </div>

          <div class="task-input-row">
            <el-input
              v-model="taskInput"
              placeholder="输入任务内容，发送给智能体..."
              type="textarea"
              :rows="4"
              class="task-input"
              @keydown.ctrl.enter="sendTask"
            />
          </div>

          <div class="task-options-row">
            <el-select v-model="targetAgent" placeholder="选择目标 Agent" class="agent-select">
              <el-option label="小呦 (项目统筹)" value="ceo" />
              <el-option label="研究员 (调研分析)" value="researcher" />
              <el-option label="产品经理 (产品设计)" value="pm" />
              <el-option label="研发工程师 (技术开发)" value="tech-lead" />
              <el-option label="测试工程师 (质量保证)" value="team-qa" />
            </el-select>
          </div>

          <div class="send-btn-row">
            <button
              class="btn btn-primary btn-lg send-btn-task"
              @click="sendTask"
              :disabled="!taskInput.trim() || !gateway.isConnected || isSending"
            >
              <span class="btn-icon">⟳</span>
              🚀 下发任务
            </button>
            <span class="connection-hint" :class="{ connected: gateway.isConnected }">
              <span class="hint-dot"></span>
              {{ gateway.isConnected ? 'Gateway 已连接' : 'Gateway 未连接' }}
            </span>
          </div>
        </div>

        <!-- 使用说明 -->
        <div class="info-panel">
          <div class="info-title">💡 使用说明</div>
          <div class="info-content">
            <p>1. 配置 Gateway Token 连接 OpenClaw</p>
            <p>2. 输入任务内容，选择目标 Agent</p>
            <p>3. 点击「下发任务」发送给智能体</p>
            <p>4. 右侧实时显示各 Agent 的输出</p>
          </div>
        </div>
      </div>

      <!-- 右侧：Agent 输出面板 -->
      <div class="task-center__right">
        <!-- 空状态 -->
        <div v-if="activeAgents.length === 0" class="empty-state">
          <div class="empty-icon">🤖</div>
          <div class="empty-text">等待智能体响应...</div>
          <div class="empty-hint">发送任务后，智能体的输出会在这里实时显示</div>
        </div>

        <!-- Agent 面板列表 -->
        <div v-else class="agents-list">
          <div
            v-for="agent in activeAgents"
            :key="agent.name"
            class="agent-panel"
            :class="{ 'is-busy': agent.isStreaming }"
          >
            <!-- Agent 头部 -->
            <div class="agent-panel-header">
              <div class="agent-info-large">
                <div class="agent-avatar-large">
                  <img v-if="agent.icon" :src="agent.icon" :alt="agent.displayName" />
                  <span v-else class="avatar-fallback">{{ agent.displayName.charAt(0) }}</span>
                  <span class="connection-dot connected"></span>
                </div>
                <div class="agent-details">
                  <div class="agent-name-large">{{ agent.displayName }}</div>
                  <div class="agent-role-large">{{ agent.roleTag }}</div>
                </div>
              </div>
              <div class="status-badge" :class="agent.isStreaming ? 'status--busy' : 'status--idle'">
                <span class="status-dot"></span>
                <span class="status-text">{{ agent.isStreaming ? '输出中' : '完成' }}</span>
              </div>
            </div>

            <!-- Agent 输出日志 -->
            <div class="agent-log-box" :ref="(el) => logBoxRefs[agent.name] = el as HTMLElement">
              <template v-for="(part, idx) in agent.parts" :key="idx">
                <!-- 文本内容 -->
                <div v-if="part.type === 'text'" class="log-item type-text">
                  <div class="log-content" v-html="renderMarkdown(part.text)"></div>
                  <span v-if="agent.isStreaming && idx === agent.parts.length - 1" class="streaming-cursor">●</span>
                </div>

                <!-- 思考过程 -->
                <details v-else-if="part.type === 'thinking'" class="log-item type-thinking" open>
                  <summary class="thinking-summary">
                    <span class="thinking-icon">💭</span>
                    <span>思考过程</span>
                    <span class="thinking-length">({{ part.thinking?.length || 0 }} 字符)</span>
                  </summary>
                  <div class="thinking-content">{{ part.thinking }}</div>
                </details>

                <!-- 工具调用 -->
                <div v-else-if="part.type === 'tool_use'" class="log-item type-tool">
                  <div class="tool-header">
                    <span class="tool-icon">🔧</span>
                    <span class="tool-name">{{ part.name || 'tool' }}</span>
                    <span v-if="part.phase" class="tool-phase">{{ part.phase }}</span>
                    <span v-if="part.isError" class="tool-error">❌</span>
                  </div>
                  <pre v-if="part.input" class="tool-input">{{ truncate(part.input, 300) }}</pre>
                  <pre v-if="part.output" class="tool-output">{{ truncate(part.output, 500) }}</pre>
                </div>

                <!-- 工具结果 -->
                <div v-else-if="part.type === 'tool_result'" class="log-item type-result" :class="{ 'is-error': part.isError }">
                  <span class="result-icon">{{ part.isError ? '❌' : '✅' }}</span>
                  <span class="result-label">{{ part.isError ? '错误' : '结果' }}</span>
                  <pre class="result-content">{{ truncate(part.content, 300) }}</pre>
                </div>
              </template>
            </div>

            <!-- Agent 底部统计 -->
            <div class="agent-panel-footer">
              <span class="footer-label">消息数</span>
              <span class="footer-value">{{ agent.parts.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Token 配置对话框 -->
    <el-dialog v-model="showTokenDialog" title="配置 Gateway Token" width="500px">
      <div class="token-dialog">
        <p>请输入 OpenClaw Gateway 的认证 Token</p>
        <el-input
          v-model="tokenInput"
          type="textarea"
          :rows="3"
          placeholder="粘贴 Gateway Token..."
        />
        <div class="token-actions">
          <button class="btn btn-secondary" @click="clearToken">清除</button>
          <button class="btn btn-primary" @click="saveToken">保存并连接</button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownIt from 'markdown-it'
import { useGatewayStore, setGatewayToken, clearGatewayToken } from '@/stores/gateway'
import { AGENT_CONFIG } from '@/simulation'

const md = new MarkdownIt({ breaks: true, linkify: true })
const gateway = useGatewayStore()

// State
const taskInput = ref('')
const targetAgent = ref('ceo')
const isSending = ref(false)
const showTokenDialog = ref(false)
const tokenInput = ref('')

// 日志框引用
const logBoxRefs = ref<Record<string, HTMLElement | null>>({})

// Gateway Agent 名称到本地配置的映射
const GATEWAY_TO_LOCAL: Record<string, string> = {
  ceo: 'xiaomu',
  researcher: 'xiaoyan',
  pm: 'xiaochan',
  'tech-lead': 'xiaokai',
  'team-qa': 'xiaoce',
}

// Agent 显示配置（整合头像）
const AGENT_DISPLAY: Record<string, { displayName: string; roleTag: string; icon: string }> = {
  ceo: { displayName: '小呦', roleTag: '项目统筹 · agent:ceo:main', icon: AGENT_CONFIG['xiaomu']?.icon || '' },
  researcher: { displayName: '研究员', roleTag: '调研分析 · agent:researcher:main', icon: AGENT_CONFIG['xiaoyan']?.icon || '' },
  pm: { displayName: '产品经理', roleTag: '产品设计 · agent:pm:main', icon: AGENT_CONFIG['xiaochan']?.icon || '' },
  'tech-lead': { displayName: '研发工程师', roleTag: '技术开发 · agent:tech-lead:main', icon: AGENT_CONFIG['xiaokai']?.icon || '' },
  'team-qa': { displayName: '测试工程师', roleTag: '质量保证 · agent:team-qa:main', icon: AGENT_CONFIG['xiaoce']?.icon || '' },
}

// 获取活跃的 Agents
const activeAgents = computed(() => {
  const agents: any[] = []
  const buffer = gateway.agentStreamBuffer

  for (const [agentName, data] of Object.entries(buffer)) {
    const config = AGENT_DISPLAY[agentName] || { displayName: agentName, roleTag: 'Agent', icon: '' }
    const isStreaming = gateway.activeStreams[agentName]

    agents.push({
      name: agentName,
      displayName: config.displayName,
      roleTag: config.roleTag,
      icon: config.icon,
      parts: data.parts || [],
      isStreaming: !!isStreaming,
    })
  }

  return agents
})

// 自动滚动到底部
function scrollToBottom(agentName: string) {
  nextTick(() => {
    const logBox = logBoxRefs.value[agentName]
    if (logBox) {
      logBox.scrollTop = logBox.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动
watch(() => gateway.agentStreamBuffer, (buffer) => {
  for (const agentName of Object.keys(buffer)) {
    scrollToBottom(agentName)
  }
}, { deep: true })

// 监听活跃 Agents 变化
watch(activeAgents, (agents) => {
  for (const agent of agents) {
    scrollToBottom(agent.name)
  }
}, { deep: true })

// 渲染 Markdown
function renderMarkdown(text: string): string {
  return md.render(text || '')
}

// 截断文本
function truncate(text: string, maxLen: number): string {
  if (!text) return ''
  const str = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

// 发送任务
async function sendTask() {
  if (!taskInput.value.trim() || isSending.value) return

  isSending.value = true
  try {
    // 构建完整的 agent ID（如 ceo -> agent:ceo:main）
    const targetAgentName = `agent:${targetAgent.value}:main`

    // 使用 HTTP API 发送消息到后端，由后端转发到 Gateway
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

    const result = await response.json()

    if (response.ok && result.message) {
      ElMessage.success('任务已发送')
      taskInput.value = ''
    } else {
      ElMessage.error('发送失败：' + (result.error || '未知错误'))
    }
  } catch (err) {
    ElMessage.error('发送失败：' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    isSending.value = false
  }
}
// 保存 Token
function saveToken() {
  const token = tokenInput.value.trim()
  if (token) {
    setGatewayToken(token)
    showTokenDialog.value = false
    ElMessage.success('Token 已保存，正在连接...')
    gateway.disconnect()
    setTimeout(() => gateway.connect(), 500)
  } else {
    ElMessage.warning('请输入有效的 Token')
  }
}

// 清除 Token
function clearToken() {
  clearGatewayToken()
  tokenInput.value = ''
  showTokenDialog.value = false
  gateway.disconnect()
}

// 初始化
onMounted(() => {
  // 检查是否有 Token
  const storedToken = localStorage.getItem('mc-gateway-token')
  if (!storedToken) {
    showTokenDialog.value = true
  } else {
    gateway.connect()
  }
})

// 监听连接状态
watch(() => gateway.isConnected, (connected) => {
  if (connected) {
    ElMessage.success('已连接到 Gateway')
  }
})
</script>

<style scoped>
.task-center-2 {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  padding-bottom: 40px;
  min-height: 100vh;
  background: #0a0a12;
}

/* Header */
.task-center__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(100, 100, 150, 0.2);
}

.task-center__title h1 {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.05em;
  margin: 0;
}

.task-center__title p {
  font-size: 12px;
  color: #888;
  margin: 4px 0 0 0;
  letter-spacing: 0.1em;
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
  background: rgba(30, 30, 40, 0.6);
  border: 1px solid rgba(100, 100, 150, 0.2);
  font-size: 12px;
}

.ai-status.status--connected {
  background: rgba(103, 194, 58, 0.1);
  border-color: #67c23a;
  color: #67c23a;
}

.ai-status.status--disconnected {
  background: rgba(245, 108, 108, 0.1);
  border-color: #f56c6c;
  color: #f56c6c;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.ai-status.status--connected .status-dot {
  box-shadow: 0 0 8px rgba(103, 194, 58, 0.6);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Main Layout */
.task-center__main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.task-center__left {
  display: flex;
  flex-direction: row;
  gap: 20px;
}

.task-center__right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Section Title */
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
  background: linear-gradient(180deg, #00d4ff, #7c3aed);
}

.section-title .title-icon {
  font-size: 20px;
}

.section-title span:last-child {
  font-size: 14px;
  font-weight: 700;
  color: #e0e0e0;
  letter-spacing: 0.1em;
}

/* Task Input Section */
.task-input-section {
  flex: 1;
  background: rgba(20, 20, 30, 0.6);
  border: 1px solid rgba(100, 100, 150, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.task-input-row {
  margin-bottom: 12px;
}

.task-input :deep(.el-textarea__inner) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(100, 100, 150, 0.2);
  color: #e0e0e0;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
}

.task-input :deep(.el-textarea__inner):focus {
  border-color: #00d4ff;
}

.task-options-row {
  margin-bottom: 12px;
}

.agent-select {
  width: 100%;
}

.agent-select :deep(.el-input__wrapper) {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(100, 100, 150, 0.2);
}

.agent-select :deep(.el-input__inner) {
  color: #e0e0e0;
}

.send-btn-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.send-btn-task {
  flex: 1;
  padding: 12px 24px;
  font-size: 14px;
}

.connection-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #f56c6c;
}

.connection-hint.connected {
  color: #67c23a;
}

.hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

/* Info Panel */
.info-panel {
  width: 280px;
  background: rgba(20, 20, 30, 0.6);
  border: 1px solid rgba(100, 100, 150, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.info-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 12px;
}

.info-content p {
  font-size: 12px;
  color: #888;
  margin: 0 0 8px;
  line-height: 1.6;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.btn-secondary {
  background: rgba(100, 100, 150, 0.2);
  color: #a0a0b0;
  border: 1px solid rgba(100, 100, 150, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(100, 100, 150, 0.3);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 14px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: rgba(20, 20, 30, 0.6);
  border: 1px solid rgba(100, 100, 150, 0.15);
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  color: #888;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: #555;
}

/* Agent Panel */
.agents-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.agent-panel {
  background: rgba(20, 20, 30, 0.6);
  border: 1px solid rgba(100, 100, 150, 0.15);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.agent-panel:hover {
  border-color: rgba(0, 212, 255, 0.3);
}

.agent-panel.is-busy {
  border-color: rgba(0, 212, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}

/* Agent Header */
.agent-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 30, 40, 0.5);
  border-bottom: 1px solid rgba(100, 100, 150, 0.1);
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
}

.agent-avatar-large img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.connection-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  border: 2px solid #1a1a24;
}

.connection-dot.connected {
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.5);
}

.agent-details {
  display: flex;
  flex-direction: column;
}

.agent-name-large {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.agent-role-large {
  font-size: 11px;
  color: #888;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.status-badge.status--busy {
  background: rgba(0, 212, 255, 0.15);
  color: #00d4ff;
}

.status-badge.status--idle {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

.status-badge .status-dot {
  width: 6px;
  height: 6px;
}

.status-badge.status--busy .status-dot {
  animation: pulse 1s infinite;
}

/* Agent Log Box */
.agent-log-box {
  height: 350px;
  overflow-y: auto;
  padding: 12px;
  background: rgba(10, 10, 15, 0.5);
  scroll-behavior: smooth;
}

.agent-log-box::-webkit-scrollbar {
  width: 4px;
}

.agent-log-box::-webkit-scrollbar-thumb {
  background: rgba(100, 100, 200, 0.3);
  border-radius: 2px;
}

/* Log Items */
.log-item {
  margin-bottom: 10px;
}

.log-item.type-text .log-content {
  font-size: 13px;
  line-height: 1.6;
  color: #e0e0e0;
  word-break: break-word;
}

.log-item.type-text .log-content :deep(p) {
  margin: 0 0 8px;
}

.log-item.type-text .log-content :deep(code) {
  background: rgba(100, 100, 150, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.log-item.type-text .log-content :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.streaming-cursor {
  color: #00d4ff;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Thinking */
.log-item.type-thinking {
  margin-bottom: 10px;
}

.thinking-summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(123, 44, 191, 0.15);
  border-radius: 6px;
  font-size: 12px;
  color: #b366ff;
}

.thinking-summary:hover {
  background: rgba(123, 44, 191, 0.25);
}

.thinking-icon {
  font-size: 14px;
}

.thinking-length {
  color: #888;
  font-size: 11px;
}

.thinking-content {
  margin-top: 8px;
  padding: 12px;
  background: rgba(30, 30, 40, 0.6);
  border-left: 2px solid #b366ff;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: #c0c0d0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
}

/* Tool */
.log-item.type-tool {
  padding: 10px 12px;
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.2);
  border-radius: 6px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  color: #ffaa00;
  font-weight: 500;
  font-family: monospace;
}

.tool-phase {
  font-size: 10px;
  background: rgba(100, 100, 100, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  color: #888;
  text-transform: uppercase;
}

.tool-error {
  margin-left: auto;
}

.tool-input,
.tool-output {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #a0a0b0;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.tool-output {
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

/* Result */
.log-item.type-result {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(103, 194, 58, 0.1);
  border-radius: 6px;
  font-size: 12px;
}

.log-item.type-result.is-error {
  background: rgba(245, 108, 108, 0.1);
}

.result-icon {
  font-size: 14px;
}

.result-label {
  color: #67c23a;
  font-weight: 500;
}

.log-item.type-result.is-error .result-label {
  color: #f56c6c;
}

.result-content {
  flex: 1;
  font-size: 11px;
  color: #a0a0b0;
  margin: 0;
  max-height: 80px;
  overflow-y: auto;
}

/* Agent Footer */
.agent-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(30, 30, 40, 0.3);
  border-top: 1px solid rgba(100, 100, 150, 0.1);
  font-size: 11px;
}

.footer-label {
  color: #888;
}

.footer-value {
  color: #00d4ff;
  font-weight: 500;
}

/* Token Dialog */
.token-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-dialog p {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.token-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

/* Responsive */
@media (max-width: 1200px) {
  .agents-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .task-center__left {
    flex-direction: column;
  }

  .info-panel {
    width: 100%;
  }
}
</style>