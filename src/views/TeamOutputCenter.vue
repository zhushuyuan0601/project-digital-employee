<template>
  <div class="center-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ currentPageTitle }}</h1>
        <p class="page-subtitle">{{ currentPageDesc }}</p>
      </div>
    </header>

    <div class="filters-bar">
      <div class="tab-group">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <section class="center-panel">
      <Agents v-if="activeTab === 'team'" />
      <DigitalEmployee v-else-if="activeTab === 'projects'" view-mode="projects" :embedded="true" />
      <DigitalEmployee v-else view-mode="outputs" :embedded="true" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Agents from '@/views/Agents.vue'
import DigitalEmployee from '@/views/DigitalEmployee.vue'

type TeamTab = 'team' | 'projects' | 'outputs'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'team', label: '团队态势', meta: '成员在线状态与当前职责' },
  { key: 'projects', label: '项目看板', meta: '项目进度、阶段与责任分工' },
  { key: 'outputs', label: '成果库', meta: '报告、文档、代码与产出检索' },
] as const

const activeTab = computed<TeamTab>(() => {
  const tab = route.query.tab
  if (tab === 'projects' || tab === 'outputs') {
    return tab
  }
  return 'team'
})

const currentPageTitle = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.label || '团队与产出中心'
})

const currentPageDesc = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.meta || ''
})

function setTab(tab: TeamTab) {
  router.replace({
    path: '/team-output',
    query: tab === 'team' ? {} : { tab },
  })
}
</script>

<style scoped>
.center-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 页面头部 */
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

.tab-group {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-panel);
}

.tab-btn.active {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.2);
}

/* 内容面板 */
.center-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 32px;
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px 0;
  }

  .filters-bar {
    padding: 12px 20px;
  }

  .center-panel {
    padding: 16px 20px;
  }
}
</style>
