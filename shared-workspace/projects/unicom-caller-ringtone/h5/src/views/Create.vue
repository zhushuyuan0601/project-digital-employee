<template>
  <div class="create-page">
    <van-nav-bar title="创作中" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <!-- 创作进度 -->
    <div class="progress-section">
      <van-circle
        v-model:current-rate="currentRate"
        :rate="progress"
        :speed="100"
        :text="progressText"
        size="120px"
        color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />
      <div class="status-text">{{ statusText }}</div>
    </div>

    <!-- 创作预览 -->
    <div class="preview-section">
      <div class="preview-box">
        <div class="preview-placeholder">
          <van-icon name="video" size="48" color="#ccc" />
          <p>视频生成预览</p>
        </div>
      </div>
    </div>

    <!-- 创作信息 -->
    <div class="info-section">
      <van-cell-group inset>
        <van-cell title="创作类型" :value="createType" />
        <van-cell title="风格选择" :value="styleType" />
        <van-cell title="预计时长" value="约3分钟" />
        <van-cell title="使用IP" :value="ipName" v-if="ipName" />
      </van-cell-group>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <van-button type="primary" block round @click="finishCreate" :disabled="progress < 100">
        完成，设为彩铃
      </van-button>
      <van-button plain block round @click="regenerate" style="margin-top: 10px" :disabled="progress < 100">
        不满意，重新生成
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()

const progress = ref(0)
const currentRate = ref(0)
const statusText = ref('正在分析需求...')
const createType = ref('拜年祝福')
const styleType = ref('传统国风')
const ipName = ref('')

const progressText = computed(() => `${Math.round(progress.value)}%`)

// 创作步骤
const steps = [
  { progress: 10, text: '正在分析需求...' },
  { progress: 25, text: '正在生成分镜脚本...' },
  { progress: 40, text: '正在渲染画面...' },
  { progress: 60, text: '正在添加特效...' },
  { progress: 75, text: '正在合成配乐...' },
  { progress: 90, text: '正在优化视频...' },
  { progress: 100, text: '创作完成！' }
]

let currentStep = 0

onMounted(() => {
  // 解析参数
  const { type, option } = route.query
  
  if (type === 'bainian') {
    createType.value = '拜年祝福'
    styleType.value = '温馨家庭'
  } else if (type === 'ip') {
    createType.value = 'IP联动创作'
    if (option === 'wzry') ipName.value = '王者荣耀'
    else if (option === 'peppa') ipName.value = '小猪佩奇'
    else if (option === 'ultraman') ipName.value = '奥特曼'
    else if (option === 'panda') ipName.value = '功夫熊猫'
  } else if (type === 'enterprise') {
    createType.value = '企业宣传'
    if (option === 'catering') styleType.value = '餐饮行业'
    else if (option === 'hotel') styleType.value = '酒店行业'
    else if (option === 'retail') styleType.value = '零售行业'
    else if (option === 'finance') styleType.value = '金融行业'
  }
  
  // 模拟创作进度
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      progress.value = steps[currentStep].progress
      statusText.value = steps[currentStep].text
      currentStep++
    } else {
      clearInterval(interval)
    }
  }, 1000)
})

const finishCreate = () => {
  showToast({
    type: 'success',
    message: '设置成功！',
    duration: 2000
  })
  setTimeout(() => {
    router.push('/mine')
  }, 2000)
}

const regenerate = () => {
  progress.value = 0
  currentStep = 0
  statusText.value = '正在重新创作...'
  
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      progress.value = steps[currentStep].progress
      statusText.value = steps[currentStep].text
      currentStep++
    } else {
      clearInterval(interval)
    }
  }, 800)
}
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 100px;
}

.progress-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.status-text {
  margin-top: 15px;
  font-size: 16px;
}

.preview-section {
  padding: 20px;
}

.preview-box {
  background: #000;
  border-radius: 12px;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-placeholder {
  text-align: center;
  color: #fff;
}

.preview-placeholder p {
  margin-top: 10px;
  color: #999;
  font-size: 14px;
}

.info-section {
  margin: 20px 0;
}

.action-buttons {
  position: fixed;
  bottom: 70px;
  left: 0;
  right: 0;
  padding: 0 20px;
}
</style>