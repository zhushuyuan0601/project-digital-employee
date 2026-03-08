<template>
  <div>
    <van-nav-bar title="AI智能客服" fixed placeholder>
      <template #right><van-icon name="setting-o" size="20" /></template>
    </van-nav-bar>

    <div class="chat-area" ref="chatArea">
      <div class="message-list">
        <div v-for="(m, i) in chatMessages" :key="i" :class="['message-item', m.role]">
          <div :class="['avatar', m.role]">{{ m.role === 'bot' ? '🤖' : '👤' }}</div>
          <div :class="['bubble', m.role]">{{ m.content }}</div>
        </div>
        <div v-if="loading" class="message-item bot">
          <div class="avatar bot">🤖</div>
          <div class="bubble bot"><van-loading size="14" /></div>
        </div>
      </div>
    </div>

    <div class="quick-actions" v-if="chatMessages.length <= 1">
      <button class="quick-btn" v-for="a in quickActions" :key="a.text" @click="send(a.prompt)">{{ a.icon }} {{ a.text }}</button>
    </div>

    <div class="input-area">
      <van-search v-model="input" placeholder="请输入问题..." show-action @search="send(input)">
        <template #action><van-button type="primary" size="small" @click="send(input)" :disabled="!input.trim()">发送</van-button></template>
      </van-search>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { chat, getMessages } from '../api/honghu'

const input = ref('')
const chatMessages = ref([{ role: 'bot', content: '您好！我是联通AI智能客服，有什么可以帮您的吗？' }])
const loading = ref(false)
const chatArea = ref(null)

const quickActions = [
  { text: '套餐查询', icon: '📱', prompt: '查一下我的套餐' },
  { text: '话费充值', icon: '💰', prompt: '如何充值话费？' },
  { text: '流量查询', icon: '📶', prompt: '查询流量使用情况' },
  { text: '业务办理', icon: '📋', prompt: '我想办理业务' },
  { text: '故障报修', icon: '🔧', prompt: '网络故障报修' },
  { text: '人工客服', icon: '👥', prompt: '转人工客服' }
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
  localStorage.setItem('chatHistory', JSON.stringify(chatMessages.value))
}

function scrollToBottom() { if (chatArea.value) chatArea.value.scrollTop = chatArea.value.scrollHeight }

onMounted(() => {
  const saved = localStorage.getItem('chatHistory')
  if (saved) chatMessages.value = JSON.parse(saved)
})
</script>