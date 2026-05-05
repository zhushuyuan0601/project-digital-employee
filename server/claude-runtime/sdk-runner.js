import { query } from '@anthropic-ai/claude-agent-sdk'

function extractAssistantText(message) {
  if (message?.type !== 'assistant') return ''
  const blocks = message.message?.content || []
  return blocks
    .map((block) => block.type === 'text' ? block.text : '')
    .filter(Boolean)
    .join('')
}

function extractPartialText(message) {
  if (message?.type !== 'stream_event') return ''
  const event = message.event
  if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text || ''
  }
  return ''
}

function toolNameFromMessage(message) {
  if (message?.type === 'stream_event') {
    const event = message.event
    if (event?.type === 'content_block_start') {
      const block = event.content_block
      if (block?.type === 'tool_use') return block.name || 'tool'
    }
  }
  return ''
}

function normalizeErrorMessage(message, config) {
  const text = String(message || '').trim()
  if (!text) return text
  if (/maximum number of turns/i.test(text)) {
    return `Claude Code 达到最大轮次限制 (${config.maxTurns})，任务在产出最终结果前被中止`
  }
  return text
}

export async function runClaudeQuery({
  prompt,
  config,
  outputFormat,
  resume,
  cwd,
  executionMode = 'report',
  abortController,
  onEvent = () => {},
}) {
  if (config.mock) {
    const mockText = outputFormat
      ? JSON.stringify({
          decision: 'ready_to_plan',
          taskTitle: '模拟任务拆解',
          goal: '在 Claude Runtime MOCK 模式下验证任务编排链路',
          participants: [
            { agentId: 'xiaoyan', needed: false, reason: '模拟任务不需要外部调研。' },
            { agentId: 'xiaochan', needed: false, reason: '模拟任务不需要产品方案。' },
            { agentId: 'xiaokai', needed: true, reason: '需要验证技术节点执行链路。' },
            { agentId: 'xiaoce', needed: true, reason: '需要在技术节点后验证测试依赖。' },
          ],
          workflow: [
            {
              id: 'node-01',
              title: '技术方案分析',
              phase: 'engineering',
              assignedAgentId: 'xiaokai',
              objective: '分析当前任务的技术路径和实现建议。',
              dependsOn: [],
              requiredInputs: ['任务描述'],
              expectedOutputs: ['技术方案报告'],
              executionMode: 'report',
              successCriteria: ['报告已说明技术路径、风险和建议'],
            },
            {
              id: 'node-02',
              title: '测试验收设计',
              phase: 'testing',
              assignedAgentId: 'xiaoce',
              objective: '基于技术方案设计验收标准和测试要点。',
              dependsOn: ['node-01'],
              requiredInputs: ['技术方案报告'],
              expectedOutputs: ['测试验收报告'],
              executionMode: 'report',
              successCriteria: ['报告已覆盖验收标准和风险清单'],
            },
          ],
          acceptanceCriteria: ['报告已生成', '风险和建议明确'],
        })
      : `# MOCK 报告\n\n## 结论\nClaude Runtime MOCK 模式已生成报告。\n\n## 依据\n当前环境开启 CLAUDE_RUNTIME_MOCK。\n\n## 风险\n这不是真实 Claude Code 输出。\n\n## 建议\n关闭 MOCK 后进行真实执行验证。\n\n## 交付物\nMarkdown 报告。`
    onEvent({ type: 'start', sessionId: 'mock-session' })
    onEvent({ type: 'assistant', text: mockText })
    return {
      ok: true,
      sessionId: 'mock-session',
      text: mockText,
      structuredOutput: outputFormat ? JSON.parse(mockText) : null,
      costUsd: 0,
      durationMs: 0,
    }
  }

  const allowWriteTools = !config.reportOnly && ['code', 'test'].includes(executionMode)
  const readonlyDisallowed = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
  const options = {
    cwd: cwd || config.cwd,
    tools: config.allowedTools,
    allowedTools: config.allowedTools,
    disallowedTools: allowWriteTools ? [] : readonlyDisallowed,
    permissionMode: 'dontAsk',
    includePartialMessages: true,
    maxTurns: config.maxTurns,
    abortController,
    outputFormat,
    ...(config.model ? { model: config.model } : {}),
    ...(resume ? { resume } : {}),
  }

  let text = ''
  let result = null
  let sessionId = ''

  for await (const message of query({ prompt, options })) {
    if (message?.session_id) sessionId = message.session_id

    if (message.type === 'system' && message.subtype === 'init') {
      onEvent({ type: 'start', sessionId })
    }

    const partial = extractPartialText(message)
    if (partial) {
      text += partial
      onEvent({ type: 'assistant', text: partial, sessionId })
    }

    const toolName = toolNameFromMessage(message)
    if (toolName) {
      onEvent({ type: 'tool', toolName, sessionId })
    }

    const assistantText = extractAssistantText(message)
    if (assistantText && !partial) {
      text = assistantText
      onEvent({ type: 'assistant', text: assistantText, sessionId, snapshot: true })
    }

    if (message.type === 'result') {
      result = message
      onEvent({
        type: 'result',
        ok: message.subtype === 'success',
        subtype: message.subtype,
        sessionId: message.session_id || sessionId,
        costUsd: message.total_cost_usd || 0,
        durationMs: message.duration_ms || 0,
        error: message.errors?.join('\n') || message.stop_reason || '',
      })
    }
  }

  if (!result) {
    return { ok: false, sessionId, text, error: 'Claude query finished without result message' }
  }

  if (result.subtype !== 'success') {
    const rawError = result.errors?.join('\n') || result.stop_reason || result.subtype
    return {
      ok: false,
      sessionId: result.session_id || sessionId,
      text,
      error: normalizeErrorMessage(rawError, config),
      costUsd: result.total_cost_usd || 0,
      durationMs: result.duration_ms || 0,
    }
  }

  return {
    ok: true,
    sessionId: result.session_id || sessionId,
    text: result.result || text,
    structuredOutput: result.structured_output || null,
    costUsd: result.total_cost_usd || 0,
    durationMs: result.duration_ms || 0,
  }
}
