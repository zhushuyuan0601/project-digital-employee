import { getDatabase } from './index.js'

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function boolValue(value, fallback = false) {
  if (value == null) return fallback ? 1 : 0
  return value ? 1 : 0
}

function normalizeChannel(row, { includeSecret = false } = {}) {
  if (!row) return null
  const channel = {
    ...row,
    enabled: Boolean(row.enabled),
    secure: Boolean(row.secure),
    unseen_only: Boolean(row.unseen_only),
    mark_seen: Boolean(row.mark_seen),
    has_password: Boolean(row.password),
  }
  if (!includeSecret) {
    delete channel.password
  }
  return channel
}

function normalizeTrigger(row) {
  if (!row) return null
  return row
}

export function initializeMailSchema() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      provider TEXT DEFAULT 'custom',
      host TEXT NOT NULL DEFAULT 'imap.qq.com',
      port INTEGER NOT NULL DEFAULT 993,
      secure INTEGER NOT NULL DEFAULT 1,
      username TEXT NOT NULL DEFAULT '',
      password TEXT,
      mailbox TEXT NOT NULL DEFAULT 'INBOX',
      scan_interval_minutes INTEGER NOT NULL DEFAULT 5,
      unseen_only INTEGER NOT NULL DEFAULT 1,
      mark_seen INTEGER NOT NULL DEFAULT 0,
      subject_filter TEXT DEFAULT '',
      from_filter TEXT DEFAULT '',
      body_keywords TEXT DEFAULT '',
      task_priority TEXT DEFAULT 'normal',
      last_uid INTEGER DEFAULT 0,
      last_scan_at INTEGER,
      last_success_at INTEGER,
      last_error TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_task_triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      message_uid INTEGER,
      message_id TEXT,
      subject TEXT,
      from_address TEXT,
      received_at INTEGER,
      task_id TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      error TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(channel_id, message_uid),
      FOREIGN KEY(channel_id) REFERENCES mail_channels(id) ON DELETE CASCADE,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_mail_channels_enabled ON mail_channels(enabled, last_scan_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_mail_triggers_channel ON mail_task_triggers(channel_id, created_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_mail_triggers_task ON mail_task_triggers(task_id)')

  console.log('[DB] Mail channel tables initialized')
}

export function listMailChannels({ includeSecret = false } = {}) {
  const db = getDatabase()
  return db.prepare('SELECT * FROM mail_channels ORDER BY updated_at DESC, created_at DESC').all()
    .map((row) => normalizeChannel(row, { includeSecret }))
}

export function getMailChannel(channelId, { includeSecret = false } = {}) {
  const db = getDatabase()
  return normalizeChannel(db.prepare('SELECT * FROM mail_channels WHERE id = ?').get(channelId), { includeSecret })
}

export function createMailChannel(input = {}) {
  const db = getDatabase()
  const id = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const channel = normalizeMailChannelInput(input)
  db.prepare(`
    INSERT INTO mail_channels (
      id, name, enabled, provider, host, port, secure, username, password, mailbox,
      scan_interval_minutes, unseen_only, mark_seen, subject_filter, from_filter,
      body_keywords, task_priority, last_uid, created_at, updated_at
    ) VALUES (
      @id, @name, @enabled, @provider, @host, @port, @secure, @username, @password, @mailbox,
      @scan_interval_minutes, @unseen_only, @mark_seen, @subject_filter, @from_filter,
      @body_keywords, @task_priority, @last_uid, unixepoch(), unixepoch()
    )
  `).run({ id, ...channel })
  return getMailChannel(id)
}

export function updateMailChannel(channelId, input = {}) {
  const existing = getMailChannel(channelId, { includeSecret: true })
  if (!existing) return null
  const db = getDatabase()
  const channel = normalizeMailChannelInput(input, existing)
  db.prepare(`
    UPDATE mail_channels
    SET
      name = @name,
      enabled = @enabled,
      provider = @provider,
      host = @host,
      port = @port,
      secure = @secure,
      username = @username,
      password = @password,
      mailbox = @mailbox,
      scan_interval_minutes = @scan_interval_minutes,
      unseen_only = @unseen_only,
      mark_seen = @mark_seen,
      subject_filter = @subject_filter,
      from_filter = @from_filter,
      body_keywords = @body_keywords,
      task_priority = @task_priority,
      updated_at = unixepoch()
    WHERE id = @id
  `).run({ id: channelId, ...channel })
  return getMailChannel(channelId)
}

export function deleteMailChannel(channelId) {
  const db = getDatabase()
  return db.prepare('DELETE FROM mail_channels WHERE id = ?').run(channelId).changes > 0
}

export function listDueMailChannels(now = nowSeconds()) {
  const db = getDatabase()
  return db.prepare(`
    SELECT *
    FROM mail_channels
    WHERE enabled = 1
      AND username != ''
      AND password IS NOT NULL
      AND password != ''
      AND (
        last_scan_at IS NULL OR
        last_scan_at + (scan_interval_minutes * 60) <= ?
      )
    ORDER BY COALESCE(last_scan_at, 0) ASC
  `).all(now).map((row) => normalizeChannel(row, { includeSecret: true }))
}

export function updateMailChannelScanState(channelId, updates = {}) {
  const db = getDatabase()
  const allowed = ['last_uid', 'last_scan_at', 'last_success_at', 'last_error']
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key))
  if (!entries.length) return getMailChannel(channelId)
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ')
  db.prepare(`UPDATE mail_channels SET ${setClause}, updated_at = unixepoch() WHERE id = ?`)
    .run(...entries.map(([, value]) => value), channelId)
  return getMailChannel(channelId)
}

