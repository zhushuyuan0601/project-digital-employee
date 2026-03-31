<template>
  <div class="webhooks-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">⚡</span>
          <span class="title-main">Webhook 管理</span>
          <span class="title-sub">WEBHOOKS // 配置 HMAC 签名事件通知</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="refreshWebhooks">
          <span>⟳</span> 刷新
        </button>
        <button class="btn btn-primary btn-sm" @click="showCreateModal = true">
          <span>+</span> 新建 Webhook
        </button>
      </div>
    </div>

    <!-- 概览统计 -->
    <div class="overview-stats">
      <div class="stat-card">
        <div class="stat-icon" style="--icon-color: var(--color-primary)">⚡</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.totalWebhooks || 0 }}</div>
          <div class="stat-label">总 Webhook 数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="--icon-color: #10b981">✓</div>
        <div class="stat-info">
          <div class="stat-value">{{ activeWebhooks }}</div>
          <div class="stat-label">已启用</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="--icon-color: #f59e0b">⏸</div>
        <div class="stat-info">
          <div class="stat-value">{{ disabledWebhooks }}</div>
          <div class="stat-label">已暂停</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="--icon-color: #ec4899">⟳</div>
        <div class="stat-info">
          <div class="stat-value">{{ todayDeliveries }}</div>
          <div class="stat-label">今日投递</div>
        </div>
      </div>
    </div>

    <!-- Webhook 列表 -->
    <div class="webhooks-list">
      <div class="list-header">
        <h3 class="list-title">Webhook 列表</h3>
        <div class="list-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜索 Webhook..."
            />
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <p class="loading-text">正在加载 Webhook 配置...</p>
      </div>

      <!-- Webhook 卡片列表 -->
      <div v-else class="webhook-cards">
        <div
          v-for="webhook in filteredWebhooks"
          :key="webhook.id"
          class="webhook-card"
          :class="{ 'is-active': webhook.enabled }"
        >
          <!-- 卡片头部 -->
          <div class="webhook-card__header">
            <div class="webhook-card__info">
              <h4 class="webhook-card__name">{{ webhook.name }}</h4>
              <div class="webhook-card__url">
                <span class="url-icon">🔗</span>
                <code class="url-text">{{ webhook.url }}</code>
                <button class="btn-icon" @click="copyUrl(webhook.url)" title="复制 URL">
                  <span>⧉</span>
                </button>
              </div>
            </div>
            <div class="webhook-card__actions">
              <span class="status-badge" :class="webhook.enabled ? 'enabled' : 'disabled'">
                <span class="status-dot"></span>
                {{ webhook.enabled ? '已启用' : '已暂停' }}
              </span>
              <button class="btn-icon" @click="toggleWebhook(webhook)" title="切换状态">
                <span>{{ webhook.enabled ? '⏸' : '▶' }}</span>
              </button>
              <button class="btn-icon" @click="editWebhook(webhook)" title="编辑">
                <span>✎</span>
              </button>
              <button class="btn-icon btn-danger" @click="deleteWebhook(webhook)" title="删除">
                <span>🗑</span>
              </button>
            </div>
          </div>

          <!-- 卡片主体 -->
          <div class="webhook-card__body">
            <!-- 事件类型 -->
            <div class="event-tags">
              <span class="event-label">订阅事件:</span>
              <span
                v-for="event in webhook.events"
                :key="event"
                class="event-tag"
              >
                {{ event }}
              </span>
            </div>

            <!-- 安全配置 -->
            <div class="security-config">
              <div class="config-row">
                <span class="config-label">HMAC 签名:</span>
                <span class="config-value" :class="{ 'has-secret': webhook.secret }">
                  {{ webhook.secret ? '已配置' : '未配置' }}
                </span>
              </div>
              <div class="config-row">
                <span class="config-label">签名算法:</span>
                <span class="config-value mono">{{ webhook.algorithm || 'HMAC-SHA256' }}</span>
              </div>
              <div class="config-row">
                <span class="config-label">重试策略:</span>
                <span class="config-value mono">{{ webhook.retryPolicy || '3 次，指数退避' }}</span>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="stats-row">
              <div class="mini-stat">
                <span class="mini-stat__label">成功:</span>
                <span class="mini-stat__value success">{{ webhook.successCount || 0 }}</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat__label">失败:</span>
                <span class="mini-stat__value danger">{{ webhook.failureCount || 0 }}</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat__label">平均响应:</span>
                <span class="mini-stat__value mono">{{ webhook.avgResponseTime || '--' }}ms</span>
              </div>
              <div class="mini-stat">
                <span class="mini-stat__label">最后投递:</span>
                <span class="mini-stat__value">{{ formatTime(webhook.lastDelivery) }}</span>
              </div>
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="webhook-card__footer">
            <button class="btn btn-secondary btn-sm" @click="testWebhook(webhook)">
              <span>⚡</span> 发送测试
            </button>
            <button class="btn btn-secondary btn-sm" @click="viewLogs(webhook)">
              <span>📋</span> 查看日志
            </button>
            <div class="webhook-id">
              <span class="id-label">ID:</span>
              <code class="id-value">{{ webhook.id }}</code>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredWebhooks.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p class="empty-text">没有找到匹配的 Webhook 配置</p>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <span>+</span> 创建第一个 Webhook
          </button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h2>{{ showEditModal ? '编辑 Webhook' : '创建 Webhook' }}</h2>
          <button class="btn-icon" @click="closeModal">
            <span>✕</span>
          </button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="saveWebhook" class="webhook-form">
            <!-- 基本信息 -->
            <div class="form-section">
              <h4 class="section-title">基本信息</h4>
              <div class="form-group">
                <label class="form-label">名称 <span class="required">*</span></label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="form-input"
                  placeholder="例如：生产环境告警"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">URL <span class="required">*</span></label>
                <input
                  v-model="formData.url"
                  type="url"
                  class="form-input"
                  placeholder="https://your-domain.com/webhook/endpoint"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">描述</label>
                <textarea
                  v-model="formData.description"
                  class="form-input form-textarea"
                  placeholder="描述此 Webhook 的用途..."
                  rows="2"
                ></textarea>
              </div>
            </div>

            <!-- 事件订阅 -->
            <div class="form-section">
              <h4 class="section-title">事件订阅</h4>
              <div class="checkbox-grid">
                <label
                  v-for="event in availableEvents"
                  :key="event.value"
                  class="checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="event.value"
                    v-model="formData.events"
                  />
                  <span class="checkbox-text">
                    <span class="event-icon">{{ event.icon }}</span>
                    {{ event.label }}
                  </span>
                </label>
              </div>
            </div>

            <!-- 安全配置 -->
            <div class="form-section">
              <h4 class="section-title">安全配置</h4>
              <div class="form-group">
                <label class="form-label">HMAC 密钥</label>
                <div class="input-with-action">
                  <input
                    v-model="formData.secret"
                    type="password"
                    class="form-input"
                    placeholder="留空则不启用签名验证"
                  />
                  <button
                    type="button"
                    class="btn btn-secondary"
                    @click="generateSecret"
                  >
                    <span>⟳</span> 生成随机密钥
                  </button>
                </div>
                <p class="form-help">用于对请求进行 HMAC-SHA256 签名，确保请求来源可信</p>
              </div>
              <div class="form-group">
                <label class="form-label">签名算法</label>
                <select v-model="formData.algorithm" class="form-input">
                  <option value="HMAC-SHA256">HMAC-SHA256 (推荐)</option>
                  <option value="HMAC-SHA1">HMAC-SHA1</option>
                  <option value="HMAC-SHA512">HMAC-SHA512</option>
                </select>
              </div>
            </div>

            <!-- 重试策略 -->
            <div class="form-section">
              <h4 class="section-title">重试策略</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">最大重试次数</label>
                  <input
                    v-model.number="formData.maxRetries"
                    type="number"
                    class="form-input"
                    min="0"
                    max="10"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">超时时间 (秒)</label>
                  <input
                    v-model.number="formData.timeout"
                    type="number"
                    class="form-input"
                    min="5"
                    max="60"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">重试策略</label>
                <select v-model="formData.retryPolicy" class="form-input">
                  <option value="fixed">固定间隔 (每 30 秒)</option>
                  <option value="exponential">指数退避 (推荐)</option>
                  <option value="linear">线性递增 (每次 +30 秒)</option>
                </select>
              </div>
            </div>

            <!-- 启用状态 -->
            <div class="form-section">
              <label class="toggle-label">
                <input type="checkbox" v-model="formData.enabled" />
                <span class="toggle-switch"></span>
                <span class="toggle-text">创建后立即启用</span>
              </label>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveWebhook" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 测试弹窗 -->
    <div v-if="showTestModal" class="modal-overlay" @click.self="showTestModal = false">
      <div class="modal-container modal-sm">
        <div class="modal-header">
          <h2>发送测试通知</h2>
          <button class="btn-icon" @click="showTestModal = false">
            <span>✕</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="test-description">
            这将向 <code class="mono">{{ testingWebhook?.url }}</code> 发送一个测试事件。
          </p>
          <div class="test-options">
            <label class="radio-label">
              <input type="radio" v-model="testEventType" value="task.created" />
              <span>任务创建</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="testEventType" value="task.completed" />
              <span>任务完成</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="testEventType" value="agent.error" />
              <span>Agent 错误</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showTestModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmTestWebhook" :disabled="testing">
            {{ testing ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 日志弹窗 -->
    <div v-if="showLogsModal" class="modal-overlay modal-lg" @click.self="showLogsModal = false">
      <div class="modal-container">
        <div class="modal-header">
          <h2>投递日志 - {{ loggingWebhook?.name }}</h2>
          <button class="btn-icon" @click="showLogsModal = false">
            <span>✕</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="logs-timeline">
            <div
              v-for="log in deliveryLogs"
              :key="log.id"
              class="log-item"
              :class="`status-${log.status}`"
            >
              <div class="log-time">
                {{ formatDateTime(log.timestamp) }}
              </div>
              <div class="log-content">
                <div class="log-header">
                  <span class="log-event">{{ log.event }}</span>
                  <span class="log-status" :class="log.status">
                    {{ log.status === 'success' ? '✓ 成功' : '✕ 失败' }}
                  </span>
                </div>
                <div class="log-details">
                  <div class="log-row">
                    <span class="log-label">HTTP:</span>
                    <span class="log-value">{{ log.httpMethod }} {{ log.httpStatus }}</span>
                  </div>
                  <div class="log-row">
                    <span class="log-label">耗时:</span>
                    <span class="log-value mono">{{ log.duration }}ms</span>
                  </div>
                  <div class="log-row" v-if="log.error">
                    <span class="log-label">错误:</span>
                    <span class="log-value error">{{ log.error }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWebhooksStore } from '@/stores/webhooks'
import type { Webhook, WebhookDelivery } from '@/api'

const webhooksStore = useWebhooksStore()

// 状态
const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showTestModal = ref(false)
const showLogsModal = ref(false)
const testEventType = ref('task.created')
const testingWebhook = ref<Webhook | null>(null)
const loggingWebhook = ref<Webhook | null>(null)
const deliveryLogs = ref<WebhookDelivery[]>([])

// 使用 store 中的数据
const loading = computed(() => webhooksStore.loading)
const stats = computed(() => webhooksStore.stats)
const webhooks = computed(() => webhooksStore.webhooks)

// 表单数据
const formData = ref({
  name: '',
  url: '',
  description: '',
  events: [] as string[],
  secret: '',
  algorithm: 'HMAC-SHA256',
  maxRetries: 3,
  timeout: 30,
  retryPolicy: 'exponential',
  enabled: true
})

// 可用事件列表
const availableEvents = [
  { value: 'task.created', label: '任务创建', icon: '+' },
  { value: 'task.completed', label: '任务完成', icon: '✓' },
  { value: 'task.failed', label: '任务失败', icon: '✕' },
  { value: 'agent.started', label: 'Agent 启动', icon: '▶' },
  { value: 'agent.stopped', label: 'Agent 停止', icon: '⏹' },
  { value: 'agent.error', label: 'Agent 错误', icon: '⚠' },
  { value: 'log.error', label: '错误日志', icon: '🔴' },
  { value: 'security.alert', label: '安全告警', icon: '🛡' }
]

// 计算属性
const filteredWebhooks = computed(() => {
  if (!searchQuery.value) return webhooks.value
  const query = searchQuery.value.toLowerCase()
  return webhooks.value.filter(w =>
    w.name.toLowerCase().includes(query) ||
    w.url.toLowerCase().includes(query) ||
    w.description?.toLowerCase().includes(query)
  )
})

const activeWebhooks = computed(() => webhooks.value.filter(w => w.enabled).length)
const disabledWebhooks = computed(() => webhooks.value.filter(w => !w.enabled).length)
const todayDeliveries = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return webhooks.value.reduce((sum, w) => sum + (w.successCount || 0) + (w.failureCount || 0), 0)
})

