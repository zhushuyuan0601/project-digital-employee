<template>
  <div class="history-page">
    <van-nav-bar title="创作历史" fixed placeholder>
      <template #right>
        <van-icon name="delete-o" size="20" @click="clearHistory" />
      </template>
    </van-nav-bar>

    <!-- 历史列表 -->
    <div class="history-list" v-if="historyList.length">
      <van-swipe-cell v-for="item in historyList" :key="item.id">
        <div class="history-item" @click="viewDetail(item)">
          <div class="history-cover">
            <van-icon name="video" size="24" color="#ccc" />
          </div>
          <div class="history-info">
            <div class="history-title">{{ item.title }}</div>
            <div class="history-meta">
              <span class="history-type">{{ item.type }}</span>
              <span class="history-time">{{ item.time }}</span>
            </div>
          </div>
          <div class="history-status">
            <van-tag :type="item.status === 'done' ? 'success' : 'warning'">
              {{ item.status === 'done' ? '已完成' : '创作中' }}
            </van-tag>
          </div>
        </div>
        <template #right>
          <van-button square type="danger" text="删除" @click="deleteItem(item.id)" />
        </template>
      </van-swipe-cell>
    </div>

    <!-- 空状态 -->
    <van-empty v-else description="暂无创作历史" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'

const historyList = ref([])

onMounted(() => {
  // 模拟历史数据
  historyList.value = [
    {
      id: 1,
      title: '新春拜年视频',
      type: '节日祝福',
      time: '2026-03-09 16:30',
      status: 'done'
    },
    {
      id: 2,
      title: '企业宣传视频',
      type: '企业服务',
      time: '2026-03-08 14:20',
      status: 'done'
    },
    {
      id: 3,
      title: '王者荣耀主题视频',
      type: 'IP联动',
      time: '2026-03-07 10:15',
      status: 'done'
    },
    {
      id: 4,
      title: '生日祝福视频',
      type: '节日祝福',
      time: '2026-03-06 09:00',
      status: 'done'
    }
  ]
})

const viewDetail = (item) => {
  showToast(`查看「${item.title}」详情`)
}

const deleteItem = (id) => {
  historyList.value = historyList.value.filter(item => item.id !== id)
  showToast('已删除')
}

const clearHistory = () => {
  showConfirmDialog({
    title: '清空历史',
    message: '确定要清空所有创作历史吗？'
  }).then(() => {
    historyList.value = []
    showToast('已清空')
  }).catch(() => {})
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.history-list {
  padding: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
}

.history-cover {
  width: 60px;
  height: 60px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.history-info {
  flex: 1;
}

.history-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #999;
}

.history-status {
  margin-left: 10px;
}
</style>