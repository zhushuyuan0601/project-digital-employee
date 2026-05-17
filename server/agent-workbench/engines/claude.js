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
  if (event?.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
    return event.delta.thinking || event.delta.text || ''
  }
  return ''
}

function extractThinking(message) {
  if (message?.type !== 'stream_event') return ''
  const event = message.event
  if (event?.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
    return event.delta.thinking || event.delta.text || ''
  }
  return ''
}

function extractToolStart(message) {
  if (message?.type !== 'stream_event') return null
  const event = message.event
  if (event?.type !== 'content_block_start') return null
  const block = event.content_block
  if (block?.type !== 'tool_use') return null
  return {
    toolCallId: block.id || `claude-tool-${event.index ?? Date.now()}`,
    name: block.name || 'tool',
    input: block.input || null,
  }
}

function extractToolResult(message) {
  if (message?.type !== 'assistant') return null
  const blocks = message.message?.content || []
  const result = blocks.find((block) => block.type === 'tool_result')
  if (!result) return null
  return {
    toolCallId: result.tool_use_id || `claude-tool-result-${Date.now()}`,
    content: Array.isArray(result.content)
      ? result.content.map((item) => item.text || item.content || '').filter(Boolean).join('\n')
      : String(result.content || ''),
    error: result.is_error ? String(result.content || 'Tool failed') : null,
  }
}

function extractUsage(message) {
  if (message?.type === 'assistant') return message.message?.usage || null
  if (message?.type === 'result') {
    return {
      costUsd: message.total_cost_usd || 0,
      durationMs: message.duration_ms || 0,
    }
  }
  return null
}

export async function runClaudeWorkbenchTurn({
  prompt,
  workbenchInstructions,
  session,
  config,
  abortController,
  emit,
}) {
  if (config.mock) {
    emit('session_started', { externalSessionId: 'mock-session' })
    const chunks = [
      '# Workbench MOCK 响应\n\n',
      `当前会话由 ${session.agent_id} 处理，运行目录为 ${session.project_cwd || config.cwd}。\n\n`,
      `用户输入：${prompt.slice(0, 500)}`,
    ]
    for (const chunk of chunks) {
      emit('content_delta', { text: chunk })
    }
    emit('turn_complete', { ok: true, externalSessionId: 'mock-session', stopReason: 'mock' })
    return { ok: true, text: chunks.join(''), externalSessionId: 'mock-session' }
  }

  const options = {
    cwd: session.project_cwd || config.cwd,
    tools: config.allowedTools,
    allowedTools: config.allowedTools,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: workbenchInstructions,
    },
    includePartialMessages: true,
    maxTurns: config.maxTurns,
    abortController,
    ...(session.model ? { model: session.model } : config.model ? { model: config.model } : {}),
  }

  let text = ''
  let result = null
  let externalSessionId = ''

  for await (const message of query({ prompt, options })) {
    if (message?.session_id) externalSessionId = message.session_id

    if (message.type === 'system' && message.subtype === 'init') {
      emit('session_started', { externalSessionId })
    }

    const thinking = extractThinking(message)
    if (thinking) {
      emit('thinking', { text: thinking })
      continue
    }

    const partial = extractPartialText(message)
    if (partial) {
      text += partial
      emit('content_delta', { text: partial, externalSessionId })
    }

    const tool = extractToolStart(message)
    if (tool) {
      emit('tool_call', {
        toolCallId: tool.toolCallId,
        name: tool.name,
        category: tool.name === 'Bash' ? 'command' : 'tool',
        status: 'running',
        input: tool.input,
      })
    }

    const toolResult = extractToolResult(message)
    if (toolResult) {
      emit('tool_call_update', {
        toolCallId: toolResult.toolCallId,
        name: 'tool_result',
        status: toolResult.error ? 'failed' : 'completed',
        content: toolResult.content,
        error: toolResult.error,
      })
    }

    const usage = extractUsage(message)
    if (usage) emit('usage_update', usage)

    const assistantText = extractAssistantText(message)
    if (assistantText && !partial) {
      text = assistantText
      emit('content_delta', { text: assistantText, snapshot: true, externalSessionId })
    }

    if (message.type === 'result') {
      result = message
      emit('turn_complete', {
        ok: message.subtype === 'success',
        externalSessionId: message.session_id || externalSessionId,
        stopReason: message.stop_reason || message.subtype,
        costUsd: message.total_cost_usd || 0,
        durationMs: message.duration_ms || 0,
      })
      break
    }
  }

  if (!result) {
    return { ok: false, text, externalSessionId, error: 'Claude query finished without result message' }
  }

  if (result.subtype !== 'success') {
    return {
      ok: false,
      text,
      externalSessionId: result.session_id || externalSessionId,
      error: result.errors?.join('\n') || result.stop_reason || result.subtype,
    }
  }

  return {
    ok: true,
    text: result.result || text,
    externalSessionId: result.session_id || externalSessionId,
  }
}
