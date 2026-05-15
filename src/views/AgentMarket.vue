<template>
  <div class="agent-market">
    <header class="market-hero">
      <div>
        <p class="eyebrow">Agent Market</p>
        <h1>Agent 市场</h1>
        <span>浏览数字员工能力卡，按场景启停可路由 Agent。</span>
      </div>
      <button class="primary-btn" :disabled="registry.loading" @click="registry.fetchAgents()">
        <i class="ri-refresh-line"></i>
        {{ registry.loading ? '刷新中' : '刷新市场' }}
      </button>
    </header>

    <section class="market-toolbar">
      <label class="search-box">
        <i class="ri-search-line"></i>
        <input v-model="query" placeholder="搜索 Agent、能力、关键词" />
      </label>
      <div class="category-tabs">
        <button
          v-for="category in departmentFilters"
          :key="category"
          type="button"
          :class="{ active: activeCategory === category }"
          @click="activeCategory = category"
        >
          {{ categoryLabel(category) }}
        </button>
      </div>
    </section>

    <section class="market-directory">
      <div>
        <span>部门</span>
        <div class="filter-pills">
          <button
            v-for="category in departmentFilters"
            :key="category"
            type="button"
            :class="{ active: activeCategory === category }"
            @click="activeCategory = category"
          >
            {{ categoryLabel(category) }}
          </button>
        </div>
      </div>
      <div>
        <span>场景</span>
        <div class="filter-pills">
          <button
            v-for="scene in sceneFilters"
            :key="scene"
            type="button"
            :class="{ active: activeScene === scene }"
            @click="activeScene = scene"
          >
            {{ sceneLabel(scene) }}
          </button>
        </div>
      </div>
      <div>
        <span>能力</span>
        <div class="filter-pills">
          <button
            v-for="skill in skillFilters"
            :key="skill"
            type="button"
            :class="{ active: activeSkill === skill }"
            @click="activeSkill = skill"
          >
            {{ skillLabel(skill) }}
          </button>
        </div>
      </div>
    </section>

    <section class="market-summary">
      <div>
        <strong>{{ registry.agents.length }}</strong>
        <span>市场 Agent</span>
      </div>
      <div>
        <strong>{{ registry.routableAgents.length }}</strong>
        <span>可路由</span>
      </div>
      <div>
        <strong>{{ departmentFilters.length - 1 }}</strong>
        <span>部门目录</span>
      </div>
    </section>

    <section class="agent-grid">
      <article
        v-for="agent in filteredAgents"
        :key="agent.id"
        class="market-card"
        :class="{ disabled: !agent.enabled, hidden: agent.marketVisible === false }"
        @click="openAgent(agent)"
      >
        <div class="market-card__top">
          <span class="agent-icon">{{ iconInitial(agent) }}</span>
          <div class="market-card__title">
            <strong>{{ agent.name }}</strong>
            <small>{{ agent.roleName }}</small>
          </div>
          <span class="state-dot" :class="{ on: agent.enabled }"></span>
        </div>

        <p>{{ agent.description }}</p>

        <div class="tag-row">
          <span>{{ categoryLabel(agent.category || 'general') }}</span>
          <span>{{ agent.riskLevel }}</span>
          <span>{{ agent.routingProfile?.costTier || 'medium' }}</span>
        </div>

        <div class="skill-row">
          <span v-for="intent in (agent.capabilityProfile?.intents || []).slice(0, 3)" :key="intent">{{ intent }}</span>
        </div>

        <div class="market-card__foot" @click.stop>
          <button class="text-btn" type="button" @click="openAgent(agent)">查看详情</button>
          <label class="switch">
            <input
              type="checkbox"
              :checked="agent.enabled"
              :disabled="agent.coordinator || registry.savingAgentId === agent.id"
              @change="registry.updateAgent(agent.id, { enabled: ($event.target as HTMLInputElement).checked })"
            />
            <span>{{ agent.enabled ? '启用' : '停用' }}</span>
          </label>
        </div>
      </article>
    </section>

    <el-empty v-if="!registry.loading && !filteredAgents.length" description="没有匹配的 Agent" />

    <el-dialog v-model="detailVisible" width="760px" class="agent-detail-dialog" destroy-on-close>
      <template #header>
        <div v-if="activeAgent" class="detail-header">
          <span class="agent-icon agent-icon--large">{{ iconInitial(activeAgent) }}</span>
          <div>
            <p class="eyebrow">Capability Card</p>
            <h2>{{ activeAgent.name }}</h2>
            <span>{{ activeAgent.roleName }} · {{ activeAgent.id }}</span>
          </div>
          <span class="detail-status" :class="{ on: activeAgent.enabled }">
            {{ activeAgent.enabled ? '可路由' : '已停用' }}
          </span>
        </div>
      </template>

      <div v-if="activeAgent" class="detail-body">
        <p class="detail-description">{{ activeAgent.description }}</p>
        <p class="boundary">{{ activeAgent.boundary }}</p>

        <div class="detail-grid">
          <div>
            <span>能力意图</span>
            <strong>{{ joinList(activeAgent.capabilityProfile?.intents) }}</strong>
          </div>
          <div>
            <span>领域</span>
            <strong>{{ joinList(activeAgent.capabilityProfile?.domains) }}</strong>
          </div>
          <div>
            <span>输入制品</span>
            <strong>{{ joinList(activeAgent.capabilityProfile?.inputArtifacts || activeAgent.inputContract) }}</strong>
          </div>
          <div>
            <span>输出制品</span>
            <strong>{{ joinList(activeAgent.capabilityProfile?.outputArtifacts || activeAgent.outputContract) }}</strong>
          </div>
        </div>

        <section class="detail-section">
          <h3>能力契约</h3>
          <div class="contract-panel">
            <div>
              <span>使命</span>
              <p>{{ activeAgent.contractProfile?.mission || activeAgent.description }}</p>
            </div>
            <div>
              <span>交付物</span>
              <p>{{ joinList(activeAgent.contractProfile?.deliverables || activeAgent.outputContract) }}</p>
            </div>
            <div>
              <span>失败策略</span>
              <p>{{ activeAgent.contractProfile?.failurePolicy || '--' }}</p>
            </div>
          </div>
        </section>

        <section class="detail-section">
          <h3>路由关键词</h3>
          <div class="skill-row skill-row--wrap">
            <span v-for="keyword in activeAgent.routingProfile?.routeKeywords || []" :key="keyword">{{ keyword }}</span>
          </div>
        </section>

        <section class="detail-section">
          <h3>治理与工具</h3>
          <div class="detail-grid compact">
            <div>
              <span>权限范围</span>
              <strong>{{ activeAgent.governanceProfile?.permissionScope || '--' }}</strong>
            </div>
            <div>
              <span>并发</span>
              <strong>{{ activeAgent.maxConcurrency }}</strong>
            </div>
            <div>
              <span>审批</span>
              <strong>{{ activeAgent.governanceProfile?.requiresApproval ? '需要' : '不需要' }}</strong>
            </div>
            <div>
              <span>工具</span>
              <strong>{{ joinList(activeAgent.allowedTools) }}</strong>
            </div>
          </div>
        </section>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AgentDefinition } from '@/types/agent'
