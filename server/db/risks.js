import { getDatabase } from './index.js'

const RISK_SEED = [
  ['risk-001', 'default', '核心依赖库存在安全漏洞', '项目使用的 lodash 版本存在原型链污染漏洞，需升级至 4.17.21+。', 'technical', 'high', 'mitigating', 4, 5, '张三', '李四', '2026-05-15T00:00:00Z', '升级 lodash 至最新版，补充回归测试', '', 'triggered', '2026-05-10T08:00:00Z', ['安全', '依赖'], '2026-05-01T09:00:00Z', '2026-05-05T14:30:00Z'],
  ['risk-002', 'default', '前端构建时间超过 10 分钟', '随着模块数量增加，Vite 全量构建时间已超 10 分钟，影响发版效率。', 'technical', 'medium', 'monitoring', 5, 3, '王五', '王五', '2026-05-20T00:00:00Z', '评估模块拆分 + 增量构建方案', '', 'none', null, ['性能', '构建'], '2026-04-28T10:00:00Z', '2026-05-02T16:00:00Z'],
  ['risk-003', 'default', '关键开发人员请假导致进度延期', '核心后端工程师请假 2 周，API 开发进度滞后。', 'resource', 'high', 'open', 5, 4, '赵六', '李四', '2026-05-10T00:00:00Z', '', '', 'triggered', '2026-05-10T08:00:00Z', ['人员', '进度'], '2026-05-03T11:00:00Z', '2026-05-03T11:00:00Z'],
  ['risk-004', 'default', '第三方 API 限流策略变更', '外部支付接口可能调整限流阈值，影响交易峰值处理能力。', 'external', 'critical', 'open', 3, 5, '李四', '李四', '2026-05-12T00:00:00Z', '联系第三方确认策略，准备降级方案', '', 'triggered', '2026-05-10T08:00:00Z', ['外部依赖', '支付'], '2026-05-08T08:00:00Z', '2026-05-08T08:00:00Z'],
  ['risk-005', 'default', '需求变更频繁导致范围蔓延', '客户在迭代期间频繁提出新需求，项目范围持续扩大。', 'scope', 'medium', 'monitoring', 4, 3, '张三', '张三', '2026-05-30T00:00:00Z', '建立变更控制委员会，所有变更需走审批流程', '', 'none', null, ['需求', '范围'], '2026-04-20T09:00:00Z', '2026-04-25T11:00:00Z'],
]

const RULE_SEED = [
  ['rule-high-level', '高风险自动预警', 1, 'high', null, ['open', 'monitoring', 'mitigating'], 'in-app', 240, '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'],
  ['rule-due-3days', '截止前 3 天提醒', 1, null, 3, ['open', 'monitoring', 'mitigating'], 'in-app', 1440, '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'],
  ['rule-overdue', '过期未处理预警', 1, null, 0, ['open', 'monitoring', 'mitigating'], 'in-app', 1440, '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z'],
]

const LEVELS = ['low', 'medium', 'high', 'critical']
const STATUSES = ['open', 'monitoring', 'mitigating', 'closed', 'accepted']
const CATEGORIES = ['technical', 'schedule', 'resource', 'quality', 'scope', 'external', 'other']
const LEVEL_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

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

function normalizeRisk(row) {
  if (!row) return null
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    category: row.category,
    level: row.level,
    status: row.status,
    probability: Number(row.probability),
    impact: Number(row.impact),
    owner: row.owner,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.due_date,
    mitigationPlan: row.mitigation_plan || '',
    resolution: row.resolution || '',
    alertStatus: row.alert_status || 'none',
    lastAlertAt: row.last_alert_at,
    tags: parseJson(row.tags_json, []),
  }
}

