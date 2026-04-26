<template>
  <div class="agent-card" :class="{ active }" @click="$emit('click')">
    <div class="agent-card__header">
      <div class="agent-card__main">
        <div class="agent-card__avatar">
          <img :src="iconSrc" :alt="name" />
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
  padding: 14px;
  border-bottom: 1px solid var(--border-default);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.agent-card:hover {
  background: rgba(99, 102, 241, 0.08);
}

.agent-card.active {
  background: rgba(99, 102, 241, 0.12);
  border-left: 3px solid var(--color-primary);
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
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
