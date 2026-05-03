<template>
  <div class="capability-page">
    <!-- 左侧边栏 -->
    <aside class="capability-sidebar">
      <div class="sidebar-section">
        <div class="sidebar-section__title">能力库管理</div>
        <div
          v-for="item in statusFilters"
          :key="item.key"
          class="sidebar-item"
          :class="{ active: activeStatusFilter === item.key }"
          @click="activeStatusFilter = item.key as StatusFilter"
        >
          <div class="sidebar-item__left">
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </div>
          <span class="sidebar-badge">{{ item.count }}</span>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section__title">分类目录</div>
        <div
          v-for="cat in categoryFilters"
          :key="cat.key"
          class="sidebar-item"
          :class="{ active: activeCategory === cat.key }"
          @click="activeCategory = activeCategory === cat.key ? 'all' : cat.key"
        >
          <div class="sidebar-item__left">
            <i :class="cat.icon"></i>
            <span>{{ cat.label }}</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section__title">能力类型</div>
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="sidebar-item"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          <div class="sidebar-item__left">
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="capability-main">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ currentPageTitle }}</h1>
          <p class="page-subtitle">{{ currentPageDesc }}</p>
        </div>
        <button class="btn-primary" @click="handlePrimaryAction">
          <i class="ri-add-line"></i>
          {{ activeTab === 'tools' ? '新增工具' : '安装技能' }}
        </button>
      </div>

      <div class="filters-bar">
        <div class="filter-group">
          <select v-model="activeCategory" class="filter-select">
            <option value="all">所有分类</option>
            <option v-for="cat in categoryFilters" :key="cat.key" :value="cat.key">{{ cat.label }}</option>
          </select>
          <select v-model="activeStatusFilter" class="filter-select">
            <option value="all">所有状态</option>
            <option value="active">已启用</option>
            <option value="inactive">已停用</option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="updated">按更新时间排序</option>
            <option value="name">按名称排序</option>
            <option value="usage">按使用量排序</option>
          </select>
        </div>
        <div class="filter-right">
          <div class="search-box">
            <i class="ri-search-line"></i>
            <input v-model="searchQuery" type="text" placeholder="搜索工具、服务或技能..." />
          </div>
          <div class="view-toggle">
            <button class="view-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
              <i class="ri-grid-fill"></i>
            </button>
            <button class="view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
              <i class="ri-list-check"></i>
            </button>
          </div>
        </div>
      </div>

      <section class="content-area">
        <Tools
          v-if="activeTab === 'tools'"
          :search-query="searchQuery"
          :category-filter="activeCategory"
          :status-filter="activeStatusFilter"
          :sort-by="sortBy"
          :view-mode="viewMode"
        />
        <SkillsHub v-else />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tools from '@/components/capability/ToolsPanel.vue'
import SkillsHub from '@/components/capability/SkillsHubPanel.vue'

type CapabilityTab = 'tools' | 'skills'
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'
type ViewMode = 'grid' | 'list'

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const activeStatusFilter = ref<string>('all')
const activeCategory = ref('all')
const sortBy = ref('updated')
const viewMode = ref<ViewMode>('grid')

const tabs = [
  { key: 'tools', label: '工具目录', icon: 'ri-apps-2-line' },
  { key: 'skills', label: '技能管理', icon: 'ri-magic-line' },
] as const

const statusFilters = computed(() => [
  { key: 'all', label: '全部能力', icon: 'ri-apps-2-line', count: 24 },
  { key: 'active', label: '已启用', icon: 'ri-check-double-line', count: 18 },
  { key: 'pending', label: '待审核', icon: 'ri-time-line', count: 3 },
  { key: 'inactive', label: '已停用', icon: 'ri-stop-circle-line', count: 3 },
])

const categoryFilters = [
  { key: 'data', label: '数据处理', icon: 'ri-database-2-line' },
  { key: 'dev', label: '开发构建', icon: 'ri-code-box-line' },
  { key: 'monitor', label: '监控分析', icon: 'ri-line-chart-line' },
  { key: 'security', label: '安全认证', icon: 'ri-shield-keyhole-line' },
  { key: 'communication', label: '通信协作', icon: 'ri-message-3-line' },
]

const activeTab = computed<CapabilityTab>(() => {
  return route.query.tab === 'skills' ? 'skills' : 'tools'
})

const currentPageTitle = computed(() => {
  if (activeTab.value === 'skills') return '技能管理'
  const status = statusFilters.value.find(s => s.key === activeStatusFilter.value)
  return status?.label || '全部能力'
})

const currentPageDesc = computed(() => {
  if (activeTab.value === 'skills') return '安装、更新、卸载与注册表检索'
  return '系统工具、启停状态与配置管理'
})

function setTab(tab: CapabilityTab) {
  router.replace({
    path: '/capability',
    query: tab === 'tools' ? {} : { tab },
  })
}

function handlePrimaryAction() {
  // handled by child components
}
</script>

<style scoped>
.capability-page {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 侧边栏 */
.capability-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-default);
  padding: 20px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-section__title {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 12px;
  font-weight: 600;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 2px;
  font-size: 13px;
}

.sidebar-item__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-item i {
  color: var(--text-tertiary);
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.sidebar-item:hover {
  background: var(--bg-panel-hover);
}

.sidebar-item.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.sidebar-item.active i {
  color: var(--color-primary);
}

.sidebar-badge {
  background: var(--bg-panel-hover);
  color: var(--text-secondary);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-family: var(--font-mono);
  min-width: 24px;
  text-align: center;
}

.sidebar-item.active .sidebar-badge {
  background: var(--color-primary);
  color: var(--text-inverse);
}

/* 主内容区 */
.capability-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 0;
  flex-shrink: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 6px 0 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

/* 筛选栏 */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  margin-top: 16px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
  gap: 16px;
}

.filter-group {
  display: flex;
  gap: 10px;
}

.filter-select {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  padding: 6px 28px 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238b949e'%3E%3Cpath d='M12 15.0006L7.75732 10.758L9.17154 9.34375L12 12.1722L14.8284 9.34375L16.2426 10.758L12 15.0006Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 16px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 6px 10px;
  width: 260px;
}

.search-box i {
  color: var(--text-tertiary);
  margin-right: 8px;
  font-size: 14px;
}

.search-box input {
  background: none;
  border: none;
  color: var(--text-primary);
  outline: none;
  width: 100%;
  font-size: 13px;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.view-toggle {
  display: flex;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  overflow: hidden;
}

.view-btn {
  background: none;
  border: none;
  padding: 6px 10px;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.view-btn:hover {
  color: var(--text-primary);
}

.view-btn.active {
  background: var(--bg-panel-hover);
  color: var(--text-primary);
}

/* 内容区 */
.content-area {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 32px;
}

@media (max-width: 960px) {
  .capability-sidebar {
    width: 200px;
  }

  .filters-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-right {
    width: 100%;
  }

  .search-box {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .capability-page {
    flex-direction: column;
  }

  .capability-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding: 12px;
    gap: 8px;
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }

  .sidebar-section {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .sidebar-section__title {
    display: none;
  }

  .sidebar-badge {
    display: none;
  }

  .page-header {
    padding: 16px 20px 0;
  }

  .filters-bar {
    padding: 12px 20px;
  }

  .content-area {
    padding: 16px 20px;
  }
}
</style>
