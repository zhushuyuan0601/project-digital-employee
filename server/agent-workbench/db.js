import { getDatabase } from '../db/index.js'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'

const SESSION_STATUSES = new Set(['idle', 'running', 'completed', 'failed', 'cancelled'])
const ENGINES = new Set(['claudecode', 'codex'])
export const WORKBENCH_DEFAULT_AGENT_ID = 'coding_workbench'
export const WORKBENCH_CODEX_AGENT_ID = 'codex_workbench'

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function stringifyJson(value) {
  return value == null ? null : JSON.stringify(value)
}

function normalizeSession(row) {
  if (!row) return null
  return {
    ...row,
    config_json: parseJson(row.config_json, {}),
  }
}

function normalizeMessage(row) {
  if (!row) return null
  return {
    ...row,
    metadata_json: parseJson(row.metadata_json, {}),
  }
}

function normalizeToolCall(row) {
  if (!row) return null
  return {
    ...row,
    input_json: parseJson(row.input_json),
    output_json: parseJson(row.output_json),
  }
}

function normalizeAttachment(row) {
  return row || null
}

function normalizePermission(row) {
  if (!row) return null
  return {
    ...row,
    options_json: parseJson(row.options_json, []),
    response_json: parseJson(row.response_json),
  }
}

function normalizeAgentConfig(row) {
  if (!row) return null
  return {
    ...row,
    config_json: parseJson(row.config_json, {}),
    enabled: Boolean(row.enabled),
  }
}

function normalizeWorkbenchSessionAgent(row) {
  if (!row) return row
  const engine = ENGINES.has(row.engine) ? row.engine : 'claudecode'
  const expectedAgentId = engine === 'codex' ? WORKBENCH_CODEX_AGENT_ID : WORKBENCH_DEFAULT_AGENT_ID
  if (row.agent_id === expectedAgentId) return row
  return {
    ...row,
    agent_id: expectedAgentId,
  }
}

function normalizeEvent(row) {
  if (!row) return null
  return {
    ...row,
    payload_json: parseJson(row.payload_json, {}),
  }
}

