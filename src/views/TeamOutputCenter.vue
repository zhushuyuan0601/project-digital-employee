<template>
  <div class="center-page">
    <header class="center-header">
      <div>
        <p class="center-kicker">Agent Team Operations</p>
        <h1>团队与产出中心</h1>
        <p class="center-desc">围绕团队成员、项目推进和成果资产组织统一经营入口，减少“看状态”和“看产出”分散在不同页面的问题。</p>
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

function setTab(tab: TeamTab) {
  router.replace({
    path: '/team-output',
    query: tab === 'team' ? {} : { tab },
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
  background: color-mix(in oklab, var(--color-secondary) 10%, var(--bg-panel));
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
