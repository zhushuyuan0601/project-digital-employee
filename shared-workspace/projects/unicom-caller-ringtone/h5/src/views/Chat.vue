<template>
  <div class="chat-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="联通智铃" fixed placeholder>
      <template #right>
        <van-icon name="setting-o" size="20" />
      </template>
    </van-nav-bar>

    <!-- 聊天区域 -->
    <div class="chat-container" ref="chatContainer">
      <div class="message-list">
        <!-- 欢迎消息 -->
        <div class="welcome-section" v-if="messages.length <= 1">
          <div class="avatar-large">🤖</div>
          <h2>你好，我是联通小鸿</h2>
          <p>AI智能创作助手，帮你轻松创作视频彩铃</p>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-item', msg.role]"
        >
          <div class="avatar">{{ msg.role === 'bot' ? '🤖' : '👤' }}</div>
          <div class="message-content">
            <div class="message-bubble">{{ msg.content }}</div>
            <!-- 选项按钮 -->
            <div class="options" v-if="msg.options && msg.options.length">
              <van-button 
                v-for="opt in msg.options" 
                :key="opt.value"
                size="small"
                type="primary"
                plain
                @click="selectOption(opt)"
              >
                {{ opt.label }}
              </van-button>
            </div>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="message-item bot">
          <div class="avatar">🤖</div>
          <div class="message-content">
            <div class="message-bubble loading">
              <van-loading size="16" color="#667eea" />
              <span>正在创作中...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions" v-if="showQuickActions">
      <div class="section-title">快捷创作</div>
      <div class="action-grid">
        <div 
          v-for="action in quickActions" 
          :key="action.id"
          class="action-card"
          @click="handleQuickAction(action)"
        >
          <div class="action-icon">{{ action.icon }}</div>
          <div class="action-text">{{ action.text }}</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <van-search
        v-model="inputText"
        placeholder="描述你想创作的视频..."
        show-action
        @search="sendMessage"
      >
        <template #action>
          <van-button 
            type="primary" 
            size="small" 
            round
            @click="sendMessage"
            :disabled="!inputText.trim() || loading"
          >
            发送
          </van-button>
        </template>
      </van-search>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const router = useRouter()
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const showQuickActions = ref(true)
const chatContainer = ref(null)
const creationState = ref({})

// 快捷入口
const quickActions = [
  { id: 1, text: '拜年祝福', icon: '🎊', prompt: '帮我创作一个拜年视频' },
  { id: 2, text: '企业宣传', icon: '🏢', prompt: '帮我创作企业宣传视频' },
  { id: 3, text: 'IP联动', icon: '🎮', prompt: '我想用IP创作视频' },
  { id: 4, text: '自由创作', icon: '✨', prompt: '我想自由创作' }
]

// 初始化欢迎消息
onMounted(() => {
  messages.value = [{
    role: 'bot',
    content: '你好！我是联通小鸿，你的AI创作助手。\n\n我可以帮你创作各种视频彩铃，你只需要告诉我你想做什么，我来帮你实现。\n\n你想创作什么类型的视频呢？'
  }]
})

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  showQuickActions.value = false

  await nextTick()
  scrollToBottom()

  // 模拟AI回复
  loading.value = true
  await new Promise(r => setTimeout(r, 1500))
  
  const response = generateResponse(text)
  messages.value.push(response)
  
  loading.value = false
  await nextTick()
  scrollToBottom()
}

// 生成AI回复（模拟）
const generateResponse = (userInput) => {
  const input = userInput.toLowerCase()
  
  // 拜年相关
  if (input.includes('拜年') || input.includes('新年')) {
    creationState.value.type = 'bainian'
    return {
      role: 'bot',
      content: '好的！帮你创作拜年视频。\n\n请问是给谁拜年呢？',
      options: [
        { label: '👴 长辈', value: 'elder' },
        { label: '👫 朋友', value: 'friend' },
        { label: '👔 客户', value: 'client' },
        { label: '👨‍👩‍👧 家人', value: 'family' }
      ]
    }
  }
  
  // IP相关
  if (input.includes('ip') || input.includes('动漫')) {
    creationState.value.type = 'ip'
    return {
      role: 'bot',
      content: '太棒了！联通有200+热门IP可以联动创作。\n\n请选择你喜欢的IP类型：',
      options: [
        { label: '🎮 王者荣耀', value: 'wzry' },
        { label: '🐷 小猪佩奇', value: 'peppa' },
        { label: '🦸 奥特曼', value: 'ultraman' },
        { label: '🐼 功夫熊猫', value: 'panda' }
      ]
    }
  }
  
  // 企业相关
  if (input.includes('企业') || input.includes('宣传')) {
    creationState.value.type = 'enterprise'
    return {
      role: 'bot',
      content: '好的！帮你创作企业宣传视频。\n\n请选择行业类型：',
      options: [
        { label: '🍽️ 餐饮', value: 'catering' },
        { label: '🏨 酒店', value: 'hotel' },
        { label: '🏪 零售', value: 'retail' },
        { label: '🏦 金融', value: 'finance' }
      ]
    }
  }
  
  // 自由创作
  if (input.includes('自由') || input.includes('创作')) {
    creationState.value.type = 'free'
    return {
      role: 'bot',
      content: '好的！请描述你想创作的视频内容，越详细越好。\n\n例如："我想做一个海边日出风格的视频，有海浪声和轻柔的音乐"'
    }
  }
  
  // 默认回复
  return {
    role: 'bot',
    content: `我理解你想做"${userInput}"相关的视频。\n\n让我帮你细化一下需求，请问你希望视频是什么风格的？`,
    options: [
      { label: '🏮 传统国风', value: 'traditional' },
      { label: '✨ 现代简约', value: 'modern' },
      { label: '🎨 卡通趣味', value: 'cartoon' },
      { label: '🌟 科技感', value: 'tech' }
    ]
  }
}

// 选择选项
const selectOption = (option) => {
  messages.value.push({ role: 'user', content: option.label })
  
  loading.value = true
  setTimeout(() => {
    // 判断是否进入创作阶段
    if (creationState.value.type) {
      // 跳转到创作页面
      router.push({
        path: '/create',
        query: { type: creationState.value.type, option: option.value }
      })
    } else {
      messages.value.push({
        role: 'bot',
        content: `好的，你选择了${option.label}风格。\n\n正在为你准备创作素材...`
      })
    }
    loading.value = false
    scrollToBottom()
  }, 1000)
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
</script>

<style scoped>
.chat-page {
  height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.welcome-section {
  text-align: center;
  padding: 40px 20px;
  color: #333;
}

.avatar-large {
  font-size: 60px;
  margin-bottom: 15px;
}

.welcome-section h2 {
  font-size: 20px;
  margin-bottom: 10px;
}

.welcome-section p {
  font-size: 14px;
  color: #666;
}

.message-list {
  padding-bottom: 20px;
}

.message-item {
  display: flex;
  margin-bottom: 15px;
  padding: 0 10px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.message-content {
  max-width: 70%;
  margin: 0 10px;
}

.message-bubble {
  background: #fff;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  white-space: pre-wrap;
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.quick-actions {
  background: #fff;
  padding: 15px;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
}

.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-card {
  text-align: center;
  padding: 12px 8px;
  background: #f7f8fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:active {
  transform: scale(0.95);
  background: #eee;
}

.action-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.action-text {
  font-size: 12px;
  color: #333;
}

.input-area {
  background: #fff;
  padding: 10px;
  border-top: 1px solid #eee;
}
</style>