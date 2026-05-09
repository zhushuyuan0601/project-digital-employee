<template>
  <div class="agent-market">
    <header class="market-header">
      <div>
        <p class="eyebrow">Agent Market</p>
        <h1>能力市场</h1>
        <span>按能力、契约、权限、成本和风险组织可调度 Agent。</span>
      </div>
      <div class="market-header__actions">
        <button class="ghost-btn" type="button" :disabled="agentRegistry.loading" @click="refreshAgents">
          <el-icon><Refresh /></el-icon>
          {{ agentRegistry.loading ? '刷新中' : '刷新' }}
        </button>
        <button class="solid-btn" type="button" @click="createDialogOpen = true">
          <el-icon><Plus /></el-icon>
          新建 Agent
        </button>
      </div>
    </header>

    <section class="market-stats">
      <article>
        <span>可调度</span>
        <strong>{{ agentRegistry.routableAgents.length }}</strong>
      </article>
      <article>
        <span>市场可见</span>
        <strong>{{ agentRegistry.marketAgents.length }}</strong>
      </article>
      <article>
        <span>系统统筹</span>
        <strong>{{ agentRegistry.coordinatorAgents.length }}</strong>
      </article>
      <article>
        <span>历史兼容</span>
        <strong>{{ agentRegistry.legacyAgents.length }}</strong>
      </article>
    </section>

    <section class="market-workbench">
      <aside class="market-filters">
        <label>
          <span>搜索</span>
          <input v-model="filters.search" class="field" placeholder="名称、能力、场景、关键词" />
        </label>
        <label>
          <span>分类</span>
          <select v-model="filters.category" class="field">
            <option value="">全部分类</option>
            <option v-for="category in filterOptions.categories" :key="category" :value="category">
              {{ categoryLabel(category) }}
            </option>
          </select>
        </label>
        <label>
          <span>能力标签</span>
          <select v-model="filters.skill" class="field">
            <option value="">全部能力</option>
            <option v-for="skill in filterOptions.skills" :key="skill" :value="skill">{{ skill }}</option>
          </select>
        </label>
        <label>
          <span>输入类型</span>
          <select v-model="filters.inputArtifact" class="field">
            <option value="">全部输入</option>
            <option v-for="item in filterOptions.inputArtifacts" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>输出类型</span>
          <select v-model="filters.outputArtifact" class="field">
            <option value="">全部输出</option>
            <option v-for="item in filterOptions.outputArtifacts" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>工具权限</span>
          <select v-model="filters.tool" class="field">
            <option value="">全部工具</option>
            <option v-for="tool in filterOptions.tools" :key="tool" :value="tool">{{ tool }}</option>
          </select>
        </label>
        <label>
          <span>成本等级</span>
          <select v-model="filters.costTier" class="field">
            <option value="">全部成本</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>风险等级</span>
          <select v-model="filters.riskLevel" class="field">
            <option value="">全部风险</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>来源</span>
          <select v-model="filters.source" class="field">
            <option value="">全部来源</option>
            <option value="builtin">内置</option>
            <option value="local">本地</option>
            <option value="history">历史</option>
          </select>
        </label>
        <label class="check-row">
          <input v-model="filters.parallelOnly" type="checkbox" />
          <span>仅看可并发</span>
        </label>
        <label class="check-row">
          <input v-model="filters.includeHidden" type="checkbox" />
          <span>显示历史兼容</span>
        </label>
      </aside>

      <main class="market-main">
        <div class="market-toolbar">
          <div>
            <strong>{{ filteredAgents.length }}</strong>
            <span>个 Agent 匹配当前条件</span>
          </div>
          <button class="ghost-btn ghost-btn--small" type="button" @click="clearFilters">清空筛选</button>
        </div>

        <div v-if="agentRegistry.loading && !agentRegistry.agents.length" class="market-empty">
          正在读取 Agent 市场...
        </div>
        <div v-else-if="!filteredAgents.length" class="market-empty">
          没有匹配的 Agent。
        </div>
        <div v-else class="agent-grid">
          <article
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="agent-card"
            :class="{ 'agent-card--disabled': !isRoutable(agent), 'agent-card--coordinator': agent.coordinator }"
          >
            <div class="agent-card__head">
              <span class="agent-card__icon" :style="{ color: agentRegistry.agentColor(agent.id) }">
                <component :is="iconComponent(agent.icon || agentRegistry.agentIcon(agent.id))" />
              </span>
              <div>
                <strong>{{ agent.name }}</strong>
                <small>{{ agent.roleName }} · {{ agent.id }}</small>
              </div>
            </div>
            <p>{{ agent.description }}</p>
            <div class="agent-card__badges">
              <span>{{ categoryLabel(agent.category) }}</span>
              <span>{{ agent.routingProfile.costTier }}</span>
              <span :class="`risk-${agent.riskLevel}`">{{ agent.riskLevel }}</span>
              <span>{{ agent.marketProfile.source === 'builtin' ? '内置' : agent.marketProfile.source }}</span>
            </div>
            <div class="contract-row">
              <div>
                <span>输入</span>
                <strong>{{ shortList(agent.capabilityProfile.inputArtifacts) }}</strong>
              </div>
              <div>
                <span>输出</span>
                <strong>{{ shortList(agent.capabilityProfile.outputArtifacts) }}</strong>
              </div>
            </div>
            <div class="tag-list">
              <span v-for="skill in agent.capabilityProfile.skills.slice(0, 5)" :key="skill">{{ skill }}</span>
            </div>
            <div class="agent-card__footer">
              <label class="switch-row">
                <input
                  type="checkbox"
                  :checked="agent.enabled"
                  :disabled="agent.coordinator || savingAgentId === agent.id"
                  @change="toggleAgent(agent, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ isRoutable(agent) ? '可自动调度' : agent.coordinator ? '系统统筹' : '不可调度' }}</span>
              </label>
              <button type="button" class="ghost-btn ghost-btn--small" @click="selectAgent(agent)">详情</button>
            </div>
          </article>
        </div>
      </main>

      <aside class="router-preview">
        <div class="preview-head">
          <p class="eyebrow">Router Preview</p>
          <h2>路由预览</h2>
        </div>
        <textarea
          v-model="previewText"
          class="preview-input"
          rows="6"
          placeholder="输入一个任务，例如：分析代码并修复 500 错误，最后运行验证。"
        ></textarea>
        <button class="solid-btn solid-btn--full" type="button" :disabled="previewLoading || !previewText.trim()" @click="runPreview">
          <el-icon><Position /></el-icon>
          {{ previewLoading ? '分析中' : '预览路由' }}
        </button>

        <div v-if="routePreview" class="preview-result">
          <div class="preview-layers">
            <article>
              <span>规则基线</span>
              <strong>{{ routePreview.deterministicPreview.candidates.length }} 候选</strong>
              <small>{{ routePreview.deterministicPreview.workflow.length }} 节点 · {{ sourceLabel(routePreview.deterministicPreview.source) }}</small>
            </article>
            <article>
              <span>语义建议</span>
              <strong>{{ routePreview.semanticPreview.available ? '已启用' : '本地回退' }}</strong>
              <small>{{ Math.round((routePreview.semanticPreview.confidence || 0) * 100) }}% · {{ sourceLabel(routePreview.semanticPreview.source) }}</small>
            </article>
            <article :class="{ 'preview-layer--warn': routePreview.validatedRoute.validation.issues.length }">
              <span>校验结果</span>
              <strong>{{ strategyLabel(routePreview.validatedRoute.strategy) }}</strong>
              <small>{{ routePreview.validatedRoute.validation.issues.length }} 个校验提示</small>
            </article>
          </div>
          <div class="preview-section">
            <span>识别意图</span>
            <div class="tag-list">
              <span v-for="intent in routePreview.validatedRoute.intent.intents" :key="intent">{{ intent }}</span>
            </div>
          </div>
          <div class="preview-section">
            <span>融合候选排名</span>
            <ol class="candidate-list">
              <li v-for="candidate in routePreview.validatedRoute.candidates.slice(0, 5)" :key="candidate.agentId">
                <strong>{{ candidate.name }}</strong>
                <em>{{ candidate.score }}</em>
              </li>
            </ol>
          </div>
          <div class="preview-section">
            <span>推荐 DAG</span>
            <div class="route-nodes">
              <article v-for="node in routePreview.validatedRoute.workflow" :key="node.id">
                <small>{{ node.id }} · {{ node.intent }}</small>
                <strong>{{ agentRegistry.agentName(node.assignedAgentId) }}</strong>
                <p>{{ node.routingReason }}</p>
              </article>
            </div>
          </div>
          <div v-if="routePreview.semanticPreview.notes.length" class="preview-section">
            <span>语义层说明</span>
            <p>{{ routePreview.semanticPreview.notes.join('；') }}</p>
          </div>
          <div v-if="routePreview.validatedRoute.validation.issues.length" class="preview-section preview-section--warn">
            <span>校验提示</span>
            <ul class="validation-list">
              <li v-for="issue in routePreview.validatedRoute.validation.issues" :key="`${issue.layer}-${issue.nodeId}-${issue.code}-${issue.message}`">
                <strong>{{ issue.severity }}</strong>
                <span>{{ issue.message }}</span>
              </li>
            </ul>
          </div>
          <div v-if="routePreview.validatedRoute.gaps.length" class="preview-section preview-section--warn">
            <span>能力缺口</span>
            <p>{{ routePreview.validatedRoute.gaps.join('；') }}</p>
          </div>
        </div>
      </aside>
    </section>

    <Teleport to="body">
      <Transition name="agent-modal">
        <div v-if="detailOpen && selectedAgent" class="agent-modal-backdrop" @click.self="detailOpen = false">
          <section class="agent-modal" role="dialog" aria-modal="true" :aria-label="`${selectedAgent.name} 详情`">
            <header class="agent-modal__header">
              <div class="agent-modal__identity">
                <span class="agent-modal__mark" :style="{ color: agentRegistry.agentColor(selectedAgent.id) }">
                  <component :is="iconComponent(selectedAgent.icon || agentRegistry.agentIcon(selectedAgent.id))" />
                </span>
                <div>
                  <p class="eyebrow">{{ categoryLabel(selectedAgent.category) }}</p>
                  <h2>{{ selectedAgent.name }}</h2>
                  <span>{{ selectedAgent.roleName }} · {{ selectedAgent.id }}</span>
                </div>
              </div>
              <button class="agent-modal__close" type="button" aria-label="关闭" @click="detailOpen = false">
                <el-icon><Close /></el-icon>
              </button>
            </header>

            <div class="agent-modal__summary">
              <p>{{ selectedAgent.description }}</p>
              <div class="agent-modal__status">
                <span :class="{ active: isRoutable(selectedAgent) }">{{ isRoutable(selectedAgent) ? '可自动调度' : selectedAgent.coordinator ? '系统统筹' : '不可调度' }}</span>
                <span>{{ selectedAgent.marketProfile.source === 'builtin' ? '内置' : selectedAgent.marketProfile.source }}</span>
                <span>v{{ selectedAgent.version }}</span>
              </div>
            </div>

            <div class="agent-modal__metrics">
              <article>
                <span>风险</span>
                <strong :class="`risk-${selectedAgent.riskLevel}`">{{ selectedAgent.riskLevel }}</strong>
              </article>
              <article>
                <span>成本</span>
                <strong>{{ selectedAgent.routingProfile.costTier }}</strong>
              </article>
              <article>
                <span>延迟</span>
                <strong>{{ selectedAgent.routingProfile.latencyTier }}</strong>
              </article>
              <article>
                <span>并发</span>
                <strong>{{ selectedAgent.routingProfile.canRunInParallel ? '允许' : '串行' }}</strong>
              </article>
            </div>

            <main class="agent-modal__body">
              <section class="detail-panel detail-panel--wide">
                <div class="detail-panel__head">
                  <span>Capability</span>
                  <strong>能力画像</strong>
                </div>
                <div class="detail-chip-grid">
                  <div>
                    <span>意图</span>
                    <p>{{ formatList(selectedAgent.capabilityProfile.intents) }}</p>
                  </div>
                  <div>
                    <span>领域</span>
                    <p>{{ formatList(selectedAgent.capabilityProfile.domains) }}</p>
                  </div>
                  <div>
                    <span>技能</span>
                    <p>{{ formatList(selectedAgent.capabilityProfile.skills) }}</p>
                  </div>
                  <div>
                    <span>不适合</span>
                    <p>{{ formatList(selectedAgent.capabilityProfile.antiCapabilities) }}</p>
                  </div>
                </div>
              </section>

              <section class="detail-panel">
                <div class="detail-panel__head">
                  <span>Contract</span>
                  <strong>输入输出</strong>
                </div>
                <dl class="detail-list">
                  <div><dt>输入制品</dt><dd>{{ formatList(selectedAgent.capabilityProfile.inputArtifacts) }}</dd></div>
                  <div><dt>输出制品</dt><dd>{{ formatList(selectedAgent.capabilityProfile.outputArtifacts) }}</dd></div>
                  <div><dt>输入契约</dt><dd>{{ formatList(selectedAgent.inputContract) }}</dd></div>
                  <div><dt>输出契约</dt><dd>{{ formatList(selectedAgent.outputContract) }}</dd></div>
                </dl>
              </section>

              <section class="detail-panel">
                <div class="detail-panel__head">
                  <span>Routing</span>
                  <strong>路由策略</strong>
                </div>
                <dl class="detail-list">
                  <div><dt>关键词</dt><dd>{{ formatList(selectedAgent.routingProfile.routeKeywords) }}</dd></div>
                  <div><dt>适用场景</dt><dd>{{ formatList(selectedAgent.routingProfile.preferredWhen, '；') }}</dd></div>
                  <div><dt>避免场景</dt><dd>{{ formatList(selectedAgent.routingProfile.avoidWhen, '；') }}</dd></div>
                  <div><dt>前置 Agent</dt><dd>{{ formatList(selectedAgent.routingProfile.requiresAgents) }}</dd></div>
                </dl>
              </section>

              <section class="detail-panel detail-panel--wide">
                <div class="detail-panel__head">
                  <span>Governance</span>
                  <strong>权限与治理</strong>
                </div>
                <div class="governance-grid">
                  <div><span>工具权限</span><strong>{{ formatList(selectedAgent.allowedTools) }}</strong></div>
                  <div><span>权限范围</span><strong>{{ selectedAgent.governanceProfile.permissionScope || '--' }}</strong></div>
                  <div><span>数据访问</span><strong>{{ selectedAgent.governanceProfile.dataAccessLevel || '--' }}</strong></div>
                  <div><span>审批</span><strong>{{ selectedAgent.governanceProfile.requiresApproval ? '需要审批' : '无需审批' }}</strong></div>
                </div>
              </section>
            </main>
          </section>
        </div>
      </Transition>
    </Teleport>

    <el-dialog v-model="createDialogOpen" title="新建本地 Agent" width="560px">
      <div class="create-form">
        <label><span>ID</span><input v-model="createForm.id" class="field" placeholder="local_writer" /></label>
        <label><span>名称</span><input v-model="createForm.name" class="field" placeholder="本地写作 Agent" /></label>
        <label><span>描述</span><textarea v-model="createForm.description" class="field" rows="3"></textarea></label>
        <label><span>能力标签</span><input v-model="createForm.skills" class="field" placeholder="draft, business_writing" /></label>
        <label><span>路由关键词</span><input v-model="createForm.keywords" class="field" placeholder="邮件, 文档, 起草" /></label>
      </div>
      <template #footer>
        <button class="ghost-btn" type="button" @click="createDialogOpen = false">取消</button>
        <button class="solid-btn" type="button" :disabled="creatingAgent" @click="createLocalAgent">
          {{ creatingAgent ? '创建中' : '创建' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Aim,
  Calendar,
  CircleCheck,
  Clock,
  Close,
  Connection,
  Cpu,
  DataAnalysis,
  DocumentChecked,
  EditPen,
  Finished,
  Guide,
  List,
  MagicStick,
  Memo,
  Monitor,
  Notebook,
  Plus,
  Position,
  Reading,
  Refresh,
  Search,
  Select,
  Share,
  Star,
  User,
  Warning,
} from '@element-plus/icons-vue'
import { agentApi, type AgentDefinition, type AgentRoutePreviewResponse } from '@/api/agents'
import { useAgentRegistryStore } from '@/stores/agentRegistry'

const agentRegistry = useAgentRegistryStore()
const savingAgentId = ref('')
const selectedAgent = ref<AgentDefinition | null>(null)
const detailOpen = ref(false)
const previewText = ref('分析代码并修复 500 错误，最后运行验证。')
const previewLoading = ref(false)
const routePreview = ref<AgentRoutePreviewResponse | null>(null)
const createDialogOpen = ref(false)
const creatingAgent = ref(false)
const createForm = reactive({
  id: '',
  name: '',
  description: '',
  skills: '',
  keywords: '',
})

const filters = reactive({
  search: '',
  category: '',
  skill: '',
  inputArtifact: '',
  outputArtifact: '',
  tool: '',
  costTier: '',
  riskLevel: '',
  source: '',
  parallelOnly: false,
  includeHidden: false,
})

const iconMap: Record<string, any> = {
  Aim: markRaw(Aim),
  Calendar: markRaw(Calendar),
  CircleCheck: markRaw(CircleCheck),
  Clock: markRaw(Clock),
  Connection: markRaw(Connection),
  Cpu: markRaw(Cpu),
  DataAnalysis: markRaw(DataAnalysis),
  DocumentChecked: markRaw(DocumentChecked),
  EditPen: markRaw(EditPen),
  Finished: markRaw(Finished),
  Guide: markRaw(Guide),
  List: markRaw(List),
  MagicStick: markRaw(MagicStick),
  Memo: markRaw(Memo),
  Monitor: markRaw(Monitor),
  Notebook: markRaw(Notebook),
  Reading: markRaw(Reading),
  Search: markRaw(Search),
  Select: markRaw(Select),
  Share: markRaw(Share),
  Star: markRaw(Star),
  User: markRaw(User),
  Warning: markRaw(Warning),
}

const categoryNames: Record<string, string> = {
  coordination: '系统统筹',
  information: '信息判断',
  product: '产品规划',
  engineering: '工程实现',
  quality: '质量风险',
  daily: '日常事务',
  legacy: '历史兼容',
  local: '本地 Agent',
}

const sourceAgents = computed(() => filters.includeHidden ? agentRegistry.agents : agentRegistry.marketAgents)
const filteredAgents = computed(() => {
  const query = filters.search.trim().toLowerCase()
  return sourceAgents.value.filter((agent) => {
    const haystack = [
      agent.id,
      agent.name,
      agent.roleName,
      agent.description,
      agent.category,
      ...agent.aliases,
      ...agent.capabilityProfile.skills,
      ...agent.capabilityProfile.intents,
      ...agent.routingProfile.routeKeywords,
    ].join(' ').toLowerCase()
    if (query && !haystack.includes(query)) return false
    if (filters.category && agent.category !== filters.category) return false
    if (filters.skill && !agent.capabilityProfile.skills.includes(filters.skill)) return false
    if (filters.inputArtifact && !agent.capabilityProfile.inputArtifacts.includes(filters.inputArtifact)) return false
    if (filters.outputArtifact && !agent.capabilityProfile.outputArtifacts.includes(filters.outputArtifact)) return false
    if (filters.tool && !agent.allowedTools.includes(filters.tool)) return false
    if (filters.costTier && agent.routingProfile.costTier !== filters.costTier) return false
    if (filters.riskLevel && agent.riskLevel !== filters.riskLevel) return false
    if (filters.source && agent.marketProfile.source !== filters.source && agent.source !== filters.source) return false
    if (filters.parallelOnly && agent.routingProfile.canRunInParallel === false) return false
    return true
  })
})

const filterOptions = computed(() => {
  const agents = sourceAgents.value
  const uniq = (items: string[]) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return {
    categories: uniq(agents.map((agent) => agent.category)),
    skills: uniq(agents.flatMap((agent) => agent.capabilityProfile.skills)),
    inputArtifacts: uniq(agents.flatMap((agent) => agent.capabilityProfile.inputArtifacts)),
    outputArtifacts: uniq(agents.flatMap((agent) => agent.capabilityProfile.outputArtifacts)),
    tools: uniq(agents.flatMap((agent) => agent.allowedTools)),
  }
})

function categoryLabel(category: string) {
  return categoryNames[category] || category || '未分类'
}

function iconComponent(icon: string) {
  return iconMap[icon] || markRaw(User)
}

function shortList(items: string[] = []) {
  if (!items.length) return '--'
  return items.slice(0, 3).join(' / ')
}

function formatList(items: string[] = [], separator = ' / ') {
  return items.filter(Boolean).join(separator) || '--'
}

function isRoutable(agent: AgentDefinition) {
  return agent.enabled && !agent.coordinator && agent.marketVisible && agent.marketProfile.marketVisible
}

function sourceLabel(source = '') {
  const labels: Record<string, string> = {
    rules: '规则',
    local_semantic_fallback: '本地语义',
    provided_semantic_preview: '外部语义',
    validated: '校验',
  }
  return labels[source] || source || 'unknown'
}

function strategyLabel(strategy = '') {
  const labels: Record<string, string> = {
    semantic: '采用语义路线',
    hybrid: '规则安全线',
    deterministic_fallback: '回退规则路线',
  }
  return labels[strategy] || strategy || '--'
}

function selectAgent(agent: AgentDefinition) {
  selectedAgent.value = agent
  detailOpen.value = true
}

async function refreshAgents() {
  await agentRegistry.loadAgents({ includeHidden: true, includeCoordinator: true })
}

function clearFilters() {
  Object.assign(filters, {
    search: '',
    category: '',
    skill: '',
    inputArtifact: '',
    outputArtifact: '',
    tool: '',
    costTier: '',
    riskLevel: '',
    source: '',
    parallelOnly: false,
    includeHidden: false,
  })
}

async function toggleAgent(agent: AgentDefinition, enabled: boolean) {
  savingAgentId.value = agent.id
  try {
    await agentRegistry.updateAgent(agent.id, { enabled })
    ElMessage.success(`${agent.name} 已${enabled ? '启用' : '停用'}`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新 Agent 失败')
  } finally {
    savingAgentId.value = ''
  }
}

async function runPreview() {
  previewLoading.value = true
  try {
    const response = await agentApi.previewRoute({ taskDescription: previewText.value })
    routePreview.value = response.preview
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '路由预览失败')
  } finally {
    previewLoading.value = false
  }
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

async function createLocalAgent() {
  creatingAgent.value = true
  try {
    const skills = splitCsv(createForm.skills)
    const keywords = splitCsv(createForm.keywords)
    await agentRegistry.createAgent({
      id: createForm.id.trim(),
      name: createForm.name.trim(),
      description: createForm.description.trim() || '本地创建的能力 Agent。',
      roleName: createForm.name.trim() || createForm.id.trim(),
      category: 'local',
      source: 'local',
      icon: 'Star',
      capabilities: skills,
      capabilityProfile: {
        intents: skills.length ? skills : ['general'],
        domains: ['daily_ops'],
        skills,
        inputArtifacts: ['plain_text'],
        outputArtifacts: ['report'],
        antiCapabilities: [],
      },
      routingProfile: {
        routeKeywords: keywords,
        preferredWhen: [],
        avoidWhen: [],
        requiresTools: [],
        requiresAgents: [],
        canRunInParallel: true,
        defaultPriority: 50,
        latencyTier: 'medium',
        costTier: 'medium',
      },
    })
    Object.assign(createForm, { id: '', name: '', description: '', skills: '', keywords: '' })
    createDialogOpen.value = false
    ElMessage.success('本地 Agent 已创建')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建 Agent 失败')
  } finally {
    creatingAgent.value = false
  }
}

onMounted(async () => {
  await refreshAgents()
})
</script>

<style scoped>
.agent-market {
  min-height: 100%;
  padding: 24px;
  color: var(--text-primary);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.03), transparent 240px),
    var(--bg-base);
}

