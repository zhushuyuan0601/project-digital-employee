<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <van-nav-bar title="联通智能客服" fixed placeholder>
      <template #right>
        <van-icon name="ellipsis" size="20" @click="showHistory = true" />
      </template>
    </van-nav-bar>

    <!-- 标签栏 -->
    <van-tabbar v-model="activeTab" active-color="#667eea" inactive-color="#666">
      <van-tabbar-item name="chat" icon="chat-o">对话</van-tabbar-item>
      <van-tabbar-item name="mission-control" icon="apps-o">开发监控</van-tabbar-item>
      <van-tabbar-item name="star-office" icon="star-o">像素办公室</van-tabbar-item>
    </van-tabbar>

    <!-- 对话 Tab -->
    <div v-if="activeTab === 'chat'" class="tab-content">
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
    </div>

    <!-- Mission Control 看板 Tab -->
    <div v-if="activeTab === 'mission-control'" class="tab-content full-height">
      <iframe
        src="http://localhost:5173/"
        width="100%"
        height="100%"
        frameborder="0"
        allow="encrypted-media"
        class="iframe-content"
      ></iframe>
    </div>

    <!-- Star Office UI Tab -->
    <div v-if="activeTab === 'star-office'" class="tab-content full-height">
      <iframe
        src="http://127.0.0.1:19000/"
        width="100%"
        height="100%"
        frameborder="0"
        class="iframe-content"
      ></iframe>
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

// 当前激活的 Tab
const activeTab = ref('chat')

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
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fff;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.avatar.bot {
  background: #667eea;
}

.avatar.user {
  background: #f0f0f0;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-bubble.bot {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-bubble.user {
  background: #667eea;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
}

.quick-btn {
  padding: 12px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

.input-area {
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom);
}

.history-panel {
  padding: 16px;
  overflow-y: auto;
  height: calc(100% - 46px);
}

.history-item {
  padding: 12px;
  border-radius: 8px;
  background: #f0f0f0;
  margin-bottom: 12px;
  cursor: pointer;
}

.history-item:hover {
  background: #e0e0e0;
}

.history-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #999;
}

.full-height {
  height: calc(100vh - 94px);
}

.iframe-content {
  width: 100%;
  height: 100%;
  border: none;
}
</style>