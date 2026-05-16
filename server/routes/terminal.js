import express from 'express'
import { spawn } from 'child_process'
import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'
import { PROJECT_ROOT, envString } from '../config/defaults.js'
import { asyncRoute, sendError } from '../utils/http.js'

const router = express.Router()
const terminalSessions = new Map()
const allowedEngines = new Set(['codex', 'claude'])
const MAX_SESSION_EVENTS = 3000
const MAX_CONTEXT_CHARS = 28000
const SESSION_TTL_MS = 1000 * 60 * 60 * 4
let commandCache = null

function nowIso() {
  return new Date().toISOString()
}

function makeSessionId() {
  return `ai-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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
  const resolvedCwd = resolveHomePath(cwd)
  if (!existsSync(resolvedCwd) || !statSync(resolvedCwd).isDirectory()) {
    const error = new Error('Working directory does not exist or is not a directory')
    error.status = 400
    throw error
  }
  const allowed = terminalAllowedRoots().some((root) => isInsidePath(resolvedCwd, root))
  if (!allowed) {
    const error = new Error('Working directory is outside TERMINAL_ALLOWED_ROOTS')
    error.status = 403
    throw error
  }
  return resolvedCwd
}

function normalizeEngine(engine) {
  const value = String(engine || 'codex').trim().toLowerCase()
  if (!allowedEngines.has(value)) {
    const error = new Error('Only codex and claude engines are allowed')
    error.status = 403
    throw error
  }
  return value
}

function parseArgs(args) {
  if (Array.isArray(args)) {
    return args.map((item) => String(item)).filter(Boolean)
  }
  return String(args || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCommandLine(commandLine) {
  const input = String(commandLine || '')
  const tokens = []
  let current = ''
  let quote = ''
  let escaping = false

  for (const char of input) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }
    if (char === '\\') {
      escaping = true
      continue
    }
    if (quote) {
      if (char === quote) {
        quote = ''
      } else {
        current += char
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (escaping) current += '\\'
  if (quote) {
    const error = new Error('Unclosed quote in command')
    error.status = 400
    throw error
  }
  if (current) tokens.push(current)
  return tokens
}

function parseHelpCommands(engine, helpText) {
  const commands = []
  const lines = String(helpText || '').split(/\r?\n/)
  let inCommands = false
  for (const line of lines) {
    if (/^Commands:/i.test(line.trim())) {
      inCommands = true
      continue
    }
    if (inCommands && /^(Arguments|Options):/i.test(line.trim())) break
    if (!inCommands) continue
    const match = line.match(/^\s{2,}([a-z][\w-]*(?:\|[a-z][\w-]*)?)\s+(.*)$/i)
    if (!match) continue
    const command = match[1].split('|')[0]
    commands.push({
      id: `${engine}:${command}`,
      source: engine,
      command: `/${engine} ${command}`,
      label: `${engine} ${command}`,
      description: match[2].trim(),
    })
  }
  return commands
}

function builtinInteractiveCommands(engine) {
  const codexCommands = [
    ['status', '显示当前 Codex 会话、模型、目录和运行状态'],
    ['model', '查看或切换 Codex 使用的模型'],
    ['permissions', '查看或调整工具权限与审批策略'],
    ['resume', '恢复之前的 Codex 交互会话'],
    ['new', '开启新的 Codex 交互会话'],
    ['clear', '清空 Codex 交互界面上下文'],
    ['compact', '压缩当前对话上下文'],
    ['help', '显示 Codex 内置 slash 命令帮助'],
    ['init', '为当前项目初始化 Codex 上下文'],
    ['review', '发起代码审查'],
    ['quit', '退出交互会话'],
  ]
  const claudeCommands = [
    ['status', '显示当前 Claude 会话、模型、账号和工具状态'],
    ['model', '查看或切换 Claude 模型'],
    ['permissions', '查看或调整工具权限'],
    ['resume', '恢复之前的 Claude 会话'],
    ['clear', '清空 Claude 交互界面上下文'],
    ['compact', '压缩当前对话上下文'],
    ['help', '显示 Claude 内置 slash 命令帮助'],
    ['init', '生成或更新项目 CLAUDE.md'],
    ['review', '发起代码审查'],
    ['security-review', '发起安全审查'],
    ['cost', '显示当前会话消耗'],
    ['doctor', '检查 Claude Code 环境健康状态'],
    ['login', '登录或切换 Claude 账号'],
    ['logout', '退出 Claude 账号'],
    ['upgrade', '检查或升级 Claude Code'],
    ['quit', '退出交互会话'],
  ]
  const commands = engine === 'claude' ? claudeCommands : codexCommands
  return commands.map(([name, description]) => ({
    id: `${engine}:builtin:${name}`,
    source: engine,
    command: `/${name}`,
    label: name,
    description,
    builtin: true,
  }))
}

function cliHelp(engine) {
  return new Promise((resolve) => {
    const child = spawn(engine, ['--help'], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => resolve({ ok: false, text: '', error: error.message || String(error) }))
    child.on('close', (code) => resolve({ ok: code === 0, text: stdout || stderr, error: code === 0 ? '' : stderr }))
  })
}

async function listSlashCommands() {
  if (commandCache && Date.now() - commandCache.createdAt < 1000 * 60 * 5) {
    return commandCache.commands
  }

  const localCommands = [
    { id: 'local:new', source: 'terminal', command: '/new', label: 'new', description: '新建当前引擎的会话' },
    { id: 'local:clear', source: 'terminal', command: '/clear', label: 'clear', description: '清空当前会话上下文和屏幕' },
    { id: 'local:stop', source: 'terminal', command: '/stop', label: 'stop', description: '停止当前正在运行的 turn' },
    { id: 'local:engine-codex', source: 'terminal', command: '/engine codex', label: 'engine codex', description: '切换新会话默认引擎到 Codex' },
    { id: 'local:engine-claude', source: 'terminal', command: '/engine claude', label: 'engine claude', description: '切换新会话默认引擎到 Claude' },
    { id: 'local:help', source: 'terminal', command: '/help', label: 'help', description: '显示可用 slash 命令' },
  ]

  const cliCommands = []
  for (const engine of allowedEngines) {
    cliCommands.push(...builtinInteractiveCommands(engine))
    const help = await cliHelp(engine)
    cliCommands.push({
      id: `${engine}:root`,
      source: engine,
      command: `/${engine}`,
      label: engine,
      description: help.ok ? `运行 ${engine} CLI，可继续输入子命令和参数` : `${engine} CLI 不可用: ${help.error}`,
    })
    if (help.ok) cliCommands.push(...parseHelpCommands(engine, help.text))
  }

  commandCache = {
    createdAt: Date.now(),
    commands: [...localCommands, ...cliCommands],
  }
  return commandCache.commands
}

function defaultArgsForEngine(engine) {
  if (engine === 'claude') return ['-p']
  return [
    'exec',
    '--json',
    '--color',
    'never',
    '--sandbox',
    'workspace-write',
    '--config',
    'approval_policy="never"',
    '--skip-git-repo-check',
    '-',
  ]
}

function argsForSession(session) {
  const args = session.args.length ? [...session.args] : defaultArgsForEngine(session.engine)
  if (session.engine === 'codex') {
    const cdIndex = args.findIndex((arg) => arg === '--cd')
    if (cdIndex >= 0) {
      args.splice(cdIndex, 2)
    }
    args.splice(args.length - (args.at(-1) === '-' ? 1 : 0), 0, '--cd', session.cwd)
  }
  return args
}

function appendEvent(session, event) {
  const next = {
    id: `${session.id}-${session.eventSeq += 1}`,
    sessionId: session.id,
    timestamp: Date.now(),
    createdAt: nowIso(),
    ...event,
  }
  session.events.push(next)
  if (session.events.length > MAX_SESSION_EVENTS) {
    session.events.splice(0, session.events.length - MAX_SESSION_EVENTS)
  }
  session.lastEventAt = next.createdAt
  for (const subscriber of session.subscribers) {
    subscriber.write(`data: ${JSON.stringify(next)}\n\n`)
  }
  return next
}

function serializeSession(session) {
  return {
    id: session.id,
    title: session.title,
    engine: session.engine,
    args: session.args,
    cwd: session.cwd,
    status: session.status,
    turnCount: session.turnCount,
    startedAt: session.startedAt,
    lastEventAt: session.lastEventAt,
    activeTurnId: session.activeTurnId,
  }
}

function trimContext(text) {
  const value = String(text || '')
  if (value.length <= MAX_CONTEXT_CHARS) return value
  return value.slice(value.length - MAX_CONTEXT_CHARS)
}

function buildPrompt(session, userPrompt) {
  const history = session.messages
    .map((message) => {
      const speaker = message.role === 'user' ? 'User' : 'Assistant'
      return `${speaker}:\n${message.content}`
    })
    .join('\n\n')

  return trimContext(`你正在一个网页 AI 终端中运行。这个终端要求保持上下文连续：
- 回答必须参考下面的历史上下文。
- 如果用户没有输入 clear，上下文不得丢失。
- 直接响应用户最新输入，不要解释你收到了历史上下文。

工作目录:
${session.cwd}

历史上下文:
${history || '(empty)'}

User:
${String(userPrompt || '').trim()}
`)
}

function extractCodexOutput(line, state) {
  try {
    const event = JSON.parse(line)
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      return { text: String(event.item.text || '') }
    }
    if (event.type === 'item.completed' && event.item?.type) {
      return { tool: event.item.type }
    }
    if (event.type === 'turn.completed') {
      state.usage = event.usage || null
    }
  } catch {
    return { text: line ? `${line}\n` : '' }
  }
  return null
}

function scheduleSessionCleanup(session) {
  if (session.cleanupTimer) clearTimeout(session.cleanupTimer)
  session.cleanupTimer = setTimeout(() => {
    if (session.status !== 'running') terminalSessions.delete(session.id)
  }, SESSION_TTL_MS)
  if (typeof session.cleanupTimer.unref === 'function') session.cleanupTimer.unref()
}

function createSession({ engine, args, cwd, title }) {
  const normalizedEngine = normalizeEngine(engine)
  const resolvedCwd = assertAllowedCwd(cwd || getClaudeRuntimeConfig().cwd || PROJECT_ROOT)
  const session = {
    id: makeSessionId(),
    title: String(title || `${normalizedEngine} session`).trim(),
    engine: normalizedEngine,
    args: parseArgs(args),
    cwd: resolvedCwd,
    status: 'idle',
    turnCount: 0,
    activeTurnId: null,
    startedAt: nowIso(),
    lastEventAt: nowIso(),
    eventSeq: 0,
    events: [],
    messages: [],
    subscribers: new Set(),
    child: null,
    cleanupTimer: null,
  }
  terminalSessions.set(session.id, session)
  appendEvent(session, {
    type: 'system',
    stream: 'system',
    text: `Session started: ${session.engine} ${argsForSession(session).join(' ')}`,
  })
  return session
}

function finishTurn(session, { turnId, status, exitCode = null, signal = null, assistantText = '', error = '' }) {
  session.status = status === 'completed' ? 'idle' : status
  session.activeTurnId = null
  session.child = null
  if (assistantText.trim()) {
    session.messages.push({ role: 'assistant', content: assistantText.trim(), createdAt: nowIso() })
  }
  appendEvent(session, {
    type: 'turn:end',
    stream: 'system',
    turnId,
    status,
    exitCode,
    signal,
    text: error || `turn ${status}${exitCode == null ? '' : `, exit ${exitCode}`}`,
  })
  scheduleSessionCleanup(session)
}

function runTurn(session, prompt) {
  if (session.status === 'running') {
    const error = new Error('A turn is already running')
    error.status = 409
    throw error
  }

  const userPrompt = String(prompt || '').trim()
  if (!userPrompt) {
    const error = new Error('prompt is required')
    error.status = 400
    throw error
  }

  session.turnCount += 1
  const turnId = `turn-${session.turnCount}`
  session.status = 'running'
  session.activeTurnId = turnId
  session.messages.push({ role: 'user', content: userPrompt, createdAt: nowIso() })
  appendEvent(session, { type: 'prompt', stream: 'stdin', turnId, text: userPrompt })

  const child = spawn(session.engine, argsForSession(session), {
    cwd: session.cwd,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  session.child = child

  const runtimePrompt = buildPrompt(session, userPrompt)
  const state = { stdoutBuffer: '', assistantText: '', usage: null }

  appendEvent(session, {
    type: 'turn:start',
    stream: 'system',
    turnId,
    text: `$ ${session.engine} ${argsForSession(session).join(' ')}`,
  })

  child.stdin.end(runtimePrompt)

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    if (session.engine !== 'codex') {
      state.assistantText += text
      appendEvent(session, { type: 'data', stream: 'stdout', turnId, text })
      return
    }

    state.stdoutBuffer += text
    const lines = state.stdoutBuffer.split(/\r?\n/)
    state.stdoutBuffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      const output = extractCodexOutput(line, state)
      if (!output) continue
      if (output.tool) {
        appendEvent(session, { type: 'tool', stream: 'system', turnId, text: `tool: ${output.tool}` })
        continue
      }
      if (output.text) {
        state.assistantText += output.text
        appendEvent(session, { type: 'data', stream: 'stdout', turnId, text: output.text })
      }
    }
  })

  child.stderr.on('data', (chunk) => {
    appendEvent(session, { type: 'data', stream: 'stderr', turnId, text: chunk.toString() })
  })

  child.on('error', (error) => {
    finishTurn(session, {
      turnId,
      status: 'failed',
      exitCode: 1,
      assistantText: state.assistantText,
      error: error.message || String(error),
    })
  })

  child.on('close', (code, signal) => {
    if (session.engine === 'codex' && state.stdoutBuffer.trim()) {
      const output = extractCodexOutput(state.stdoutBuffer.trim(), state)
      if (output?.text) {
        state.assistantText += output.text
        appendEvent(session, { type: 'data', stream: 'stdout', turnId, text: output.text })
      }
    }
    finishTurn(session, {
      turnId,
      status: code === 0 ? 'completed' : 'failed',
      exitCode: code,
      signal,
      assistantText: state.assistantText,
    })
  })
}

function runNativeCommand(session, commandLine) {
  if (session.status === 'running') {
    const error = new Error('A turn is already running')
    error.status = 409
    throw error
  }

  const tokens = parseCommandLine(commandLine)
  const slashEngine = String(tokens.shift() || '').replace(/^\//, '').toLowerCase()
  const engine = normalizeEngine(slashEngine)
  if (engine !== session.engine) {
    const error = new Error(`This session uses ${session.engine}; ${engine} commands are not allowed here`)
    error.status = 403
    throw error
  }
  const args = tokens
  const turnId = `cmd-${Date.now()}`
  session.status = 'running'
  session.activeTurnId = turnId
  appendEvent(session, { type: 'prompt', stream: 'stdin', turnId, text: commandLine })
  appendEvent(session, { type: 'turn:start', stream: 'system', turnId, text: `$ ${engine} ${args.join(' ')}`.trim() })

  const child = spawn(engine, args, {
    cwd: session.cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  session.child = child

  child.stdout.on('data', (chunk) => {
    appendEvent(session, { type: 'data', stream: 'stdout', turnId, text: chunk.toString() })
  })

  child.stderr.on('data', (chunk) => {
    appendEvent(session, { type: 'data', stream: 'stderr', turnId, text: chunk.toString() })
  })

  child.on('error', (error) => {
    finishTurn(session, {
      turnId,
      status: 'failed',
      exitCode: 1,
      error: error.message || String(error),
    })
  })

  child.on('close', (code, signal) => {
    finishTurn(session, {
      turnId,
      status: code === 0 ? 'completed' : 'failed',
      exitCode: code,
      signal,
    })
  })
}

router.get('/terminal/capabilities', (_req, res) => {
  const config = getClaudeRuntimeConfig()
  res.json({
    success: true,
    allowedCommands: [...allowedEngines],
    defaultCwd: config.cwd || PROJECT_ROOT,
    allowedRoots: terminalAllowedRoots(),
    activeSessions: [...terminalSessions.values()].map(serializeSession),
  })
})

router.get('/terminal/commands', asyncRoute(async (_req, res) => {
  res.json({
    success: true,
    commands: await listSlashCommands(),
  })
}))

router.get('/terminal/sessions', (_req, res) => {
  res.json({
    success: true,
    sessions: [...terminalSessions.values()]
      .map(serializeSession)
      .sort((a, b) => String(b.lastEventAt).localeCompare(String(a.lastEventAt))),
  })
})

router.post('/terminal/sessions', asyncRoute(async (req, res) => {
  try {
    const session = createSession({
      engine: req.body?.engine || req.body?.executable || 'codex',
      args: req.body?.args,
      cwd: req.body?.cwd,
      title: req.body?.title,
    })
    res.status(201).json({ success: true, session: serializeSession(session), events: session.events })
  } catch (err) {
    return sendError(
      res,
      err.status || 500,
      err.status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST',
      err.message || 'Failed to create terminal session',
    )
  }
}))

router.get('/terminal/sessions/:id', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  res.json({ success: true, session: serializeSession(session), events: session.events })
})

router.get('/terminal/sessions/:id/stream', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  for (const event of session.events) {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId: session.id, timestamp: Date.now() })}\n\n`)
  session.subscribers.add(res)

  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', sessionId: session.id, timestamp: Date.now() })}\n\n`)
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    session.subscribers.delete(res)
  })
})

