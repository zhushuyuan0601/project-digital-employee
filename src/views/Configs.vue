<template>
  <div class="configs-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">系统配置</h1>
        <span class="page-subtitle">维护平台级运行参数、目录存储和环境健康状态</span>
      </div>
      <button class="btn btn-primary" type="button" :disabled="loading" @click="refreshConfig">
        <el-icon><Refresh /></el-icon>
        {{ loading ? '刷新中' : '刷新状态' }}
      </button>
    </header>

    <main class="config-shell">
      <section class="status-panel">
        <div class="status-panel__main">
          <div :class="['status-orb', runtimeStatus?.healthy ? 'is-ok' : 'is-warn']">
            <el-icon>
              <Check v-if="runtimeStatus?.healthy" />
              <Warning v-else />
            </el-icon>
          </div>
          <div>
            <span class="eyebrow">System Runtime</span>
            <h2>{{ runtimeStatus?.healthy ? '系统运行正常' : '系统需要检查' }}</h2>
            <p>{{ statusSummary }}</p>
          </div>
        </div>
        <div class="status-metrics">
          <article>
            <span>执行中</span>
            <strong>{{ runtimeStatus?.running ?? 0 }}</strong>
          </article>
          <article>
            <span>排队中</span>
            <strong>{{ runtimeStatus?.queued ?? 0 }}</strong>
          </article>
          <article>
            <span>并发上限</span>
            <strong>{{ runtimeForm.maxConcurrency }}</strong>
          </article>
          <article>
            <span>配置来源</span>
            <strong>{{ runtimeStatus?.configSource || '默认配置' }}</strong>
          </article>
        </div>
      </section>

      <section class="config-grid">
        <article class="config-panel config-panel--wide">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Execution Policy</span>
              <h2>执行策略</h2>
            </div>
            <button class="btn" type="button" :disabled="saving || loading" @click="saveRuntimeConfig">
              <el-icon><Check /></el-icon>
              {{ saving ? '保存中' : '保存配置' }}
            </button>
          </div>

          <div class="form-grid">
            <label class="form-field">
              <span>最大并发数</span>
              <input v-model.number="runtimeForm.maxConcurrency" type="number" min="1" class="field" />
            </label>
            <label class="form-field">
              <span>单次最大轮次</span>
              <input v-model.number="runtimeForm.maxTurns" type="number" min="1" class="field" />
            </label>
            <label class="form-field">
              <span>默认模型</span>
              <input v-model="runtimeForm.model" class="field" placeholder="留空使用系统默认模型" />
            </label>
            <label class="form-field form-field--full">
              <span>允许调用的工具</span>
              <input v-model="allowedToolsText" class="field" placeholder="Read, Glob, Grep" />
            </label>
          </div>

          <div class="switch-grid">
            <label class="switch-card">
              <input v-model="runtimeForm.reportOnly" type="checkbox" />
              <span>
                <strong>报告模式</strong>
                <small>只生成过程报告，不执行高风险写入动作</small>
              </span>
            </label>
            <label class="switch-card">
              <input v-model="runtimeForm.workspaceIsolation" type="checkbox" />
              <span>
                <strong>工作空间隔离</strong>
                <small>每次执行使用独立目录，降低文件互相影响</small>
              </span>
            </label>
            <label class="switch-card">
              <input v-model="runtimeForm.mock" type="checkbox" />
              <span>
                <strong>模拟运行</strong>
                <small>用于联调和演示，不调用真实执行链路</small>
              </span>
            </label>
          </div>
        </article>

        <article class="config-panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Storage</span>
              <h2>目录与存储</h2>
            </div>
            <el-icon class="panel-icon"><FolderOpened /></el-icon>
          </div>
          <div class="path-list">
            <div>
              <span>数据库</span>
              <code>{{ runtimeStatus?.dbPath || '--' }}</code>
            </div>
            <div>
              <span>执行目录</span>
              <code>{{ runtimeConfig?.cwd || '--' }}</code>
            </div>
            <div>
              <span>隔离目录</span>
              <code>{{ runtimeConfig?.workspaceRoot || '--' }}</code>
            </div>
            <div>
              <span>输出目录</span>
              <code>{{ runtimeConfig?.outputRoot || '--' }}</code>
            </div>
          </div>
        </article>

        <article class="config-panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Health Checks</span>
              <h2>健康检查</h2>
            </div>
            <el-icon class="panel-icon"><Cpu /></el-icon>
          </div>
          <div class="check-list">
            <span :class="checkClass(runtimeStatus?.dbWritable)">数据库可写</span>
            <span :class="checkClass(runtimeStatus?.cwdExists)">执行目录存在</span>
            <span :class="checkClass(runtimeStatus?.workspaceRootWritable)">隔离目录可写</span>
            <span :class="checkClass(runtimeStatus?.outputRootWritable)">输出目录可写</span>
            <span :class="checkClass(runtimeStatus?.sdkAvailable)">运行 SDK 可用</span>
          </div>
        </article>

        <article class="config-panel config-panel--wide">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Environment</span>
              <h2>环境诊断</h2>
            </div>
            <span :class="['driver-badge', runtimeStatus?.healthy ? 'is-ok' : 'is-warn']">
              {{ displayRuntimeDriver }}
            </span>
          </div>

          <div class="environment-grid">
            <div>
              <span>Node 进程</span>
              <code>{{ runtimeStatus?.nodePath || '--' }}</code>
            </div>
            <div>
              <span>Claude CLI</span>
              <code>{{ runtimeStatus?.claudeCliPath || runtimeStatus?.claudePath || '--' }}</code>
            </div>
            <div>
              <span>Codex CLI</span>
              <code>{{ runtimeStatus?.codexCliPath || '--' }}</code>
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
              <span>环境文件</span>
              <code>{{ runtimeStatus?.hasEnvFile ? '已加载' : '未检测到' }}</code>
            </div>
          </div>

          <div class="config-snapshot">
            <div class="snapshot-head">
              <strong>当前参数快照</strong>
              <span>{{ overrideSummary }}</span>
            </div>
            <div class="snapshot-grid">
              <span>运行模式</span>
              <code>{{ runtimeConfig?.runtime || '--' }}</code>
              <span>并发上限</span>
              <code>{{ runtimeConfig?.maxConcurrency ?? '--' }}</code>
              <span>最大轮次</span>
              <code>{{ runtimeConfig?.maxTurns ?? '--' }}</code>
              <span>报告模式</span>
              <code>{{ runtimeConfig?.reportOnly ? '开启' : '关闭' }}</code>
              <span>目录隔离</span>
              <code>{{ runtimeConfig?.workspaceIsolation ? '开启' : '关闭' }}</code>
              <span>模拟运行</span>
              <code>{{ runtimeConfig?.mock ? '开启' : '关闭' }}</code>
            </div>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Cpu, FolderOpened, Refresh, Warning } from '@element-plus/icons-vue'
