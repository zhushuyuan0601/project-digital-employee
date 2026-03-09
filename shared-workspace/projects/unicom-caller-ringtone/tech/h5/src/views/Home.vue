<template>
  <div>
    <van-nav-bar title="联通智铃" fixed placeholder>
      <template #right><van-icon name="setting-o" size="20" /></template>
    </van-nav-bar>

    <div class="chat-area" ref="chatArea">
      <div class="message-list">
        <div v-for="(m, i) in chatMessages" :key="i" :class="['message-item', m.role]">
          <div :class="['avatar', m.role]">{{ m.role === 'bot' ? '🔔' : '👤' }}</div>
          <div :class="['bubble', m.role]">{{ m.content }}</div>
        </div>
        <div v-if="loading" class="message-item bot">
          <div class="avatar bot">🔔</div>
          <div class="bubble bot"><van-loading size="14" /></div>
        </div>
      </div>
    </div>

    <div class="quick-actions" v-if="chatMessages.length <= 1">
      <button class="quick-btn" v-for="a in quickActions" :key="a.text" @click="send(a.prompt)">{{ a.icon }} {{ a.text }}</button>
    </div>

    <div class="input-area">
      <van-search v-model="input" placeholder="一句话创作视频彩铃..." show-action @search="send(input)">
        <template #action><van-button type="primary" size="small" @click="send(input)" :disabled="!input.trim()">发送</van-button></template>
      </van-search>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { chat } from '../api/honghu'

const input = ref('')
const chatMessages = ref([{ role: 'bot', content: '您好！我是联通智铃助手小铃 🔔\n\n一句话，创作专属视频彩铃：\n• 🧧 拜年祝福\n• 🏢 企业宣传\n• 🎨 IP模板\n\n请告诉我您的需求~' }])
const loading = ref(false)
const chatArea = ref(null)

const quickActions = [
  { text: '拜年视频', icon: '🧧', prompt: '帮我创作拜年视频彩铃' },
  { text: '企业宣传', icon: '🏢', prompt: '创作企业宣传视频彩铃' },
  { text: 'IP模板', icon: '🎨', prompt: '推荐一些IP模板' },
  { text: '节日祝福', icon: '🎉', prompt: '创作节日祝福视频' }
]

async function send(text) {
  if (!text?.trim()) return
  chatMessages.value.push({ role: 'user', content: text.trim() })
  input.value = ''
  await nextTick()
  scrollToBottom()
  loading.value = true
  try {
    const reply = await chat(text.trim())
    chatMessages.value.push({ role: 'bot', content: reply })
  } catch { chatMessages.value.push({ role: 'bot', content: '服务暂时不可用' }) }
  finally { loading.value = false; await nextTick(); scrollToBottom() }
  localStorage.setItem('ringtoneHistory', JSON.stringify(chatMessages.value))
}

function scrollToBottom() { if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight }

onMounted(() => {
  const saved = localStorage.getItem('ringtoneHistory')
  if (saved) chatMessages.value = JSON.parse(saved)
})
</script>