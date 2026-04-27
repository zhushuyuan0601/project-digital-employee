<template>
  <div class="center-page">
    <header class="center-header">
      <div>
        <p class="center-kicker">Capability Surface</p>
        <h1>能力中心</h1>
        <p class="center-desc">把工具目录和技能管理放进同一个能力经营入口，统一管理 Agent 可调用、可安装、可维护的能力资产。</p>
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
      <Tools v-if="activeTab === 'tools'" />
      <SkillsHub v-else />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tools from '@/views/Tools.vue'
import SkillsHub from '@/views/SkillsHub.vue'

type CapabilityTab = 'tools' | 'skills'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'tools', label: '工具目录', meta: '系统工具、启停状态与说明' },
  { key: 'skills', label: '技能管理', meta: '安装、更新、卸载与注册表检索' },
] as const

const activeTab = computed<CapabilityTab>(() => {
  return route.query.tab === 'skills' ? 'skills' : 'tools'
})

function setTab(tab: CapabilityTab) {
  router.replace({
    path: '/capability',
    query: tab === 'tools' ? {} : { tab },
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
    radial-gradient(circle at top left, color-mix(in oklab, var(--color-secondary) 10%, transparent), transparent 36%),
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
  background: color-mix(in oklab, var(--color-secondary) 12%, var(--bg-panel));
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