.market-header,
.market-toolbar,
.agent-card__head,
.agent-card__footer,
.runtime-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.market-header h1 {
  margin: 4px 0;
  font-size: 28px;
  letter-spacing: 0;
}

.market-header span,
.market-toolbar span,
.agent-card small,
.agent-card p,
.preview-section span,
.detail-list dt,
.agent-modal__summary p {
  color: var(--text-secondary);
}

.eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

.market-header__actions,
.agent-card__badges,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.solid-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 7px;
  border: 1px solid var(--border-default);
  cursor: pointer;
  font-weight: 700;
}

.solid-btn {
  color: #fff;
  background: #0f766e;
  border-color: #0f766e;
}

.solid-btn--full {
  width: 100%;
}

.ghost-btn {
  color: var(--text-primary);
  background: var(--bg-panel);
}

.ghost-btn--small {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.solid-btn:disabled,
.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.market-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.market-stats article {
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.market-stats span {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}

.market-stats strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
}

.market-workbench {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr) 360px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.market-filters,
.router-preview {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.market-filters label,
.create-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.field,
.preview-input {
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--bg-base);
  color: var(--text-primary);
  padding: 9px 10px;
  outline: none;
}

.check-row,
.switch-row {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  gap: 8px !important;
}

.market-main {
  min-width: 0;
}

.market-toolbar {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.agent-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.agent-card--disabled {
  opacity: 0.72;
}

.agent-card--coordinator {
  border-color: color-mix(in oklab, var(--color-primary) 45%, var(--border-default));
}

.agent-card__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--bg-base);
}

