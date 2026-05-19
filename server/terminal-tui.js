import { WebSocketServer } from 'ws'
import { randomUUID } from 'crypto'
import { existsSync, readdirSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'
import express from 'express'
import { spawn, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { getClaudeRuntimeConfig } from './claude-runtime/config.js'
import { PROJECT_ROOT, envString } from './config/defaults.js'
import { asyncRoute, sendError } from './utils/http.js'

const allowedEngines = new Set(['codex', 'claude'])
const tuiSessions = new Map()
const tuiTickets = new Map()
const MAX_TUI_BUFFER = 200000
const TUI_TICKET_TTL_MS = 60_000
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function resolveHomePath(value) {
  const text = String(value || '').trim()
  if (!text) return PROJECT_ROOT
  if (text === '~') return process.env.HOME || PROJECT_ROOT
  if (text.startsWith('~/')) return resolve(process.env.HOME || PROJECT_ROOT, text.slice(2))
  return resolve(text)
}

function terminalAllowedRoots() {
  const config = getClaudeRuntimeConfig()
  const extras = envString('TERMINAL_ALLOWED_ROOTS', '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return [
    process.env.HOME,
    PROJECT_ROOT,
    config.cwd,
    config.workspaceRoot,
    config.outputRoot,
    ...extras,
  ]
    .filter(Boolean)
    .map((item) => resolveHomePath(item))
}

function isInsidePath(targetPath, rootPath) {
  const target = resolve(targetPath)
  const root = resolve(rootPath)
  return target === root || target.startsWith(`${root}/`)
}

function assertAllowedCwd(cwd) {
  const resolvedCwd = resolveHomePath(cwd || getClaudeRuntimeConfig().cwd || PROJECT_ROOT)
  if (!existsSync(resolvedCwd) || !statSync(resolvedCwd).isDirectory()) {
    throw new Error('Working directory does not exist or is not a directory')
  }
  const allowed = terminalAllowedRoots().some((root) => isInsidePath(resolvedCwd, root))
  if (!allowed) throw new Error('Working directory is outside TERMINAL_ALLOWED_ROOTS')
  return resolvedCwd
}

function normalizeEngine(engine) {
  const value = String(engine || 'codex').trim().toLowerCase()
  if (!allowedEngines.has(value)) throw new Error('Only codex and claude engines are allowed')
  return value
}

function tuiArgsForEngine(engine, cwd) {
  if (engine === 'claude') return []
  return [
    '--cd',
    cwd,
    '--sandbox',
    'workspace-write',
    '--ask-for-approval',
    'never',
  ]
}

function extractCommandPath(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('/')) || ''
}

function findLocalExecutable(engine) {
  const home = process.env.HOME || ''
  if (!home) return ''

  const candidates = [
    join(home, '.openclaw', 'node_modules', engine, 'bin', engine),
    join(home, '.bun', 'bin', engine),
    join(home, '.cargo', 'bin', engine),
    `/opt/homebrew/bin/${engine}`,
    `/usr/local/bin/${engine}`,
  ]

  const nvmNodeRoot = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmNodeRoot)) {
    for (const version of readdirSync(nvmNodeRoot).sort().reverse()) {
      candidates.unshift(join(nvmNodeRoot, version, 'bin', engine))
    }
  }

  return candidates.find((candidate) => existsSync(candidate)) || ''
}

function executableForEngine(engine) {
  const envKey = engine === 'claude' ? 'TERMINAL_CLAUDE_BIN' : 'TERMINAL_CODEX_BIN'
  const explicit = String(process.env[envKey] || '').trim()
  if (explicit) return explicit

  const direct = spawnSync('/bin/sh', ['-lc', `command -v ${engine}`], {
    encoding: 'utf8',
    env: process.env,
  })
  const directPath = extractCommandPath(direct.stdout)
  if (directPath) return directPath

  const userShell = process.env.SHELL || '/bin/zsh'
  const shell = existsSync(userShell) ? userShell : '/bin/zsh'
  const login = spawnSync(shell, ['-lic', `command -v ${engine}`], {
    encoding: 'utf8',
    env: process.env,
  })
  return extractCommandPath(login.stdout) || findLocalExecutable(engine) || engine
}

