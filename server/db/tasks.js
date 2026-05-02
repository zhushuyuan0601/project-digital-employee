import { getDatabase } from './index.js'

export const TASK_STATUSES = ['draft', 'planning', 'dispatching', 'running', 'reviewing', 'completed', 'failed', 'cancelled']
export const SUBTASK_STATUSES = ['pending', 'assigned', 'running', 'blocked', 'completed', 'failed']
export const OUTPUT_STATUSES = ['pending_review', 'accepted', 'rejected']

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function parseJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function taskProgress(task, subtasks = []) {
  if (!subtasks.length) return 0
  const total = subtasks.reduce((sum, subtask) => sum + Number(subtask.progress || 0), 0)
  return Math.round(total / subtasks.length)
}

function normalizeTask(row, subtasks = [], outputs = []) {
  if (!row) return null
  const normalizedSubtasks = subtasks.map(normalizeSubtask)
  return {
    ...row,
    plan_json: parseJson(row.plan_json),
    progress: taskProgress(row, normalizedSubtasks),
    subtasks: normalizedSubtasks,
    outputs: outputs.map(normalizeOutput),
  }
}

function normalizeSubtask(row) {
  if (!row) return null
  return {
    ...row,
    context_json: parseJson(row.context_json),
  }
}

function normalizeEvent(row) {
  if (!row) return null
  return {
    ...row,
    payload_json: parseJson(row.payload_json),
  }
}

function normalizeOutput(row) {
  if (!row) return null
  return row
}

export function initializeTaskSchema() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      coordinator_agent_id TEXT NOT NULL DEFAULT 'xiaomu',
      coordinator_session_key TEXT NOT NULL DEFAULT 'agent:ceo:main',
      created_by TEXT DEFAULT 'operator',
      priority TEXT DEFAULT 'normal',
      plan_json TEXT,
      summary TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      started_at INTEGER,
      completed_at INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      expected_output TEXT,
      assigned_agent_id TEXT NOT NULL,
      gateway_agent_id TEXT NOT NULL,
      session_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      result_summary TEXT,
      error TEXT,
      context_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      started_at INTEGER,
      completed_at INTEGER,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      subtask_id TEXT,
      agent_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      subtask_id TEXT,
      agent_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      path TEXT,
      git_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending_review',
      mtime INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(task_id, path),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_events_task ON task_events(task_id, created_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_outputs_task ON task_outputs(task_id)')

  console.log('[DB] Task orchestration tables initialized')
}

