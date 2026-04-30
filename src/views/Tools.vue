<template>
  <div class="tools-view">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="filteredTools.length === 0" class="empty-state">
      <i class="ri-search-line"></i>
      <span>未找到匹配的工具</span>
    </div>

    <div v-else class="tool-grid" :class="{ 'tool-grid--list': viewMode === 'list' }">
      <div
        v-for="tool in filteredTools"
        :key="tool.id"
        class="tool-card"
        :class="{ 'tool-card--disabled': !tool.enabled }"
      >
        <div class="tool-card__header">
          <div class="tool-icon" :class="getIconClass(tool.category)">
            <i :class="getCategoryIcon(tool.category)"></i>
          </div>
          <span class="status-tag" :class="tool.enabled ? 'status-tag--active' : 'status-tag--inactive'">
            {{ tool.enabled ? '运行中' : '已停用' }}
          </span>
        </div>
        <h3 class="tool-card__title">{{ tool.name }}</h3>
        <p class="tool-card__desc">{{ tool.description }}</p>
        <div class="tool-card__footer">
          <div class="tool-card__meta">
            <span class="meta-item">
              <i class="ri-price-tag-3-line"></i>
              {{ tool.category }}
            </span>
            <span class="meta-item">
              <i class="ri-code-line"></i>
              v{{ tool.version }}
            </span>
          </div>
          <div class="tool-card__actions">
            <button
              class="action-btn"
              :class="tool.enabled ? 'action-btn--stop' : 'action-btn--start'"
              :title="tool.enabled ? '停用' : '启用'"
              @click="toggleTool(tool)"
            >
              <i :class="tool.enabled ? 'ri-stop-circle-line' : 'ri-play-circle-line'"></i>
            </button>
            <button class="action-btn action-btn--config" title="配置" @click="configTool(tool)">
              <i class="ri-settings-4-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Tool {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  category: string
  version: string
}

const props = defineProps<{
  searchQuery?: string
  categoryFilter?: string
  statusFilter?: string
  sortBy?: string
  viewMode?: 'grid' | 'list'
}>()

const loading = ref(false)

const tools = ref<Tool[]>([
  { id: 'web_search', name: 'Web Search', description: '网络搜索功能，支持多种搜索引擎，可检索网页、文档和技术资料。', icon: '🔍', enabled: true, category: '搜索', version: '1.0.0' },
  { id: 'web_fetch', name: 'Web Fetch', description: '网页内容抓取与解析，支持 HTML 转 Markdown 和结构化数据提取。', icon: '🌐', enabled: true, category: '数据处理', version: '1.2.0' },
  { id: 'exec', name: 'Shell Exec', description: '安全沙箱内的 Shell 命令执行，支持脚本运行和系统管理操作。', icon: '⚡', enabled: true, category: '开发构建', version: '2.0.1' },
  { id: 'read', name: 'File Read', description: '文件系统读取能力，支持文本、图片、PDF 等多种格式的内容读取。', icon: '📖', enabled: true, category: '数据处理', version: '1.1.0' },
  { id: 'write', name: 'File Write', description: '文件写入与编辑，支持创建、修改和删除文件操作。', icon: '✏️', enabled: true, category: '开发构建', version: '1.1.0' },
  { id: 'message', name: 'Message Push', description: '消息推送服务，支持邮件、Webhook 和即时通讯渠道的消息通知。', icon: '💬', enabled: true, category: '通信协作', version: '1.0.0' },
  { id: 'memory_search', name: 'Memory Search', description: '智能记忆检索，基于向量数据库的语义搜索和知识召回能力。', icon: '🧠', enabled: true, category: '数据处理', version: '1.3.0' },
  { id: 'cron', name: 'Cron Scheduler', description: '定时任务调度器，支持 Cron 表达式的自动化任务编排与执行。', icon: '⏰', enabled: false, category: '开发构建', version: '1.0.0' },
  { id: 'image', name: 'Image Gen', description: 'AI 图像生成能力，支持文本到图像的生成和图像编辑操作。', icon: '🎨', enabled: true, category: '数据处理', version: '2.1.0' },
])