// 方法
const refreshWebhooks = async () => {
  await webhooksStore.fetchWebhooks()
}

const copyUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
  } catch (e) {
    console.error('复制失败', e)
  }
}

const toggleWebhook = async (webhook: Webhook) => {
  try {
    await webhooksStore.toggleWebhook(webhook.id)
  } catch (e: any) {
    alert('操作失败：' + e.message)
  }
}

const editWebhook = (webhook: Webhook) => {
  formData.value = {
    name: webhook.name,
    url: webhook.url,
    description: webhook.description || '',
    events: [...webhook.events],
    secret: webhook.secret || '',
    algorithm: webhook.algorithm || 'HMAC-SHA256',
    maxRetries: webhook.maxRetries || 3,
    timeout: webhook.timeout || 30,
    retryPolicy: webhook.retryPolicy || 'exponential',
    enabled: webhook.enabled
  }
  showEditModal.value = true
}

const deleteWebhook = async (webhook: Webhook) => {
  if (confirm(`确定要删除 Webhook "${webhook.name}" 吗？`)) {
    try {
      await webhooksStore.deleteWebhook(webhook.id)
    } catch (e: any) {
      alert('删除失败：' + e.message)
    }
  }
}

const testWebhook = (webhook: Webhook) => {
  testingWebhook.value = webhook
  showTestModal.value = true
}