export function createTask({ title, description, priority = 'normal', createdBy = 'operator' }) {
  const db = getDatabase()
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, description, status, coordinator_agent_id, coordinator_session_key,
      created_by, priority, created_at, updated_at
    ) VALUES (?, ?, ?, 'planning', 'xiaomu', 'agent:ceo:main', ?, ?, unixepoch(), unixepoch())
  `)
  stmt.run(id, title, description, createdBy, priority)
  addTaskEvent({
    taskId: id,
    agentId: 'xiaomu',
    type: 'task.created',
    message: `任务已创建，等待小呦拆解：${title}`,
    payload: { priority },
  })
  return getTaskDetail(id)
}

export function listTasks({ status, limit = 50 } = {}) {
  const db = getDatabase()
  let query = `
    SELECT
      t.*,
      COUNT(DISTINCT s.id) as subtask_count,
      SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_subtask_count,
      COUNT(DISTINCT o.id) as output_count
    FROM tasks t
    LEFT JOIN subtasks s ON s.task_id = t.id
    LEFT JOIN task_outputs o ON o.task_id = t.id
  `
  const params = []
  if (status) {
    query += ' WHERE t.status = ?'
    params.push(status)
  }
  query += ' GROUP BY t.id ORDER BY t.updated_at DESC LIMIT ?'
  params.push(Number(limit) || 50)

  const rows = db.prepare(query).all(...params)
  return rows.map((row) => ({
    ...row,
    plan_json: parseJson(row.plan_json),
    progress: row.subtask_count ? Math.round((Number(row.completed_subtask_count || 0) / Number(row.subtask_count)) * 100) : 0,
  }))
}

export function getTaskDetail(taskId) {
  const db = getDatabase()
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
  if (!task) return null
  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC').all(taskId)
  const outputs = db.prepare('SELECT * FROM task_outputs WHERE task_id = ? ORDER BY created_at DESC').all(taskId)
  const events = db.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at ASC, id ASC').all(taskId)
  return {
    ...normalizeTask(task, subtasks, outputs),
    events: events.map(normalizeEvent),
  }
}

export function getSubtask(subtaskId) {
  const db = getDatabase()
  return normalizeSubtask(db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId))
}

export function updateTask(taskId, updates) {
  const allowed = ['status', 'plan_json', 'summary', 'started_at', 'completed_at']
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key))
  if (!entries.length) return getTaskDetail(taskId)
  const db = getDatabase()
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ')
  const values = entries.map(([, value]) => keyValue(value))
  db.prepare(`UPDATE tasks SET ${setClause}, updated_at = unixepoch() WHERE id = ?`).run(...values, taskId)
  return getTaskDetail(taskId)
}

export function addTaskEvent({ taskId, subtaskId = null, agentId = null, type, message, payload = null }) {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO task_events (task_id, subtask_id, agent_id, type, message, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())
  `).run(taskId, subtaskId, agentId, type, message, payload ? JSON.stringify(payload) : null)
  db.prepare('UPDATE tasks SET updated_at = unixepoch() WHERE id = ?').run(taskId)
}

export function listTaskEvents(taskId) {
  const db = getDatabase()
  return db.prepare('SELECT * FROM task_events WHERE task_id = ? ORDER BY created_at ASC, id ASC').all(taskId).map(normalizeEvent)
}

function keyValue(value) {
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value
}

export function savePlan(taskId, plan) {
  const db = getDatabase()
  db.prepare(`
    UPDATE tasks
    SET plan_json = ?, status = 'dispatching', updated_at = unixepoch()
    WHERE id = ?
  `).run(JSON.stringify(plan), taskId)
  addTaskEvent({
    taskId,
    agentId: 'xiaomu',
    type: 'plan.accepted',
    message: `小呦拆解计划已通过校验，共 ${plan.subtasks.length} 个子任务`,
    payload: plan,
  })
  return getTaskDetail(taskId)
}

export function markPlanInvalid(taskId, reason, payload) {
  const db = getDatabase()
  db.prepare(`
    UPDATE tasks
    SET status = 'failed', updated_at = unixepoch()
    WHERE id = ?
  `).run(taskId)
  addTaskEvent({
    taskId,
    agentId: 'xiaomu',
    type: 'plan.invalid',
    message: reason,
    payload,
  })
  return getTaskDetail(taskId)
}

export function createSubtasksFromPlan(taskId, plan, agentMap) {
  const db = getDatabase()
  const task = getTaskDetail(taskId)
  if (!task) return null

  const existing = db.prepare('SELECT COUNT(*) as count FROM subtasks WHERE task_id = ?').get(taskId)
  if (existing.count > 0) {
    return getTaskDetail(taskId)
  }

  const insert = db.prepare(`
    INSERT INTO subtasks (
      id, task_id, title, description, expected_output, assigned_agent_id,
      gateway_agent_id, session_key, status, progress, context_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'assigned', 5, ?, unixepoch(), unixepoch())
  `)

  const tx = db.transaction(() => {
    plan.subtasks.forEach((subtask, index) => {
      const agent = agentMap[subtask.assignedAgentId]
      const subtaskId = `${taskId}-sub-${String(index + 1).padStart(2, '0')}`
      insert.run(
        subtaskId,
        taskId,
        subtask.title,
        subtask.description,
        subtask.expectedOutput || '',
        subtask.assignedAgentId,
        agent.gatewayAgentId,
        agent.sessionKey,
        JSON.stringify({
          expectedOutput: subtask.expectedOutput || '',
          acceptanceCriteria: plan.acceptanceCriteria || [],
        })
      )
    })
    db.prepare(`
      UPDATE tasks
      SET status = 'running', started_at = COALESCE(started_at, unixepoch()), updated_at = unixepoch()
      WHERE id = ?
    `).run(taskId)
  })
  tx()

  addTaskEvent({
    taskId,
    type: 'task.dispatch.queued',
    message: `平台已创建 ${plan.subtasks.length} 个子任务，等待前端 WebSocket 派发`,
    payload: { subtaskCount: plan.subtasks.length },
  })

  return getTaskDetail(taskId)
}