const filteredTools = computed(() => {
  let result = [...tools.value]

  if (props.searchQuery) {
    const q = props.searchQuery.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }

  if (props.categoryFilter && props.categoryFilter !== 'all') {
    const categoryMap: Record<string, string> = {
      data: '数据处理',
      dev: '开发构建',
      monitor: '监控分析',
      security: '安全认证',
      communication: '通信协作',
    }
    const target = categoryMap[props.categoryFilter]
    if (target) {
      result = result.filter(t => t.category === target)
    }
  }

  if (props.statusFilter && props.statusFilter !== 'all') {
    if (props.statusFilter === 'active') {
      result = result.filter(t => t.enabled)
    } else if (props.statusFilter === 'inactive') {
      result = result.filter(t => !t.enabled)
    }
  }

  if (props.sortBy === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name))
  }

  return result
})

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    '搜索': 'ri-search-line',
    '数据处理': 'ri-database-2-line',
    '开发构建': 'ri-code-box-line',
    '监控分析': 'ri-line-chart-line',
    '安全认证': 'ri-shield-keyhole-line',
    '通信协作': 'ri-message-3-line',
  }
  return icons[category] || 'ri-tools-line'
}

function getIconClass(category: string): string {
  const classes: Record<string, string> = {
    '搜索': 'icon-blue',
    '数据处理': 'icon-green',
    '开发构建': 'icon-purple',
    '监控分析': 'icon-orange',
    '安全认证': 'icon-pink',
    '通信协作': 'icon-yellow',
  }
  return classes[category] || 'icon-blue'
}

function toggleTool(tool: Tool) {
  tool.enabled = !tool.enabled
}

function configTool(tool: Tool) {
  console.log('Config:', tool.id)
}

</script>

<style scoped>
.tools-view {
  min-height: 0;
}

/* 工具网格 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.tool-grid--list {
  grid-template-columns: 1fr;
}

/* 工具卡片 */
.tool-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  border-color: var(--border-strong);
}

.tool-card--disabled {
  opacity: 0.6;
}

.tool-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

/* 图标 */
.tool-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.icon-blue { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
.icon-green { background: rgba(52, 211, 153, 0.1); color: #34d399; }
.icon-purple { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }
.icon-orange { background: rgba(251, 146, 60, 0.1); color: #fb923c; }
.icon-pink { background: rgba(244, 114, 182, 0.1); color: #f472b6; }
.icon-yellow { background: rgba(250, 204, 21, 0.1); color: #facc15; }

/* 状态标签 */
.status-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}

.status-tag--active {
  background: rgba(35, 134, 54, 0.1);
  color: #3fb950;
  border-color: rgba(63, 185, 80, 0.3);
}

.status-tag--inactive {
  background: rgba(218, 54, 51, 0.1);
  color: #ff7b72;
  border-color: rgba(255, 123, 114, 0.3);
}

.tool-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.tool-card__desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 16px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--border-default);
}

.tool-card__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item i {
  font-size: 13px;
}

.tool-card__actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
}

.action-btn:hover {
  background: var(--bg-panel-hover);
  border-color: var(--border-strong);
}

.action-btn--config:hover {
  color: var(--color-primary);
}

.action-btn--stop:hover {
  color: var(--color-error);
}

.action-btn--start:hover {
  color: var(--color-success);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
}

.loading-spinner {
  position: relative;
  width: 48px;
  height: 48px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  border-top-color: var(--color-secondary);
  animation-duration: 0.8s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: var(--color-cyan);
  animation-duration: 0.6s;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 13px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 12px;
  color: var(--text-tertiary);
}

.empty-state i {
  font-size: 40px;
  opacity: 0.4;
}

@media (max-width: 768px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
