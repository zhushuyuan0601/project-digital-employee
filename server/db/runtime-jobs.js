import { getDatabase } from './index.js'
import { getAgentRun, updateAgentRun } from './tasks.js'

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function normalizeJob(row) {
  if (!row) return null
  return row
}

function capacityAllows(agentCapacity, agentId) {
  if (!agentCapacity) return true
  if (agentCapacity instanceof Map) {
    return Number(agentCapacity.get(agentId) ?? 0) > 0
  }
  if (Object.prototype.hasOwnProperty.call(agentCapacity, agentId)) {
    return Number(agentCapacity[agentId] ?? 0) > 0
  }
  return false
}

function releaseSessionLock(db, runId) {
  db.prepare('DELETE FROM runtime_session_locks WHERE run_id = ?').run(runId)
}

export function releaseRuntimeJobLock(runId) {
  releaseSessionLock(getDatabase(), runId)
}

export function enqueueRuntimeJob({ run, sessionKey, priority = 0, maxAttempts = 3 }) {
  if (!run?.id) throw new Error('enqueueRuntimeJob requires a run')
  if (!sessionKey) throw new Error('enqueueRuntimeJob requires a sessionKey')
  const db = getDatabase()
  db.prepare(`
    INSERT INTO runtime_jobs (
      run_id, task_id, subtask_id, agent_id, kind, session_key, priority,
      status, attempt_count, max_attempts, available_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, unixepoch(), unixepoch(), unixepoch())
    ON CONFLICT(run_id) DO UPDATE SET
      session_key = excluded.session_key,
      priority = excluded.priority,
      max_attempts = excluded.max_attempts,
      status = 'queued',
      available_at = unixepoch(),
      error = NULL,
      updated_at = unixepoch()
  `).run(
    run.id,
    run.task_id,
    run.subtask_id || null,
    run.agent_id,
    run.kind || '',
    sessionKey,
    Number(priority) || 0,
    Math.max(1, Number(maxAttempts) || 3)
  )
  updateAgentRun(run.id, { status: 'queued', error: null, completed_at: null })
  return getRuntimeJob(run.id)
}

export function claimNextRuntimeJob({ ownerId, agentCapacity = null, lockedSeconds = 300 } = {}) {
  const db = getDatabase()
  const owner = ownerId || `runtime-${process.pid}`
  const tx = db.transaction(() => {
    const now = nowSeconds()
    db.prepare('DELETE FROM runtime_session_locks WHERE locked_until <= ?').run(now)
    const candidates = db.prepare(`
      SELECT *
      FROM runtime_jobs
      WHERE status = 'queued'
        AND available_at <= ?
        AND NOT EXISTS (
          SELECT 1
          FROM runtime_session_locks locks
          WHERE locks.session_key = runtime_jobs.session_key
            AND locks.locked_until > ?
        )
      ORDER BY priority DESC, created_at ASC, run_id ASC
      LIMIT 50
    `).all(now, now)

    const candidate = candidates.find((job) => capacityAllows(agentCapacity, job.agent_id))
    if (!candidate) return null

    const lockResult = db.prepare(`
      INSERT INTO runtime_session_locks (session_key, run_id, owner_id, locked_until, created_at, updated_at)
      VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(session_key) DO UPDATE SET
        run_id = CASE WHEN runtime_session_locks.locked_until <= ? THEN excluded.run_id ELSE runtime_session_locks.run_id END,
        owner_id = CASE WHEN runtime_session_locks.locked_until <= ? THEN excluded.owner_id ELSE runtime_session_locks.owner_id END,
        locked_until = CASE WHEN runtime_session_locks.locked_until <= ? THEN excluded.locked_until ELSE runtime_session_locks.locked_until END,
        updated_at = unixepoch()
      WHERE runtime_session_locks.locked_until <= ?
    `).run(candidate.session_key, candidate.run_id, owner, now + Math.max(1, Number(lockedSeconds) || 300), now, now, now, now)

    if (lockResult.changes === 0) {
      deferRuntimeJob(candidate.run_id, 5, 'session lock conflict')
      return null
    }

    db.prepare(`
      UPDATE runtime_jobs
      SET status = 'running',
        owner_id = ?,
        locked_at = ?,
        attempt_count = attempt_count + 1,
        error = NULL,
        updated_at = unixepoch()
      WHERE run_id = ? AND status = 'queued'
    `).run(owner, now, candidate.run_id)
    updateAgentRun(candidate.run_id, { status: 'running', started_at: now, error: null })
    return getRuntimeJob(candidate.run_id)
  })
  return normalizeJob(tx())
}

