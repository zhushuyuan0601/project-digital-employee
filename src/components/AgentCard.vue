<template>
  <div class="agent-card" :class="['agent-card--' + agent.role, { 'is-busy': agent.status === 'busy' }]" @click="$emit('click')">
    <div class="agent-card__header">
      <div class="agent-card__icon">
        <img :src="agent.icon" :alt="agent.name" />
      </div>
      <div class="agent-card__info">
        <div class="agent-card__name">{{ agent.name }}</div>
        <div class="agent-card__role">{{ agent.description }}</div>
      </div>
      <div class="agent-card__status" :class="`status--${agent.status}`">
        <span class="status-dot"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- 执行日志区域 - 仅在任务执行时显示 -->
    <div v-if="logs && logs.length > 0" class="agent-card__logs">
        <div class="logs-header">
          <span class="logs-title"><i class="fas fa-terminal"></i> 执行日志</span>
          <span class="logs-count">{{ logs.length }} 条</span>
        </div>
        <div class="logs-terminal">
          <div
            v-for="log in displayedLogs"
            :key="log.id"
            class="log-line"
            :class="[
              `type--${log.type}`,
              { 'fade-in': log.id === latestLogId },
              { 'is-empty': log.message === '' },
              { 'is-divider': log.message.includes('━━') }
            ]"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-content">
              <span class="log-icon" v-if="log.message && !log.message.includes('━━')">
                <i :class="getLogIconClass(log.type)"></i>
              </span>
              <span class="log-message">{{ log.message }}</span>
            </span>
          </div>
        </div>
    </div>

    <div class="agent-card__footer">
      <div class="stat-item">
        <span class="stat-label">完成任务</span>
        <span class="stat-value">{{ agent.completedTasks }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">今日任务</span>
        <span class="stat-value">{{ agent.todayTasks || 0 }}</span>
      </div>
    </div>
    <div class="click-hint">点击查看详情</div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Agent } from '@/types/agent'
import type { ExecutionLog } from '@/simulation'

const props = defineProps<{
  agent: Agent
  logs?: ExecutionLog[]
}>()

defineEmits<{
  click: []
}>()

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    idle: '空闲',
    busy: '工作中',
    offline: '离线'
  }
  return statusMap[props.agent.status] || '未知'
})

// 显示的日志（显示全部）
const displayedLogs = computed(() => {
  if (!props.logs || props.logs.length === 0) return []
  return props.logs
})

// 最新日志 ID
const latestLogId = computed(() => {
  if (!props.logs || props.logs.length === 0) return null
  return props.logs[props.logs.length - 1].id
})

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 获取日志图标类名
const getLogIconClass = (type: string) => {
  const iconMap: Record<string, string> = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  }
  return iconMap[type] || 'fas fa-angle-right'
}

// 监听日志变化，自动滚动到底部
watch(() => props.logs?.length, () => {
  // 日志变化时滚动到底部
  setTimeout(() => {
    const terminal = document.querySelector('.logs-terminal')
    if (terminal) {
      terminal.scrollTop = terminal.scrollHeight
    }
  }, 50)
})
</script>

<style scoped>
.agent-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.agent-card:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.agent-card.is-busy {
  border-color: rgba(255, 100, 50, 0.8);
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.15) 0%, rgba(255, 50, 100, 0.1) 100%);
  box-shadow: 0 4px 20px rgba(255, 100, 50, 0.3), inset 0 0 10px rgba(255, 100, 50, 0.05);
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 4px 20px rgba(255, 100, 50, 0.3), inset 0 0 10px rgba(255, 100, 50, 0.05); }
  50% { box-shadow: 0 4px 28px rgba(255, 100, 50, 0.5), inset 0 0 15px rgba(255, 100, 50, 0.1); }
}

.agent-card--assistant {
  border-left: 3px solid #00ff88;
}

.agent-card--developer {
  border-left: 3px solid #667eea;
}

.agent-card--product {
  border-left: 3px solid #f093fb;
}

.agent-card--analyst {
  border-left: 3px solid #ffaa00;
}

