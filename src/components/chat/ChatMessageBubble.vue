<template>
  <div
    class="chat-message-bubble"
    :class="[
      `chat-message-bubble--${variant}`,
      `chat-message-bubble--${layout}`
    ]"
  >
    <div class="chat-message-bubble__avatar">
      <img
        v-if="avatarImage"
        :src="avatarImage"
        :alt="senderName || 'avatar'"
        class="chat-message-bubble__avatar-image"
      />
      <span v-else class="chat-message-bubble__avatar-text">{{ avatarText }}</span>
    </div>

    <div class="chat-message-bubble__body">
      <div v-if="senderName || time" class="chat-message-bubble__meta">
        <span v-if="senderName" class="chat-message-bubble__name">{{ senderName }}</span>
        <span v-if="time" class="chat-message-bubble__time">{{ time }}</span>
      </div>

      <div class="chat-message-bubble__content" v-html="contentHtml"></div>

      <div v-if="mentions.length > 0" class="chat-message-bubble__mentions">
        <span
          v-for="mention in mentions"
          :key="mention"
          class="chat-message-bubble__mention"
        >
          @{{ mention }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant: 'user' | 'assistant' | 'system'
  layout?: 'left' | 'right'
  senderName?: string
  time?: string
  contentHtml: string
  avatarText?: string
  avatarImage?: string
  mentions?: string[]
}>(), {
  layout: 'left',
  senderName: '',
  time: '',
  avatarText: '◈',
  avatarImage: '',
  mentions: () => [],
})
</script>

<style scoped>
.chat-message-bubble {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.chat-message-bubble--right {
  flex-direction: row-reverse;
}

.chat-message-bubble__avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(189, 0, 255, 0.15) 100%);
  border: 1px solid rgba(0, 240, 255, 0.25);
  overflow: hidden;
}

.chat-message-bubble__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-message-bubble__avatar-text {
  font-size: 18px;
  color: var(--color-primary);
}

.chat-message-bubble__body {
  min-width: 0;
  max-width: min(760px, calc(100% - 52px));
}

.chat-message-bubble--right .chat-message-bubble__body {
  text-align: right;
}

.chat-message-bubble__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.chat-message-bubble--right .chat-message-bubble__meta {
  justify-content: flex-end;
}

.chat-message-bubble__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.chat-message-bubble__time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.chat-message-bubble__content {
  display: inline-block;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.65;
  word-break: break-word;
  background: rgba(30, 58, 95, 0.3);
  border: 1px solid rgba(48, 80, 112, 0.4);
  color: var(--text-primary);
}

.chat-message-bubble--assistant .chat-message-bubble__content {
  background: rgba(0, 240, 255, 0.06);
  border-color: rgba(0, 240, 255, 0.18);
}

.chat-message-bubble--user .chat-message-bubble__content {
  background: rgba(189, 0, 255, 0.14);
  border-color: rgba(189, 0, 255, 0.22);
}

.chat-message-bubble--system .chat-message-bubble__content {
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.2);
}

:root.light-theme .chat-message-bubble__avatar {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border: none;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

:root.light-theme .chat-message-bubble--user .chat-message-bubble__avatar {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
}

:root.light-theme .chat-message-bubble--system .chat-message-bubble__avatar {
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
}

:root.light-theme .chat-message-bubble__content {
  background: #ffffff;
  border: 1px solid #e5e6e9;
  color: #1f2329;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root.light-theme .chat-message-bubble--user .chat-message-bubble__content {
  background: linear-gradient(135deg, #3370ff 0%, #4d82ff 100%);
  border: none;
  color: #ffffff;
}

.chat-message-bubble__mentions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.chat-message-bubble--right .chat-message-bubble__mentions {
  justify-content: flex-end;
}

.chat-message-bubble__mention {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-primary);
}

:root.light-theme .chat-message-bubble__mention {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  color: #4f46e5;
}

:root.light-theme .chat-message-bubble--user .chat-message-bubble__mention {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

.chat-message-bubble__content :deep(.code-block) {
  background: rgba(10, 14, 20, 0.8);
  border: 1px solid rgba(48, 80, 112, 0.5);
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--terminal-cyan);
  border-radius: 6px;
}

.chat-message-bubble__content :deep(.inline-code) {
  background: rgba(30, 58, 95, 0.5);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-secondary);
  border-radius: 4px;
  border: 1px solid rgba(189, 0, 255, 0.3);
}

:root.light-theme .chat-message-bubble__content :deep(.code-block) {
  background: #1f2329;
  border: 1px solid #444852;
  color: #e5e6e9;
}

:root.light-theme .chat-message-bubble__content :deep(.inline-code) {
  background: #f5f6f7;
  border: 1px solid #e5e6e9;
  color: #3370ff;
}

:root.light-theme .chat-message-bubble--user .chat-message-bubble__content :deep(.code-block) {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
  color: #e0e4ff;
}

:root.light-theme .chat-message-bubble--user .chat-message-bubble__content :deep(.inline-code) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}
</style>
