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

    <section class="mail-panel">
      <div class="runtime-panel__head">
        <div>
          <p class="eyebrow">Mail Trigger</p>
          <h2>邮件触发渠道</h2>
          <span class="mail-panel__subtitle">通过 IMAP 扫描邮箱，把匹配邮件自动转成协作任务。</span>
        </div>
        <div class="runtime-panel__chips">
          <span>渠道 {{ mailStatus?.channelCount ?? mailChannels.length }}</span>
          <span>启用 {{ mailStatus?.activeChannelCount ?? enabledMailCount }}</span>
          <span>{{ mailStatus?.scannerRunning ? '扫描中' : '监听中' }}</span>
        </div>
      </div>

      <div class="mail-layout">
        <aside class="mail-list">
          <button class="btn btn-primary" type="button" @click="startNewMailChannel">
            <i class="ri-mail-add-line"></i>
            新增邮箱渠道
          </button>
          <button
            v-for="channel in mailChannels"
            :key="channel.id"
            type="button"
            :class="['mail-channel-row', { active: selectedMailChannelId === channel.id }]"
            @click="selectMailChannel(channel.id)"
          >
            <span class="mail-channel-row__top">
              <strong>{{ channel.name }}</strong>
              <em :class="{ ok: channel.enabled, warn: !channel.enabled }">{{ channel.enabled ? '启用' : '停用' }}</em>
            </span>
            <small>{{ channel.username || '未配置账号' }}</small>
            <small>{{ channel.host }}:{{ channel.port }} / {{ channel.mailbox }}</small>
          </button>
        </aside>

        <div class="mail-editor">
          <div class="mail-editor__grid">
            <label>
              <span>渠道名称</span>
              <input v-model="mailForm.name" class="field" placeholder="例如：QQ 邮箱任务入口" />
            </label>
            <label>
              <span>邮箱类型</span>
              <select v-model="mailForm.provider" class="field" @change="applyMailProviderPreset">
                <option value="qq">QQ 邮箱</option>
                <option value="custom">自定义 IMAP</option>
              </select>
            </label>
            <label>
              <span>邮箱账号</span>
              <input v-model="mailForm.username" class="field" placeholder="name@qq.com" />
            </label>
            <label>
              <span>授权码</span>
              <input v-model="mailForm.password" class="field" type="password" placeholder="留空则保留已保存授权码" />
            </label>
            <label>
              <span>IMAP Host</span>
              <input v-model="mailForm.host" class="field" placeholder="imap.qq.com" />
            </label>
            <label>
              <span>端口</span>
              <input v-model.number="mailForm.port" class="field" type="number" min="1" />
            </label>
            <label>
              <span>邮箱目录</span>
              <input v-model="mailForm.mailbox" class="field" placeholder="INBOX" />
            </label>
            <label>
              <span>扫描间隔（分钟）</span>
              <input v-model.number="mailForm.scan_interval_minutes" class="field" type="number" min="1" />
            </label>
            <label>
              <span>主题包含</span>
              <input v-model="mailForm.subject_filter" class="field" placeholder="可留空" />
            </label>
            <label>
              <span>发件人包含</span>
              <input v-model="mailForm.from_filter" class="field" placeholder="可留空" />
            </label>
            <label>
              <span>正文关键词</span>
              <input v-model="mailForm.body_keywords" class="field" placeholder="逗号分隔，可留空" />
            </label>
            <label>
              <span>任务优先级</span>
              <select v-model="mailForm.task_priority" class="field">
                <option value="normal">普通</option>
                <option value="high">高优先级</option>
                <option value="urgent">紧急</option>
              </select>
            </label>
          </div>

          <div class="mail-toggles">
            <label class="toggle-row">
              <input v-model="mailForm.enabled" type="checkbox" />
              <span>启用自动扫描</span>
            </label>
            <label class="toggle-row">
              <input v-model="mailForm.secure" type="checkbox" />
              <span>SSL/TLS</span>
            </label>
            <label class="toggle-row">
              <input v-model="mailForm.unseen_only" type="checkbox" />
              <span>只处理未读邮件</span>
            </label>
            <label class="toggle-row">
              <input v-model="mailForm.mark_seen" type="checkbox" />
              <span>触发后标记已读</span>
            </label>
          </div>

          <div class="mail-meta">
            <span>最近 UID：{{ selectedMailChannel?.last_uid || 0 }}</span>
            <span>最近扫描：{{ formatSeconds(selectedMailChannel?.last_scan_at) }}</span>
            <span>最近成功：{{ formatSeconds(selectedMailChannel?.last_success_at) }}</span>
            <span v-if="selectedMailChannel?.has_password">授权码已保存</span>
            <span v-if="selectedMailChannel?.last_error" class="mail-error">{{ selectedMailChannel.last_error }}</span>
          </div>

          <div class="mail-actions">
            <button class="btn btn-primary" :disabled="mailSaving" @click="saveMailChannel">
              <i class="ri-save-3-line"></i>
              {{ mailSaving ? '保存中' : '保存渠道' }}
            </button>
            <button class="btn" :disabled="!selectedMailChannelId || mailTesting" @click="testSelectedMailChannel">
              <i class="ri-plug-line"></i>
              {{ mailTesting ? '测试中' : '连接测试' }}
            </button>
            <button class="btn" :disabled="!selectedMailChannelId || mailScanning" @click="scanSelectedMailChannel">
              <i class="ri-search-eye-line"></i>
              {{ mailScanning ? '扫描中' : '立即扫描' }}
            </button>
            <button class="btn btn-danger" :disabled="!selectedMailChannelId" @click="deleteSelectedMailChannel">
              <i class="ri-delete-bin-line"></i>
              删除
            </button>
          </div>

          <p class="mail-help">
            QQ 邮箱请先在邮箱设置中开启 IMAP/SMTP 服务，并使用“授权码”登录；系统不会通过网页登录 mail.qq.com。
          </p>
        </div>
      </div>

      <div class="mail-trigger-log">
        <div class="surface-heading">
          <div>
            <p class="eyebrow">触发记录</p>
            <h2>最近由邮件创建的任务</h2>
          </div>
          <button class="btn" :disabled="loadingMail" @click="refreshMailConfig">
            <i class="ri-refresh-line"></i>
            刷新邮件
          </button>
        </div>
        <div v-if="mailTriggers.length === 0" class="mail-empty">暂无邮件触发记录。</div>
        <div v-else class="mail-trigger-list">
          <article v-for="trigger in mailTriggers" :key="trigger.id" class="mail-trigger-item">
            <strong>{{ trigger.subject || '无主题邮件' }}</strong>
            <span>{{ trigger.from_address || '未知发件人' }}</span>
            <span>任务：{{ trigger.task_id || '--' }}</span>
            <small>{{ formatSeconds(trigger.created_at) }}</small>
          </article>
        </div>
      </div>
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
import { mailApi, type MailChannel, type MailTrigger } from '@/api/mail'

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
const loadingMail = ref(false)
const mailSaving = ref(false)
const mailTesting = ref(false)
const mailScanning = ref(false)
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
} | null>(null)

