<template>
  <div class="chat-section">
    <div class="chat-container" ref="chatContainer">
      <div v-if="messages.length === 0" class="chat-empty-hint">
        <i class="ri-chat-smile-2-line"></i>
        暂无对话记录
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-msg"
        :class="{ user: msg.role === 'user' }"
      >
        <div class="msg-avatar">
          <template v-if="msg.role === 'user'">
            <i class="ri-user-line"></i>
          </template>
          <template v-else>
            <img :src="agentIcon" :alt="agentName" />
          </template>
        </div>
        <div>
          <div class="msg-bubble" v-html="renderMarkdown(msg.content)"></div>
          <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>
    </div>
    <div class="chat-input-bar">
      <div class="chat-input-row">
        <el-input
          :model-value="modelValue"
          :placeholder="placeholder"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          class="chat-input"
          @update:model-value="$emit('update:modelValue', $event)"
          @keydown.ctrl.enter="$emit('send')"
        />
        <button
          type="button"
          class="dispatch-send-btn"
          @click="$emit('send')"
          :disabled="!modelValue.trim() || !connected"
        >
          <i class="fas fa-paper-plane"></i>
          <span>派发</span>
        </button>
      </div>
      <div class="chat-input-meta">
        <span class="connection-hint" :class="{ connected }">
          <span class="hint-dot"></span>
          {{ connected ? `${agentName} 已连接` : `${agentName} 未连接` }}
        </span>
        <span class="input-shortcut">Ctrl+Enter 派发</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'

interface TaskMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

const props = defineProps<{
  messages: TaskMessage[]
  agentName: string
  agentIcon: string
  connected: boolean
  placeholder: string
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})
const chatContainer = ref<HTMLElement | null>(null)
const userScrolledUp = ref(false)

const renderMarkdown = (content: string) => md.render(content || '')

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value && !userScrolledUp.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
  { immediate: true }
)

const handleScroll = () => {
  if (!chatContainer.value) return
  const threshold = 50
  const distance = chatContainer.value.scrollHeight - chatContainer.value.scrollTop - chatContainer.value.clientHeight
  userScrolledUp.value = distance > threshold
}

watch(chatContainer, (element, oldElement) => {
  oldElement?.removeEventListener('scroll', handleScroll)
  element?.addEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.chat-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(11, 18, 29, 0.74), rgba(11, 18, 29, 0.9));
}

.chat-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background-image:
    radial-gradient(circle at top left, rgba(var(--color-primary-rgb), 0.08), transparent 24%),
    linear-gradient(rgba(255, 255, 255, 0.015), rgba(255, 255, 255, 0.015)),
    linear-gradient(90deg, rgba(121, 192, 255, 0.035) 1px, transparent 1px),
    linear-gradient(rgba(121, 192, 255, 0.03) 1px, transparent 1px);
  background-size: auto, auto, 28px 28px, 28px 28px;
}

.chat-empty-hint {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  height: 100%;
}

.chat-msg {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--color-primary-rgb), 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.msg-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-bubble {
  max-width: 760px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.12);
  color: var(--text-primary);
  line-height: 1.6;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
}

.chat-msg.user .msg-bubble {
  background: linear-gradient(135deg, rgba(121, 192, 255, 0.92), rgba(49, 130, 206, 0.96));
  border-color: transparent;
  color: white;
}

.msg-time {
  margin-top: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.chat-input-bar {
  border-top: 1px solid rgba(var(--color-primary-rgb), 0.14);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(10, 15, 23, 0.95);
}

.chat-input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.chat-input {
  flex: 1;
}

.chat-input :deep(.el-textarea__inner) {
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-primary);
  padding: 10px 12px;
}

.chat-input :deep(.el-textarea__inner::placeholder) {
  color: var(--text-tertiary);
}

.dispatch-send-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-cyan), var(--color-primary));
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(88, 166, 255, 0.24);
}

.dispatch-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chat-input-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.connection-hint {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.connection-hint.connected {
  color: var(--color-success);
}

.connection-hint.connected .hint-dot {
  background: var(--color-success);
}
</style>
