<template>
  <div class="center-page">
    <header class="center-header">
      <div>
        <p class="center-kicker">Unified Runtime Lens</p>
        <h1>运行观测中心</h1>
        <p class="center-desc">把系统总览、健康状态和事件流统一到一个连续工作面，避免在多个页面之间来回切换。</p>
      </div>
    </header>

    <div class="center-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="center-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="setTab(tab.key)"
      >
        <strong>{{ tab.label }}</strong>
        <span>{{ tab.meta }}</span>
      </button>
    </div>

    <section class="center-panel">
      <Dashboard v-if="activeTab === 'overview'" />
      <Status v-else-if="activeTab === 'health'" />
      <Logs v-else />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Status from '@/views/Status.vue'
import Logs from '@/views/Logs.vue'

type ObservabilityTab = 'overview' | 'health' | 'events'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'overview', label: '总览', meta: '任务态势与系统摘要' },
  { key: 'health', label: '健康度', meta: '连接质量与资源状态' },
  { key: 'events', label: '事件流', meta: '日志、审批与运行轨迹' },
] as const

const activeTab = computed<ObservabilityTab>(() => {
  const tab = route.query.tab
  if (tab === 'health' || tab === 'events') {
    return tab
  }
  return 'overview'
})

function setTab(tab: ObservabilityTab) {
  router.replace({
    path: '/dashboard',
    query: tab === 'overview' ? {} : { tab },
  })
}
</script>

<style scoped>
.center-page {
  display: grid;
  gap: 18px;
  padding: 20px;
}

.center-header {
  padding: 24px 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 12%, transparent), transparent 36%),
    var(--bg-panel);
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.center-kicker {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.center-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 2rem;
}

.center-desc {
  margin: 10px 0 0;
  max-width: 52rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.center-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.center-tab {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 0;
  border-radius: 20px;
  text-align: left;
  background: var(--bg-panel);
  box-shadow: inset 0 0 0 1px var(--border-default);
  color: var(--text-secondary);
}

.center-tab strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.center-tab span {
  font-size: 0.82rem;
}

.center-tab.is-active {
  background: color-mix(in oklab, var(--color-primary) 12%, var(--bg-panel));
}

.center-panel {
  min-width: 0;
}

@media (max-width: 860px) {
  .center-page {
    padding: 12px;
  }

  .center-tabs {
    grid-template-columns: 1fr;
  }
}
</style>
