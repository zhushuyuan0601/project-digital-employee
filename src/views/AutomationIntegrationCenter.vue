<template>
  <div class="center-page">
    <header class="center-header">
      <div>
        <p class="center-kicker">Automation Fabric</p>
        <h1>自动化与集成中心</h1>
        <p class="center-desc">统一管理定时触发、外部回调和系统自动化联动，减少调度能力分散带来的运维视角断裂。</p>
      </div>
    </header>

    <div class="center-tabs center-tabs--dual">
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
      <Cron v-if="activeTab === 'cron'" />
      <Webhooks v-else />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cron from '@/views/Cron.vue'
import Webhooks from '@/views/Webhooks.vue'

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

function setTab(tab: AutomationTab) {
  router.replace({
    path: '/automation',
    query: tab === 'cron' ? {} : { tab },
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
    radial-gradient(circle at top left, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 36%),
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
  gap: 12px;
}

.center-tabs--dual {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

@media (max-width: 860px) {
  .center-page {
    padding: 12px;
  }

  .center-tabs--dual {
    grid-template-columns: 1fr;
  }
}
</style>