.agent-card__icon svg {
  width: 20px;
  height: 20px;
}

.agent-card__head strong {
  display: block;
  font-size: 15px;
}

.agent-card__head small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
}

.agent-card__badges span,
.tag-list span {
  border: 1px solid var(--border-default);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-base);
}

.risk-high {
  color: #dc2626 !important;
}

.risk-medium {
  color: #ca8a04 !important;
}

.risk-low {
  color: #059669 !important;
}

.contract-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.contract-row div {
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--bg-base);
}

.contract-row span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}

.contract-row strong {
  font-size: 12px;
}

.preview-head h2 {
  margin: 4px 0 0;
}

.preview-result,
.preview-section,
.route-nodes,
.preview-layers,
.validation-list {
  display: grid;
  gap: 10px;
}

.preview-layers {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.preview-layers article {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-base);
}

.preview-layers span,
.preview-layers small {
  display: block;
  color: var(--text-secondary);
  font-size: 11px;
}

.preview-layers strong {
  display: block;
  margin: 5px 0 3px;
  color: var(--text-primary);
  font-size: 13px;
}

.preview-layer--warn {
  border-color: color-mix(in srgb, #ca8a04 42%, var(--border-default)) !important;
}

.preview-section {
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}

.candidate-list {
  display: grid;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.candidate-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.candidate-list em {
  color: var(--color-primary);
  font-style: normal;
}

.validation-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.validation-list li {
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, #ca8a04 34%, var(--border-default));
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-base) 88%, #ca8a04 12%);
}

.validation-list strong {
  color: #ca8a04;
  font-size: 11px;
  text-transform: uppercase;
}

.validation-list span {
  color: var(--text-secondary);
  font-size: 12px;
}

.route-nodes article {
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--bg-base);
}

