import { getDatabase } from './index.js'

const CRON_SEED = [
  {
    id: 'cron1',
    name: '每日数据备份',
    cron: '0 2 * * *',
    agentId: 'xiaokai',
    agentName: '小开',
    enabled: true,
    successCount: 128,
    failureCount: 3,
    lastStatus: 'success',
  },
  {
    id: 'cron2',
    name: '周报生成',
    cron: '0 9 * * 1',
    agentId: 'xiaochan',
    agentName: '小产',
    enabled: true,
    successCount: 45,
    failureCount: 1,
    lastStatus: 'success',
  },
  {
    id: 'cron3',
    name: '日志清理',
    cron: '0 0 * * 0',
    agentId: 'xiaokai',
    agentName: '小开',
    enabled: false,
    successCount: 24,
    failureCount: 0,
    lastStatus: 'success',
  },
]

const WEBHOOK_SEED = [
  {
    id: 'wh1',
    name: '生产环境告警',
    url: 'https://api.example.com/webhooks/alerts',
    description: '发送所有错误和告警事件到监控系统',
    events: ['agent.error', 'log.error', 'security.alert'],
    secret: 'whsec_xxxxxxxxxxxxxxxx',
    algorithm: 'HMAC-SHA256',
    retryPolicy: 'exponential',
    maxRetries: 3,
    timeout: 30,
    enabled: true,
    successCount: 1247,
    failureCount: 12,
    avgResponseTime: 156,
  },
  {
    id: 'wh2',
    name: '任务状态同步',
    url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
    description: '任务状态变更通知到 Slack 频道',
    events: ['task.created', 'task.completed', 'task.failed'],
    secret: '',
    algorithm: 'HMAC-SHA256',
    retryPolicy: 'fixed',
    maxRetries: 2,
    timeout: 15,
    enabled: true,
    successCount: 856,
    failureCount: 3,
    avgResponseTime: 234,
  },
]

function nowIso() {
  return new Date().toISOString()
}

function json(value) {
  return JSON.stringify(value ?? [])
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function bool(value) {
  return Boolean(Number(value))
}

function normalizeCronTask(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    cron: row.cron,
    cronDescription: row.cron_description || undefined,
    agentId: row.agent_id,
    agentName: row.agent_name,
    enabled: bool(row.enabled),
    lastRun: row.last_run || undefined,
    nextRun: row.next_run || undefined,
    successCount: Number(row.success_count || 0),
    failureCount: Number(row.failure_count || 0),
    lastStatus: row.last_status || undefined,
    lastError: row.last_error || undefined,
  }
}

function normalizeCronExecution(row) {
  if (!row) return null
  return {
    id: row.id,
    taskId: row.task_id,
    taskName: row.task_name,
    startTime: row.start_time,
    endTime: row.end_time || undefined,
    status: row.status,
    error: row.error || undefined,
    output: row.output || undefined,
  }
}

function normalizeWebhook(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description || '',
    events: parseJson(row.events_json, []),
    secret: row.secret || '',
    algorithm: row.algorithm || 'HMAC-SHA256',
    retryPolicy: row.retry_policy || 'exponential',
    maxRetries: Number(row.max_retries || 3),
    timeout: Number(row.timeout || 30),
    enabled: bool(row.enabled),
    successCount: Number(row.success_count || 0),
    failureCount: Number(row.failure_count || 0),
    avgResponseTime: Number(row.avg_response_time || 0),
    lastDelivery: row.last_delivery || undefined,
  }
}

function normalizeWebhookDelivery(row) {
  if (!row) return null
  return {
    id: row.id,
    webhookId: row.webhook_id,
    event: row.event,
    timestamp: row.timestamp,
    status: row.status,
    httpMethod: row.http_method || 'POST',
    httpStatus: Number(row.http_status || 0),
    duration: Number(row.duration || 0),
    error: row.error || undefined,
    payload: parseJson(row.payload_json, null),
    response: parseJson(row.response_json, null),
  }
}

