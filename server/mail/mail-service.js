import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import {
  createMailTrigger,
  findMailTrigger,
  getMailChannel,
  listDueMailChannels,
  listMailChannels,
  listMailTriggers,
  updateMailChannelScanState,
} from '../db/mail.js'
import { addTaskEvent, createTask, getTaskDetail } from '../db/tasks.js'
import { enqueuePlanRun } from '../claude-runtime/index.js'

const DEFAULT_SCAN_TICK_MS = 60 * 1000
const MAX_MESSAGES_PER_SCAN = 20

let scannerTimer = null
let scannerRunning = false
let scannerStarted = false

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function compactText(value, limit = 8000) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit)
}

function addressText(addresses) {
  if (!addresses?.value?.length) return ''
  return addresses.value
    .map((item) => [item.name, item.address].filter(Boolean).join(' <') + (item.name && item.address ? '>' : ''))
    .join(', ')
}

function htmlToText(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywordList(value = '') {
  return String(value)
    .split(/[,，\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function matchesChannelRules(channel, mail) {
  const subject = String(mail.subject || '').toLowerCase()
  const from = String(mail.fromAddress || '').toLowerCase()
  const body = String(mail.bodyText || '').toLowerCase()

  if (channel.subject_filter && !subject.includes(String(channel.subject_filter).toLowerCase())) {
    return false
  }
  if (channel.from_filter && !from.includes(String(channel.from_filter).toLowerCase())) {
    return false
  }

  const keywords = keywordList(channel.body_keywords)
  if (keywords.length && !keywords.some((keyword) => subject.includes(keyword) || body.includes(keyword))) {
    return false
  }

  return true
}

function buildTaskPayload(channel, mail) {
  const receivedText = mail.receivedAt ? new Date(mail.receivedAt * 1000).toLocaleString('zh-CN') : '未知'
  const attachmentText = mail.attachments.length
    ? mail.attachments.map((item) => `- ${item.filename || '未命名附件'} (${item.contentType || 'unknown'})`).join('\n')
    : '无'

  const description = [
    `邮件渠道：${channel.name}`,
    `邮箱账号：${channel.username}`,
    `邮件 UID：${mail.uid}`,
    `Message-ID：${mail.messageId || '无'}`,
    `发件人：${mail.fromAddress || '未知'}`,
    `收件时间：${receivedText}`,
    '',
    '## 邮件正文',
    mail.bodyText || '邮件正文为空。',
    '',
    '## 附件',
    attachmentText,
    '',
    '## 处理要求',
    '请小呦先判断邮件内容的任务目标、背景、交付物和优先级，再拆解给内置团队成员产出报告。',
  ].join('\n')

  return {
    title: `邮件任务：${mail.subject || '无主题邮件'}`.slice(0, 120),
    description,
    priority: channel.task_priority || 'normal',
    createdBy: `mail:${channel.id}`,
  }
}

async function parseFetchedMessage(message) {
  const parsed = await simpleParser(message.source)
  const text = compactText(parsed.text || htmlToText(parsed.html || ''), 10000)
  return {
    uid: Number(message.uid),
    flags: Array.from(message.flags || []),
    subject: parsed.subject || message.envelope?.subject || '',
    messageId: parsed.messageId || message.envelope?.messageId || '',
    fromAddress: addressText(parsed.from),
    receivedAt: Math.floor((parsed.date || message.internalDate || new Date()).getTime() / 1000),
    bodyText: text,
    attachments: (parsed.attachments || []).map((item) => ({
      filename: item.filename,
      contentType: item.contentType,
      size: item.size,
    })),
  }
}

function makeClient(channel) {
  return new ImapFlow({
    host: channel.host,
    port: Number(channel.port || 993),
    secure: Boolean(channel.secure),
    auth: {
      user: channel.username,
      pass: channel.password,
    },
    logger: false,
  })
}

export function getMailStatus() {
  const channels = listMailChannels()
  const activeChannels = channels.filter((channel) => channel.enabled)
  const lastScanAt = Math.max(0, ...channels.map((channel) => Number(channel.last_scan_at || 0)))
  return {
    scannerStarted,
    scannerRunning,
    channelCount: channels.length,
    activeChannelCount: activeChannels.length,
    lastScanAt: lastScanAt || null,
    recentTriggers: listMailTriggers({ limit: 10 }),
  }
}

export async function testMailChannel(channelId) {
  const channel = getMailChannel(channelId, { includeSecret: true })
  if (!channel) throw new Error('邮件渠道不存在')
  if (!channel.username || !channel.password) throw new Error('请先填写邮箱账号和授权码')

  const client = makeClient(channel)
  await client.connect()
  try {
    const lock = await client.getMailboxLock(channel.mailbox || 'INBOX')
    try {
      const mailbox = client.mailbox
      return {
        ok: true,
        mailbox: mailbox?.path || channel.mailbox || 'INBOX',
        exists: mailbox?.exists ?? 0,
        uidNext: mailbox?.uidNext ?? null,
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }
}

export async function scanMailChannel(channelId, { manual = false } = {}) {
  const channel = getMailChannel(channelId, { includeSecret: true })
  if (!channel) throw new Error('邮件渠道不存在')
  if (!channel.username || !channel.password) throw new Error('请先填写邮箱账号和授权码')

  const scanStartedAt = nowSeconds()
  const stats = {
    channelId,
    checked: 0,
    matched: 0,
    created: 0,
    skipped: 0,
    lastUid: Number(channel.last_uid || 0),
    manual,
  }

  const client = makeClient(channel)
  try {
    await client.connect()
    const lock = await client.getMailboxLock(channel.mailbox || 'INBOX')
    try {
      const startUid = Math.max(1, Number(channel.last_uid || 0) + 1)
      const range = `${startUid}:*`
      let maxUid = Number(channel.last_uid || 0)
      let scanned = 0

      for await (const message of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        internalDate: true,
        source: true,
      }, { uid: true })) {
        scanned += 1
        if (scanned > MAX_MESSAGES_PER_SCAN) break

        const mail = await parseFetchedMessage(message)
        maxUid = Math.max(maxUid, mail.uid)
        stats.checked += 1

        if (channel.unseen_only && mail.flags.includes('\\Seen')) {
          stats.skipped += 1
          continue
        }

        if (findMailTrigger({ channelId: channel.id, uid: mail.uid, messageId: mail.messageId })) {
          stats.skipped += 1
          continue
        }

        if (!matchesChannelRules(channel, mail)) {
          stats.skipped += 1
          continue
        }

        stats.matched += 1
        const taskPayload = buildTaskPayload(channel, mail)
        const task = createTask(taskPayload)
        addTaskEvent({
          taskId: task.id,
          agentId: 'xiaomu',
          type: 'mail.task.created',
          message: `邮件渠道触发任务：${channel.name}`,
          payload: {
            channelId: channel.id,
            messageUid: mail.uid,
            messageId: mail.messageId,
            from: mail.fromAddress,
            subject: mail.subject,
          },
        })
        const run = enqueuePlanRun(task.id)
        createMailTrigger({
          channelId: channel.id,
          messageUid: mail.uid,
          messageId: mail.messageId,
          subject: mail.subject,
          fromAddress: mail.fromAddress,
          receivedAt: mail.receivedAt,
          taskId: task.id,
          status: 'created',
        })
        stats.created += 1
        stats.lastTask = getTaskDetail(task.id)
        stats.lastRunId = run.id

        if (channel.mark_seen) {
          await client.messageFlagsAdd(mail.uid, ['\\Seen'], { uid: true }).catch(() => {})
        }
      }

      updateMailChannelScanState(channel.id, {
        last_uid: maxUid,
        last_scan_at: scanStartedAt,
        last_success_at: nowSeconds(),
        last_error: null,
      })
      stats.lastUid = maxUid
      return stats
    } finally {
      lock.release()
    }
  } catch (err) {
    updateMailChannelScanState(channel.id, {
      last_scan_at: scanStartedAt,
      last_error: err instanceof Error ? err.message : String(err),
    })
    throw err
  } finally {
    await client.logout().catch(() => {})
  }
}

export async function scanDueMailChannels() {
  if (scannerRunning) return { skipped: true, reason: 'scanner-running' }
  scannerRunning = true
  const results = []
  try {
    for (const channel of listDueMailChannels()) {
      try {
        results.push(await scanMailChannel(channel.id))
      } catch (err) {
        results.push({
          channelId: channel.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return { skipped: false, results }
  } finally {
    scannerRunning = false
  }
}

export function startMailScanner() {
  if (scannerTimer) return
  scannerStarted = true
  scannerTimer = setInterval(() => {
    scanDueMailChannels().catch((err) => {
      console.error('[Mail] scan failed:', err)
    })
  }, Number(process.env.MAIL_SCAN_TICK_MS || DEFAULT_SCAN_TICK_MS))
  scannerTimer.unref?.()
  scanDueMailChannels().catch((err) => {
    console.error('[Mail] initial scan failed:', err)
  })
}
