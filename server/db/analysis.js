/**
 * 数据分析会话数据库模块
 */

import { getDatabase } from '../db/index.js'

export function initializeAnalysisSchema() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      model TEXT,
      last_user_message TEXT,
      last_report_path TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  db.exec('CREATE INDEX IF NOT EXISTS idx_analysis_sessions_updated_at ON analysis_sessions(updated_at DESC)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status)')

  console.log('[DB] Analysis sessions table initialized')
}

export function listAnalysisSessions() {
  const db = getDatabase()
  return db.prepare(`
    SELECT *
    FROM analysis_sessions
    ORDER BY updated_at DESC
  `).all()
}

export function getAnalysisSession(id) {
  const db = getDatabase()
  return db.prepare(`
    SELECT *
    FROM analysis_sessions
    WHERE id = ?
  `).get(id)
}

export function upsertAnalysisSession(session) {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO analysis_sessions (
      id,
      title,
      status,
      model,
      last_user_message,
      last_report_path,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      status = excluded.status,
      model = excluded.model,
      last_user_message = excluded.last_user_message,
      last_report_path = excluded.last_report_path,
      updated_at = unixepoch()
  `).run(
    session.id,
    session.title || '未命名分析会话',
    session.status || 'idle',
    session.model || null,
    session.last_user_message || null,
    session.last_report_path || null
  )

  return getAnalysisSession(session.id)
}

export function patchAnalysisSession(id, patch) {
  const existing = getAnalysisSession(id)
  if (!existing) return null
  return upsertAnalysisSession({
    ...existing,
    ...patch,
    id,
  })
}

export function deleteAnalysisSession(id) {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM analysis_sessions WHERE id = ?').run(id)
  return result.changes > 0
}