const runtimeForm = reactive({
  maxConcurrency: 3,
  maxTurns: 256,
  reportOnly: true,
  workspaceIsolation: true,
  mock: false,
  allowedTools: ['Read', 'Glob', 'Grep'] as string[],
})

const mailChannels = ref<MailChannel[]>([])
const mailTriggers = ref<MailTrigger[]>([])
const mailStatus = ref<{
  scannerStarted: boolean
  scannerRunning: boolean
  channelCount: number
  activeChannelCount: number
  lastScanAt?: number | null
} | null>(null)
const selectedMailChannelId = ref('')
const mailForm = reactive({
  id: '',
  name: 'QQ 邮箱任务入口',
  enabled: false,
  provider: 'qq',
  host: 'imap.qq.com',
  port: 993,
  secure: true,
  username: '',
  password: '',
  mailbox: 'INBOX',
  scan_interval_minutes: 5,
  unseen_only: true,
  mark_seen: false,
  subject_filter: '',
  from_filter: '',
  body_keywords: '',
  task_priority: 'normal',
})

const enabledMailCount = computed(() => mailChannels.value.filter(channel => channel.enabled).length)
const selectedMailChannel = computed(() => mailChannels.value.find(channel => channel.id === selectedMailChannelId.value) || null)

const allowedToolsText = computed({
  get: () => runtimeForm.allowedTools.join(','),
  set: (value: string) => {
    runtimeForm.allowedTools = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  },
})

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
CLAUDE_RUNTIME_MOCK=${config.mock}`
  }
}

const toggleConfig = (config: ConfigItem) => {
  config.expanded = !config.expanded
}

function resetMailForm() {
  Object.assign(mailForm, {
    id: '',
    name: 'QQ 邮箱任务入口',
    enabled: false,
    provider: 'qq',
    host: 'imap.qq.com',
    port: 993,
    secure: true,
    username: '',
    password: '',
    mailbox: 'INBOX',
    scan_interval_minutes: 5,
    unseen_only: true,
    mark_seen: false,
    subject_filter: '',
    from_filter: '',
    body_keywords: '',
    task_priority: 'normal',
  })
}

function fillMailForm(channel: MailChannel) {
  Object.assign(mailForm, {
    id: channel.id,
    name: channel.name,
    enabled: channel.enabled,
    provider: channel.provider || 'qq',
    host: channel.host || 'imap.qq.com',
    port: channel.port || 993,
    secure: channel.secure,
    username: channel.username || '',
    password: '',
    mailbox: channel.mailbox || 'INBOX',
    scan_interval_minutes: channel.scan_interval_minutes || 5,
    unseen_only: channel.unseen_only,
    mark_seen: channel.mark_seen,
    subject_filter: channel.subject_filter || '',
    from_filter: channel.from_filter || '',
    body_keywords: channel.body_keywords || '',
    task_priority: channel.task_priority || 'normal',
  })
}

function startNewMailChannel() {
  selectedMailChannelId.value = ''
  resetMailForm()
}

function selectMailChannel(channelId: string) {
  const channel = mailChannels.value.find(item => item.id === channelId)
  if (!channel) return
  selectedMailChannelId.value = channelId
  fillMailForm(channel)
}

function applyMailProviderPreset() {
  if (mailForm.provider === 'qq') {
    mailForm.host = 'imap.qq.com'
    mailForm.port = 993
    mailForm.secure = true
    mailForm.mailbox = mailForm.mailbox || 'INBOX'
  }
}

function formatSeconds(value?: number | null) {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleString('zh-CN')
}

function mailPayload() {
  return {
    name: mailForm.name,
    enabled: mailForm.enabled,
    provider: mailForm.provider,
    host: mailForm.host,
    port: mailForm.port,
    secure: mailForm.secure,
    username: mailForm.username,
    password: mailForm.password,
    mailbox: mailForm.mailbox,
    scan_interval_minutes: mailForm.scan_interval_minutes,
    unseen_only: mailForm.unseen_only,
    mark_seen: mailForm.mark_seen,
    subject_filter: mailForm.subject_filter,
    from_filter: mailForm.from_filter,
    body_keywords: mailForm.body_keywords,
    task_priority: mailForm.task_priority,
  }
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

async function refreshMailConfig() {
  loadingMail.value = true
  try {
    const [channelsResponse, statusResponse, triggersResponse] = await Promise.all([
      mailApi.listChannels(),
      mailApi.status(),
      mailApi.listTriggers({ limit: 12 }),
    ])
    mailChannels.value = channelsResponse.channels
    mailStatus.value = statusResponse.status
    mailTriggers.value = triggersResponse.triggers
    if (selectedMailChannelId.value) {
      const current = mailChannels.value.find(channel => channel.id === selectedMailChannelId.value)
      if (current) fillMailForm(current)
      else startNewMailChannel()
    } else if (mailChannels.value.length > 0 && !mailForm.username) {
      selectMailChannel(mailChannels.value[0].id)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '读取邮件渠道配置失败')
  } finally {
    loadingMail.value = false
  }
}

async function saveMailChannel() {
  mailSaving.value = true
  try {
    const response = selectedMailChannelId.value
      ? await mailApi.updateChannel(selectedMailChannelId.value, mailPayload())
      : await mailApi.createChannel(mailPayload())
    selectedMailChannelId.value = response.channel.id
    fillMailForm(response.channel)
    ElMessage.success('邮件渠道已保存')
    await refreshMailConfig()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存邮件渠道失败')
  } finally {
    mailSaving.value = false
  }
}

async function testSelectedMailChannel() {
  if (!selectedMailChannelId.value) return
  mailTesting.value = true
  try {
    await mailApi.testChannel(selectedMailChannelId.value)
    ElMessage.success('邮箱连接测试成功')
    await refreshMailConfig()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '邮箱连接测试失败')
    await refreshMailConfig()
  } finally {
    mailTesting.value = false
  }
}

async function scanSelectedMailChannel() {
  if (!selectedMailChannelId.value) return
  mailScanning.value = true
  try {
    const response = await mailApi.scanChannel(selectedMailChannelId.value)
    const created = Number(response.result?.created || 0)
    ElMessage.success(created ? `扫描完成，已创建 ${created} 个任务` : '扫描完成，暂无新任务')
    await refreshMailConfig()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '扫描邮件失败')
    await refreshMailConfig()
  } finally {
    mailScanning.value = false
  }
}

async function deleteSelectedMailChannel() {
  if (!selectedMailChannelId.value) return
  try {
    await mailApi.deleteChannel(selectedMailChannelId.value)
    ElMessage.success('邮件渠道已删除')
    startNewMailChannel()
    await refreshMailConfig()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除邮件渠道失败')
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
  refreshMailConfig()
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

.runtime-panel {
  margin: 16px 32px 0;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

.mail-panel {
  margin: 16px 32px 0;
  padding: 16px;
  border: 1px solid color-mix(in oklab, var(--color-primary) 28%, var(--border-default));
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), transparent 42%),
    var(--bg-panel);
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

.mail-panel__subtitle {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
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

.runtime-form label,
.mail-editor__grid label {
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

.mail-layout {
  display: grid;
  grid-template-columns: minmax(210px, 260px) minmax(0, 1fr);
  gap: 14px;
  margin-top: 16px;
}

.mail-list,
.mail-editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 8px;
}

.mail-channel-row {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
}

.mail-channel-row.active,
.mail-channel-row:hover {
  border-color: rgba(var(--color-primary-rgb), 0.48);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.mail-channel-row__top,
.mail-toggles,
.mail-actions,
.mail-meta,
.surface-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mail-channel-row__top,
.surface-heading {
  justify-content: space-between;
}

.mail-channel-row strong,
.mail-channel-row small,
.mail-trigger-item strong,
.mail-trigger-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-channel-row strong {
  color: var(--text-primary);
}

.mail-channel-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-size: 11px;
}

.mail-channel-row em.ok {
  color: var(--color-success);
}

.mail-channel-row em.warn,
.mail-channel-row small {
  color: var(--text-tertiary);
}

.mail-editor__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.mail-toggles,
.mail-actions,
.mail-meta {
  flex-wrap: wrap;
}

.mail-meta span {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.02);
  font-size: 12px;
}

.mail-meta .mail-error {
  max-width: 100%;
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
  background: rgba(248, 113, 113, 0.08);
}

.mail-help {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.mail-trigger-log {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}

.surface-heading {
  margin-bottom: 12px;
}

.surface-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
}

.mail-empty {
  color: var(--text-secondary);
  font-size: 13px;
}

.mail-trigger-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.mail-trigger-item {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.mail-trigger-item strong {
  color: var(--text-primary);
  font-size: 13px;
}

.mail-trigger-item span,
.mail-trigger-item small {
  color: var(--text-tertiary);
  font-size: 12px;
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
  .runtime-form,
  .mail-layout,
  .mail-editor__grid {
    grid-template-columns: 1fr;
  }

  .runtime-panel__head,
  .runtime-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