export function initializeWorkbenchSchema() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      engine TEXT NOT NULL,
      project_cwd TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      model TEXT,
      mode TEXT,
      config_json TEXT,
      active_run_id TEXT,
      last_error TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      started_at INTEGER,
      completed_at INTEGER,
      last_event_id INTEGER DEFAULT 0
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      turn_id TEXT,
      metadata_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      created_at_ms INTEGER DEFAULT 0,
      sequence INTEGER DEFAULT 0,
      FOREIGN KEY(session_id) REFERENCES workbench_sessions(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      turn_id TEXT,
      tool_call_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'tool',
      status TEXT NOT NULL DEFAULT 'running',
      input_json TEXT,
      output_json TEXT,
      content TEXT,
      error TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(session_id, tool_call_id),
      FOREIGN KEY(session_id) REFERENCES workbench_sessions(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      message_id TEXT,
      name TEXT NOT NULL,
      path TEXT,
      mime_type TEXT,
      size INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(session_id) REFERENCES workbench_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES workbench_messages(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      tool_call_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      options_json TEXT,
      response_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      resolved_at INTEGER,
      FOREIGN KEY(session_id) REFERENCES workbench_sessions(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_agent_configs (
      agent_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      engine TEXT NOT NULL DEFAULT 'claudecode',
      default_model TEXT,
      default_cwd TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS workbench_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      created_at_ms INTEGER DEFAULT 0,
      FOREIGN KEY(session_id) REFERENCES workbench_sessions(id) ON DELETE CASCADE
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_sessions_updated ON workbench_sessions(updated_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_sessions_status ON workbench_sessions(status)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_messages_session ON workbench_messages(session_id, created_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_tool_calls_session ON workbench_tool_calls(session_id, updated_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_events_session ON workbench_events(session_id, id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_workbench_permissions_session ON workbench_permissions(session_id, status)')

  ensureColumn('workbench_messages', 'created_at_ms', 'INTEGER DEFAULT 0')
  ensureColumn('workbench_messages', 'sequence', 'INTEGER DEFAULT 0')
  db.prepare('UPDATE workbench_messages SET created_at_ms = created_at * 1000 WHERE COALESCE(created_at_ms, 0) = 0').run()
  db.prepare(`
    UPDATE workbench_messages
    SET sequence = (
      SELECT COUNT(*)
      FROM workbench_messages AS previous
      WHERE previous.session_id = workbench_messages.session_id
        AND (
          previous.created_at < workbench_messages.created_at
          OR (previous.created_at = workbench_messages.created_at AND previous.id <= workbench_messages.id)
        )
    )
    WHERE COALESCE(sequence, 0) = 0
  `).run()

  seedAgentConfigs()
  migrateWorkbenchSessions()
  console.log('[DB] Agent workbench tables initialized')
}

function ensureColumn(table, column, definition) {
  const db = getDatabase()
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column)
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

export function seedAgentConfigs() {
  const db = getDatabase()
  const config = getClaudeRuntimeConfig()
  const upsertWorkbenchAgent = db.prepare(`
    INSERT INTO workbench_agent_configs (
      agent_id, display_name, engine, default_model, default_cwd, enabled, config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, unixepoch(), unixepoch())
    ON CONFLICT(agent_id) DO UPDATE SET
      display_name = excluded.display_name,
      engine = excluded.engine,
      default_model = excluded.default_model,
      default_cwd = excluded.default_cwd,
      enabled = 1,
      config_json = excluded.config_json,
      updated_at = unixepoch()
  `)
  upsertWorkbenchAgent.run(
    WORKBENCH_DEFAULT_AGENT_ID,
    'Coding Workbench',
    'claudecode',
    config.model || '',
    config.cwd,
    stringifyJson({
      agentType: 'claude_code',
      description: 'Claude Code workbench engine. Independent from project business agents.',
      allowedTools: config.allowedTools || [],
      workbenchDefault: true,
    })
  )
  upsertWorkbenchAgent.run(
    'codex_workbench',
    'Codex Workbench',
    'codex',
    process.env.CODEX_AGENT_MODEL || '',
    config.cwd,
    stringifyJson({
      agentType: 'codex',
      description: 'Codex CLI workbench engine. Independent from project business agents.',
      allowedTools: [],
      workbenchDefault: true,
    })
  )

  db.prepare(`
    UPDATE workbench_agent_configs
    SET enabled = 0, updated_at = unixepoch()
    WHERE agent_id NOT IN (?, ?)
  `).run(WORKBENCH_DEFAULT_AGENT_ID, WORKBENCH_CODEX_AGENT_ID)
}

function migrateWorkbenchSessions() {
  const db = getDatabase()
  db.prepare(`
    UPDATE workbench_sessions
    SET agent_id = CASE
      WHEN engine = 'codex' THEN ?
      ELSE ?
    END
    WHERE agent_id NOT IN (?, ?)
  `).run(
    WORKBENCH_CODEX_AGENT_ID,
    WORKBENCH_DEFAULT_AGENT_ID,
    WORKBENCH_DEFAULT_AGENT_ID,
    WORKBENCH_CODEX_AGENT_ID
  )
}

export function listAgentConfigs() {
  return getDatabase()
    .prepare(`
      SELECT * FROM workbench_agent_configs
      WHERE agent_id IN ('coding_workbench', 'codex_workbench')
      ORDER BY
        enabled DESC,
        CASE agent_id
          WHEN 'coding_workbench' THEN 0
          WHEN 'codex_workbench' THEN 1
          ELSE 2
        END,
        display_name ASC
    `)
    .all()
    .map(normalizeAgentConfig)
}

export function createSession(payload) {
  const db = getDatabase()
  const engine = ENGINES.has(payload.engine) ? payload.engine : 'claudecode'
  const status = SESSION_STATUSES.has(payload.status) ? payload.status : 'idle'
  const id = makeId('wbs')
  const createdAt = nowSeconds()
  db.prepare(`
    INSERT INTO workbench_sessions (
      id, title, agent_id, engine, project_cwd, status, model, mode, config_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.title || '新建编码会话',
    engine === 'codex' ? WORKBENCH_CODEX_AGENT_ID : WORKBENCH_DEFAULT_AGENT_ID,
    engine,
    payload.projectCwd || null,
    status,
    payload.model || '',
    payload.mode || '',
    stringifyJson(payload.config || {}),
    createdAt,
    createdAt
  )
  return getSession(id)
}

export function listSessions({ engine, status, search, limit = 80 } = {}) {
  const clauses = []
  const params = []
  if (engine && ENGINES.has(engine)) {
    clauses.push('engine = ?')
    params.push(engine)
  }
  if (status && SESSION_STATUSES.has(status)) {
    clauses.push('status = ?')
    params.push(status)
  }
  if (search) {
    clauses.push('(title LIKE ? OR agent_id LIKE ? OR project_cwd LIKE ?)')
    const pattern = `%${search}%`
    params.push(pattern, pattern, pattern)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  params.push(Math.max(1, Math.min(300, Number(limit) || 80)))
  return getDatabase()
    .prepare(`SELECT * FROM workbench_sessions ${where} ORDER BY updated_at DESC, created_at DESC LIMIT ?`)
    .all(...params)
    .map(normalizeWorkbenchSessionAgent)
    .map(normalizeSession)
}

export function getSession(sessionId) {
  return normalizeSession(normalizeWorkbenchSessionAgent(getDatabase().prepare('SELECT * FROM workbench_sessions WHERE id = ?').get(sessionId)))
}

export function getSessionDetail(sessionId) {
  const session = getSession(sessionId)
  if (!session) return null
  return {
    session,
    messages: listMessages(sessionId),
    toolCalls: listToolCalls(sessionId),
    attachments: listAttachments(sessionId),
    permissions: listPermissions(sessionId),
  }
}

export function updateSession(sessionId, updates) {
  const allowed = ['title', 'project_cwd', 'status', 'model', 'mode', 'config_json', 'active_run_id', 'last_error', 'started_at', 'completed_at', 'last_event_id']
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key))
  if (!entries.length) return getSession(sessionId)
  const values = entries.map(([key, value]) => key === 'config_json' && value && typeof value === 'object' ? stringifyJson(value) : value)
  getDatabase().prepare(`
    UPDATE workbench_sessions
    SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = unixepoch()
    WHERE id = ?
  `).run(...values, sessionId)
  return getSession(sessionId)
}

export function addMessage({ sessionId, role, content, status = 'completed', turnId = null, metadata = null }) {
  const db = getDatabase()
  const id = makeId('wbm')
  const createdAtMs = Date.now()
  const nextSequence = Number(db.prepare('SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM workbench_messages WHERE session_id = ?').get(sessionId)?.next || 1)
  db.prepare(`
    INSERT INTO workbench_messages (id, session_id, role, content, status, turn_id, metadata_json, created_at, created_at_ms, sequence)
    VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), ?, ?)
  `).run(id, sessionId, role, content, status, turnId, stringifyJson(metadata), createdAtMs, nextSequence)
  db.prepare('UPDATE workbench_sessions SET updated_at = unixepoch() WHERE id = ?').run(sessionId)
  return getMessage(id)
}

export function appendAssistantContent(messageId, delta) {
  const db = getDatabase()
  db.prepare('UPDATE workbench_messages SET content = content || ? WHERE id = ?').run(delta, messageId)
  return getMessage(messageId)
}

export function replaceAssistantContent(messageId, content) {
  const db = getDatabase()
  db.prepare('UPDATE workbench_messages SET content = ? WHERE id = ?').run(String(content || ''), messageId)
  return getMessage(messageId)
}

export function finalizeMessage(messageId, status = 'completed') {
  getDatabase().prepare('UPDATE workbench_messages SET status = ? WHERE id = ?').run(status, messageId)
  return getMessage(messageId)
}

export function getMessage(messageId) {
  return normalizeMessage(getDatabase().prepare('SELECT * FROM workbench_messages WHERE id = ?').get(messageId))
}

export function listMessages(sessionId) {
  return getDatabase()
    .prepare('SELECT * FROM workbench_messages WHERE session_id = ? ORDER BY sequence ASC, created_at_ms ASC, created_at ASC, id ASC')
    .all(sessionId)
    .map(normalizeMessage)
}

export function upsertToolCall({ sessionId, turnId = null, toolCallId, name, category = 'tool', status = 'running', input = null, output = null, content = null, error = null }) {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO workbench_tool_calls (
      session_id, turn_id, tool_call_id, name, category, status, input_json, output_json, content, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    ON CONFLICT(session_id, tool_call_id) DO UPDATE SET
      turn_id = COALESCE(excluded.turn_id, workbench_tool_calls.turn_id),
      name = excluded.name,
      category = excluded.category,
      status = excluded.status,
      input_json = COALESCE(excluded.input_json, workbench_tool_calls.input_json),
      output_json = COALESCE(excluded.output_json, workbench_tool_calls.output_json),
      content = COALESCE(excluded.content, workbench_tool_calls.content),
      error = COALESCE(excluded.error, workbench_tool_calls.error),
      updated_at = unixepoch()
  `).run(
    sessionId,
    turnId,
    toolCallId,
    name,
    category,
    status,
    stringifyJson(input),
    stringifyJson(output),
    content,
    error
  )
  return getToolCall(sessionId, toolCallId)
}

export function getToolCall(sessionId, toolCallId) {
  return normalizeToolCall(getDatabase()
    .prepare('SELECT * FROM workbench_tool_calls WHERE session_id = ? AND tool_call_id = ?')
    .get(sessionId, toolCallId))
}

export function listToolCalls(sessionId) {
  return getDatabase()
    .prepare('SELECT * FROM workbench_tool_calls WHERE session_id = ? ORDER BY created_at ASC, id ASC')
    .all(sessionId)
    .map(normalizeToolCall)
}

export function addAttachment({ sessionId, messageId = null, name, path = null, mimeType = null, size = 0 }) {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO workbench_attachments (session_id, message_id, name, path, mime_type, size, created_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())
  `).run(sessionId, messageId, name, path, mimeType, Number(size) || 0)
  return normalizeAttachment(db.prepare('SELECT * FROM workbench_attachments WHERE id = ?').get(result.lastInsertRowid))
}

export function listAttachments(sessionId) {
  return getDatabase()
    .prepare('SELECT * FROM workbench_attachments WHERE session_id = ? ORDER BY created_at ASC, id ASC')
    .all(sessionId)
    .map(normalizeAttachment)
}

export function createPermission({ sessionId, toolCallId = null, options = [] }) {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO workbench_permissions (session_id, tool_call_id, status, options_json, created_at)
    VALUES (?, ?, 'pending', ?, unixepoch())
  `).run(sessionId, toolCallId, stringifyJson(options))
  return getPermission(result.lastInsertRowid)
}

export function getPermission(permissionId) {
  return normalizePermission(getDatabase().prepare('SELECT * FROM workbench_permissions WHERE id = ?').get(permissionId))
}

export function listPermissions(sessionId) {
  return getDatabase()
    .prepare('SELECT * FROM workbench_permissions WHERE session_id = ? ORDER BY created_at ASC, id ASC')
    .all(sessionId)
    .map(normalizePermission)
}

export function respondPermission(permissionId, response) {
  const status = response?.decision === 'deny' ? 'denied' : 'approved'
  getDatabase().prepare(`
    UPDATE workbench_permissions
    SET status = ?, response_json = ?, resolved_at = unixepoch()
    WHERE id = ?
  `).run(status, stringifyJson(response || {}), permissionId)
  return getPermission(permissionId)
}

export function addEvent({ sessionId, type, payload = {} }) {
  const db = getDatabase()
  const createdAtMs = Date.now()
  const result = db.prepare(`
    INSERT INTO workbench_events (session_id, type, payload_json, created_at, created_at_ms)
    VALUES (?, ?, ?, unixepoch(), ?)
  `).run(sessionId, type, stringifyJson(payload), createdAtMs)
  db.prepare(`
    UPDATE workbench_sessions
    SET last_event_id = ?, updated_at = unixepoch()
    WHERE id = ?
  `).run(result.lastInsertRowid, sessionId)
  return normalizeEvent(db.prepare('SELECT * FROM workbench_events WHERE id = ?').get(result.lastInsertRowid))
}

export function listEvents(sessionId, { since = null, limit = 500 } = {}) {
  const params = [sessionId]
  let cursor = ''
  if (since != null && Number.isFinite(Number(since))) {
    cursor = 'AND id > ?'
    params.push(Number(since))
  }
  params.push(Math.max(1, Math.min(1000, Number(limit) || 500)))
  return getDatabase()
    .prepare(`
      SELECT *
      FROM workbench_events
      WHERE session_id = ? ${cursor}
      ORDER BY id ASC
      LIMIT ?
    `)
    .all(...params)
    .map(normalizeEvent)
}