import { taskApi, type RuntimeConfig } from '@/api/tasks'

type RuntimeStatus = {
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
  claudePath?: string | null
  claudeCliPath?: string | null
  codexCliPath?: string | null
  runtimeDriver?: string
  claudeSdkVersion?: string | null
  claudeCodeVersion?: string | null
  nodePath?: string
  hasEnvFile?: boolean
  configSource?: string
  envOverrides?: Record<string, boolean>
}

const loading = ref(false)
const saving = ref(false)
const runtimeConfig = ref<RuntimeConfig | null>(null)
const runtimeStatus = ref<RuntimeStatus | null>(null)

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
  get: () => runtimeForm.allowedTools.join(', '),
  set: (value: string) => {
    runtimeForm.allowedTools = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  },
})

const statusSummary = computed(() => {
  if (!runtimeStatus.value) return '正在读取系统状态。'
  if (runtimeStatus.value.healthy) return '核心依赖、目录权限和运行队列处于可用状态。'
  return '部分依赖或目录权限不可用，请根据健康检查项处理。'
})

const displayRuntimeDriver = computed(() => {
  const driver = String(runtimeStatus.value?.runtimeDriver || '').trim()
  if (!driver) return '未检测'
  if (/sdk/i.test(driver)) return 'SDK 驱动'
  if (/cli/i.test(driver)) return 'CLI 驱动'
  return driver.replace(/agent/gi, '').replace(/--+/g, '-').replace(/^-|-$/g, '') || '运行驱动'
})

const overrideSummary = computed(() => {
  const overrides = runtimeStatus.value?.envOverrides
  if (!overrides) return '使用默认值'
  const count = Object.values(overrides).filter(Boolean).length
  return count ? `${count} 项环境覆盖已生效` : '使用默认值'
})