function normalizeRule(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(Number(row.enabled)),
    triggerCondition: {
      levelThreshold: row.level_threshold,
      daysBeforeDue: row.days_before_due == null ? null : Number(row.days_before_due),
      statusFilter: parseJson(row.status_filter_json, []),
    },
    notificationType: row.notification_type || 'in-app',
    cooldownMinutes: Number(row.cooldown_minutes || 1440),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function seedRiskData(db) {
  const riskCount = db.prepare('SELECT COUNT(*) as count FROM risks').get().count
  if (!riskCount) {
    const insert = db.prepare(`
      INSERT INTO risks (
        id, project_id, title, description, category, level, status, probability, impact,
        owner, created_by, due_date, mitigation_plan, resolution, alert_status, last_alert_at,
        tags_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const row of RISK_SEED) {
      insert.run(...row.slice(0, 16), json(row[16]), row[17], row[18])
    }
  }

  const ruleCount = db.prepare('SELECT COUNT(*) as count FROM risk_alert_rules').get().count
  if (!ruleCount) {
    const insert = db.prepare(`
      INSERT INTO risk_alert_rules (
        id, name, enabled, level_threshold, days_before_due, status_filter_json,
        notification_type, cooldown_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const row of RULE_SEED) {
      insert.run(row[0], row[1], row[2], row[3], row[4], json(row[5]), row[6], row[7], row[8], row[9])
    }
  }
}

export function initializeRiskSchema() {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      status TEXT NOT NULL,
      probability INTEGER NOT NULL,
      impact INTEGER NOT NULL,
      owner TEXT NOT NULL,
      created_by TEXT NOT NULL,
      due_date TEXT,
      mitigation_plan TEXT,
      resolution TEXT,
      alert_status TEXT NOT NULL DEFAULT 'none',
      last_alert_at TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      level_threshold TEXT,
      days_before_due INTEGER,
      status_filter_json TEXT NOT NULL DEFAULT '[]',
      notification_type TEXT NOT NULL DEFAULT 'in-app',
      cooldown_minutes INTEGER NOT NULL DEFAULT 1440,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
    CREATE INDEX IF NOT EXISTS idx_risks_level ON risks(level);
    CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
  `)
  seedRiskData(db)
  console.log('[DB] Risk tables initialized')
}

function validateRisk(input, { partial = false } = {}) {
  const required = ['title', 'category', 'level', 'status', 'owner']
  if (!partial) {
    for (const field of required) {
      if (!String(input[field] || '').trim()) throw Object.assign(new Error(`${field} is required`), { statusCode: 400, code: 'RISK_FIELD_REQUIRED' })
    }
  }
  if (input.level && !LEVELS.includes(input.level)) throw Object.assign(new Error('Invalid risk level'), { statusCode: 400, code: 'RISK_LEVEL_INVALID' })
  if (input.status && !STATUSES.includes(input.status)) throw Object.assign(new Error('Invalid risk status'), { statusCode: 400, code: 'RISK_STATUS_INVALID' })
  if (input.category && !CATEGORIES.includes(input.category)) throw Object.assign(new Error('Invalid risk category'), { statusCode: 400, code: 'RISK_CATEGORY_INVALID' })
}

export function listRisks(params = {}) {
  const db = getDatabase()
  let rows = db.prepare('SELECT * FROM risks').all().map(normalizeRisk)
  const page = Math.max(Number(params.page || 1), 1)
  const pageSize = Math.min(Math.max(Number(params.pageSize || 20), 1), 200)
  const asArray = value => Array.isArray(value) ? value : value ? String(value).split(',') : []

  const levels = asArray(params.level)
  const statuses = asArray(params.status)
  const categories = asArray(params.category)
  const keyword = String(params.keyword || '').trim().toLowerCase()

  if (levels.length) rows = rows.filter(row => levels.includes(row.level))
  if (statuses.length) rows = rows.filter(row => statuses.includes(row.status))
  if (categories.length) rows = rows.filter(row => categories.includes(row.category))
  if (params.owner) rows = rows.filter(row => row.owner === params.owner)
  if (keyword) rows = rows.filter(row => row.title.toLowerCase().includes(keyword) || row.description.toLowerCase().includes(keyword))

  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'
  rows.sort((a, b) => {
    let cmp
    if (sortBy === 'level') cmp = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
    else if (sortBy === 'dueDate') cmp = (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    else cmp = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    return sortOrder === 'desc' ? -cmp : cmp
  })

  const total = rows.length
  return { data: rows.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize }
}

export function getRisk(id) {
  return normalizeRisk(getDatabase().prepare('SELECT * FROM risks WHERE id = ?').get(id))
}

export function createRisk(input) {
  validateRisk(input)
  const created = nowIso()
  const risk = {
    projectId: input.projectId || 'default',
    title: String(input.title || '').trim(),
    description: input.description || '',
    category: input.category,
    level: input.level,
    status: input.status || 'open',
    probability: Number(input.probability || 1),
    impact: Number(input.impact || 1),
    owner: input.owner || '',
    createdBy: input.createdBy || input.owner || 'system',
    dueDate: input.dueDate || null,
    mitigationPlan: input.mitigationPlan || '',
    resolution: input.resolution || '',
    alertStatus: input.alertStatus || 'none',
    lastAlertAt: input.lastAlertAt || null,
    tags: Array.isArray(input.tags) ? input.tags : [],
  }
  const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  getDatabase().prepare(`
    INSERT INTO risks (
      id, project_id, title, description, category, level, status, probability, impact,
      owner, created_by, due_date, mitigation_plan, resolution, alert_status, last_alert_at,
      tags_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    risk.projectId,
    risk.title,
    risk.description,
    risk.category,
    risk.level,
    risk.status,
    risk.probability,
    risk.impact,
    risk.owner,
    risk.createdBy,
    risk.dueDate,
    risk.mitigationPlan,
    risk.resolution,
    risk.alertStatus,
    risk.lastAlertAt,
    json(risk.tags),
    created,
    created,
  )
  return getRisk(id)
}

export function updateRisk(id, input = {}) {
  validateRisk(input, { partial: true })
  const current = getRisk(id)
  if (!current) return null
  const next = { ...current, ...input, id, updatedAt: nowIso() }
  getDatabase().prepare(`
    UPDATE risks SET
      project_id = ?, title = ?, description = ?, category = ?, level = ?, status = ?,
      probability = ?, impact = ?, owner = ?, created_by = ?, due_date = ?,
      mitigation_plan = ?, resolution = ?, alert_status = ?, last_alert_at = ?,
      tags_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.projectId,
    next.title,
    next.description,
    next.category,
    next.level,
    next.status,
    next.probability,
    next.impact,
    next.owner,
    next.createdBy,
    next.dueDate,
    next.mitigationPlan,
    next.resolution,
    next.alertStatus,
    next.lastAlertAt,
    json(next.tags),
    next.updatedAt,
    id,
  )
  return getRisk(id)
}

export function deleteRisk(id) {
  return getDatabase().prepare('DELETE FROM risks WHERE id = ?').run(id).changes > 0
}

export function riskStats() {
  const risks = getDatabase().prepare('SELECT * FROM risks').all().map(normalizeRisk)
  const byLevel = { low: 0, medium: 0, high: 0, critical: 0 }
  const byStatus = { open: 0, monitoring: 0, mitigating: 0, closed: 0, accepted: 0 }
  const byCategory = { technical: 0, schedule: 0, resource: 0, quality: 0, scope: 0, external: 0, other: 0 }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let overdueCount = 0
  let triggeredAlertCount = 0
  for (const risk of risks) {
    byLevel[risk.level]++
    byStatus[risk.status]++
    byCategory[risk.category]++
    if (risk.dueDate && new Date(risk.dueDate) < today && !['closed', 'accepted'].includes(risk.status)) overdueCount++
    if (risk.alertStatus === 'triggered') triggeredAlertCount++
  }
  const trendLast7Days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - index))
    const date = day.toISOString().slice(0, 10)
    const dayRisks = risks.filter(risk => risk.createdAt.slice(0, 10) === date)
    return { date, openCount: dayRisks.length, closedCount: dayRisks.filter(risk => ['closed', 'accepted'].includes(risk.status)).length }
  })
  return { total: risks.length, byLevel, byStatus, byCategory, overdueCount, triggeredAlertCount, trendLast7Days }
}

export function listAlertRules() {
  return getDatabase().prepare('SELECT * FROM risk_alert_rules ORDER BY created_at ASC').all().map(normalizeRule)
}

export function createAlertRule(input) {
  const created = nowIso()
  const id = `rule-${Date.now()}`
  getDatabase().prepare(`
    INSERT INTO risk_alert_rules (
      id, name, enabled, level_threshold, days_before_due, status_filter_json,
      notification_type, cooldown_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(input.name || '').trim(),
    input.enabled === false ? 0 : 1,
    input.triggerCondition?.levelThreshold ?? input.levelThreshold ?? null,
    input.triggerCondition?.daysBeforeDue ?? input.daysBeforeDue ?? null,
    json(input.triggerCondition?.statusFilter ?? input.statusFilter ?? []),
    input.notificationType || 'in-app',
    Number(input.cooldownMinutes || 1440),
    created,
    created,
  )
  return listAlertRules()
}

export function updateAlertRule(id, input = {}) {
  const current = listAlertRules().find(rule => rule.id === id)
  if (!current) return null
  const next = {
    ...current,
    ...input,
    triggerCondition: {
      ...current.triggerCondition,
      ...(input.triggerCondition || {}),
    },
  }
  getDatabase().prepare(`
    UPDATE risk_alert_rules SET
      name = ?, enabled = ?, level_threshold = ?, days_before_due = ?,
      status_filter_json = ?, notification_type = ?, cooldown_minutes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.name,
    next.enabled ? 1 : 0,
    next.triggerCondition.levelThreshold,
    next.triggerCondition.daysBeforeDue,
    json(next.triggerCondition.statusFilter),
    next.notificationType,
    next.cooldownMinutes,
    nowIso(),
    id,
  )
  return listAlertRules()
}

export function deleteAlertRule(id) {
  return getDatabase().prepare('DELETE FROM risk_alert_rules WHERE id = ?').run(id).changes > 0
}

export function checkRiskAlerts() {
  const risks = listRisks({ pageSize: 1000 }).data
  const rules = listAlertRules().filter(rule => rule.enabled)
  const notifications = []
  const now = Date.now()
  for (const rule of rules) {
    for (const risk of risks) {
      if (!rule.triggerCondition.statusFilter.includes(risk.status)) continue
      let matched = false
      let message = ''
      if (rule.triggerCondition.levelThreshold) {
        const thresholds = { low: 0, medium: 1, high: 2, critical: 3 }
        if (thresholds[risk.level] >= thresholds[rule.triggerCondition.levelThreshold]) {
          matched = true
          message = `风险「${risk.title}」已触发等级预警`
        }
      }
      if (!matched && rule.triggerCondition.daysBeforeDue != null && risk.dueDate) {
        const daysDiff = Math.ceil((new Date(risk.dueDate).getTime() - now) / (1000 * 60 * 60 * 24))
        if (rule.triggerCondition.daysBeforeDue === 0 && daysDiff <= 0) {
          matched = true
          message = `风险「${risk.title}」已过期未处理`
        } else if (rule.triggerCondition.daysBeforeDue > 0 && daysDiff <= rule.triggerCondition.daysBeforeDue && daysDiff > 0) {
          matched = true
          message = `风险「${risk.title}」将在 ${daysDiff} 天后到期`
        }
      }
      if (matched) notifications.push({ risk, rule, message })
    }
  }
  return notifications
}