router.post('/terminal/sessions/:id/turns', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  try {
    runTurn(session, req.body?.prompt || req.body?.input || '')
    res.status(202).json({ success: true, session: serializeSession(session) })
  } catch (err) {
    return sendError(res, err.status || 500, err.status === 409 ? 'SESSION_BUSY' : 'BAD_REQUEST', err.message)
  }
})

router.post('/terminal/sessions/:id/commands', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  try {
    runNativeCommand(session, req.body?.command || '')
    res.status(202).json({ success: true, session: serializeSession(session) })
  } catch (err) {
    return sendError(res, err.status || 500, err.status === 409 ? 'SESSION_BUSY' : 'BAD_REQUEST', err.message)
  }
})

router.post('/terminal/sessions/:id/input', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  try {
    runTurn(session, req.body?.input || req.body?.prompt || '')
    res.status(202).json({ success: true, session: serializeSession(session) })
  } catch (err) {
    return sendError(res, err.status || 500, err.status === 409 ? 'SESSION_BUSY' : 'BAD_REQUEST', err.message)
  }
})

router.post('/terminal/sessions/:id/clear', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  if (session.status === 'running') {
    return sendError(res, 409, 'SESSION_BUSY', 'Cannot clear while a turn is running')
  }
  session.events = []
  session.messages = []
  session.eventSeq = 0
  session.turnCount = 0
  appendEvent(session, { type: 'clear', stream: 'system', text: 'context cleared' })
  res.json({ success: true, session: serializeSession(session), events: session.events })
})

router.post('/terminal/sessions/:id/stop', (req, res) => {
  const session = terminalSessions.get(req.params.id)
  if (!session) return sendError(res, 404, 'NOT_FOUND', 'Terminal session not found')
  if (session.status !== 'running') {
    return res.json({ success: true, session: serializeSession(session) })
  }
  const signal = String(req.body?.signal || 'SIGTERM')
  session.child?.kill(signal)
  appendEvent(session, { type: 'stop', stream: 'system', turnId: session.activeTurnId, text: `Sent ${signal}` })
  res.json({ success: true, session: serializeSession(session) })
})

export default router
