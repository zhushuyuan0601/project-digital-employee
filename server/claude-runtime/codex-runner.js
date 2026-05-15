import { spawn } from 'child_process'

function parseJsonLine(line) {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

function codexSandboxForMode(executionMode = 'report') {
  return ['code', 'test'].includes(executionMode) ? 'workspace-write' : 'read-only'
}

function codexArgs({ config, cwd, executionMode, outputFormat }) {
  const args = [
    'exec',
    '--json',
    '--color',
    'never',
    '--cd',
    cwd || config.cwd,
    '--sandbox',
    codexSandboxForMode(executionMode),
    '--config',
    'approval_policy="never"',
    '--skip-git-repo-check',
  ]
  if (config.model) args.push('--model', config.model)
  if (outputFormat) {
    args.push('--config', 'model_reasoning_effort="low"')
  }
  args.push('-')
  return args
}

export async function runCodexQuery({
  prompt,
  config,
  outputFormat,
  cwd,
  executionMode = 'report',
  abortController,
  onEvent = () => {},
}) {
  if (config.mock) {
    const text = outputFormat || executionMode === 'plan'
      ? JSON.stringify({
          decision: 'ready_to_plan',
          taskTitle: 'Codex 模拟任务拆解',
          goal: '在 Codex Runtime MOCK 模式下验证任务编排链路',
          participants: [{ agentId: 'xiaokai', needed: true, reason: '模拟技术执行节点。' }],
          workflow: [{
            id: 'node-01',
            title: 'Codex 模拟执行',
            phase: 'engineering',
            assignedAgentId: 'xiaokai',
            objective: '验证 Codex Runtime 执行链路。',
            dependsOn: [],
            requiredInputs: ['任务描述'],
            expectedOutputs: ['执行报告'],
            executionMode: 'report',
            successCriteria: ['报告已生成'],
          }],
          acceptanceCriteria: ['报告已生成'],
        })
      : '# MOCK 报告\n\nCodex Runtime MOCK 模式已生成报告。'
    onEvent({ type: 'start', sessionId: 'codex-mock-session', runtimeEngine: 'codex' })
    onEvent({ type: 'assistant', text, snapshot: true, sessionId: 'codex-mock-session', runtimeEngine: 'codex' })
    onEvent({ type: 'result', ok: true, sessionId: 'codex-mock-session', runtimeEngine: 'codex' })
    return { ok: true, sessionId: 'codex-mock-session', text, structuredOutput: outputFormat ? JSON.parse(text) : null, costUsd: 0, durationMs: 0 }
  }

  return new Promise((resolve) => {
    const startedAt = Date.now()
    const args = codexArgs({ config, cwd, executionMode, outputFormat })
    const child = spawn('codex', args, {
      cwd: cwd || config.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let sessionId = ''
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
      finish({ ok: false, sessionId, text, error: 'Codex run aborted', durationMs: Date.now() - startedAt })
    })

    child.stdin.end(prompt)

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const event = parseJsonLine(line)
        if (!event) continue
        if (event.type === 'thread.started') {
          sessionId = event.thread_id || sessionId
          onEvent({ type: 'start', sessionId, runtimeEngine: 'codex' })
        } else if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
          const nextText = String(event.item.text || '')
          text = nextText
          onEvent({ type: 'assistant', text: nextText, snapshot: true, sessionId, runtimeEngine: 'codex' })
        } else if (event.type === 'item.completed' && event.item?.type) {
          onEvent({ type: 'tool', toolName: event.item.type, sessionId, runtimeEngine: 'codex' })
        } else if (event.type === 'turn.completed') {
          onEvent({
            type: 'result',
            ok: true,
            sessionId,
            durationMs: Date.now() - startedAt,
            usage: event.usage || null,
            runtimeEngine: 'codex',
          })
        }
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      finish({ ok: false, sessionId, text, error: error.message || String(error), durationMs: Date.now() - startedAt })
    })

    child.on('close', (code) => {
      if (settled) return
      const durationMs = Date.now() - startedAt
      if (code !== 0) {
        finish({ ok: false, sessionId, text, error: stderr.trim() || `Codex exited with code ${code}`, durationMs })
        return
      }
      let structuredOutput = null
      if (outputFormat) {
        try {
          structuredOutput = JSON.parse(text)
        } catch {
          structuredOutput = null
        }
      }
      finish({ ok: true, sessionId, text, structuredOutput, costUsd: 0, durationMs })
    })
  })
}
