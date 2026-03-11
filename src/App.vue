<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <van-nav-bar title="联通智能客服" fixed placeholder>
      <template #right>
        <van-icon name="ellipsis" size="20" @click="showHistory = true" />
      </template>
    </van-nav-bar>

    <!-- 聊天区域 -->
    <div class="chat-container" ref="chatContainer">
      <div class="message-list">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-item', msg.role]"
        >
          <div :class="['avatar', msg.role]">
            {{ msg.role === 'bot' ? '🤖' : '👤' }}
          </div>
          <div :class="['message-bubble', msg.role]">
            {{ msg.content }}
          </div>
        </div>
        
        <!-- 加载中 -->
        <div v-if="loading" class="message-item bot">
          <div class="avatar bot">🤖</div>
          <div class="message-bubble bot">
            <van-loading size="16" color="#667eea" />
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions" v-if="messages.length <= 1">
      <button 
        v-for="action in quickActions" 
        :key="action.text"
        class="quick-btn"
        @click="handleQuickAction(action)"
      >
        {{ action.icon }} {{ action.text }}
      </button>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <van-search
        v-model="inputText"
        placeholder="请输入您的问题..."
        show-action
        @search="sendMessage"
        @cancel="inputText = ''"
      >
        <template #action>
          <van-button 
            type="primary" 
            size="small" 
            @click="sendMessage"
            :disabled="!inputText.trim()"
          >
            发送
          </van-button>
        </template>
      </van-search>
    </div>

    <!-- 历史记录面板 -->
    <van-popup 
      v-model:show="showHistory" 
      position="right" 
      :style="{ width: '80%', height: '100%' }"
    >
      <van-nav-bar title="历史记录" left-arrow @click-left="showHistory = false" />
      <div class="history-panel">
        <div 
          v-for="(item, index) in chatHistory" 
          :key="index"
          class="history-item"
          @click="loadHistory(item)"
        >
          <div class="history-title">{{ item.title }}</div>
          <div class="history-time">{{ item.time }}</div>
        </div>
        <van-empty v-if="chatHistory.length === 0" description="暂无历史记录" />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { showToast } from 'vant'
import { chatWithHonghu } from './api/honghu'

// 消息列表
const messages = ref([
  { role: 'bot', content: '您好！我是联通智能客服小通，很高兴为您服务！请问有什么可以帮您的？' }
])

// 输入文本
const inputText = ref('')

// 加载状态
const loading = ref(false)

// 显示历史
const showHistory = ref(false)

// 聊天容器
const chatContainer = ref(null)

// 快捷入口
const quickActions = [
  { text: '套餐查询', icon: '📱', prompt: '帮我查询当前的套餐详情' },
  { text: '话费充值', icon: '💰', prompt: '如何进行话费充值？' },
  { text: '流量查询', icon: '📶', prompt: '查询我的流量使用情况' },
  { text: '办理业务', icon: '📋', prompt: '我想办理新业务' },
  { text: '故障报修', icon: '🔧', prompt: '我遇到了网络故障' },
  { text: '人工客服', icon: '👥', prompt: '转接人工客服' }
]

// 历史记录
const chatHistory = ref([])

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 调用元景大模型
  loading.value = true
  try {
    const response = await chatWithHonghu(text)
    messages.value.push({ role: 'bot', content: response })
  } catch (error) {
    showToast('抱歉，服务暂时不可用')
    messages.value.push({ role: 'bot', content: '抱歉，服务暂时不可用，请稍后再试。' })
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }

  // 保存到历史
  saveToHistory(text)
}

// 快捷入口点击
const handleQuickAction = (action) => {
  inputText.value = action.prompt
  sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 保存到历史
const saveToHistory = (text) => {
  const now = new Date()
  const time = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  
  chatHistory.value.unshift({
    title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
    time,
    messages: [...messages.value]
  })

  // 最多保存20条
  if (chatHistory.value.length > 20) {
    chatHistory.value.pop()
  }

  // 存储到本地
  localStorage.setItem('chatHistory', JSON.stringify(chatHistory.value))
}

// 加载历史
const loadHistory = (item) => {
  messages.value = item.messages
  showHistory.value = false
}

// 初始化
onMounted(() => {
  // 加载历史记录
  const saved = localStorage.getItem('chatHistory')
  if (saved) {
    chatHistory.value = JSON.parse(saved)
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  background: #f5f5f5;
}
</style>