function envForExecutable(executable) {
  if (!executable.startsWith('/')) return process.env
  return {
    ...process.env,
    PATH: `${dirname(executable)}:${process.env.PATH || ''}`,
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

function nowIso() {
  return new Date().toISOString()
}

function closeWithHttpError(socket, code, message) {
  socket.write(`HTTP/1.1 ${code} ${message}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

function issueTuiTicket(sessionId) {
  const ticket = randomUUID()
  tuiTickets.set(ticket, {
    sessionId,
    expiresAt: Date.now() + TUI_TICKET_TTL_MS,
  })
  return ticket
}

function consumeTuiTicket(requestUrl) {
  const ticket = requestUrl.searchParams.get('ticket')
  if (!ticket) return false
  const entry = tuiTickets.get(ticket)
  tuiTickets.delete(ticket)
  if (!entry || entry.expiresAt < Date.now()) return false
  const sessionId = requestUrl.searchParams.get('sessionId')
  return !!sessionId && entry.sessionId === sessionId
}

function isAuthorized(requestUrl) {
  const token = process.env.API_AUTH_TOKEN || ''
  if (!token) return true
  return consumeTuiTicket(requestUrl)
}

function serializeTuiSession(session) {
  return {
    id: session.id,
    title: session.title,
    engine: session.engine,
    cwd: session.cwd,
    status: session.status,
    startedAt: session.startedAt,
    lastEventAt: session.lastEventAt,
    exitCode: session.exitCode,
    signal: session.signal,
    clients: session.clients.size,
  }
}

function createTuiSession({ engine, cwd, title, cols = 120, rows = 36 }) {
  const normalizedEngine = normalizeEngine(engine)
  const resolvedCwd = assertAllowedCwd(cwd)
  const safeCols = Math.max(40, Math.min(240, Number(cols) || 120))
  const safeRows = Math.max(12, Math.min(80, Number(rows) || 36))
  const id = `tui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const executable = executableForEngine(normalizedEngine)
  const executableEnv = envForExecutable(executable)
  const bridgePath = resolve(__dirname, 'scripts/pty-bridge.py')
  const pythonBin = process.env.PYTHON_BIN || 'python3'
  const child = spawn(pythonBin, [
    bridgePath,
    '--cwd',
    resolvedCwd,
    '--cols',
    String(safeCols),
    '--rows',
    String(safeRows),
    executable,
    ...tuiArgsForEngine(normalizedEngine, resolvedCwd),
  ], {
    cwd: resolvedCwd,
    env: {
      ...executableEnv,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      FORCE_COLOR: '1',
      COLUMNS: String(safeCols),
      LINES: String(safeRows),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const session = {
    id,
    title: String(title || `${normalizedEngine}-${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`).trim(),
    engine: normalizedEngine,
    cwd: resolvedCwd,
    status: 'running',
    startedAt: nowIso(),
    lastEventAt: nowIso(),
    exitCode: null,
    signal: null,
    term: child,
    buffer: '',
    clients: new Set(),
  }
  tuiSessions.set(id, session)

  child.stdout.on('data', (chunk) => {
    const data = chunk.toString()
    session.buffer = `${session.buffer}${data}`
    if (session.buffer.length > MAX_TUI_BUFFER) {
      session.buffer = session.buffer.slice(session.buffer.length - MAX_TUI_BUFFER)
    }
    session.lastEventAt = nowIso()
    for (const client of session.clients) {
      sendJson(client, { type: 'data', data })
    }
  })

  child.stderr.on('data', (chunk) => {
    const data = chunk.toString()
    session.buffer = `${session.buffer}${data}`
    if (session.buffer.length > MAX_TUI_BUFFER) {
      session.buffer = session.buffer.slice(session.buffer.length - MAX_TUI_BUFFER)
    }
    session.lastEventAt = nowIso()
    for (const client of session.clients) {
      sendJson(client, { type: 'data', data })
    }
  })

  child.on('exit', (exitCode, signal) => {
    session.status = 'exited'
    session.exitCode = exitCode
    session.signal = signal
    session.lastEventAt = nowIso()
    for (const client of session.clients) {
      sendJson(client, { type: 'exit', sessionId: session.id, exitCode, signal })
    }
    tuiSessions.delete(session.id)
  })

  return session
}

function attachTuiSession(ws, session, { cols = 120, rows = 36 } = {}) {
  session.clients.add(ws)
  sendJson(ws, { type: 'ready', session: serializeTuiSession(session) })
  if (session.buffer) sendJson(ws, { type: 'data', data: session.buffer })

  ws.on('message', (raw) => {
    const message = safeJsonParse(raw.toString())
    if (!message) return
    if (message.type === 'input') {
      if (session.status === 'running') session.term.stdin.write(String(message.data || ''))
      return
    }
    if (message.type === 'resize') {
      if (session.status === 'running') {
        const nextCols = Math.max(40, Math.min(240, Number(message.cols) || cols))
        const nextRows = Math.max(12, Math.min(120, Number(message.rows) || rows))
        session.term.stdin.write(`\u001b]1337;Resize=${nextCols}x${nextRows}\u0007`)
      }
      return
    }
    if (message.type === 'kill') {
      session.term.kill()
    }
  })

  ws.on('close', () => {
    session.clients.delete(ws)
  })
}

function getOrCreateTuiSession(requestUrl) {
  const sessionId = requestUrl.searchParams.get('sessionId')
  if (sessionId) {
    const session = tuiSessions.get(sessionId)
    if (!session) throw new Error('TUI session not found')
    return session
  }
  return createTuiSession({
    engine: requestUrl.searchParams.get('engine'),
    cwd: requestUrl.searchParams.get('cwd'),
    cols: requestUrl.searchParams.get('cols'),
    rows: requestUrl.searchParams.get('rows'),
  })
}

export const terminalTuiRouter = express.Router()

terminalTuiRouter.get('/terminal/tui/sessions', (_req, res) => {
  res.json({
    success: true,
    sessions: [...tuiSessions.values()]
      .map(serializeTuiSession)
      .sort((a, b) => String(b.lastEventAt).localeCompare(String(a.lastEventAt))),
  })
})

terminalTuiRouter.post('/terminal/tui/sessions', asyncRoute(async (req, res) => {
  try {
    const session = createTuiSession({
      engine: req.body?.engine,
      cwd: req.body?.cwd,
      title: req.body?.title,
      cols: req.body?.cols,
      rows: req.body?.rows,
    })
    res.status(201).json({ success: true, session: serializeTuiSession(session) })
  } catch (err) {
    return sendError(res, err.status || 400, 'BAD_REQUEST', err.message || 'Failed to create TUI session')
  }
}))

terminalTuiRouter.delete('/terminal/tui/sessions/:id', (req, res) => {
  const session = tuiSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'TUI_SESSION_NOT_FOUND', 'TUI session not found')
  session.term.kill()
  tuiSessions.delete(session.id)
  for (const client of session.clients) client.close()
  res.json({ success: true })
})

terminalTuiRouter.post('/terminal/tui/tickets', (req, res) => {
  const sessionId = String(req.body?.sessionId || '')
  if (!sessionId || !tuiSessions.has(sessionId)) {
    return sendError(res, 404, 'TUI_SESSION_NOT_FOUND', 'TUI session not found')
  }
  const ticket = issueTuiTicket(sessionId)
  res.json({
    success: true,
    ticket,
    expiresAt: new Date(Date.now() + TUI_TICKET_TTL_MS).toISOString(),
  })
})

export function attachTerminalTuiServer(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const requestUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
    if (requestUrl.pathname !== '/api/terminal/tui') return
    if (!isAuthorized(requestUrl)) {
      closeWithHttpError(socket, 401, 'Unauthorized')
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      try {
        const session = getOrCreateTuiSession(requestUrl)
        attachTuiSession(ws, session, {
          cols: requestUrl.searchParams.get('cols'),
          rows: requestUrl.searchParams.get('rows'),
        })
      } catch (err) {
        sendJson(ws, { type: 'error', error: err instanceof Error ? err.message : String(err) })
        ws.close()
      }
    })
  })

  return wss
}
