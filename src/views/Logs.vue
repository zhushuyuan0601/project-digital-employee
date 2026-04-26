<template>
  <div class="logs">
    <div class="page-header">
      <h1>系统日志</h1>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索日志..."
        />
        <button class="btn-primary" @click="refreshLogs">刷新</button>
        <button class="btn-secondary" @click="clearLogs">清空</button>
        <button
          :class="['btn-toggle', { active: autoScroll }]"
          @click="autoScroll = !autoScroll"
        >
          {{ autoScroll ? '🔒 锁定' : '🔓 滚动' }}
        </button>
      </div>
    </div>

    <div class="log-filters">
      <select v-model="logLevel" class="filter-select">
        <option value="">所有级别</option>
        <option value="info">信息</option>
        <option value="warn">警告</option>
        <option value="error">错误</option>
        <option value="debug">调试</option>
      </select>
      <select v-model="logSource" class="filter-select">
        <option value="">所有来源</option>
        <option value="gateway">网关</option>
        <option value="agent">智能体</option>
        <option value="tool">工具</option>
        <option value="system">系统</option>
      </select>
      <span class="log-count">共 {{ logs.length }} 条日志</span>
    </div>

    <div class="log-container" ref="logContainer">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="!isConnected" class="disconnected">
        <div class="disconnected-icon">🔌</div>
        <p>未连接到 Gateway</p>
        <p class="disconnected-hint">请先确认 Gateway 与 Agent 连接状态</p>
      </div>

      <div v-else class="log-list">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          :class="['log-entry', log.level]"
        >
          <div class="log-time">{{ log.time }}</div>
          <div class="log-level">{{ log.level.toUpperCase() }}</div>
          <div class="log-source">{{ log.source }}</div>
          <div class="log-message">{{ log.message }}</div>
        </div>
        <div v-if="filteredLogs.length === 0" class="empty-logs">
          暂无日志
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useNotification } from '@/composables/useNotification'

const multiAgentStore = useMultiAgentChatStore()
const notification = useNotification()
const isConnected = computed(() => multiAgentStore.anyConnected)

const loading = ref(false)
const searchQuery = ref('')
const logLevel = ref('')
const logSource = ref('')
const autoScroll = ref(true)
const logContainer = ref<HTMLElement | null>(null)

interface LogEntry {
  id: string
  time: string
  level: string
  source: string
  message: string
}

const logs = ref<LogEntry[]>([])

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const matchesSearch = !searchQuery.value ||
      log.message.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesLevel = !logLevel.value || log.level === logLevel.value
    const matchesSource = !logSource.value || log.source === logSource.value
    return matchesSearch && matchesLevel && matchesSource
  })
})

