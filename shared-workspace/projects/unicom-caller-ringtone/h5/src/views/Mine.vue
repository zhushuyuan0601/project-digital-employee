<template>
  <div class="mine-page">
    <van-nav-bar title="我的" fixed placeholder />

    <!-- 用户信息 -->
    <div class="user-section">
      <div class="user-avatar">👤</div>
      <div class="user-info">
        <div class="user-name">联通用户</div>
        <div class="user-phone">138****8888</div>
      </div>
      <van-icon name="arrow" color="#999" />
    </div>

    <!-- 我的服务 -->
    <van-cell-group inset title="我的服务">
      <van-cell title="我的彩铃" icon="video-o" is-link :value="ringtoneCount" />
      <van-cell title="创作历史" icon="clock-o" is-link to="/history" :value="historyCount" />
      <van-cell title="我的收藏" icon="star-o" is-link :value="favoriteCount" />
    </van-cell-group>

    <!-- 创作统计 -->
    <van-cell-group inset title="创作统计">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总创作数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.viewed }}</div>
          <div class="stat-label">被播放次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.liked }}</div>
          <div class="stat-label">获得点赞</div>
        </div>
      </div>
    </van-cell-group>

    <!-- 功能列表 -->
    <van-cell-group inset title="更多功能">
      <van-cell title="帮助中心" icon="question-o" is-link />
      <van-cell title="意见反馈" icon="comment-o" is-link />
      <van-cell title="设置" icon="setting-o" is-link />
      <van-cell title="关于" icon="info-o" is-link value="v2.0.0" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const ringtoneCount = ref('3个')
const historyCount = ref('12个')
const favoriteCount = ref('8个')

const stats = ref({
  total: 12,
  viewed: 1258,
  liked: 89
})
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.user-section {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.user-avatar {
  width: 60px;
  height: 60px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-right: 15px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-phone {
  font-size: 14px;
  opacity: 0.8;
}

.stats-grid {
  display: flex;
  padding: 20px 0;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>