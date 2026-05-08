<template>
  <div class="configs-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <span class="page-subtitle">Claude Runtime 运行参数和本机环境配置</span>
      </div>
      <button class="btn btn-primary" :disabled="loading" @click="refreshConfig">
        <i class="ri-refresh-line"></i>
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </div>

    <section class="runtime-panel">
      <div class="runtime-panel__head">
        <div>
          <p class="eyebrow">Claude Runtime</p>
          <h2>{{ runtimeStatus?.healthy ? '运行时就绪' : '运行时未就绪' }}</h2>
        </div>
        <div class="runtime-panel__chips">
          <span>运行 {{ runtimeStatus?.running ?? 0 }}</span>
          <span>排队 {{ runtimeStatus?.queued ?? 0 }}</span>
          <span>并发 {{ runtimeForm.maxConcurrency }}</span>
        </div>
      </div>

      <div class="runtime-form">
        <label>
          <span>最大并发</span>
          <input v-model.number="runtimeForm.maxConcurrency" type="number" min="1" class="field" />
        </label>
        <label>
          <span>最大轮次</span>
          <input v-model.number="runtimeForm.maxTurns" type="number" min="1" class="field" />
        </label>
        <label>
          <span>允许工具</span>
          <input v-model="allowedToolsText" class="field" placeholder="Read,Glob,Grep" />
        </label>
        <label>
          <span>全局模型</span>
          <input v-model="runtimeForm.model" class="field" placeholder="留空使用 Claude Code default" />
        </label>
        <label class="toggle-row">
          <input v-model="runtimeForm.reportOnly" type="checkbox" />
          <span>报告模式</span>
        </label>
        <label class="toggle-row">
          <input v-model="runtimeForm.workspaceIsolation" type="checkbox" />
          <span>任务工作空间隔离</span>
        </label>
        <label class="toggle-row">
          <input v-model="runtimeForm.mock" type="checkbox" />
          <span>Mock Runtime</span>
        </label>
      </div>

      <div class="runtime-paths">
        <div>
          <span>配置来源</span>
          <code>{{ runtimeStatus?.configSource || 'built-in defaults' }}</code>
        </div>
        <div>
          <span>数据库</span>
          <code>{{ runtimeStatus?.dbPath || '--' }}</code>
        </div>
        <div>
          <span>执行目录</span>
          <code>{{ runtimeConfig?.cwd || '--' }}</code>
        </div>
        <div>
          <span>隔离根目录</span>
          <code>{{ runtimeConfig?.workspaceRoot || '--' }}</code>
        </div>
        <div>
          <span>报告目录</span>
          <code>{{ runtimeConfig?.outputRoot || '--' }}</code>
        </div>
      </div>

      <div class="runtime-checks">
        <span :class="{ ok: runtimeStatus?.sdkAvailable, warn: !runtimeStatus?.sdkAvailable }">
          SDK {{ runtimeStatus?.sdkAvailable ? '可用' : '不可用' }}
        </span>
        <span :class="{ ok: runtimeStatus?.dbWritable, warn: !runtimeStatus?.dbWritable }">
          DB {{ runtimeStatus?.dbWritable ? '可写' : '不可写' }}
        </span>
        <span :class="{ ok: runtimeStatus?.cwdExists, warn: !runtimeStatus?.cwdExists }">
          CWD {{ runtimeStatus?.cwdExists ? '存在' : '缺失' }}
        </span>
        <span :class="{ ok: runtimeStatus?.workspaceRootWritable, warn: !runtimeStatus?.workspaceRootWritable }">
          工作区 {{ runtimeStatus?.workspaceRootWritable ? '可写' : '不可写' }}
        </span>
        <span :class="{ ok: runtimeStatus?.outputRootWritable, warn: !runtimeStatus?.outputRootWritable }">
          报告目录 {{ runtimeStatus?.outputRootWritable ? '可写' : '不可写' }}
        </span>
      </div>

      <div class="runtime-actions">
        <button class="btn" :disabled="saving || loading" @click="saveRuntimeConfig">
          <i class="ri-save-3-line"></i>
          {{ saving ? '保存中' : '保存配置' }}
        </button>
        <span class="runtime-note">配置写入当前 Node 进程环境，新入队任务即时生效。</span>
      </div>
    </section>

    <section class="claude-env-panel">
      <div class="runtime-panel__head">
        <div>
          <p class="eyebrow">Claude Environment</p>
          <h2>环境检测与模型路由</h2>
        </div>
        <span class="env-health" :class="{ ok: runtimeStatus?.sdkAvailable }">
          {{ runtimeStatus?.runtimeDriver || 'unavailable' }}
        </span>
      </div>
      <div class="claude-call-overview">
        <div class="claude-primary-card">
          <span>当前任务调用方式</span>
          <strong>{{ runtimeStatus?.sdkAvailable ? 'Claude Agent SDK' : '不可用' }}</strong>
          <small>{{ runtimeStatus?.sdkPath || '未检测到 SDK 包路径' }}</small>
        </div>
        <div class="claude-primary-card">
          <span>默认模型</span>
          <strong>{{ runtimeStatus?.modelRouting?.defaultModel || 'Claude Code default' }}</strong>
          <small>Agent 默认模型会覆盖全局模型</small>
        </div>
      </div>
      <div class="claude-call-grid">
        <div>
          <span>SDK 内置 Claude Code</span>
          <code>{{ runtimeStatus?.claudeBundledPath || '--' }}</code>
        </div>
        <div>
          <span>全局 Claude CLI</span>
          <code>{{ runtimeStatus?.claudeCliPath || '--' }}</code>
        </div>
        <div>
          <span>SDK 版本</span>
          <code>{{ runtimeStatus?.claudeSdkVersion || '--' }}</code>
        </div>
        <div>
          <span>Claude Code 版本</span>
          <code>{{ runtimeStatus?.claudeCodeVersion || '--' }}</code>
        </div>
        <div>
          <span>Node 进程</span>
          <code>{{ runtimeStatus?.nodePath || '--' }}</code>
        </div>
        <div>
          <span>允许工具</span>
          <code>{{ runtimeConfig?.allowedTools.join(', ') || '--' }}</code>
        </div>
      </div>
      <div class="recent-run-models">
        <div class="recent-run-row recent-run-row--head">
          <span>最近 Run</span>
          <span>Agent</span>
          <span>状态</span>
          <span>模型</span>
        </div>
        <div v-for="run in recentModelRuns" :key="run.id" class="recent-run-row">
          <code>{{ run.id }}</code>
          <span>{{ run.role_name || run.agent_id }}</span>
          <span :class="`run-status-${run.status}`">{{ run.status }}</span>
          <strong>{{ run.model || 'Claude Code default' }}</strong>
        </div>
        <p v-if="!recentModelRuns.length">暂无 Run 记录。</p>
      </div>
    </section>

    <section class="agent-market-link">
      <div class="runtime-panel__head">
        <div>
          <p class="eyebrow">Agent Market</p>
          <h2>能力市场已独立管理</h2>
        </div>
        <div class="runtime-panel__chips">
          <span>Router 调度</span>
          <span>能力卡</span>
        </div>
      </div>
      <p class="agent-market-link__copy">Agent 的启用、能力标签、输入输出契约、工具权限、成本风险和路由预览，统一在独立市场页面维护。</p>
      <router-link to="/agent-market" class="btn btn-primary">打开 Agent 市场</router-link>
    </section>

    <div class="config-tree">
      <div
        v-for="config in configs"
        :key="config.id"
        :class="['config-item', { expanded: config.expanded }]"
      >
        <div class="config-header" @click="toggleConfig(config)">
          <i :class="config.icon"></i>
          <span class="config-name">{{ config.name }}</span>
          <span class="config-path">{{ config.path }}</span>
          <i class="ri-arrow-down-s-line config-toggle"></i>
        </div>
        <div v-if="config.expanded" class="config-content">
          <pre class="config-code">{{ config.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { taskApi, type RuntimeConfig } from '@/api/tasks'

type ConfigItem = {
  id: string
  name: string
  path: string
  icon: string
  expanded: boolean
  content: string
}

const loading = ref(false)
const saving = ref(false)
const runtimeConfig = ref<RuntimeConfig | null>(null)
const runtimeStatus = ref<{
  healthy: boolean
  running: number
  queued: number
  maxConcurrency: number
  dbPath?: string
  dbWritable?: boolean
  cwdExists?: boolean
  outputRootWritable?: boolean
  workspaceRootWritable?: boolean
  sdkAvailable?: boolean
  configSource?: string
  sdkPath?: string | null
  claudePath?: string | null
  claudeCliPath?: string | null
  claudeBundledPath?: string | null
  runtimeDriver?: string
  claudeSdkVersion?: string | null
  claudeCodeVersion?: string | null
  nodePath?: string
  modelRouting?: {
    globalModel?: string
    defaultModel?: string
    agentDefaults?: Record<string, string>
    precedence?: string[]
  }
  recentRuns?: Array<{
    id: string
    agent_id: string
    role_name?: string | null
    status: string
    model?: string | null
  }>
} | null>(null)

const runtimeForm = reactive({
  maxConcurrency: 3,
  maxTurns: 256,
  reportOnly: true,
  workspaceIsolation: true,
  mock: false,
  model: '',
  allowedTools: ['Read', 'Glob', 'Grep'] as string[],
})

const allowedToolsText = computed({
  get: () => runtimeForm.allowedTools.join(','),
  set: (value: string) => {
    runtimeForm.allowedTools = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  },
})

const recentModelRuns = computed(() => (runtimeStatus.value?.recentRuns || []).slice(0, 8))

const configs = ref<ConfigItem[]>([
  {
    id: 'claude-runtime',
    name: 'Claude Runtime',
    path: '.env / server runtime',
    icon: 'ri-settings-3-line',
    expanded: true,
    content: '',
  },
])

function applyRuntimeConfig(config: RuntimeConfig, status?: typeof runtimeStatus.value) {
  runtimeConfig.value = config
  runtimeStatus.value = status || runtimeStatus.value
  runtimeForm.maxConcurrency = config.maxConcurrency
  runtimeForm.maxTurns = config.maxTurns
  runtimeForm.reportOnly = config.reportOnly
  runtimeForm.workspaceIsolation = config.workspaceIsolation
  runtimeForm.mock = config.mock
  runtimeForm.model = config.model || ''
  runtimeForm.allowedTools = [...config.allowedTools]
  const runtimeItem = configs.value.find(item => item.id === 'claude-runtime')
  if (runtimeItem) {
    runtimeItem.content = `AGENT_RUNTIME=${config.runtime}
CLAUDE_AGENT_MAX_CONCURRENCY=${config.maxConcurrency}
CLAUDE_AGENT_MAX_TURNS=${config.maxTurns}
CLAUDE_REPORT_ONLY=${config.reportOnly}
CLAUDE_RUNTIME_CWD=${config.cwd}
CLAUDE_WORKSPACE_ISOLATION=${config.workspaceIsolation}
CLAUDE_WORKSPACE_ROOT=${config.workspaceRoot}
CLAUDE_ALLOWED_TOOLS=${config.allowedTools.join(',')}
CLAUDE_OUTPUT_ROOT=${config.outputRoot}
CLAUDE_AGENT_MODEL=${config.model || ''}
CLAUDE_RUNTIME_MOCK=${config.mock}`
  }
}

const toggleConfig = (config: ConfigItem) => {
  config.expanded = !config.expanded
}

async function refreshConfig() {
  loading.value = true
  try {
    const [configResponse, statusResponse] = await Promise.all([
      taskApi.runtimeConfig(),
      taskApi.runtimeStatus(),
    ])
    applyRuntimeConfig(configResponse.config, statusResponse.status)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '读取 Runtime 配置失败')
  } finally {
    loading.value = false
  }
}

async function saveRuntimeConfig() {
  saving.value = true
  try {
    const response = await taskApi.updateRuntimeConfig({
      maxConcurrency: runtimeForm.maxConcurrency,
      maxTurns: runtimeForm.maxTurns,
      reportOnly: runtimeForm.reportOnly,
      workspaceIsolation: runtimeForm.workspaceIsolation,
      mock: runtimeForm.mock,
      model: runtimeForm.model.trim(),
      allowedTools: runtimeForm.allowedTools,
    })
    applyRuntimeConfig(response.config, response.status)
    ElMessage.success('Claude Runtime 配置已更新')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存 Runtime 配置失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  refreshConfig()
})
</script>

<style scoped>
.configs-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
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
  display: block;
}