function seedAutomationData(db) {
  const cronCount = db.prepare('SELECT COUNT(*) as count FROM automation_cron_tasks').get().count
  if (!cronCount) {
    const insertCron = db.prepare(`
      INSERT INTO automation_cron_tasks (
        id, name, cron, agent_id, agent_name, enabled, last_run, next_run,
        success_count, failure_count, last_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [index, task] of CRON_SEED.entries()) {
      const created = nowIso()
      insertCron.run(
        task.id,
        task.name,
        task.cron,
        task.agentId,
        task.agentName,
        task.enabled ? 1 : 0,
        new Date(Date.now() - 1000 * 60 * 60 * (index + 2)).toISOString(),
        task.enabled ? new Date(Date.now() + 1000 * 60 * 60 * (index + 6)).toISOString() : null,
        task.successCount,
        task.failureCount,
        task.lastStatus,
        created,
        created,
      )
    }
  }

  const webhookCount = db.prepare('SELECT COUNT(*) as count FROM automation_webhooks').get().count
  if (!webhookCount) {
    const insertWebhook = db.prepare(`
      INSERT INTO automation_webhooks (
        id, name, url, description, events_json, secret, algorithm, retry_policy,
        max_retries, timeout, enabled, success_count, failure_count, avg_response_time,
        last_delivery, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [index, webhook] of WEBHOOK_SEED.entries()) {
      const created = nowIso()
      insertWebhook.run(
        webhook.id,
        webhook.name,
        webhook.url,
        webhook.description,
        json(webhook.events),
        webhook.secret,
        webhook.algorithm,
        webhook.retryPolicy,
        webhook.maxRetries,
        webhook.timeout,
        webhook.enabled ? 1 : 0,
        webhook.successCount,
        webhook.failureCount,
        webhook.avgResponseTime,
        new Date(Date.now() - 1000 * 60 * (index + 5)).toISOString(),
        created,
        created,
      )
    }
  }
}

export function initializeAutomationSchema() {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_cron_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron TEXT NOT NULL,
      cron_description TEXT,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_status TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automation_cron_executions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      task_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL,
      error TEXT,
      output TEXT,
      FOREIGN KEY(task_id) REFERENCES automation_cron_tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS automation_webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      events_json TEXT NOT NULL DEFAULT '[]',
      secret TEXT,
      algorithm TEXT NOT NULL DEFAULT 'HMAC-SHA256',
      retry_policy TEXT NOT NULL DEFAULT 'exponential',
      max_retries INTEGER NOT NULL DEFAULT 3,
      timeout INTEGER NOT NULL DEFAULT 30,
      enabled INTEGER NOT NULL DEFAULT 1,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      avg_response_time INTEGER NOT NULL DEFAULT 0,
      last_delivery TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automation_webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      http_method TEXT NOT NULL DEFAULT 'POST',
      http_status INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      payload_json TEXT,
      response_json TEXT,
      FOREIGN KEY(webhook_id) REFERENCES automation_webhooks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cron_executions_task ON automation_cron_executions(task_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON automation_webhook_deliveries(webhook_id);
  `)
  seedAutomationData(db)
  console.log('[DB] Automation tables initialized')
}

export function listCronTasks() {
  const db = getDatabase()
  return db.prepare('SELECT * FROM automation_cron_tasks ORDER BY updated_at DESC, created_at DESC').all().map(normalizeCronTask)
}

export function listCronExecutions(limit = 50) {
  const db = getDatabase()
  return db.prepare('SELECT * FROM automation_cron_executions ORDER BY start_time DESC LIMIT ?').all(Math.min(Number(limit) || 50, 100)).map(normalizeCronExecution)
}

export function cronStats() {
  const tasks = listCronTasks()
  return {
    totalTasks: tasks.length,
    enabledTasks: tasks.filter(task => task.enabled).length,
    disabledTasks: tasks.filter(task => !task.enabled).length,
    todayExecutions: listCronExecutions(500).filter(exec => exec.startTime.slice(0, 10) === nowIso().slice(0, 10)).length,
  }
}

export function createCronTask(input) {
  const db = getDatabase()
  const id = `cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const created = nowIso()
  db.prepare(`
    INSERT INTO automation_cron_tasks (
      id, name, cron, cron_description, agent_id, agent_name, enabled, success_count, failure_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `).run(
    id,
    String(input.name || '').trim(),
    String(input.cron || '').trim(),
    input.cronDescription || null,
    String(input.agentId || '').trim(),
    input.agentName || '小开',
    input.enabled === false ? 0 : 1,
    created,
    created,
  )
  return getCronTask(id)
}

export function getCronTask(id) {
  return normalizeCronTask(getDatabase().prepare('SELECT * FROM automation_cron_tasks WHERE id = ?').get(id))
}

export function updateCronTask(id, updates = {}) {
  const current = getCronTask(id)
  if (!current) return null
  const next = {
    ...current,
    ...updates,
    agentId: updates.agentId ?? updates.agent_id ?? current.agentId,
    agentName: updates.agentName ?? updates.agent_name ?? current.agentName,
    cronDescription: updates.cronDescription ?? updates.cron_description ?? current.cronDescription,
  }
  getDatabase().prepare(`
    UPDATE automation_cron_tasks
    SET name = ?, cron = ?, cron_description = ?, agent_id = ?, agent_name = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.cron,
    next.cronDescription || null,
    next.agentId,
    next.agentName || '小开',
    next.enabled ? 1 : 0,
    nowIso(),
    id,
  )
  return getCronTask(id)
}

export function deleteCronTask(id) {
  return getDatabase().prepare('DELETE FROM automation_cron_tasks WHERE id = ?').run(id).changes > 0
}

export function toggleCronTask(id) {
  const task = getCronTask(id)
  if (!task) return null
  return updateCronTask(id, { enabled: !task.enabled })
}

export function executeCronTask(id) {
  const db = getDatabase()
  const task = getCronTask(id)
  if (!task) return null
  const start = nowIso()
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  db.prepare(`
    INSERT INTO automation_cron_executions (id, task_id, task_name, start_time, end_time, status, output)
    VALUES (?, ?, ?, ?, ?, 'success', ?)
  `).run(executionId, task.id, task.name, start, nowIso(), '手动执行已记录')
  db.prepare(`
    UPDATE automation_cron_tasks
    SET last_run = ?, success_count = success_count + 1, last_status = 'success', last_error = NULL, updated_at = ?
    WHERE id = ?
  `).run(start, nowIso(), id)
  return { executionId, task: getCronTask(id) }
}

export function listWebhooks() {
  return getDatabase().prepare('SELECT * FROM automation_webhooks ORDER BY updated_at DESC, created_at DESC').all().map(normalizeWebhook)
}

export function webhookStats() {
  const webhooks = listWebhooks()
  return {
    totalWebhooks: webhooks.length,
    enabledWebhooks: webhooks.filter(webhook => webhook.enabled).length,
    disabledWebhooks: webhooks.filter(webhook => !webhook.enabled).length,
    todayDeliveries: listWebhookDeliveries(null, 500).filter(delivery => delivery.timestamp.slice(0, 10) === nowIso().slice(0, 10)).length,
  }
}

export function getWebhook(id) {
  return normalizeWebhook(getDatabase().prepare('SELECT * FROM automation_webhooks WHERE id = ?').get(id))
}

export function createWebhook(input) {
  const id = `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const created = nowIso()
  getDatabase().prepare(`
    INSERT INTO automation_webhooks (
      id, name, url, description, events_json, secret, algorithm, retry_policy,
      max_retries, timeout, enabled, success_count, failure_count, avg_response_time, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
  `).run(
    id,
    String(input.name || '').trim(),
    String(input.url || '').trim(),
    input.description || '',
    json(input.events || []),
    input.secret || '',
    input.algorithm || 'HMAC-SHA256',
    input.retryPolicy || input.retry_policy || 'exponential',
    Number(input.maxRetries || input.max_retries || 3),
    Number(input.timeout || 30),
    input.enabled === false ? 0 : 1,
    created,
    created,
  )
  return getWebhook(id)
}

export function updateWebhook(id, updates = {}) {
  const current = getWebhook(id)
  if (!current) return null
  const next = { ...current, ...updates }
  getDatabase().prepare(`
    UPDATE automation_webhooks
    SET name = ?, url = ?, description = ?, events_json = ?, secret = ?, algorithm = ?,
      retry_policy = ?, max_retries = ?, timeout = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.url,
    next.description || '',
    json(next.events || []),
    next.secret || '',
    next.algorithm || 'HMAC-SHA256',
    next.retryPolicy || 'exponential',
    Number(next.maxRetries || 3),
    Number(next.timeout || 30),
    next.enabled ? 1 : 0,
    nowIso(),
    id,
  )
  return getWebhook(id)
}

export function deleteWebhook(id) {
  return getDatabase().prepare('DELETE FROM automation_webhooks WHERE id = ?').run(id).changes > 0
}

export function toggleWebhook(id) {
  const webhook = getWebhook(id)
  if (!webhook) return null
  return updateWebhook(id, { enabled: !webhook.enabled })
}

export function recordWebhookDelivery(webhookId, event = 'test.event') {
  const db = getDatabase()
  const webhook = getWebhook(webhookId)
  if (!webhook) return null
  const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const timestamp = nowIso()
  const duration = 80 + Math.floor(Math.random() * 220)
  db.prepare(`
    INSERT INTO automation_webhook_deliveries (
      id, webhook_id, event, timestamp, status, http_method, http_status, duration, payload_json, response_json
    ) VALUES (?, ?, ?, ?, 'success', 'POST', 200, ?, ?, ?)
  `).run(id, webhookId, event, timestamp, duration, json({ event, test: true }), json({ ok: true }))
  db.prepare(`
    UPDATE automation_webhooks
    SET success_count = success_count + 1, avg_response_time = ?, last_delivery = ?, updated_at = ?
    WHERE id = ?
  `).run(duration, timestamp, timestamp, webhookId)
  return normalizeWebhookDelivery(db.prepare('SELECT * FROM automation_webhook_deliveries WHERE id = ?').get(id))
}

export function listWebhookDeliveries(webhookId = null, limit = 50) {
  const db = getDatabase()
  const capped = Math.min(Number(limit) || 50, 100)
  if (webhookId) {
    return db.prepare(`
      SELECT * FROM automation_webhook_deliveries WHERE webhook_id = ? ORDER BY timestamp DESC LIMIT ?
    `).all(webhookId, capped).map(normalizeWebhookDelivery)
  }
  return db.prepare('SELECT * FROM automation_webhook_deliveries ORDER BY timestamp DESC LIMIT ?').all(capped).map(normalizeWebhookDelivery)
}