const confirmTestWebhook = async () => {
  if (!testingWebhook.value) return
  try {
    await webhooksStore.testWebhook(testingWebhook.value.id, testEventType.value)
    alert('测试通知已发送！')
    showTestModal.value = false
  } catch (e: any) {
    alert('发送失败：' + e.message)
  }
}

const viewLogs = async (webhook: Webhook) => {
  loggingWebhook.value = webhook
  try {
    deliveryLogs.value = await webhooksStore.fetchDeliveries(webhook.id, 50)
    showLogsModal.value = true
  } catch (e: any) {
    alert('获取日志失败：' + e.message)
  }
}

const generateSecret = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let secret = 'whsec_'
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  formData.value.secret = secret
}

const saveWebhook = async () => {
  try {
    if (showEditModal.value && editingWebhookId.value) {
      await webhooksStore.updateWebhook(editingWebhookId.value, formData.value)
    } else {
      await webhooksStore.createWebhook(formData.value)
    }
    closeModal()
    await refreshWebhooks()
  } catch (e: any) {
    alert('保存失败：' + e.message)
  }
}

const editingWebhookId = ref<string | null>(null)

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingWebhookId.value = null
  formData.value = {
    name: '',
    url: '',
    description: '',
    events: [],
    secret: '',
    algorithm: 'HMAC-SHA256',
    maxRetries: 3,
    timeout: 30,
    retryPolicy: 'exponential',
    enabled: true
  }
}

