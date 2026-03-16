<template>
  <div class="tools-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">⚙</span>
          工具管理
        </h1>
        <span class="page-subtitle">管理和配置系统工具</span>
      </div>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索工具..."
        />
        <button class="btn btn-primary btn-sm" @click="refreshTools">
          <span class="btn-icon">⟳</span>
          刷新
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else class="tools-grid">
      <div
        v-for="tool in filteredTools"
        :key="tool.id"
        class="tool-card"
        :class="{ disabled: !tool.enabled }"
      >
        <div class="tool-header">
          <span class="tool-icon">{{ tool.icon }}</span>
          <div class="tool-status" :class="{ active: tool.enabled }">
            <span class="status-dot"></span>
            <span class="status-text">{{ tool.enabled ? '已启用' : '已禁用' }}</span>
          </div>
        </div>
        <div class="tool-content">
          <h3 class="tool-name">{{ tool.name }}</h3>
          <p class="tool-description">{{ tool.description }}</p>
          <div class="tool-meta">
            <span class="tool-category">{{ tool.category }}</span>
            <span class="tool-version">v{{ tool.version }}</span>
          </div>
        </div>
        <div class="tool-actions">
          <button
            class="btn btn-toggle"
            :class="{ active: tool.enabled }"
            @click="toggleTool(tool)"
          >
            <span class="btn-icon">{{ tool.enabled ? '⏻' : '⏻' }}</span>
            {{ tool.enabled ? '禁用' : '启用' }}
          </button>
          <button class="btn btn-config" @click="configTool(tool)">
            <span class="btn-icon">◈</span>
            配置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const loading = ref(false)
const searchQuery = ref('')

const tools = ref([
  {
    id: 'web_search',
    name: 'Web Search',
    description: '网络搜索功能，支持多种搜索引擎',
    icon: '🔍',
    enabled: true,
    category: '搜索',
    version: '1.0.0'
  },
  {
    id: 'web_fetch',
    name: 'Web Fetch',
    description: '抓取网页内容并提取文本',
    icon: '🌐',
    enabled: true,
    category: '网络',
    version: '1.0.0'
  },
  {
    id: 'exec',
    name: 'Exec',
    description: '执行系统命令',
    icon: '⚡',
    enabled: true,
    category: '系统',
    version: '1.0.0'
  },
  {
    id: 'read',
    name: 'Read',
    description: '读取文件内容',
    icon: '📖',
    enabled: true,
    category: '文件',
    version: '1.0.0'
  },
  {
    id: 'write',
    name: 'Write',
    description: '写入文件内容',
    icon: '✍️',
    enabled: true,
    category: '文件',
    version: '1.0.0'
  },
  {
    id: 'message',
    name: 'Message',
    description: '发送消息到各平台',
    icon: '💬',
    enabled: true,
    category: '通信',
    version: '1.0.0'
  },
  {
    id: 'memory_search',
    name: 'Memory Search',
    description: '搜索记忆内容',
    icon: '🧠',
    enabled: true,
    category: '记忆',
    version: '1.0.0'
  },
  {
    id: 'cron',
    name: 'Cron',
    description: '定时任务调度',
    icon: '⏰',
    enabled: false,
    category: '任务',
    version: '1.0.0'
  },
  {
    id: 'image',
    name: 'Image',
    description: '图像处理和生成',
    icon: '🖼️',
    enabled: false,
    category: '媒体',
    version: '1.0.0'
  }
])

const filteredTools = computed(() => {
  return tools.value.filter(tool => {
    return !searchQuery.value ||
      tool.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.value.toLowerCase())
  })
})

const refreshTools = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const toggleTool = (tool) => {
  tool.enabled = !tool.enabled
  // TODO: 调用 Gateway API 更新工具状态
}

const configTool = (tool) => {
  console.log('Config tool:', tool.id)
  // TODO: 打开工具配置面板
}
</script>

<style scoped>
.tools-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--grid-line);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
}

.title-icon {
  color: var(--color-primary);
  font-size: var(--text-3xl);
  text-shadow: var(--glow-primary);
}

.page-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

.header-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.search-input {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  outline: none;
  width: 280px;
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--color-primary-dim);
  box-shadow: var(--glow-primary);
}

/* ========== 加载状态 ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: var(--space-6);
}

.loading-spinner {
  position: relative;
  width: 64px;
  height: 64px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: var(--color-secondary);
  animation-delay: -0.5s;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: var(--color-accent);
  animation-delay: -1s;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 0.15em;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== 工具卡片网格 ========== */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.tool-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: all var(--transition-base);
  overflow: hidden;
  position: relative;
}

.tool-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-primary-dim),
    transparent
  );
  opacity: 0.5;
  transition: opacity var(--transition-base);
}

.tool-card:hover {
  border-color: var(--color-primary-dim);
  box-shadow: var(--shadow-md);
}

.tool-card:hover::before {
  opacity: 1;
}