.runtime-panel,
.claude-env-panel {
  margin: 16px 32px 0;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.agent-panel,
.agent-market-link {
  margin: 16px 32px 0;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.agent-market-link__copy {
  max-width: 720px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.runtime-panel__head,
.runtime-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.runtime-panel__head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.runtime-panel__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.runtime-panel__chips span,
.runtime-note {
  color: var(--text-secondary);
  font-size: 12px;
}

.runtime-panel__chips span {
  padding: 4px 9px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--bg-card);
}

.runtime-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.agent-config {
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.agent-config__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.agent-config__head strong {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
}

.agent-config__head span,
.agent-config p,
.agent-contracts {
  color: var(--text-secondary);
  font-size: 12px;
}

.agent-config p {
  min-height: 34px;
  margin: 10px 0;
  line-height: 1.45;
}

.agent-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.agent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 25px;
}

.agent-tags span {
  padding: 4px 7px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  font-size: 11px;
}

.agent-form {
  display: grid;
  grid-template-columns: 0.8fr 0.8fr 1.4fr 1.2fr;
  gap: 10px;
  margin-top: 12px;
}

.agent-form label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.agent-contracts {
  display: grid;
  gap: 4px;
  margin-top: 10px;
}

.runtime-form label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.field {
  min-height: 36px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 0 10px;
  outline: none;
}

.toggle-row {
  display: flex !important;
  align-items: center;
  grid-template-columns: none !important;
  gap: 8px !important;
  padding: 9px 10px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
}

.runtime-paths {
  display: grid;
  gap: 8px;
  margin: 14px 0;
}

.runtime-paths div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
}

.runtime-paths code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.runtime-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.runtime-checks span {
  padding: 5px 8px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 12px;
}

.runtime-checks span.ok {
  border-color: color-mix(in oklab, var(--color-success) 42%, transparent);
  color: var(--color-success);
}

.runtime-checks span.warn {
  border-color: color-mix(in oklab, var(--color-danger) 42%, transparent);
  color: var(--color-danger);
}

.env-health {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  font-size: 12px;
}

.env-health.ok {
  border-color: color-mix(in oklab, var(--color-success) 42%, transparent);
  color: var(--color-success);
}

.claude-call-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.claude-primary-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.claude-primary-card span,
.claude-primary-card small,
.claude-call-grid span,
.recent-run-models p {
  color: var(--text-secondary);
  font-size: 12px;
}

.claude-primary-card strong {
  color: var(--text-primary);
  font-size: 18px;
}

.claude-primary-card small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.claude-call-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  margin-top: 14px;
}