.route-nodes strong,
.route-nodes small {
  display: block;
}

.route-nodes p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.preview-section--warn p {
  color: #ca8a04;
}

.market-empty {
  padding: 48px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-panel);
}

.agent-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(135deg, rgba(2, 6, 23, 0.82), rgba(15, 23, 42, 0.72));
  backdrop-filter: blur(12px);
}

.agent-modal {
  width: min(1040px, calc(100vw - 48px));
  max-height: min(860px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  color: #e5edf5;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(10, 18, 34, 0.96)),
    #0f172a;
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.agent-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.agent-modal__identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}

.agent-modal__identity h2 {
  margin: 4px 0 5px;
  color: #f8fafc;
  font-size: 26px;
  line-height: 1.15;
  letter-spacing: 0;
}

.agent-modal__identity span {
  color: #94a3b8;
}

.agent-modal__mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

.agent-modal__mark svg {
  width: 28px;
  height: 28px;
}

.agent-modal__close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.58);
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.agent-modal__close:hover {
  color: #fff;
  background: rgba(30, 41, 59, 0.92);
  transform: translateY(-1px);
}

.agent-modal__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
  padding: 18px 26px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.agent-modal__summary p {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
}

.agent-modal__status {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.agent-modal__status span,
.agent-modal__metrics article,
.detail-panel,
.governance-grid div {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.58);
}

