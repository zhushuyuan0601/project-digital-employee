<template>
  <div class="agents-page">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">◰</span>
          <span class="title-main">团队成员</span>
          <span class="title-sub">AGENT MANAGEMENT SYSTEM</span>
        </h1>
        <div class="title-meta">
          <span class="meta-label">STATUS:</span>
          <span class="meta-value">{{ onlineAgents }}/{{ totalAgents }} ONLINE</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="refreshAgents">
          <span>⟳</span> 刷新状态
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">正在初始化团队成员...</p>
    </div>

    <!-- Agent 卡片网格 -->
    <div v-else class="agents-grid">
      <div
        v-for="agent in agentsStore.agents"
        :key="agent.id"
        class="agent-card"
        :class="{ 'is-busy': agent.status === 'busy', 'is-offline': agent.status === 'offline' }"
      >
        <div class="agent-card__header">
          <div class="agent-card__icon">
            <img :src="agent.icon" :alt="agent.name" />
          </div>
          <div class="agent-card__info">
            <div class="agent-card__name">{{ agent.name }}</div>
            <div class="agent-card__id">{{ agent.id }}</div>
          </div>
          <div class="status-badge" :class="getStatusType(agent.status)">
            <span class="status-dot"></span>
            <span class="status-text">{{ getStatusText(agent.status) }}</span>
          </div>
        </div>

        <div class="agent-card__body">
          <div class="detail-row">
            <span class="detail-label">角色定位</span>
            <span class="detail-value">{{ agent.description }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">完成任务</span>
            <span class="detail-value highlight">{{ agent.completedTasks }}</span>
          </div>
          <div class="detail-row" v-if="agent.currentTask">
            <span class="detail-label">当前任务</span>
            <span class="detail-value task-value">{{ agent.currentTask.title }}</span>
          </div>
        </div>

        <div class="agent-card__footer">
          <button
            v-if="agent.status === 'idle'"
            class="btn btn-secondary btn-sm btn-full"
            disabled
          >
            <span class="btn-icon">◉</span>
            待命
          </button>
          <button
            v-else-if="agent.status === 'busy'"
            class="btn btn-secondary btn-sm btn-full"
            disabled
          >
            <span class="btn-icon">⏳</span>
            执行中
          </button>
          <button
            v-else
            class="btn btn-secondary btn-sm btn-full"
            disabled
          >
            <span class="btn-icon">◌</span>
            离线
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAgentsStore } from '@/stores/agents'

const agentsStore = useAgentsStore()

const loading = ref(false)

// 计算在线/总数
const onlineAgents = computed(() =>
  agentsStore.agents.filter(a => a.status !== 'offline').length
)
const totalAgents = computed(() => agentsStore.agents.length)

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    idle: '就绪',
    busy: '执行中',
    offline: '离线'
  }
  return statusMap[status] || status
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    idle: 'success',
    busy: 'warning',
    offline: 'error'
  }
  return typeMap[status] || 'info'
}

const refreshAgents = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

onMounted(() => {
  if (agentsStore.agents.length === 0) {
    agentsStore.initializeDefaultAgents()
  }
})
</script>

<style scoped>
.agents-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* ========== 页面标题 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.title-main {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
  letter-spacing: 0.1em;
}

.title-sub {
  font-size: 12px;
  color: var(--color-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.title-icon {
  display: none;
}

.title-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.meta-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.meta-value {
  font-size: 14px;
  color: var(--color-success);
  font-weight: 700;
  font-family: var(--font-mono);
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ========== 加载状态 ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 24px;
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
  border: 2px solid var(--border-subtle);
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
  border-top-color: var(--color-success);
  animation-delay: -1s;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== Agent 卡片网格 ========== */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  align-items: stretch;
}

.agent-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.agent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.6;
}

.agent-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 32px rgba(0, 240, 255, 0.15);
  transform: translateY(-4px);
}

.agent-card.is-busy::before {
  background: linear-gradient(90deg, var(--color-warning), var(--color-accent));
}

.agent-card.is-busy:hover {
  border-color: var(--color-warning);
  box-shadow: 0 8px 32px rgba(255, 170, 0, 0.15);
}

.agent-card.is-offline::before {
  background: var(--text-muted);
  opacity: 0.3;
}

.agent-card.is-offline {
  opacity: 0.7;
}

/* ========== 卡片头部 ========== */
.agent-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.agent-card__icon {
  font-size: 36px;
  min-width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.05) 100%);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
  color: var(--color-primary);
  overflow: hidden;
}

.agent-card__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.agent-card__info {
  flex: 1;
}

.agent-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}

.agent-card__id {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

/* ========== 状态徽章 ========== */
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.2s;
}

.status-badge.success {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}

.status-badge.success .status-dot {
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}

.status-badge.warning {
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid var(--color-warning);
  color: var(--color-warning);
}

.status-badge.warning .status-dot {
  background: var(--color-warning);
  box-shadow: 0 0 8px rgba(255, 170, 0, 0.5);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.status-badge.error {
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.status-badge.error .status-dot {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}

/* ========== 卡片主体 ========== */
.agent-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--grid-line-dim);
  flex: 1;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: var(--font-mono);
}

.detail-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  text-align: right;
  max-width: 60%;
}

.detail-value.highlight {
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-weight: 700;
}

.detail-value.task-value {
  text-align: left;
  color: var(--color-primary);
  font-size: 12px;
}

/* ========== 卡片底部 ========== */
.agent-card__footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
}

/* ========== 按钮样式 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.btn-icon {
  font-size: 1.2em;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

.btn-full {
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-color: transparent;
  color: var(--text-inverse);
  box-shadow: var(--glow-primary);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 240, 255, 0.3);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--bg-panel-hover);
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
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

:root.light-theme .title-sub {
  color: #64748b;
}

:root.light-theme .title-icon {
  color: #2563eb;
}

:root.light-theme .meta-label {
  color: #94a3b8;
}

:root.light-theme .meta-value {
  color: #1e293b;
  font-weight: 600;
}

:root.light-theme .agent-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .agent-card::before {
  background: linear-gradient(90deg, #2563eb, #6366f1);
  opacity: 1;
}

:root.light-theme .agent-card:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
}

:root.light-theme .agent-card__header {
  border-bottom-color: #f3f4f6;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%);
}

:root.light-theme .agent-card__name {
  color: #1e293b;
  font-weight: 700;
}

:root.light-theme .agent-card__id {
  color: #94a3b8;
}

:root.light-theme .agent-card__icon {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%);
}

:root.light-theme .status-badge {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

:root.light-theme .status-dot {
  background: #10b981;
}

:root.light-theme .agent-card__content {
  color: #475569;
}

:root.light-theme .agent-card__label {
  color: #94a3b8;
}

:root.light-theme .agent-card__value {
  color: #1e293b;
  font-weight: 600;
}

:root.light-theme .progress-bar {
  background: #f3f4f6;
}

:root.light-theme .progress-fill {
  background: #2563eb;
  box-shadow: none;
}

:root.light-theme .agent-card__actions {
  border-top-color: #f3f4f6;
  background: #f9fafb;
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

/* ========== 页面加载动画 ========== */
.agents-page {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .agents-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .title-main {
    font-size: 20px;
  }
}
</style>
