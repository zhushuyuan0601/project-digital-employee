<template>
  <div class="agent-card" :class="{ active }" @click="$emit('click')">
    <div class="agent-card__glow"></div>
    <div class="agent-card__header">
      <div class="agent-card__main">
        <div class="agent-card__avatar">
          <img :src="iconSrc" :alt="name" />
          <span class="agent-card__status-dot" :class="statusClass"></span>
        </div>
        <div>
          <div class="agent-card__name">{{ name }}</div>
          <div class="agent-card__role">{{ role }}</div>
        </div>
      </div>
      <div class="status-badge-mini" :class="statusClass">
        {{ statusText }}
      </div>
    </div>
    <div class="agent-card__desc">{{ desc }}</div>
    <div class="agent-card__footer">
      <div class="agent-card__tags">
        <span class="tag" v-for="tag in tags" :key="tag">{{ tag }}</span>
      </div>
      <div class="agent-card__meta">
        <i class="ri-message-3-line"></i> {{ messageCount }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  role: string
  desc: string
  tags: string[]
  iconSrc: string
  active: boolean
  statusClass: string
  statusText: string
  messageCount: number
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.agent-card {
  position: relative;
  margin: 10px 12px;
  padding: 16px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.025);
  cursor: pointer;
  overflow: hidden;
  transition: transform var(--transition-fast), background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.agent-card__glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(var(--color-primary-rgb), 0.18), transparent 35%);
  opacity: 0;
  transition: opacity var(--transition-base);
  pointer-events: none;
}

.agent-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.agent-card:hover .agent-card__glow,
.agent-card.active .agent-card__glow {
  opacity: 1;
}

.agent-card.active {
  background: rgba(var(--color-primary-rgb), 0.11);
  border-color: rgba(var(--color-primary-rgb), 0.26);
  box-shadow: inset 3px 0 0 var(--color-primary), 0 12px 24px rgba(0, 0, 0, 0.18);
}

.agent-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.agent-card__main {
  display: flex;
  gap: 10px;
  min-width: 0;
}

.agent-card__avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(var(--color-primary-rgb), 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.agent-card__status-dot {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg-panel);
  background: var(--text-tertiary);
}

.agent-card__status-dot.idle {
  background: var(--color-success);
  box-shadow: 0 0 10px rgba(46, 160, 67, 0.35);
}

.agent-card__status-dot.busy {
  background: var(--color-warning);
  box-shadow: 0 0 10px rgba(210, 153, 34, 0.35);
}

.agent-card__status-dot.offline {
  background: var(--color-error);
  box-shadow: 0 0 10px rgba(248, 81, 73, 0.35);
}

.agent-card__name {
  color: var(--text-primary);
  font-weight: 600;
}

.agent-card__role,
.agent-card__desc {
  color: var(--text-tertiary);
  font-size: 12px;
}

.agent-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.agent-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-tertiary);
  font-size: 11px;
}

.agent-card__meta {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.status-badge-mini {
  align-self: flex-start;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.status-badge-mini.idle {
  color: var(--color-success);
  background: rgba(46, 160, 67, 0.12);
}

.status-badge-mini.busy {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.12);
}

.status-badge-mini.offline {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.12);
}
</style>
