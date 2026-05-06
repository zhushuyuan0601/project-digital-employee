<template>
  <div class="mail-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">邮件触发中心</h1>
        <span class="page-subtitle">配置邮箱扫描渠道，将符合条件的邮件自动转成协作任务。</span>
      </div>
      <button class="btn btn-primary" :disabled="loadingMail" @click="refreshMailConfig">
        <i class="ri-refresh-line"></i>
        {{ loadingMail ? '刷新中' : '刷新' }}
      </button>
    </div>

    <section class="mail-panel">
      <div class="mail-panel__head">
        <div>
          <p class="eyebrow">Mail Trigger</p>
          <h2>邮箱渠道</h2>
          <span class="mail-panel__subtitle">通过 IMAP 扫描邮箱，把匹配邮件自动转成协作任务。</span>
        </div>
        <div class="mail-panel__chips">
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
    </section>

    <section class="mail-trigger-log">
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { mailApi, type MailChannel, type MailTrigger } from '@/api/mail'

const loadingMail = ref(false)
const mailSaving = ref(false)
const mailTesting = ref(false)
const mailScanning = ref(false)

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

onMounted(() => {
  refreshMailConfig()
})
</script>

<style scoped>
.mail-page {
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
  gap: 16px;
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

.mail-panel,
.mail-trigger-log {
  margin: 16px 32px 0;
  padding: 16px;
  border: 1px solid color-mix(in oklab, var(--color-primary) 28%, var(--border-default));
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), transparent 42%),
    var(--bg-panel);
}

.mail-trigger-log {
  margin-bottom: 32px;
}

.mail-panel__head,
.surface-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mail-panel__head h2,
.surface-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}

.surface-heading h2 {
  font-size: 16px;
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

.mail-panel__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mail-panel__chips span {
  padding: 4px 9px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
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
.mail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mail-channel-row__top {
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
  gap: 8px !important;
  padding: 9px 10px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
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

.surface-heading {
  margin-bottom: 12px;
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

.btn-danger:hover {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: var(--text-inverse);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 1100px) {
  .mail-editor__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .page-header,
  .mail-panel__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .mail-layout,
  .mail-editor__grid {
    grid-template-columns: 1fr;
  }
}
</style>