import { useAgentRegistryStore } from '@/stores/agentRegistry'

const registry = useAgentRegistryStore()
const query = ref('')
const activeCategory = ref('all')
const activeScene = ref('all')
const activeSkill = ref('all')
const detailVisible = ref(false)
const activeAgent = ref<AgentDefinition | null>(null)

const departmentFilters = computed(() => {
  const values = registry.agents.map(agent => agent.category || 'general').filter(Boolean)
  return ['all', ...Array.from(new Set(values))]
})

const sceneFilters = computed(() => {
  const values = registry.agents.flatMap(agent => agent.capabilityProfile?.intents || []).filter(Boolean)
  return ['all', ...Array.from(new Set(values)).slice(0, 18)]
})

const skillFilters = computed(() => {
  const values = registry.agents.flatMap(agent => agent.capabilityProfile?.skills || agent.capabilities || []).filter(Boolean)
  return ['all', ...Array.from(new Set(values)).slice(0, 24)]
})

const filteredAgents = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return registry.agents.filter((agent) => {
    const categoryMatch = activeCategory.value === 'all' || (agent.category || 'general') === activeCategory.value
    if (!categoryMatch) return false
    const sceneMatch = activeScene.value === 'all' || (agent.capabilityProfile?.intents || []).includes(activeScene.value)
    if (!sceneMatch) return false
    const skillMatch = activeSkill.value === 'all' || [...(agent.capabilityProfile?.skills || []), ...(agent.capabilities || [])].includes(activeSkill.value)
    if (!skillMatch) return false
    if (!keyword) return true
    const haystack = [
      agent.name,
      agent.id,
      agent.roleName,
      agent.description,
      agent.category,
      ...(agent.capabilities || []),
      ...(agent.capabilityProfile?.intents || []),
      ...(agent.capabilityProfile?.skills || []),
      ...(agent.routingProfile?.routeKeywords || []),
    ].join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
})

function categoryLabel(category: string) {
  return {
    all: '全部',
    research: '研究',
    product: '产品',
    engineering: '工程',
    quality: '质量',
    security: '安全',
    documentation: '文档',
    coordination: '编排',
    information: '信息',
    business: '业务',
    daily_ops: '日常',
    general: '通用',
    local: '本地',
  }[category] || category
}

function sceneLabel(scene: string) {
  return {
    all: '全部',
    route: '任务路由',
    orchestrate: '流程编排',
    summarize: '汇总',
    research: '调研',
    compare: '对比',
    fact_check: '核查',
    requirements: '需求',
    product_design: '产品设计',
    workflow_design: '流程设计',
    code_change: '代码修改',
    code_diagnosis: '代码诊断',
    implementation: '实现',
    minimal_change: '最小变更',
    frontend: '前端',
    backend: '后端',
    code_review: '代码审查',
    security_review: '安全审查',
    documentation: '文档',
    test_analysis: '测试分析',
    clarification: '需求澄清',
    selective_followup_from_report: '报告选点跟进',
    architecture: '架构',
    verify: '验证',
    test: '测试',
    review: '审查',
  }[scene] || scene
}