.tool-card.disabled {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.tool-card.disabled::before {
  background: linear-gradient(
    90deg,
    transparent,
    var(--text-muted),
    transparent
  );
}

/* ========== 卡片头部 ========== */
.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.tool-icon {
  font-size: 32px;
}

.tool-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--bg-base);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.tool-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-none);
  background: var(--text-muted);
  transition: all var(--transition-fast);
}

.tool-status.active {
  border-color: var(--terminal-green);
}

.tool-status.active .status-dot {
  background: var(--terminal-green);
  box-shadow: 0 0 8px var(--terminal-green);
}

.tool-status:not(.active) {
  border-color: var(--border-subtle);
}

.tool-status .status-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: 0.05em;
}

.tool-status.active .status-text {
  color: var(--terminal-green);
}

.tool-status:not(.active) .status-text {
  color: var(--text-muted);
}

/* ========== 卡片内容 ========== */
.tool-content {
  margin-bottom: var(--space-4);
}

.tool-name {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 var(--space-2) 0;
}

.tool-description {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-3);
}

.tool-meta {
  display: flex;
  gap: var(--space-3);
  font-size: var(--text-xs);
}

.tool-category {
  padding: var(--space-1) var(--space-2);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary-dim);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-weight: var(--font-bold);
  letter-spacing: 0.05em;
}

.tool-version {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* ========== 卡片操作 ========== */
.tool-actions {
  display: flex;
  gap: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-4);
}

/* ========== 通用按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  white-space: nowrap;
  flex: 1;
}

.btn-icon {
  font-size: 1.2em;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
}

.btn-primary {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-dim);
  color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--text-inverse);
  box-shadow: var(--glow-primary);
}

.btn-toggle {
  background: var(--bg-base);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.btn-toggle:hover {
  border-color: var(--color-secondary-dim);
  color: var(--color-secondary);
}

.btn-toggle.active {
  background: var(--color-success);
  border-color: var(--color-success);
  color: var(--text-inverse);
  box-shadow: 0 0 15px rgba(46, 204, 113, 0.4);
}

.btn-config {
  background: var(--color-primary-bg);
  border-color: var(--color-primary-dim);
  color: var(--color-primary);
}

.btn-config:hover {
  background: var(--color-primary);
  color: var(--text-inverse);
  box-shadow: var(--glow-primary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: var(--space-4);
  }

  .header-actions {
    width: 100%;
  }

  .search-input {
    flex: 1;
  }
}

/* ========== 亮色主题样式 ========== */
:root.light-theme .page-header {
  border-bottom-color: #e5e7eb;
}

:root.light-theme .page-title {
  color: #1e293b;
}

:root.light-theme .title-main {
  color: #1e293b;
  font-weight: 800;
}

:root.light-theme .title-icon {
  color: #2563eb;
}

:root.light-theme .page-subtitle {
  color: #64748b;
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
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

:root.light-theme .loading-text {
  color: #9ca3af;
}

:root.light-theme .spinner-ring {
  border-color: rgba(37, 99, 235, 0.2);
}

:root.light-theme .spinner-ring:nth-child(1) {
  border-top-color: #2563eb;
}

:root.light-theme .spinner-ring:nth-child(2) {
  border-top-color: #6366f1;
}

:root.light-theme .spinner-ring:nth-child(3) {
  border-top-color: #10b981;
}

:root.light-theme .tool-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .tool-card::before {
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.5), transparent);
}

:root.light-theme .tool-card:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
}

:root.light-theme .tool-card:hover::before {
  opacity: 1;
}

:root.light-theme .tool-card.disabled {
  opacity: 0.7;
}

:root.light-theme .tool-card.disabled::before {
  background: linear-gradient(90deg, transparent, #9ca3af, transparent);
}

:root.light-theme .tool-status {
  background: #f9fafb;
  border-color: #e5e7eb;
}

:root.light-theme .tool-status .status-dot {
  background: #9ca3af;
}

:root.light-theme .tool-status.active {
  border-color: #10b981;
}

:root.light-theme .tool-status.active .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

:root.light-theme .tool-status .status-text {
  color: #475569;
}

:root.light-theme .tool-status.active .status-text {
  color: #059669;
}

:root.light-theme .tool-name {
  color: #1e293b;
}

:root.light-theme .tool-description {
  color: #475569;
}

:root.light-theme .tool-category {
  background: rgba(37, 99, 235, 0.1);
  border-color: #bfdbfe;
  color: #2563eb;
}

:root.light-theme .tool-version {
  color: #9ca3af;
}

:root.light-theme .tool-actions {
  border-top-color: #e5e7eb;
}

:root.light-theme .btn {
  border-color: transparent;
}

:root.light-theme .btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  color: #ffffff;
}

:root.light-theme .btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

:root.light-theme .btn-toggle {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #475569;
}

:root.light-theme .btn-toggle:hover {
  border-color: #2563eb;
  color: #2563eb;
}

:root.light-theme .btn-toggle.active {
  background: #10b981;
  border-color: #10b981;
  color: #ffffff;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
}

:root.light-theme .btn-config {
  background: rgba(37, 99, 235, 0.1);
  border-color: #bfdbfe;
  color: #2563eb;
}

:root.light-theme .btn-config:hover {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
</style>