function checkClass(value?: boolean) {
  return ['check-pill', value ? 'is-ok' : 'is-warn']
}

function applyRuntimeConfig(config: RuntimeConfig, status?: RuntimeStatus | null) {
  runtimeConfig.value = config
  runtimeStatus.value = status || runtimeStatus.value
  runtimeForm.maxConcurrency = config.maxConcurrency
  runtimeForm.maxTurns = config.maxTurns
  runtimeForm.reportOnly = config.reportOnly
  runtimeForm.workspaceIsolation = config.workspaceIsolation
  runtimeForm.mock = config.mock
  runtimeForm.model = config.model || ''
  runtimeForm.allowedTools = [...config.allowedTools]
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
    ElMessage.error(err instanceof Error ? err.message : '读取系统配置失败')
  } finally {
    loading.value = false
  }
}

async function saveRuntimeConfig() {
  try {
    await ElMessageBox.confirm(
      `确定要保存系统配置吗？新进入队列的执行任务将使用新参数。\n\n并发：${runtimeForm.maxConcurrency}\n最大轮次：${runtimeForm.maxTurns}\n工具：${runtimeForm.allowedTools.join(', ') || '--'}`,
      '确认系统配置变更',
      {
        confirmButtonText: '保存配置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

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
    ElMessage.success('系统配置已更新')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存系统配置失败')
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
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--bg-base) 86%, var(--color-primary) 5%), var(--bg-base));
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px 32px 0;
  flex-shrink: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 750;
  color: var(--text-primary);
  margin: 0;
}

.page-subtitle {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.config-shell {
  display: grid;
  gap: 16px;
  padding: 18px 32px 32px;
}

.status-panel,
.config-panel {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: color-mix(in oklab, var(--bg-panel) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.status-panel {
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(420px, 1fr);
  gap: 18px;
  padding: 18px;
}

.status-panel__main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.status-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  font-size: 24px;
}

.status-orb.is-ok,
.check-pill.is-ok,
.driver-badge.is-ok {
  color: var(--color-success);
  border-color: color-mix(in oklab, var(--color-success) 42%, var(--border-default));
  background: color-mix(in oklab, var(--color-success) 10%, var(--bg-card));
}

.status-orb.is-warn,
.check-pill.is-warn,
.driver-badge.is-warn {
  color: var(--color-warning);
  border-color: color-mix(in oklab, var(--color-warning) 48%, var(--border-default));
  background: color-mix(in oklab, var(--color-warning) 10%, var(--bg-card));
}

.eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-panel h2,
.panel-head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 750;
}

.status-panel p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.status-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.status-metrics article {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-card);
}

.status-metrics span,
.path-list span,
.environment-grid span,
.snapshot-grid span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.status-metrics strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.config-panel {
  min-width: 0;
  padding: 16px;
}

.config-panel--wide {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-icon {
  color: var(--color-primary);
  font-size: 22px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.form-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.field {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 0 11px;
  outline: none;
  font: inherit;
}

.field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-glow);
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.switch-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.switch-card input {
  margin-top: 3px;
}

.switch-card strong {
  display: block;
  color: var(--text-primary);
  font-size: 13px;
}

.switch-card small {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.path-list,
.environment-grid {
  display: grid;
  gap: 9px;
}

.path-list div,
.environment-grid div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.environment-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.environment-grid div {
  grid-template-columns: 112px minmax(0, 1fr);
}

code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.check-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.check-pill,
.driver-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.config-snapshot {
  margin-top: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-card);
  overflow: hidden;
}

.snapshot-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.snapshot-head strong {
  color: var(--text-primary);
  font-size: 13px;
}

.snapshot-head span {
  color: var(--text-tertiary);
  font-size: 12px;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) 112px minmax(0, 1fr);
  gap: 10px 14px;
  padding: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.btn-primary,
.btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 1180px) {
  .status-panel,
  .config-grid,
  .environment-grid,
  .snapshot-grid {
    grid-template-columns: 1fr;
  }

  .status-metrics,
  .form-grid,
  .switch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px 18px 0;
  }

  .config-shell {
    padding: 16px 18px 24px;
  }

  .status-panel__main {
    align-items: flex-start;
  }

  .status-metrics,
  .form-grid,
  .switch-grid,
  .path-list div,
  .environment-grid div {
    grid-template-columns: 1fr;
  }
}
</style>
