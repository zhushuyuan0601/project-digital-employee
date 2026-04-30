<template>
  <header class="header">
    <div class="header__left">
      <div class="header__logo">
        <i class="ri-command-fill"></i>
      </div>
      <div class="header__title">任务指挥中心 v2.0</div>
    </div>
    <div class="header__info">
      <div class="header__info-item">
        <i class="ri-server-line"></i>
        <span>{{ aiStatusText }}</span>
      </div>
      <div class="header__info-item">
        <i class="ri-time-line"></i>
        <span>{{ timestampText }}</span>
      </div>
      <div class="header__info-item">
        <i class="ri-user-settings-line"></i>
        <span>{{ currentUser }}</span>
      </div>
    </div>
    <div class="header__actions">
      <div class="ai-status" :class="`status--${aiStatus}`">
        <span class="status-dot"></span>
        <span class="status-label">{{ aiStatusText }}</span>
      </div>
      <button type="button" class="header__btn" @click="$emit('toggle-theme')" :title="isLight ? '切换到深色模式' : '切换到浅色模式'">
        <el-icon><Sunny v-if="isLight" /><Moon v-else /></el-icon>
      </button>
      <button type="button" class="header__btn header__btn--success" @click="$emit('connect-all')" :disabled="allConnected">
        <i class="fas fa-plug"></i>
        <span>全连</span>
      </button>
      <button type="button" class="header__btn header__btn--danger" @click="$emit('disconnect-all')" :disabled="!anyConnected">
        <i class="fas fa-power-off"></i>
        <span>全断</span>
      </button>
      <button type="button" class="header__btn header__btn--secondary" @click="$emit('reset')">
        <i class="fas fa-trash-alt"></i>
        <span>重置</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'

defineProps<{
  aiStatus: 'connected' | 'disconnected' | 'error'
  aiStatusText: string
  allConnected: boolean
  anyConnected: boolean
  isLight: boolean
  timestampText: string
  currentUser: string
}>()

defineEmits<{
  'connect-all': []
  'disconnect-all': []
  reset: []
  'toggle-theme': []
}>()
</script>

<style scoped>
.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: linear-gradient(90deg, rgba(18, 23, 33, 0.9) 0%, rgba(18, 23, 33, 0.6) 100%);
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.2);
  position: relative;
  flex-shrink: 0;
}

.header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--color-primary) 50%, transparent 100%);
  opacity: 0.5;
}

.header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header__logo {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-cyan), var(--color-primary));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.5);
}

.header__title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(90deg, var(--text-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header__info {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.header__info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header__info-item i {
  color: var(--color-primary);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
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

.header__btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.header__btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.header__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header__btn--success {
  color: var(--color-success);
  border-color: rgba(46, 160, 67, 0.3);
}

.header__btn--success:hover {
  background: rgba(46, 160, 67, 0.1);
}

.header__btn--danger {
  color: var(--color-error);
  border-color: rgba(220, 38, 38, 0.3);
}

.header__btn--danger:hover {
  background: rgba(220, 38, 38, 0.1);
}

.header__btn--secondary {
  color: var(--text-tertiary);
}

@media (max-width: 1280px) {
  .header {
    padding: 0 20px;
    gap: 16px;
  }

  .header__info {
    gap: 16px;
  }
}

@media (max-width: 960px) {
  .header {
    height: auto;
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .header__info {
    order: 3;
    width: 100%;
    gap: 12px;
    font-size: 12px;
  }

  .header__actions {
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