export function findMailTrigger({ channelId, uid, messageId }) {
  const db = getDatabase()
  const byUid = uid != null
    ? db.prepare('SELECT * FROM mail_task_triggers WHERE channel_id = ? AND message_uid = ?').get(channelId, Number(uid))
    : null
  if (byUid) return normalizeTrigger(byUid)
  if (messageId) {
    return normalizeTrigger(db.prepare('SELECT * FROM mail_task_triggers WHERE channel_id = ? AND message_id = ?').get(channelId, messageId))
  }
  return null
}

export function createMailTrigger(input = {}) {
  const db = getDatabase()
  db.prepare(`
    INSERT OR IGNORE INTO mail_task_triggers (
      channel_id, message_uid, message_id, subject, from_address, received_at,
      task_id, status, error, created_at
    ) VALUES (
      @channel_id, @message_uid, @message_id, @subject, @from_address, @received_at,
      @task_id, @status, @error, unixepoch()
    )
  `).run({
    channel_id: input.channelId,
    message_uid: input.messageUid ?? null,
    message_id: input.messageId || null,
    subject: input.subject || '',
    from_address: input.fromAddress || '',
    received_at: input.receivedAt || null,
    task_id: input.taskId || null,
    status: input.status || 'created',
    error: input.error || null,
  })
  return findMailTrigger({ channelId: input.channelId, uid: input.messageUid, messageId: input.messageId })
}

export function listMailTriggers({ channelId = null, limit = 30 } = {}) {
  const db = getDatabase()
  const normalizedLimit = Math.max(1, Math.min(200, Number(limit) || 30))
  if (channelId) {
    return db.prepare(`
      SELECT *
      FROM mail_task_triggers
      WHERE channel_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(channelId, normalizedLimit).map(normalizeTrigger)
  }
  return db.prepare(`
    SELECT *
    FROM mail_task_triggers
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(normalizedLimit).map(normalizeTrigger)
}

function normalizeMailChannelInput(input = {}, existing = null) {
  const provider = input.provider ?? existing?.provider ?? 'qq'
  const defaults = provider === 'qq'
    ? { host: 'imap.qq.com', port: 993, secure: true }
    : { host: 'imap.qq.com', port: 993, secure: true }

  const password = input.password === ''
    ? existing?.password || null
    : input.password ?? existing?.password ?? null

  return {
    name: String(input.name ?? existing?.name ?? 'QQ 邮箱渠道').trim() || 'QQ 邮箱渠道',
    enabled: boolValue(input.enabled, Boolean(existing?.enabled)),
    provider,
    host: String(input.host ?? existing?.host ?? defaults.host).trim(),
    port: Number(input.port ?? existing?.port ?? defaults.port) || defaults.port,
    secure: boolValue(input.secure, input.secure ?? existing?.secure ?? defaults.secure),
    username: String(input.username ?? existing?.username ?? '').trim(),
    password,
    mailbox: String(input.mailbox ?? existing?.mailbox ?? 'INBOX').trim() || 'INBOX',
    scan_interval_minutes: Math.max(1, Number(input.scan_interval_minutes ?? existing?.scan_interval_minutes ?? 5) || 5),
    unseen_only: boolValue(input.unseen_only, input.unseen_only ?? existing?.unseen_only ?? true),
    mark_seen: boolValue(input.mark_seen, input.mark_seen ?? existing?.mark_seen ?? false),
    subject_filter: String(input.subject_filter ?? existing?.subject_filter ?? '').trim(),
    from_filter: String(input.from_filter ?? existing?.from_filter ?? '').trim(),
    body_keywords: String(input.body_keywords ?? existing?.body_keywords ?? '').trim(),
    task_priority: String(input.task_priority ?? existing?.task_priority ?? 'normal').trim() || 'normal',
    last_uid: Number(existing?.last_uid || 0),
  }
}
