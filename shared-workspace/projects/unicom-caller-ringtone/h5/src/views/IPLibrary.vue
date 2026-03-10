<template>
  <div class="ip-library-page">
    <van-nav-bar title="IP库" fixed placeholder>
      <template #right>
        <van-icon name="search" size="20" />
      </template>
    </van-nav-bar>

    <!-- IP分类 -->
    <van-tabs v-model:active="activeCategory" sticky>
      <van-tab title="全部" name="all" />
      <van-tab title="动漫" name="anime" />
      <van-tab title="游戏" name="game" />
      <van-tab title="影视" name="movie" />
      <van-tab title="体育" name="sports" />
    </van-tabs>

    <!-- 热门IP -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">🔥 热门IP</span>
        <span class="section-more">查看全部 ></span>
      </div>
      <div class="ip-hot-list">
        <div class="ip-hot-item" v-for="ip in hotIPs" :key="ip.id" @click="selectIP(ip)">
          <div class="ip-avatar">{{ ip.emoji }}</div>
          <div class="ip-name">{{ ip.name }}</div>
        </div>
      </div>
    </div>

    <!-- IP列表 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">📦 全部IP ({{ filteredIPs.length }})</span>
      </div>
      <van-grid :column-num="3" :gutter="10">
        <van-grid-item v-for="ip in filteredIPs" :key="ip.id">
          <div class="ip-card" @click="selectIP(ip)">
            <div class="ip-avatar-lg">{{ ip.emoji }}</div>
            <div class="ip-info">
              <div class="ip-name-lg">{{ ip.name }}</div>
              <div class="ip-category">{{ ip.categoryLabel }}</div>
            </div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'

const router = useRouter()
const activeCategory = ref('all')

// IP数据
const ipList = [
  { id: 1, name: '王者荣耀', emoji: '🎮', category: 'game', categoryLabel: '游戏' },
  { id: 2, name: '小猪佩奇', emoji: '🐷', category: 'anime', categoryLabel: '动漫' },
  { id: 3, name: '奥特曼', emoji: '🦸', category: 'anime', categoryLabel: '动漫' },
  { id: 4, name: '功夫熊猫', emoji: '🐼', category: 'movie', categoryLabel: '影视' },
  { id: 5, name: '熊出没', emoji: '🐻', category: 'anime', categoryLabel: '动漫' },
  { id: 6, name: '喜羊羊', emoji: '🐑', category: 'anime', categoryLabel: '动漫' },
  { id: 7, name: '变形金刚', emoji: '🤖', category: 'movie', categoryLabel: '影视' },
  { id: 8, name: 'CBA联赛', emoji: '🏀', category: 'sports', categoryLabel: '体育' },
  { id: 9, name: '原神', emoji: '⚔️', category: 'game', categoryLabel: '游戏' },
  { id: 10, name: '英雄联盟', emoji: '🎯', category: 'game', categoryLabel: '游戏' },
  { id: 11, name: '海绵宝宝', emoji: '🧽', category: 'anime', categoryLabel: '动漫' },
  { id: 12, name: '哆啦A梦', emoji: '🤖', category: 'anime', categoryLabel: '动漫' }
]

const hotIPs = ipList.slice(0, 5)

const filteredIPs = computed(() => {
  if (activeCategory.value === 'all') return ipList
  return ipList.filter(ip => ip.category === activeCategory.value)
})

const selectIP = (ip) => {
  showDialog({
    title: `使用「${ip.name}」创作`,
    message: '选择创作类型后开始创作',
    showCancelButton: true,
    confirmButtonText: '立即创作',
    cancelButtonText: '取消'
  }).then(() => {
    router.push({
      path: '/create',
      query: { type: 'ip', name: ip.name }
    })
  }).catch(() => {})
}
</script>

<style scoped>
.ip-library-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.section {
  padding: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-more {
  font-size: 12px;
  color: #999;
}

.ip-hot-list {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.ip-hot-item {
  text-align: center;
  flex-shrink: 0;
}

.ip-avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 6px;
}

.ip-name {
  font-size: 12px;
  color: #333;
}

.ip-card {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.ip-avatar-lg {
  width: 50px;
  height: 50px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 8px;
}

.ip-name-lg {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.ip-category {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
</style>