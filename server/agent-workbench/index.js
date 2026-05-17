import express from 'express'
import { execFile } from 'child_process'
import { statSync } from 'fs'
import { basename } from 'path'
import { platform } from 'os'
import { promisify } from 'util'
import {
  createSession,
  getPermission,
  getSession,
  getSessionDetail,
  listAgentConfigs,
  listSessions,
  respondPermission,
  updateSession,
} from './db.js'
import { attachSessionStream, emitWorkbenchEvent } from './events.js'
import { cancelWorkbenchSession, getActiveRun, startWorkbenchTurn } from './runtime.js'

const router = express.Router()
const execFileAsync = promisify(execFile)

function parsePositiveInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

async function selectDirectory(defaultPath = '') {
  if (platform() === 'darwin') {
    const script = defaultPath
      ? `POSIX path of (choose folder default location POSIX file "${String(defaultPath).replaceAll('"', '\\"')}")`
      : 'POSIX path of (choose folder)'
    const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 120000 })
    return stdout.trim().replace(/\/$/, '') || null
  }

  const candidates = [
    { command: 'zenity', args: ['--file-selection', '--directory'] },
    { command: 'kdialog', args: ['--getexistingdirectory', defaultPath || process.cwd()] },
  ]
  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate.command, candidate.args, { timeout: 120000 })
      const selected = stdout.trim()
      if (selected) return selected
    } catch {
      // Try the next platform picker.
    }
  }
  const error = new Error('No supported directory picker is available on this server')
  error.statusCode = 501
  throw error
}

function fileInfo(path) {
  let size = 0
  try {
    size = statSync(path).size
  } catch {
    size = 0
  }
  return {
    name: basename(path),
    path,
    size,
    mimeType: null,
  }
}

async function selectFiles(defaultPath = '', multiple = true) {
  if (platform() === 'darwin') {
    const defaultLocation = defaultPath
      ? ` default location POSIX file "${String(defaultPath).replaceAll('"', '\\"')}"`
      : ''
    const multi = multiple ? ' with multiple selections allowed' : ''
    const script = `set chosenFiles to choose file${defaultLocation}${multi}
set output to ""
if class of chosenFiles is list then
  repeat with chosenFile in chosenFiles
    set output to output & POSIX path of chosenFile & linefeed
  end repeat
else
  set output to POSIX path of chosenFiles
end if
return output`
    const { stdout } = await execFileAsync('osascript', ['-e', script], { timeout: 120000 })
    return stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map(fileInfo)
  }

  const candidates = [
    { command: 'zenity', args: ['--file-selection', ...(multiple ? ['--multiple', '--separator=\n'] : [])] },
    { command: 'kdialog', args: multiple ? ['--getopenfilename', defaultPath || process.cwd(), '', '--multiple'] : ['--getopenfilename', defaultPath || process.cwd()] },
  ]
  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(candidate.command, candidate.args, { timeout: 120000 })
      const selected = stdout.split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean)
      if (selected.length) return selected.map(fileInfo)
    } catch {
      // Try the next platform picker.
    }
  }
  const error = new Error('No supported file picker is available on this server')
  error.statusCode = 501
  throw error
}

router.get('/workbench/agent-configs', (_req, res) => {
  try {
    res.json({ success: true, agentConfigs: listAgentConfigs() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/workbench/select-directory', async (req, res) => {
  try {
    const path = await selectDirectory(String(req.body?.defaultPath || req.body?.default_path || '').trim())
    if (!path) return res.status(400).json({ success: false, error: 'No directory selected' })
    res.json({ success: true, path })
  } catch (err) {
    const message = err?.code === 1 ? 'No directory selected' : err.message
    res.status(err.statusCode || (err?.code === 1 ? 400 : 500)).json({ success: false, error: message })
  }
})

router.post('/workbench/select-files', async (req, res) => {
  try {
    const files = await selectFiles(
      String(req.body?.defaultPath || req.body?.default_path || '').trim(),
      req.body?.multiple !== false
    )
    if (!files.length) return res.status(400).json({ success: false, error: 'No file selected' })
    res.json({ success: true, files })
  } catch (err) {
    const message = err?.code === 1 ? 'No file selected' : err.message
    res.status(err.statusCode || (err?.code === 1 ? 400 : 500)).json({ success: false, error: message })
  }
})

router.get('/workbench/sessions', (req, res) => {
  try {
    const sessions = listSessions({
      engine: req.query.engine,
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit,
    })
    res.json({ success: true, sessions })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/workbench/sessions', (req, res) => {
  try {
    const body = req.body || {}
    const session = createSession({
      title: String(body.title || '').trim() || undefined,
      agentId: '',
      engine: body.engine,
      projectCwd: String(body.projectCwd || body.project_cwd || '').trim() || null,
      model: String(body.model || '').trim(),
      mode: String(body.mode || '').trim(),
      config: body.config || {},
    })
    emitWorkbenchEvent(session.id, 'session_created', { session })
    res.json({ success: true, session })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.get('/workbench/sessions/:id', (req, res) => {
  try {
    const detail = getSessionDetail(req.params.id)
    if (!detail) return res.status(404).json({ success: false, error: 'Session not found' })
    res.json({ success: true, ...detail, activeRun: getActiveRun(req.params.id)?.runId || null })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.patch('/workbench/sessions/:id', (req, res) => {
  try {
    const session = getSession(req.params.id)
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
    const body = req.body || {}
    const updates = {}
    if (body.title != null) updates.title = String(body.title).trim() || session.title
    if (body.projectCwd != null || body.project_cwd != null) {
      updates.project_cwd = String(body.projectCwd ?? body.project_cwd ?? '').trim() || null
    }
    if (body.model != null) updates.model = String(body.model || '').trim()
    if (body.mode != null) updates.mode = String(body.mode || '').trim()
    if (body.config != null) updates.config_json = body.config || {}
    const updated = updateSession(req.params.id, updates)
    emitWorkbenchEvent(req.params.id, 'session_updated', { session: updated })
    res.json({ success: true, session: updated })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.post('/workbench/sessions/:id/messages', async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim()
    if (!content) return res.status(400).json({ success: false, error: 'content is required' })
    const result = await startWorkbenchTurn({
      sessionId: req.params.id,
      content,
      attachments: req.body?.attachments || [],
      mode: req.body?.mode ?? null,
      config: req.body?.config ?? null,
    })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.post('/workbench/sessions/:id/cancel', (req, res) => {
  try {
    const session = getSession(req.params.id)
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
    const result = cancelWorkbenchSession(req.params.id)
    if (!result.ok) return res.status(409).json({ success: false, error: result.error })
    res.json({ success: true, result, session: getSession(req.params.id) })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.post('/workbench/permissions/:id/respond', (req, res) => {
  try {
    const permission = getPermission(req.params.id)
    if (!permission) return res.status(404).json({ success: false, error: 'Permission not found' })
    const updated = respondPermission(req.params.id, {
      decision: req.body?.decision === 'deny' ? 'deny' : 'approve',
      optionId: req.body?.optionId || req.body?.option_id || null,
      remember: Boolean(req.body?.remember),
    })
    emitWorkbenchEvent(updated.session_id, 'permission_responded', { permission: updated })
    res.json({ success: true, permission: updated })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.get('/workbench/sessions/:id/stream', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
  const lastEventId = req.headers['last-event-id']
  const since = req.query.since != null
    ? parsePositiveInt(req.query.since, null)
    : lastEventId != null
      ? parsePositiveInt(lastEventId, null)
      : null
  attachSessionStream(req, res, req.params.id, { since })
})

export default router
