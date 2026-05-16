import { getDatabase } from './index.js'

function json(value) {
  if (value == null) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function actorFromRequest(req) {
  return String(
    req?.headers?.['x-actor'] ||
    req?.headers?.['x-user'] ||
    req?.headers?.['x-user-name'] ||
    'system',
  )
}

function actionFromRequest(req) {
  const method = String(req?.method || '').toLowerCase()
  const path = String(req?.originalUrl || req?.url || '').split('?')[0]
  return `${method}:${path}`
}

function resourceFromPath(req) {
  const path = String(req?.originalUrl || req?.url || '').split('?')[0]
  const parts = path.split('/').filter(Boolean)
  const apiIndex = parts.indexOf('api')
  const resourceParts = apiIndex >= 0 ? parts.slice(apiIndex + 1) : parts
  return {
    resourceType: resourceParts[0] || 'api',
    resourceId: resourceParts.find(part => /^(task|risk|cron|wh|agent|run|rule|mail|skill)-/.test(part)) || req?.params?.id || null,
  }
}

export function initializeAuditSchema() {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      summary TEXT,
      before_json TEXT,
      after_json TEXT,
      metadata_json TEXT,
      ip TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_trace ON audit_logs(trace_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `)
  console.log('[DB] Audit tables initialized')
}

export function recordAuditLog(input = {}) {
  try {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO audit_logs (
        trace_id, actor, action, resource_type, resource_id, summary,
        before_json, after_json, metadata_json, ip, user_agent, status, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.traceId || null,
      input.actor || 'system',
      input.action || 'unknown',
      input.resourceType || 'api',
      input.resourceId || null,
      input.summary || null,
      json(input.before),
      json(input.after),
      json(input.metadata),
      input.ip || null,
      input.userAgent || null,
      input.status || 'success',
      input.error || null,
    )
    return result.lastInsertRowid
  } catch (err) {
    console.error('[Audit] Failed to record audit log:', err)
    return null
  }
}

export function listAuditLogs({ resourceType, resourceId, limit = 100 } = {}) {
  const db = getDatabase()
  const where = []
  const params = []
  if (resourceType) {
    where.push('resource_type = ?')
    params.push(resourceType)
  }
  if (resourceId) {
    where.push('resource_id = ?')
    params.push(resourceId)
  }
  const sql = `
    SELECT * FROM audit_logs
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id DESC
    LIMIT ?
  `
  return db.prepare(sql).all(...params, Math.min(Number(limit) || 100, 500)).map(row => ({
    id: row.id,
    traceId: row.trace_id,
    actor: row.actor,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    summary: row.summary,
    before: row.before_json ? JSON.parse(row.before_json) : null,
    after: row.after_json ? JSON.parse(row.after_json) : null,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    ip: row.ip,
    userAgent: row.user_agent,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  }))
}

export function auditMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
  const startedAt = Date.now()
  res.on('finish', () => {
    const resource = resourceFromPath(req)
    recordAuditLog({
      traceId: req.traceId,
      actor: actorFromRequest(req),
      action: actionFromRequest(req),
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      summary: `${req.method} ${req.originalUrl || req.url}`,
      after: req.body,
      metadata: { statusCode: res.statusCode, durationMs: Date.now() - startedAt },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: res.statusCode >= 400 ? 'failed' : 'success',
      error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
    })
  })
  next()
}