const formatTime = (date: Date | string | null) => {
  if (!date) return '从未'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  return `${days} 天前`
}

const formatDateTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

onMounted(() => {
  refreshWebhooks()
})
</script>

<style scoped>
.webhooks-page {
  min-height: 100%;
  padding: 2rem;
  background: var(--bg-base);
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.title-icon {
  font-size: 1.75rem;
  color: var(--color-primary);
  filter: drop-shadow(0 0 10px var(--color-primary));
}

.title-main {
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-sub {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  margin-left: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* ========== 按钮 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-panel);
  color: var(--color-text);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: #000;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
}

.btn-secondary {
  border-color: var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  background: var(--bg-panel-hover);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  border-color: var(--color-primary);
  background: var(--bg-panel-hover);
}

.btn-icon.btn-danger:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 概览统计 ========== */
.overview-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--icon-color);
  font-size: 1.5rem;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-top: 0.25rem;
}

/* ========== Webhook 列表 ========== */
.webhooks-list {
  background: var(--bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--bg-panel-header);
}

.list-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.list-actions {
  display: flex;
  gap: 0.75rem;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  color: var(--color-text-dim);
}

.search-input {
  width: 280px;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.875rem;
}

.search-input::placeholder {
  color: var(--color-text-dim);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* ========== Webhook 卡片 ========== */
.webhook-cards {
  padding: 1rem;
}

.webhook-card {
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.2s;
  opacity: 0.7;
}

.webhook-card:last-child {
  margin-bottom: 0;
}

.webhook-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.15);
  transform: translateY(-2px);
}

