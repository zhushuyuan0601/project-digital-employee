<template>
  <div class="templates-page">
    <van-nav-bar title="模板库" fixed placeholder />
    
    <!-- 分类标签 -->
    <van-tabs v-model:active="activeCategory" sticky>
      <van-tab title="热门" name="hot" />
      <van-tab title="节日" name="festival" />
      <van-tab title="企业" name="enterprise" />
      <van-tab title="娱乐" name="entertainment" />
      <van-tab title="IP联动" name="ip" />
    </van-tabs>

    <!-- 模板列表 -->
    <div class="template-list">
      <van-grid :column-num="2" :gutter="10">
        <van-grid-item v-for="tpl in filteredTemplates" :key="tpl.id">
          <div class="template-card" @click="useTemplate(tpl)">
            <div class="template-cover">
              <img :src="tpl.cover" :alt="tpl.name" />
              <div class="template-badge" v-if="tpl.badge">{{ tpl.badge }}</div>
            </div>
            <div class="template-info">
              <div class="template-name">{{ tpl.name }}</div>
              <div class="template-meta">
                <span class="use-count">🔥 {{ tpl.useCount }}人使用</span>
              </div>
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

const router = useRouter()
const activeCategory = ref('hot')

// 模板数据
const templates = [
  { id: 1, name: '新春拜年', category: 'festival', cover: 'https://picsum.photos/200/120?random=1', useCount: 12580, badge: '热门' },
  { id: 2, name: '企业宣传', category: 'enterprise', cover: 'https://picsum.photos/200/120?random=2', useCount: 8920 },
  { id: 3, name: '生日祝福', category: 'festival', cover: 'https://picsum.photos/200/120?random=3', useCount: 6750 },
  { id: 4, name: '王者荣耀', category: 'ip', cover: 'https://picsum.photos/200/120?random=4', useCount: 15200, badge: 'IP' },
  { id: 5, name: '小猪佩奇', category: 'ip', cover: 'https://picsum.photos/200/120?random=5', useCount: 9800, badge: 'IP' },
  { id: 6, name: '趣味表情', category: 'entertainment', cover: 'https://picsum.photos/200/120?random=6', useCount: 5430 },
  { id: 7, name: '浪漫表白', category: 'entertainment', cover: 'https://picsum.photos/200/120?random=7', useCount: 7890 },
  { id: 8, name: '酒店推广', category: 'enterprise', cover: 'https://picsum.photos/200/120?random=8', useCount: 3210 },
  { id: 9, name: '元宵节', category: 'festival', cover: 'https://picsum.photos/200/120?random=9', useCount: 4560 },
  { id: 10, name: '奥特曼', category: 'ip', cover: 'https://picsum.photos/200/120?random=10', useCount: 11200, badge: 'IP' }
]

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'hot') {
    return templates.sort((a, b) => b.useCount - a.useCount)
  }
  return templates.filter(t => t.category === activeCategory.value)
})

const useTemplate = (tpl) => {
  router.push({
    path: '/create',
    query: { type: 'template', name: tpl.name }
  })
}
</script>

<style scoped>
.templates-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 60px;
}

.template-list {
  padding: 10px;
}

.template-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.template-cover {
  position: relative;
  aspect-ratio: 4/3;
}

.template-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.template-info {
  padding: 8px;
}

.template-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.template-meta {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}
</style>