.agent-modal__status span {
  border-radius: 999px;
  padding: 6px 10px;
  color: #cbd5e1;
  font-size: 12px;
}

.agent-modal__status span.active {
  color: #99f6e4;
  border-color: rgba(45, 212, 191, 0.38);
  background: rgba(13, 148, 136, 0.15);
}

.agent-modal__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0 26px 18px;
}

.agent-modal__metrics article {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
}

.agent-modal__metrics span,
.detail-panel__head span,
.detail-chip-grid span,
.governance-grid span,
.detail-list dt {
  color: #94a3b8;
  font-size: 12px;
}

.agent-modal__metrics strong {
  color: #f8fafc;
  font-size: 16px;
}

.agent-modal__body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-height: min(620px, calc(100vh - 280px));
  overflow: auto;
  padding: 0 26px 26px;
}

.detail-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border-radius: 14px;
}

.detail-panel--wide {
  grid-column: 1 / -1;
}

.detail-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.detail-panel__head strong {
  color: #f8fafc;
  font-size: 15px;
}

.detail-chip-grid,
.governance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-chip-grid div,
.governance-grid div {
  min-width: 0;
  border-radius: 11px;
  padding: 11px;
  background: rgba(2, 6, 23, 0.22);
}

.detail-chip-grid p,
.governance-grid strong,
.detail-list dd {
  margin: 4px 0 0;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

.detail-list,
.create-form {
  display: grid;
  gap: 12px;
}

.detail-list div {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.detail-list div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.detail-list dt {
  margin-bottom: 4px;
}

.detail-list dd {
  margin: 0;
}

.agent-modal-enter-active,
.agent-modal-leave-active {
  transition: opacity 0.18s ease;
}

.agent-modal-enter-active .agent-modal,
.agent-modal-leave-active .agent-modal {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.agent-modal-enter-from,
.agent-modal-leave-to {
  opacity: 0;
}

.agent-modal-enter-from .agent-modal,
.agent-modal-leave-to .agent-modal {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 1280px) {
  .market-workbench {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .router-preview {
    position: static;
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .market-header,
  .market-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .market-stats,
  .market-workbench {
    grid-template-columns: 1fr;
  }

  .market-filters {
    position: static;
  }

  .agent-modal-backdrop {
    padding: 10px;
  }

  .agent-modal {
    width: calc(100vw - 20px);
    max-height: calc(100vh - 20px);
    border-radius: 14px;
  }

  .agent-modal__header,
  .agent-modal__summary,
  .agent-modal__metrics,
  .agent-modal__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .agent-modal__summary,
  .agent-modal__body {
    grid-template-columns: 1fr;
  }

  .preview-layers {
    grid-template-columns: 1fr;
  }

  .agent-modal__status {
    justify-content: flex-start;
  }

  .agent-modal__metrics,
  .detail-chip-grid,
  .governance-grid {
    grid-template-columns: 1fr;
  }

  .agent-modal__body {
    max-height: calc(100vh - 300px);
  }
}
</style>