function skillLabel(skill: string) {
  return skill.replace(/_/g, ' ')
}

function iconInitial(agent: AgentDefinition) {
  return (agent.name || agent.id || 'A').slice(0, 1)
}

function joinList(values?: string[]) {
  return values?.length ? values.join('、') : '--'
}

function openAgent(agent: AgentDefinition) {
  activeAgent.value = agent
  detailVisible.value = true
}

onMounted(() => {
  registry.fetchAgents()
})
</script>

<style scoped>
.agent-market {
  min-height: 100%;
  padding: 24px;
  color: var(--text-primary);
  background: var(--bg-base);
}

.market-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background:
    linear-gradient(135deg, color-mix(in oklab, var(--bg-surface) 94%, var(--color-primary) 6%), var(--bg-panel));
  box-shadow: var(--shadow-sm);
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.market-hero h1,
.detail-header h2 {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0;
}

.market-hero h1 {
  font-size: 30px;
}

.market-hero span,
.detail-header span,
.market-card small,
.market-card p,
.detail-grid span,
.detail-description,
.boundary {
  color: var(--text-secondary);
}

.market-toolbar {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 18px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tabs button,
.primary-btn,
.text-btn {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font: inherit;
  cursor: pointer;
}

.category-tabs button {
  height: 42px;
  padding: 0 14px;
  color: var(--text-secondary);
  background: var(--bg-surface);
}

.category-tabs button.active {
  color: var(--text-on-primary);
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  color: var(--text-on-primary);
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.market-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.market-directory {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.market-directory > div {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.market-directory > div > span {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 30px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pills button {
  min-height: 30px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 0 10px;
  color: var(--text-secondary);
  background: var(--bg-panel);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.filter-pills button.active {
  color: var(--text-on-primary);
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.market-summary div {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.market-summary strong {
  font-size: 24px;
}

.market-summary span {
  color: var(--text-tertiary);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.market-card {
  display: grid;
  gap: 14px;
  min-height: 260px;
  padding: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.market-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--color-primary) 46%, var(--border-subtle));
  box-shadow: var(--shadow-md);
}

.market-card.disabled {
  opacity: 0.72;
}

.market-card.hidden {
  display: none;
}

.market-card__top,
.market-card__foot,
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.market-card__top {
  align-items: flex-start;
}

.market-card__title {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}

.market-card__title strong {
  overflow-wrap: anywhere;
}

.agent-icon {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 12px;
  color: var(--text-on-primary);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  font-weight: 700;
}

.agent-icon--large {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  font-size: 20px;
}

.state-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--text-muted);
}

.state-dot.on {
  background: var(--color-success);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-success) 18%, transparent);
}

.market-card p {
  margin: 0;
  min-height: 66px;
  line-height: 1.55;
}

.tag-row,
.skill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-row span,
.skill-row span,
.detail-status {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 5px 9px;
  color: var(--text-secondary);
  background: color-mix(in oklab, var(--bg-panel) 80%, var(--bg-base));
  font-size: 12px;
}

.skill-row span {
  color: var(--color-primary);
  background: color-mix(in oklab, var(--color-primary) 10%, var(--bg-surface));
}

.market-card__foot {
  justify-content: space-between;
  align-self: end;
  padding-top: 4px;
}

.text-btn {
  padding: 8px 10px;
  color: var(--color-primary);
  background: transparent;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.detail-header {
  padding-right: 24px;
}

.detail-header > div {
  flex: 1;
}

.detail-status.on {
  color: var(--color-success);
  border-color: color-mix(in oklab, var(--color-success) 36%, var(--border-subtle));
}

.detail-body {
  display: grid;
  gap: 16px;
}

.detail-description,
.boundary {
  margin: 0;
  line-height: 1.65;
}

.boundary {
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-panel);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.detail-grid div {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.detail-grid strong {
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.detail-section {
  display: grid;
  gap: 10px;
}

.detail-section h3 {
  margin: 0;
  font-size: 16px;
}

.contract-panel {
  display: grid;
  gap: 10px;
}

.contract-panel div {
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
}

.contract-panel span {
  display: block;
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.contract-panel p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.skill-row--wrap {
  align-items: flex-start;
}

:deep(.agent-detail-dialog .el-dialog) {
  border-radius: var(--radius-md);
  background: var(--bg-panel);
}

:deep(.agent-detail-dialog .el-dialog__body),
:deep(.agent-detail-dialog .el-dialog__header) {
  color: var(--text-primary);
  background: var(--bg-panel);
}

@media (max-width: 960px) {
  .market-hero,
  .market-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .market-summary,
  .market-directory > div,
  .detail-grid,
  .detail-grid.compact {
    grid-template-columns: 1fr;
  }
}
</style>