.webhook-card.is-active {
  opacity: 1;
  border-left: 3px solid var(--color-primary);
}

.webhook-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.webhook-card__name {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.webhook-card__url {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-text-dim);
}

.url-icon {
  font-size: 0.75rem;
}

.url-text {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhook-card__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--font-mono);
}

.status-badge.enabled {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-badge.disabled {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.webhook-card__body {
  padding: 1rem 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

/* ========== 事件标签 ========== */
.event-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.event-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-right: 0.25rem;
}

.event-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background: var(--bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--color-text);
  font-family: var(--font-mono);
}

/* ========== 安全配置 ========== */
.security-config {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.config-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.config-value {
  font-size: 0.8125rem;
  color: var(--color-text);
}

.config-value.has-secret {
  color: #10b981;
  font-weight: 500;
}

.config-value.mono {
  font-family: var(--font-mono);
}

/* ========== 统计信息 ========== */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.mini-stat__label {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mini-stat__value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.mini-stat__value.success {
  color: #10b981;
}

.mini-stat__value.danger {
  color: #ef4444;
}

.webhook-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
}

.webhook-id {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
}

.id-value {
  padding: 0.125rem 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  color: var(--color-text-dim);
  margin-bottom: 1.5rem;
}

/* ========== 加载状态 ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
}

.loading-spinner {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
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
  animation-direction: reverse;
  animation-duration: 0.8s;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  border-top-color: var(--color-primary);
  animation-duration: 0.6s;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--color-text-dim);
  font-size: 0.875rem;
}

/* ========== 弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 90%;
  max-width: 640px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-container.modal-sm {
  max-width: 480px;
}

.modal-container.modal-lg {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--bg-panel-header);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem;
  border-top: 1px solid var(--color-border);
  background: var(--bg-panel-footer);
}

/* ========== 表单 ========== */
.webhook-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
}

.required {
  color: #ef4444;
}

.form-input {
  padding: 0.625rem 0.75rem;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-help {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin: 0.25rem 0 0 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.input-with-action {
  display: flex;
  gap: 0.5rem;
}

.input-with-action .form-input {
  flex: 1;
}

.input-with-action .btn {
  white-space: nowrap;
}

/* ========== 复选框网格 ========== */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox-label:hover {
  border-color: var(--color-primary);
  background: var(--bg-panel-hover);
}

.checkbox-label:has(input:checked) {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
}

.event-icon {
  font-size: 0.75rem;
}

/* ========== 单选按钮 ========== */
.test-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-label:hover {
  border-color: var(--color-primary);
}

.radio-label:has(input:checked) {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

/* ========== 切换开关 ========== */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  position: relative;
  transition: all 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--color-text-dim);
  border-radius: 50%;
  transition: all 0.2s;
}

.toggle-label input:checked + .toggle-switch {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.2);
}

.toggle-label input:checked + .toggle-switch::after {
  left: 22px;
  background: var(--color-primary);
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text);
}

/* ========== 日志时间线 ========== */
.logs-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-base);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  border-left: 3px solid var(--color-border);
}

.log-item.status-success {
  border-left-color: #10b981;
}

.log-item.status-failure {
  border-left-color: #ef4444;
}