// 添加日志
const addLog = (level: string, source: string, message: string) => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`

  logs.value.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time,
    level,
    source,
    message
  })

  // 限制日志数量
  if (logs.value.length > 1000) {
    logs.value = logs.value.slice(0, 1000)
  }

  // 自动滚动
  if (autoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

const scrollToBottom = () => {
  if (logContainer.value) {
    const list = logContainer.value.querySelector('.log-list')
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }
}

// 处理 WebSocket 事件
const handleEvent = (event: string, payload: any) => {
  // 处理 log 事件
  if (event === 'log') {
    const level = payload?.level || 'info'
    const source = payload?.source || 'gateway'
    const message = payload?.message || JSON.stringify(payload)
    addLog(level, source, message)
    return
  }

  // 处理 agent 事件中的日志
  if (event === 'agent') {
    const stream = payload?.stream
    if (stream === 'lifecycle') {
      const state = payload?.data?.state || payload?.phase
      const agentId = payload?.agentId || 'unknown'
      if (state === 'start') {
        addLog('info', 'agent', `Agent "${agentId}" 开始执行`)
      } else if (state === 'done' || state === 'final') {
        addLog('info', 'agent', `Agent "${agentId}" 执行完成`)
      } else if (state === 'error') {
        const error = payload?.data?.error || payload?.error || '未知错误'
        addLog('error', 'agent', `Agent "${agentId}" 错误：${error}`)
      }
    }
    if (stream === 'tool') {
      const data = payload?.data || {}
      const phase = data.phase || data.type
      const toolName = data.name || 'unknown'
      if (phase === 'start' || phase === 'call') {
        addLog('info', 'tool', `调用工具：${toolName}`)
      } else if (phase === 'error') {
        const error = data.error || data.errorMessage || '未知错误'
        addLog('error', 'tool', `工具 "${toolName}" 错误：${error}`)
      }
    }
    return
  }

  // 处理 error 事件
  if (event === 'error') {
    const error = payload?.message || payload?.error || JSON.stringify(payload)
    addLog('error', 'system', error)
    return
  }

  // 处理 presence 事件
  if (event === 'presence') {
    const agents = payload?.agents
    if (Array.isArray(agents)) {
      addLog('info', 'gateway', `${agents.length} 个代理在线`)
    }
    return
  }

  // 处理 device.pair 事件
  if (event === 'device.pair.requested') {
    addLog('info', 'gateway', `设备配对请求：${payload?.device?.name || '未知设备'}`)
    return
  }
  if (event === 'device.pair.resolved') {
    const status = payload?.status
    if (status === 'accepted') {
      addLog('info', 'gateway', `设备配对成功：${payload?.device?.name || '未知设备'}`)
    } else {
      addLog('warn', 'gateway', `设备配对失败：${status}`)
    }
    return
  }

  // 处理 exec.approval 事件
  if (event === 'exec.approval.requested') {
    addLog('warn', 'gateway', `执行审批请求：${payload?.description || '需要批准'}`)
    return
  }
  if (event === 'exec.approval.resolved') {
    const status = payload?.status
    if (status === 'approved') {
      addLog('info', 'gateway', '审批已通过')
    } else {
      addLog('warn', 'gateway', '审批已被拒绝')
    }
    return
  }

  // 处理 cron 事件
  if (event === 'cron') {
    const task = payload?.task || payload?.name
    const status = payload?.status
    addLog('info', 'system', `定时任务 ${task}: ${status || '执行中'}`)
    return
  }

  // 处理 update.available 事件
  if (event === 'update.available') {
    addLog('info', 'system', `新版本可用：${payload?.version || 'unknown'}`)
    return
  }

  // 处理 compaction 事件
  if (event === 'compaction') {
    const phase = payload?.phase
    if (phase === 'start') {
      addLog('info', 'system', '正在压缩对话上下文...')
    } else if (phase === 'end' || phase === 'complete') {
      const tokensSaved = payload?.compactCount || payload?.tokensSaved || '未知'
      addLog('info', 'system', `上下文压缩完成，已优化 ${tokensSaved} tokens`)
    }
    return
  }

  // 处理 fallback 事件
  if (event === 'fallback') {
    const data = payload?.data || {}
    addLog('warn', 'system', `模型降级：${data.reason || '未知原因'}`)
    return
  }
}

const refreshLogs = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const clearLogs = async () => {
  const confirmed = await notification.confirm('确定要清空所有日志吗？', '清空日志')
  if (!confirmed) return
  logs.value = []
}

// 监听连接状态，连接时添加初始日志
watch(isConnected, (connected) => {
  if (connected) {
    addLog('info', 'gateway', '已连接到 Gateway')
  } else {
    addLog('warn', 'gateway', '与 Gateway 断开连接')
  }
})

const handleMultiAgentEvent = (_agentId: string, event: string, payload: any) => {
  handleEvent(event, payload)
}

// 组件挂载时注册事件监听器
onMounted(() => {
  multiAgentStore.addEventListener(handleMultiAgentEvent)
  console.log('[Logs] Component mounted, event listener registered')

  // 如果已连接，添加初始日志
  if (isConnected.value) {
    addLog('info', 'gateway', '已连接到 Gateway')
  }
})

// 组件卸载时移除事件监听器
onUnmounted(() => {
  multiAgentStore.removeEventListener(handleMultiAgentEvent)
  console.log('[Logs] Component unmounted, event listener removed')
})
</script>

<style scoped>
.logs {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  outline: none;
  width: 300px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.filter-select {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.log-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.log-count {
  margin-left: auto;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.log-container {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #E60012;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.disconnected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: rgba(255, 255, 255, 0.5);
}

.disconnected-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.disconnected-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
}

.log-entry {
  display: grid;
  grid-template-columns: 140px 80px 100px 1fr;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  line-height: 1.5;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.05);
}

.log-time {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.log-level {
  font-weight: 600;
}

.log-entry.info .log-level {
  color: #00d9ff;
}

.log-entry.warn .log-level {
  color: #ffaa00;
}

.log-entry.error .log-level {
  color: #ff3366;
}

.log-entry.debug .log-level {
  color: rgba(255, 255, 255, 0.5);
}

.log-source {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.log-message {
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
}

.empty-logs {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}

.btn-primary,
.btn-secondary,
.btn-toggle {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #E60012, #ff3366);
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-toggle {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
}

.btn-toggle.active {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.btn-primary:hover,
.btn-secondary:hover,
.btn-toggle:hover {
  transform: translateY(-2px);
}

/* 滚动条样式 */
.log-list::-webkit-scrollbar {
  width: 8px;
}

.log-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.log-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.log-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ========== 亮色主题样式 ========== */
:root.light-theme .page-header h1 {
  color: #1e293b;
}

:root.light-theme .search-input {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .search-input::placeholder {
  color: #9ca3af;
}

:root.light-theme .search-input:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

:root.light-theme .filter-select {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .log-count {
  color: #94a3b8;
}

:root.light-theme .log-container {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .log-list {
  background: #fafbfc;
}

:root.light-theme .log-entry {
  border-bottom-color: #f3f4f6;
}

:root.light-theme .log-entry:hover {
  background: #f9fafb;
}

:root.light-theme .log-time {
  color: #9ca3af;
}

:root.light-theme .log-entry.info .log-level {
  color: #2563eb;
}

:root.light-theme .log-entry.warn .log-level {
  color: #f59e0b;
}

:root.light-theme .log-entry.error .log-level {
  color: #ef4444;
}

:root.light-theme .log-entry.debug .log-level {
  color: #64748b;
}

:root.light-theme .log-source {
  color: #6b7280;
}

:root.light-theme .log-message {
  color: #1e293b;
}

:root.light-theme .empty-logs {
  color: #9ca3af;
}

:root.light-theme .btn-secondary {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #475569;
}

:root.light-theme .btn-toggle {
  background: #f9fafb;
  color: #6b7280;
  border-color: #e5e7eb;
}

:root.light-theme .btn-toggle.active {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border-color: #10b981;
}

:root.light-theme .log-list::-webkit-scrollbar-track {
  background: #f3f4f6;
}

:root.light-theme .log-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
}

:root.light-theme .log-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