.claude-call-grid div {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.claude-call-grid code,
.recent-run-row code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.recent-run-models {
  display: grid;
  gap: 6px;
  margin-top: 14px;
}

.recent-run-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 120px 90px minmax(140px, 1fr);
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
}

.recent-run-row--head {
  background: transparent;
  color: var(--text-tertiary);
  font-weight: 700;
}

.recent-run-row strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.run-status-completed {
  color: var(--color-success);
}

.run-status-failed,
.run-status-cancelled {
  color: var(--color-danger);
}

.run-status-running,
.run-status-queued {
  color: var(--color-warning);
}

.btn-danger:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: var(--text-inverse);
}

.config-tree {
  padding: 16px 32px 32px;
  overflow: visible;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary,
.btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-inverse);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.config-item {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.15s ease;
}

.config-item:hover,
.config-item.expanded {
  border-color: var(--color-primary-dim);
}

.config-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.config-header:hover {
  background: var(--bg-panel-hover);
}

.config-header i {
  color: var(--text-tertiary);
  font-size: 16px;
  width: 18px;
  text-align: center;
}

.config-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-path {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}

.config-toggle {
  font-size: 16px;
  color: var(--text-tertiary);
  transition: transform 0.15s ease;
}

.config-item.expanded .config-toggle {
  transform: rotate(180deg);
  color: var(--color-primary);
}

.config-content {
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-base);
}

.config-code {
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre;
}

@media (max-width: 900px) {
  .runtime-form {
    grid-template-columns: 1fr;
  }

  .agent-grid,
  .agent-form,
  .claude-call-overview,
  .claude-call-grid,
  .recent-run-row {
    grid-template-columns: 1fr;
  }

  .runtime-panel__head,
  .runtime-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