export function updateSubtask(subtaskId, updates) {
  const allowed = ['status', 'progress', 'result_summary', 'error', 'started_at', 'completed_at']
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key))
  if (!entries.length) return getSubtask(subtaskId)
  const db = getDatabase()
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ')
  const values = entries.map(([, value]) => value)
  db.prepare(`UPDATE subtasks SET ${setClause}, updated_at = unixepoch() WHERE id = ?`).run(...values, subtaskId)
  const subtask = getSubtask(subtaskId)
  if (subtask) {
    db.prepare('UPDATE tasks SET updated_at = unixepoch() WHERE id = ?').run(subtask.task_id)
    refreshTaskStatus(subtask.task_id)
  }
  return subtask
}

export function refreshTaskStatus(taskId) {
  const db = getDatabase()
  const subtasks = db.prepare('SELECT status FROM subtasks WHERE task_id = ?').all(taskId)
  if (!subtasks.length) return getTaskDetail(taskId)
  const allCompleted = subtasks.every((subtask) => subtask.status === 'completed')
  const anyFailed = subtasks.some((subtask) => subtask.status === 'failed')
  const status = allCompleted ? 'reviewing' : anyFailed ? 'failed' : 'running'
  db.prepare('UPDATE tasks SET status = ?, updated_at = unixepoch() WHERE id = ?').run(status, taskId)
  return getTaskDetail(taskId)
}

export function upsertTaskOutput(output) {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO task_outputs (
      task_id, subtask_id, agent_id, name, type, path, git_url, status, mtime, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(task_id, path) DO UPDATE SET
      subtask_id = excluded.subtask_id,
      agent_id = excluded.agent_id,
      name = excluded.name,
      type = excluded.type,
      git_url = excluded.git_url,
      mtime = excluded.mtime
  `).run(
    output.taskId,
    output.subtaskId || null,
    output.agentId || null,
    output.name,
    output.type || 'text',
    output.path || null,
    output.gitUrl || null,
    output.status || 'pending_review',
    output.mtime || null
  )
}

export function listTaskOutputs({ taskId, agentId, status } = {}) {
  const db = getDatabase()
  const clauses = []
  const params = []
  if (taskId) {
    clauses.push('o.task_id = ?')
    params.push(taskId)
  }
  if (agentId) {
    clauses.push('o.agent_id = ?')
    params.push(agentId)
  }
  if (status) {
    clauses.push('o.status = ?')
    params.push(status)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return db.prepare(`
    SELECT o.*, t.title as task_title, s.title as subtask_title
    FROM task_outputs o
    LEFT JOIN tasks t ON t.id = o.task_id
    LEFT JOIN subtasks s ON s.id = o.subtask_id
    ${where}
    ORDER BY o.created_at DESC
    LIMIT 200
  `).all(...params).map(normalizeOutput)
}

export function completeTask(taskId, summary) {
  const db = getDatabase()
  db.prepare(`
    UPDATE tasks
    SET status = 'completed', summary = ?, completed_at = unixepoch(), updated_at = unixepoch()
    WHERE id = ?
  `).run(summary || '', taskId)
  addTaskEvent({
    taskId,
    agentId: 'xiaomu',
    type: 'task.completed',
    message: '任务已完成并进入归档',
    payload: { summary },
  })
  return getTaskDetail(taskId)
}
