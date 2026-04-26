<template>
  <div class="task-center__header">
    <div class="task-center__title-wrap">
      <div class="task-center__title">
        <span class="title-icon"><i class="fas fa-satellite-dish"></i></span>
        <h1>任务指挥中心</h1>
        <span class="task-center__mode">Gateway 直连</span>
      </div>
    </div>
    <div class="header-actions">
      <div class="ai-status" :class="`status--${aiStatus}`">
        <span class="status-dot"></span>
        <span class="status-label">{{ aiStatusText }}</span>
      </div>
      <button type="button" class="btn btn-theme-toggle btn-sm" @click="$emit('toggle-theme')" :title="isLight ? '切换到深色模式' : '切换到浅色模式'">
        <span class="btn-icon theme-icon">
          <el-icon><Sunny v-if="isLight" /><Moon v-else /></el-icon>
        </span>
        <span class="theme-label">{{ isLight ? '关灯' : '开灯' }}</span>
      </button>
      <button type="button" class="btn btn-success btn-sm" @click="$emit('connect-all')" :disabled="allConnected">
        <span class="btn-icon"><i class="fas fa-plug"></i></span>
        全连
      </button>
      <button type="button" class="btn btn-danger btn-sm" @click="$emit('disconnect-all')" :disabled="!anyConnected">
        <span class="btn-icon"><i class="fas fa-power-off"></i></span>
        全断
      </button>
      <button type="button" class="btn btn-secondary btn-sm" @click="$emit('reset')">
        <span class="btn-icon"><i class="fas fa-trash-alt"></i></span>
        重置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'

defineProps<{
  aiStatus: 'connected' | 'disconnected' | 'error'
  aiStatusText: string
  allConnected: boolean
  anyConnected: boolean
  isLight: boolean
}>()

defineEmits<{
  'connect-all': []
  'disconnect-all': []
  reset: []
  'toggle-theme': []
}>()
</script>

<style scoped>
.task-center__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 32px;
  height: 64px;
  border-bottom: 1px solid var(--border-default);
  background: rgba(22, 27, 34, 0.8);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.task-center__title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  font-size: 12px;
}

.task-center__title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-center__mode {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-primary-bg) 80%, transparent);
  color: var(--text-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.btn-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.theme-label {
  font-size: 12px;
  font-weight: 500;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(46, 160, 67, 0.1);
  border: 1px solid rgba(46, 160, 67, 0.2);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-success);
}

.ai-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.status--disconnected {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.2);
}

.status--error {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

@media (max-width: 960px) {
  .task-center__header {
    height: auto;
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
