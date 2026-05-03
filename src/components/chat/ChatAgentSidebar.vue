<template>
  <div class="chat-agent-sidebar">
    <button
      v-for="agent in agents"
      :key="agent.id"
      type="button"
      :class="['chat-agent-sidebar__item', { 'is-active': agent.active }]"
      @click="$emit('select', agent.id)"
    >
      <div class="chat-agent-sidebar__avatar">{{ agent.avatar }}</div>
      <div class="chat-agent-sidebar__info">
        <span class="chat-agent-sidebar__name">{{ agent.name }}</span>
        <span class="chat-agent-sidebar__role">{{ agent.role }}</span>
      </div>
      <span class="chat-agent-sidebar__status" :class="agent.status"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface SidebarAgent {
  id: string
  name: string
  role: string
  avatar: string
  status: 'connected' | 'connecting' | 'disconnected'
  active: boolean
}

defineProps<{
  agents: SidebarAgent[]
}>()

defineEmits<{
  select: [agentId: string]
}>()
</script>

<style scoped>
.chat-agent-sidebar {
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, rgba(10, 14, 20, 0.8) 100%);
  border-right: 1px solid var(--grid-line);
}

.chat-agent-sidebar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(10, 14, 20, 0.6);
  border: 1px solid rgba(48, 80, 112, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-agent-sidebar__item:hover {
  background: rgba(30, 58, 95, 0.4);
  border-color: rgba(0, 240, 255, 0.3);
}

.chat-agent-sidebar__item.is-active {
  background: rgba(0, 240, 255, 0.1);
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
}

.chat-agent-sidebar__avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 8px;
  font-size: 18px;
  color: var(--color-primary);
}

.chat-agent-sidebar__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.chat-agent-sidebar__name {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-agent-sidebar__role {
  font-size: 8px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: center;
}

.chat-agent-sidebar__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.chat-agent-sidebar__status.connected {
  background: var(--color-success);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
}

.chat-agent-sidebar__status.connecting {
  background: var(--color-warning);
}

.chat-agent-sidebar__status.disconnected {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.4);
}
</style>