.log-time {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  white-space: nowrap;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.log-event {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.log-status {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.log-status.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.log-status.failure {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.log-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.log-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.log-label {
  font-size: 0.6875rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-value {
  font-size: 0.8125rem;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.log-value.error {
  color: #ef4444;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .overview-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .webhooks-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }

  .checkbox-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

/* ========== 亮色主题 ========== */
:root.light-theme .webhooks-page {
  background: #f8fafc;
}

:root.light-theme .page-title {
  background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:root.light-theme .title-sub {
  color: #64748b;
}

:root.light-theme .title-icon {
  filter: none;
}

:root.light-theme .btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-color: #2563eb;
}

:root.light-theme .btn-primary:hover {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

:root.light-theme .btn-secondary:hover {
  border-color: #2563eb;
  background: #f1f5f9;
}

:root.light-theme .btn-icon:hover {
  border-color: #2563eb;
  background: #f1f5f9;
}

:root.light-theme .stat-card {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

:root.light-theme .stat-card::before {
  background: linear-gradient(90deg, #2563eb, #7c3aed);
}

:root.light-theme .stat-value {
  color: #1e293b;
}

:root.light-theme .stat-label {
  color: #64748b;
}

:root.light-theme .webhooks-list {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .list-header {
  background: #f8fafc;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .list-title {
  color: #1e293b;
}

:root.light-theme .search-input {
  background: #f8fafc;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .search-input::placeholder {
  color: #94a3b8;
}

:root.light-theme .search-input:focus {
  border-color: #2563eb;
}

:root.light-theme .webhook-cards {
  background: #ffffff;
}

:root.light-theme .webhook-card {
  background: #f8fafc;
  border-color: #e5e7eb;
  opacity: 0.85;
}

:root.light-theme .webhook-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

:root.light-theme .webhook-card.is-active {
  opacity: 1;
  border-left-color: #2563eb;
}

:root.light-theme .webhook-card__name {
  color: #1e293b;
}

:root.light-theme .webhook-card__url {
  color: #64748b;
}

:root.light-theme .webhook-card__body {
  border-top-color: #e5e7eb;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .event-label {
  color: #64748b;
}

:root.light-theme .event-tag {
  background: #f1f5f9;
  border-color: #e5e7eb;
  color: #334155;
}

:root.light-theme .config-label {
  color: #64748b;
}

:root.light-theme .config-value {
  color: #334155;
}

:root.light-theme .mini-stat__label {
  color: #64748b;
}

:root.light-theme .mini-stat__value {
  color: #1e293b;
}

:root.light-theme .webhook-id {
  color: #64748b;
}

:root.light-theme .id-value {
  background: #f1f5f9;
  border-color: #e5e7eb;
}

:root.light-theme .empty-icon {
  opacity: 0.4;
}

:root.light-theme .empty-text {
  color: #64748b;
}

:root.light-theme .loading-text {
  color: #64748b;
}

:root.light-theme .modal-overlay {
  background: rgba(0, 0, 0, 0.5);
}

:root.light-theme .modal-container {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .modal-header {
  background: #f8fafc;
  border-bottom-color: #e5e7eb;
}

:root.light-theme .modal-header h2 {
  color: #1e293b;
}

:root.light-theme .modal-footer {
  background: #f8fafc;
  border-top-color: #e5e7eb;
}

:root.light-theme .section-title {
  color: #2563eb;
}

:root.light-theme .form-label {
  color: #334155;
}

:root.light-theme .form-input {
  background: #f8fafc;
  border-color: #e5e7eb;
  color: #1e293b;
}

:root.light-theme .form-input:focus {
  border-color: #2563eb;
  background: #ffffff;
}

:root.light-theme .form-help {
  color: #64748b;
}

:root.light-theme .checkbox-label {
  background: #f8fafc;
  border-color: #e5e7eb;
}

:root.light-theme .checkbox-label:hover {
  border-color: #2563eb;
  background: #f1f5f9;
}

:root.light-theme .checkbox-label:has(input:checked) {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
}

:root.light-theme .checkbox-text {
  color: #334155;
}

:root.light-theme .radio-label {
  background: #f8fafc;
  border-color: #e5e7eb;
}

:root.light-theme .radio-label:hover {
  border-color: #2563eb;
}

:root.light-theme .radio-label:has(input:checked) {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.05);
}

:root.light-theme .toggle-switch {
  background: #f1f5f9;
  border-color: #e5e7eb;
}

:root.light-theme .toggle-switch::after {
  background: #94a3b8;
}

:root.light-theme .toggle-label input:checked + .toggle-switch {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.15);
}

:root.light-theme .toggle-label input:checked + .toggle-switch::after {
  background: #2563eb;
}

:root.light-theme .toggle-text {
  color: #334155;
}

:root.light-theme .log-item {
  background: #f8fafc;
  border-color: #e5e7eb;
}

:root.light-theme .log-time {
  color: #64748b;
}

:root.light-theme .log-event {
  color: #1e293b;
}

:root.light-theme .log-label {
  color: #64748b;
}

:root.light-theme .log-value {
  color: #334155;
}
</style>
