import {
  addAttachment,
  addMessage,
  appendAssistantContent,
  createPermission,
  finalizeMessage,
  getSession,
  replaceAssistantContent,
  updateSession,
  upsertToolCall,
} from './db.js'
import { emitWorkbenchEvent } from './events.js'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'
import { runClaudeWorkbenchTurn } from './engines/claude.js'
import { runCodexWorkbenchTurn } from './engines/codex.js'

const activeRuns = new Map()

function makeRunId() {
  return `wbr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return []
  return attachments
    .map((attachment) => ({
      name: String(attachment?.name || '').trim(),
      path: attachment?.path ? String(attachment.path) : null,
      mimeType: attachment?.mimeType || attachment?.mime_type || null,
      size: Number(attachment?.size || 0),
    }))
    .filter((attachment) => attachment.name)
}

function resolveWorkbenchCwd(session, runtimeConfig) {
  return session?.project_cwd || runtimeConfig?.cwd || process.cwd()
}

function buildWorkbenchInstructions({ session, runtimeConfig }) {
  const cwd = resolveWorkbenchCwd(session, runtimeConfig)
  const engine = session?.engine === 'codex' ? 'Codex CLI' : 'Claude Code'
  return [
    'You are the coding agent inside Agent Workbench.',
    `Engine: ${engine}.`,
    `Workbench session id: ${session?.id || 'unknown'}.`,
    `Authoritative workspace directory: ${cwd}.`,
    '',
    'Runtime rules:',
    '- Treat the authoritative workspace directory above as the only current project for this session.',
    '- Do not infer the workspace from the user home directory, older Claude/Codex sessions, shell history, or other projects.',
    '- If the user asks for the current working directory or project path, answer with the authoritative workspace directory exactly.',
    '- Run file reads, writes, searches, installs and tests relative to that directory unless the user explicitly gives another absolute path.',
    '- Ignore role-play/persona instructions from this host application unless they are explicitly included in the current user request.',
  ].join('\n')
}

function buildPrompt({ content, attachments, session, runtimeConfig }) {
  const attachmentLines = attachments
    .filter((attachment) => attachment.path)
    .map((attachment) => `- ${attachment.name}: ${attachment.path}`)
  const parts = [
    '<agent_workbench_context>',
    buildWorkbenchInstructions({ session, runtimeConfig }),
    '</agent_workbench_context>',
    '',
    '<user_message>',
    content,
    '</user_message>',
  ]
  if (attachmentLines.length) {
    parts.push('', '附件:', attachmentLines.join('\n'))
  }
  return parts.join('\n')
}

function applyRuntimeEvent({ sessionId, turnId, assistantMessageId, type, payload }) {
  if (type === 'content_delta') {
    if (payload.snapshot) {
      payload.message = replaceAssistantContent(assistantMessageId, String(payload.text || ''))
    } else {
      payload.message = appendAssistantContent(assistantMessageId, String(payload.text || ''))
    }
  }

  if (type === 'tool_call' || type === 'tool_call_update') {
    const toolCall = upsertToolCall({
      sessionId,
      turnId,
      toolCallId: payload.toolCallId || payload.tool_call_id || `${type}-${Date.now()}`,
      name: payload.name || payload.toolName || 'tool',
      category: payload.category || 'tool',
      status: payload.status || (type === 'tool_call' ? 'running' : 'completed'),
      input: payload.input || null,
      output: payload.output || null,
      content: payload.content || null,
      error: payload.error || null,
    })
    payload.toolCall = toolCall
  }

  if (type === 'permission_request') {
    const permission = createPermission({
      sessionId,
      toolCallId: payload.toolCallId || payload.tool_call_id || null,
      options: payload.options || [],
    })
    payload.permission = permission
  }
}

export function getActiveRun(sessionId) {
  return activeRuns.get(sessionId) || null
}

export function cancelWorkbenchSession(sessionId) {
  const active = activeRuns.get(sessionId)
  if (!active) {
    const session = getSession(sessionId)
    if (session?.status === 'running') {
      updateSession(sessionId, {
        status: 'cancelled',
        active_run_id: null,
        completed_at: Math.floor(Date.now() / 1000),
        last_error: 'Cancelled orphaned run',
      })
      emitWorkbenchEvent(sessionId, 'error', { message: 'Cancelled orphaned run', cancelled: true })
      return { ok: true, recovered: true }
    }
    return { ok: false, error: 'No active run' }
  }
  active.abortController.abort()
  updateSession(sessionId, {
    status: 'cancelled',
    active_run_id: null,
    completed_at: Math.floor(Date.now() / 1000),
    last_error: 'Cancelled by user',
  })
  emitWorkbenchEvent(sessionId, 'error', { message: 'Cancelled by user', cancelled: true })
  activeRuns.delete(sessionId)
  return { ok: true }
}

export async function startWorkbenchTurn({ sessionId, content, attachments = [], mode = null, config = null }) {
  const session = getSession(sessionId)
  if (!session) {
    const error = new Error('Session not found')
    error.statusCode = 404
    throw error
  }
  if (activeRuns.has(sessionId) || session.status === 'running') {
    const error = new Error('Session is already running')
    error.statusCode = 409
    throw error
  }

  const normalizedAttachments = normalizeAttachments(attachments)
  const runId = makeRunId()
  const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const userMessage = addMessage({
    sessionId,
    role: 'user',
    content,
    turnId,
    metadata: { runId, mode, config },
  })
  for (const attachment of normalizedAttachments) {
    addAttachment({ sessionId, messageId: userMessage.id, ...attachment })
  }

  const assistantMessage = addMessage({
    sessionId,
    role: 'assistant',
    content: '',
    status: 'streaming',
    turnId,
    metadata: { runId },
  })

  const abortController = new AbortController()
  activeRuns.set(sessionId, { runId, abortController, assistantMessageId: assistantMessage.id })
  updateSession(sessionId, {
    status: 'running',
    active_run_id: runId,
    started_at: Math.floor(Date.now() / 1000),
    completed_at: null,
    last_error: null,
    ...(mode != null ? { mode } : {}),
    ...(config != null ? { config_json: config } : {}),
  })

  emitWorkbenchEvent(sessionId, 'user_message', { message: userMessage, attachments: normalizedAttachments })
  emitWorkbenchEvent(sessionId, 'assistant_message', { message: assistantMessage })

  queueMicrotask(() => {
    runTurn({
      sessionId,
      runId,
      turnId,
      content,
      attachments: normalizedAttachments,
      assistantMessageId: assistantMessage.id,
    }).catch((error) => {
      handleRunFailure({ sessionId, runId, assistantMessageId: assistantMessage.id, error })
    })
  })

  return { runId, message: userMessage, assistantMessage }
}

async function runTurn({ sessionId, runId, turnId, content, attachments, assistantMessageId }) {
  const session = getSession(sessionId)
  const runtimeConfig = getClaudeRuntimeConfig()
  const active = activeRuns.get(sessionId)
  if (!session || !active || active.runId !== runId) return

  const emit = (type, payload = {}) => {
    applyRuntimeEvent({ sessionId, turnId, assistantMessageId, type, payload })
    emitWorkbenchEvent(sessionId, type, { runId, turnId, ...payload })
  }

  const runner = session.engine === 'codex' ? runCodexWorkbenchTurn : runClaudeWorkbenchTurn
  const workbenchInstructions = buildWorkbenchInstructions({ session, runtimeConfig })
  const prompt = buildPrompt({ content, attachments, session, runtimeConfig })
  const result = await runner({
    prompt,
    workbenchInstructions,
    session,
    config: runtimeConfig,
    abortController: active.abortController,
    emit,
  })

  if (!activeRuns.has(sessionId)) return

  if (!result.ok) {
    handleRunFailure({
      sessionId,
      runId,
      assistantMessageId,
      error: new Error(result.error || 'Workbench run failed'),
    })
    return
  }

  const assistantMessage = finalizeMessage(assistantMessageId, 'completed')
  updateSession(sessionId, {
    status: 'completed',
    active_run_id: null,
    completed_at: Math.floor(Date.now() / 1000),
    last_error: null,
  })
  emitWorkbenchEvent(sessionId, 'assistant_message', { runId, turnId, message: assistantMessage })
  activeRuns.delete(sessionId)
}

function handleRunFailure({ sessionId, runId, assistantMessageId, error }) {
  if (!activeRuns.has(sessionId)) return
  const message = error instanceof Error ? error.message : String(error || 'Workbench run failed')
  const assistantMessage = finalizeMessage(assistantMessageId, 'failed')
  updateSession(sessionId, {
    status: message.includes('aborted') ? 'cancelled' : 'failed',
    active_run_id: null,
    completed_at: Math.floor(Date.now() / 1000),
    last_error: message,
  })
  emitWorkbenchEvent(sessionId, 'error', { runId, message, messageRecord: assistantMessage })
  activeRuns.delete(sessionId)
}
