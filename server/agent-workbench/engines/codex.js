import { spawn } from 'child_process'

function parseJsonLine(line) {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

function codexArgs({ config, session }) {
  const args = [
    'exec',
    '--json',
    '--color',
    'never',
    '--cd',
    session.project_cwd || config.cwd,
    '--sandbox',
    session.config_json?.permissionMode === 'yolo' ? 'danger-full-access' : 'workspace-write',
    '--ask-for-approval',
    'never',
    '--skip-git-repo-check',
  ]
  const model = session.model || process.env.CODEX_AGENT_MODEL || ''
  if (model) args.push('--model', model)
  args.push('-')
  return args
}

export async function runCodexWorkbenchTurn({
  prompt,
  workbenchInstructions,
  session,
  config,
  abortController,
  emit,
}) {
  if (config.mock) {
    emit('session_started', { externalSessionId: 'codex-mock-session' })
    emit('tool_call', {
      toolCallId: 'codex-mock-tool',
      name: 'analysis',
      category: 'tool',
      status: 'completed',
      content: 'Mock tool call completed.',
    })
    const text = `# Codex Workbench MOCK 响应\n\n已收到：${prompt.slice(0, 500)}`
    emit('content_delta', { text })
    emit('turn_complete', { ok: true, externalSessionId: 'codex-mock-session' })
    return { ok: true, text, externalSessionId: 'codex-mock-session' }
  }

  return new Promise((resolve) => {
    const startedAt = Date.now()
    const args = codexArgs({ config, session })
    const child = spawn('codex', args, {
      cwd: session.project_cwd || config.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let externalSessionId = ''
    let text = ''
    let stderr = ''
    let buffer = ''
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    abortController?.signal?.addEventListener('abort', () => {
      child.kill('SIGTERM')
      finish({
        ok: false,
        text,
        externalSessionId,
        error: 'Codex run aborted',
        durationMs: Date.now() - startedAt,
      })
    })

    child.stdin.end(`${workbenchInstructions}\n\n${prompt}`)

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const event = parseJsonLine(line)
        if (!event) continue

        if (event.type === 'thread.started') {
          externalSessionId = event.thread_id || externalSessionId
          emit('session_started', { externalSessionId })
          continue
        }

        if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
          const nextText = String(event.item.text || '')
          text = nextText
          emit('content_delta', { text: nextText, snapshot: true, externalSessionId })
          continue
        }

        if (event.type === 'item.completed' && event.item?.type) {
          const toolCallId = event.item.id || `${event.item.type}-${Date.now()}`
          emit('tool_call', {
            toolCallId,
            name: event.item.type,
            category: event.item.type === 'exec_command' ? 'command' : 'tool',
            status: 'completed',
            input: event.item.arguments || event.item.input || null,
            output: event.item.output || null,
            content: event.item.text || event.item.output || '',
          })
          continue
        }

        if (event.type === 'turn.completed') {
          emit('usage_update', event.usage || {})
          emit('turn_complete', {
            ok: true,
            externalSessionId,
            durationMs: Date.now() - startedAt,
            usage: event.usage || null,
          })
        }
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      finish({
        ok: false,
        text,
        externalSessionId,
        error: error.message || String(error),
        durationMs: Date.now() - startedAt,
      })
    })

    child.on('close', (code) => {
      if (settled) return
      const durationMs = Date.now() - startedAt
      if (code !== 0) {
        finish({
          ok: false,
          text,
          externalSessionId,
          error: stderr.trim() || `Codex exited with code ${code}`,
          durationMs,
        })
        return
      }
      finish({ ok: true, text, externalSessionId, durationMs })
    })
  })
}