export function deferRuntimeJob(runId, delaySeconds = 5, reason = '', { releaseLock = true } = {}) {
  const db = getDatabase()
  const next = nowSeconds() + Math.max(0, Number(delaySeconds) || 0)
  if (releaseLock) releaseSessionLock(db, runId)
  db.prepare(`
    UPDATE runtime_jobs
    SET status = 'queued',
      owner_id = NULL,
      locked_at = NULL,
      available_at = ?,
      error = ?,
      updated_at = unixepoch()
    WHERE run_id = ?
  `).run(next, reason || null, runId)
  updateAgentRun(runId, { status: 'queued', error: reason || null })
  return getRuntimeJob(runId)
}

export function completeRuntimeJob(runId, { releaseLock = true } = {}) {
  const db = getDatabase()
  if (releaseLock) releaseSessionLock(db, runId)
  db.prepare(`
    UPDATE runtime_jobs
    SET status = 'completed',
      completed_at = unixepoch(),
      owner_id = NULL,
      locked_at = NULL,
      error = NULL,
      updated_at = unixepoch()
    WHERE run_id = ?
  `).run(runId)
  return getRuntimeJob(runId)
}

export function retryRuntimeJob(runId, error, delaySeconds = 15, { releaseLock = true } = {}) {
  const db = getDatabase()
  const job = getRuntimeJob(runId)
  if (!job) return null
  if (Number(job.attempt_count || 0) >= Number(job.max_attempts || 1)) {
    return failRuntimeJobFinal(runId, error)
  }
  if (releaseLock) releaseSessionLock(db, runId)
  db.prepare(`
    UPDATE runtime_jobs
    SET status = 'queued',
      available_at = ?,
      owner_id = NULL,
      locked_at = NULL,
      error = ?,
      updated_at = unixepoch()
    WHERE run_id = ?
  `).run(nowSeconds() + Math.max(0, Number(delaySeconds) || 0), String(error || ''), runId)
  updateAgentRun(runId, { status: 'queued', error: String(error || '') })
  return getRuntimeJob(runId)
}

export function failRuntimeJobFinal(runId, error, { releaseLock = true } = {}) {
  const db = getDatabase()
  if (releaseLock) releaseSessionLock(db, runId)
  db.prepare(`
    UPDATE runtime_jobs
    SET status = 'failed',
      completed_at = unixepoch(),
      owner_id = NULL,
      locked_at = NULL,
      error = ?,
      updated_at = unixepoch()
    WHERE run_id = ?
  `).run(String(error || ''), runId)
  updateAgentRun(runId, { status: 'failed', error: String(error || ''), completed_at: nowSeconds() })
  return getRuntimeJob(runId)
}

export function cancelRuntimeJob(runId, { releaseLock = true } = {}) {
  const db = getDatabase()
  if (releaseLock) releaseSessionLock(db, runId)
  db.prepare(`
    UPDATE runtime_jobs
    SET status = 'cancelled',
      completed_at = unixepoch(),
      owner_id = NULL,
      locked_at = NULL,
      error = COALESCE(error, 'cancelled'),
      updated_at = unixepoch()
    WHERE run_id = ?
  `).run(runId)
  updateAgentRun(runId, { status: 'cancelled', error: '用户取消排队任务', completed_at: nowSeconds() })
  return getRuntimeJob(runId)
}

export function getRuntimeJob(runId) {
  const db = getDatabase()
  return normalizeJob(db.prepare('SELECT * FROM runtime_jobs WHERE run_id = ?').get(runId))
}

export function listQueuedRuntimeJobs({ agentId = null, limit = 500 } = {}) {
  const db = getDatabase()
  const clauses = [`status = 'queued'`]
  const params = []
  if (agentId) {
    clauses.push('agent_id = ?')
    params.push(agentId)
  }
  params.push(Math.max(1, Number(limit) || 500))
  return db.prepare(`
    SELECT *
    FROM runtime_jobs
    WHERE ${clauses.join(' AND ')}
    ORDER BY priority DESC, created_at ASC, run_id ASC
    LIMIT ?
  `).all(...params).map(normalizeJob)
}

export function listActiveRuntimeJobs({ taskId = null, status = null, limit = 1000 } = {}) {
  const db = getDatabase()
  const clauses = []
  const params = []
  if (status) {
    clauses.push('status = ?')
    params.push(status)
  } else {
    clauses.push(`status IN ('queued', 'running')`)
  }
  if (taskId) {
    clauses.push('task_id = ?')
    params.push(taskId)
  }
  params.push(Math.max(1, Number(limit) || 1000))
  return db.prepare(`
    SELECT *
    FROM runtime_jobs
    WHERE ${clauses.join(' AND ')}
    ORDER BY priority DESC, created_at ASC, run_id ASC
    LIMIT ?
  `).all(...params).map(normalizeJob)
}