.agent-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.agent-card__icon {
  font-size: 28px;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.agent-card__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.agent-card__info {
  flex: 1;
  min-width: 0;
}

.agent-card__name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-card__role {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-card__status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.status--busy {
  background: rgba(255, 100, 50, 0.2);
  border: 1px solid rgba(255, 100, 50, 0.3);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ff88;
  box-shadow: 0 0 6px #00ff88;
}

.status--idle .status-dot {
  background: #00ff88;
  box-shadow: 0 0 8px #00ff88;
}

.status--busy .status-dot {
  background: #ff6b32;
  box-shadow: 0 0 10px #ff6b32, 0 0 20px #ff6b32;
  animation: pulse 1s ease-in-out infinite;
}

.status--offline .status-dot {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

.status-text {
  color: rgba(255, 255, 255, 0.8);
}

.status--busy .status-text {
  color: #ffaa80;
  font-weight: 600;
}

.agent-card__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.status--offline .status-text {
  color: rgba(255, 255, 255, 0.4);
}

/* 执行日志区域 */
.agent-card__logs {
  margin-top: 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logs-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 6px;
}

.logs-title i {
  color: var(--color-primary);
  font-size: 10px;
}

.logs-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--font-mono);
}

.logs-terminal {
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  max-height: 140px;
  overflow-y: auto;
  scroll-behavior: smooth;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
}

.log-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 8px;
  margin-bottom: 3px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.log-line:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 淡入动画 */
.log-line.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-line.type--info {
  border-left-color: var(--color-primary);
}

.log-line.type--success {
  border-left-color: var(--color-success);
  background: rgba(0, 255, 136, 0.06);
}

.log-line.type--warning {
  border-left-color: var(--color-warning);
  background: rgba(255, 170, 0, 0.06);
}

.log-line.type--error {
  border-left-color: var(--color-error);
  background: rgba(255, 51, 102, 0.06);
}

.log-line.is-empty {
  padding: 2px 8px;
  background: transparent;
  border-left-color: transparent;
}

.log-line.is-divider {
  padding: 6px 8px;
  background: transparent;
  border-left-color: transparent;
  margin: 6px 0;
}

.log-line.is-divider .log-content {
  color: var(--color-primary);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.log-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 55px;
}

.log-content {
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  word-break: break-all;
  flex: 1;
}

.log-icon {
  flex-shrink: 0;
  font-size: 10px;
  margin-top: 2px;
}

.log-icon i {
  font-size: 10px;
}

.log-line.type--success .log-icon i {
  color: var(--color-success);
}

.log-line.type--error .log-icon i {
  color: var(--color-error);
}

.log-line.type--warning .log-icon i {
  color: var(--color-warning);
}

.log-line.type--info .log-icon i {
  color: var(--color-primary);
}

.log-message {
  flex: 1;
}

.click-hint {
  text-align: center;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.05);
}

/* ========== 亮色主题样式 - 飞书风格 ========== */
:root.light-theme .agent-card {
  background: #ffffff;
  border: 1px solid #dee0e3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

:root.light-theme .agent-card:hover {
  background: #fafbfc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:root.light-theme .agent-card.is-busy {
  border-color: #ffbb96;
  background: linear-gradient(135deg, rgba(255, 170, 119, 0.12) 0%, rgba(255, 119, 119, 0.08) 100%);
  box-shadow: 0 4px 12px rgba(255, 136, 80, 0.2);
}

:root.light-theme .agent-card--assistant {
  border-left: 3px solid #00b365;
}

:root.light-theme .agent-card--developer {
  border-left: 3px solid #5b73e8;
}

:root.light-theme .agent-card--product {
  border-left: 3px solid #ec4899;
}

:root.light-theme .agent-card--analyst {
  border-left: 3px solid #ff9500;
}

:root.light-theme .agent-card__icon {
  background: #f5f6f7;
  border: 1px solid #e5e6e9;
}

:root.light-theme .agent-card__name {
  color: #1f2329;
}

:root.light-theme .agent-card__role {
  color: #8f959e;
}

:root.light-theme .agent-card__status {
  background: #f5f6f7;
}

:root.light-theme .status--busy {
  background: rgba(255, 122, 45, 0.08);
  border-color: #ffbb96;
}

:root.light-theme .status-dot {
  background: #00b365;
  box-shadow: 0 0 6px rgba(0, 179, 101, 0.4);
}

:root.light-theme .status--busy .status-dot {
  background: #ff7a2d;
  box-shadow: 0 0 10px rgba(255, 122, 45, 0.5);
}

:root.light-theme .status--offline .status-dot {
  background: #c2c8d1;
}

:root.light-theme .status-text {
  color: #646a73;
}

:root.light-theme .status--busy .status-text {
  color: #ff7a2d;
}

:root.light-theme .status--offline .status-text {
  color: #c2c8d1;
}

:root.light-theme .stat-label {
  color: #8f959e;
}

:root.light-theme .stat-value {
  color: #1f2329;
}

:root.light-theme .agent-card__footer {
  border-top-color: #f5f6f7;
}

:root.light-theme .click-hint {
  color: #c2c8d1;
  border-top-color: #f5f6f7;
}

/* 日志区域 */
:root.light-theme .logs-terminal {
  background: #f5f6f7;
  border: 1px solid #e5e6e9;
}

:root.light-theme .log-time {
  color: #c2c8d1;
}

:root.light-theme .log-content {
  color: #646a73;
}

:root.light-theme .log-line.type--info {
  border-left-color: #3370ff;
}

:root.light-theme .log-line.type--success {
  border-left-color: #00b365;
  background: rgba(0, 179, 101, 0.06);
}

:root.light-theme .log-line.type--warning {
  border-left-color: #ff7a2d;
  background: rgba(255, 122, 45, 0.06);
}

:root.light-theme .log-line.type--error {
  border-left-color: #ff4d4f;
  background: rgba(255, 77, 79, 0.06);
}

:root.light-theme .log-line.is-divider .log-content {
  color: #3370ff;
}
</style>
