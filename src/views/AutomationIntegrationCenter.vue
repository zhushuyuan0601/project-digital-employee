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
      <Cron v-if="activeTab === 'cron'" />
      <Webhooks v-else />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cron from '@/components/automation/CronPanel.vue'
import Webhooks from '@/components/automation/WebhooksPanel.vue'

type AutomationTab = 'cron' | 'webhooks'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'cron', label: '定时任务', meta: '调度、启停与立即执行' },
  { key: 'webhooks', label: 'Webhook 集成', meta: '外部通知、回调与投递记录' },
] as const

const activeTab = computed<AutomationTab>(() => {
  return route.query.tab === 'webhooks' ? 'webhooks' : 'cron'
})

const currentPageTitle = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.label || '自动化与集成中心'
})

const currentPageDesc = computed(() => {
  const t = tabs.find(t => t.key === activeTab.value)
  return t?.meta || ''
})

function setTab(tab: AutomationTab) {
  router.replace({
    path: '/automation',
    query: tab === 'cron' ? {} : { tab },
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
