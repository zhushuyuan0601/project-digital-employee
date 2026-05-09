import express from 'express'
import { getDatabase } from '../db/index.js'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'
import { runClaudeQuery } from '../claude-runtime/sdk-runner.js'
import { RUNTIME_AGENT_MAP } from '../claude-runtime/plan-utils.js'

const router = express.Router()
const DEFAULT_ROOM_ID = 'group-main'
const DEFAULT_RECENT_LIMIT = 30
const DEFAULT_MEMORY_LIMIT = 8000
let schemaReady = false

const clients = new Set()
const activeRuns = new Map()
const queuedRuns = []

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function makeRunId() {
  return `group-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function agentName(agentId) {
  return RUNTIME_AGENT_MAP[agentId]?.name || agentId
}

function ensureGroupChatSchema() {
  if (schemaReady) return
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_chat_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL DEFAULT 'group-main',
      sender TEXT NOT NULL,
      sender_id TEXT,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      run_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      created_at_ms INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_chat_rooms (
      room_id TEXT PRIMARY KEY,
      memory_summary TEXT,
      compressed_until_ms INTEGER DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_chat_agent_sessions (
      room_id TEXT NOT NULL DEFAULT 'group-main',
      agent_id TEXT NOT NULL,
      claude_session_id TEXT,
      memory_summary TEXT,
      last_run_id TEXT,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY(room_id, agent_id)
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_chat_runs (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      prompt TEXT,
      claude_session_id TEXT,
      result_text TEXT,
      error TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_group_chat_messages_room ON group_chat_messages(room_id, created_at_ms)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_group_chat_runs_room ON group_chat_runs(room_id, created_at)')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chat_messages_run ON group_chat_messages(run_id) WHERE run_id IS NOT NULL')
  schemaReady = true
}

function normalizeGroupMessage(row) {
  if (!row) return null
  return {
    id: row.id,
    content: row.content,
    sender: row.sender,
    senderId: row.sender_id || undefined,
    senderName: row.sender_name,
    timestamp: row.created_at_ms,
    runId: row.run_id || undefined,
  }
}

function normalizeRun(row) {
  if (!row) return null
  return {
    id: row.id,
    roomId: row.room_id,
    agentId: row.agent_id,
    status: row.status,
    claudeSessionId: row.claude_session_id || null,
    error: row.error || null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function saveGroupMessage({
  roomId = DEFAULT_ROOM_ID,
  sender,
  senderId = null,
  senderName,
  content,
  runId = null,
  id = `group-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  createdAtMs = Date.now(),
}) {
  ensureGroupChatSchema()
  const db = getDatabase()
  db.prepare(`
    INSERT OR REPLACE INTO group_chat_messages (
      id, room_id, sender, sender_id, sender_name, content, run_id, created_at, created_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, roomId, sender, senderId, senderName, content, runId, nowSeconds(), Number(createdAtMs || Date.now()))
  return normalizeGroupMessage(db.prepare('SELECT * FROM group_chat_messages WHERE id = ?').get(id))
}

function listGroupMessages(roomId = DEFAULT_ROOM_ID, limit = 80) {
  ensureGroupChatSchema()
  cleanupNoisySystemMessages(roomId)
  const rows = getDatabase().prepare(`
    SELECT *
    FROM group_chat_messages
    WHERE room_id = ?
    ORDER BY created_at_ms DESC
    LIMIT ?
  `).all(roomId, Math.max(1, Number(limit) || 80))
  return rows.reverse().map(normalizeGroupMessage)
}

function cleanupNoisySystemMessages(roomId = DEFAULT_ROOM_ID) {
  ensureGroupChatSchema()
  getDatabase().prepare(`
    DELETE FROM group_chat_messages
    WHERE room_id = ?
      AND sender = 'system'
      AND (
        content LIKE '%已进入%'
        OR content LIKE '%开始回复%'
        OR content LIKE '%回复完成%'
        OR content LIKE '%队列%'
        OR content LIKE '%运行结束%'
        OR content LIKE '%运行回复已停止%'
        OR content LIKE '%排队回复已取消%'
        OR content LIKE '%Claude Runtime 状态更新%'
      )
  `).run(roomId)
}

function listMessagesAfter(roomId, afterMs) {
  ensureGroupChatSchema()
  return getDatabase().prepare(`
    SELECT *
    FROM group_chat_messages
    WHERE room_id = ? AND created_at_ms > ?
    ORDER BY created_at_ms ASC
  `).all(roomId, Number(afterMs || 0)).map(normalizeGroupMessage)
}

function getRoomMemory(roomId = DEFAULT_ROOM_ID) {
  ensureGroupChatSchema()
  const row = getDatabase().prepare('SELECT * FROM group_chat_rooms WHERE room_id = ?').get(roomId)
  return {
    roomId,
    memorySummary: row?.memory_summary || '',
    compressedUntilMs: Number(row?.compressed_until_ms || 0),
  }
}

function updateRoomMemory(roomId, memorySummary, compressedUntilMs) {
  ensureGroupChatSchema()
  getDatabase().prepare(`
    INSERT INTO group_chat_rooms (room_id, memory_summary, compressed_until_ms, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(room_id) DO UPDATE SET
      memory_summary = excluded.memory_summary,
      compressed_until_ms = excluded.compressed_until_ms,
      updated_at = unixepoch()
  `).run(roomId, memorySummary, Number(compressedUntilMs || 0))
}

function getGroupAgentSession(roomId, agentId) {
  ensureGroupChatSchema()
  return getDatabase().prepare(`
    SELECT *
    FROM group_chat_agent_sessions
    WHERE room_id = ? AND agent_id = ?
  `).get(roomId, agentId)
}

function updateGroupAgentSession({ roomId = DEFAULT_ROOM_ID, agentId, claudeSessionId = null, memorySummary = '', runId = null }) {
  ensureGroupChatSchema()
  getDatabase().prepare(`
    INSERT INTO group_chat_agent_sessions (
      room_id, agent_id, claude_session_id, memory_summary, last_run_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(room_id, agent_id) DO UPDATE SET
      claude_session_id = COALESCE(excluded.claude_session_id, group_chat_agent_sessions.claude_session_id),
      memory_summary = excluded.memory_summary,
      last_run_id = COALESCE(excluded.last_run_id, group_chat_agent_sessions.last_run_id),
      updated_at = unixepoch()
  `).run(roomId, agentId, claudeSessionId, memorySummary, runId)
}

function createChatRun({ id, roomId, agentId, prompt }) {
  ensureGroupChatSchema()
  getDatabase().prepare(`
    INSERT INTO group_chat_runs (id, room_id, agent_id, status, prompt, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', ?, unixepoch(), unixepoch())
  `).run(id, roomId, agentId, prompt)
  return getChatRun(id)
}

function updateChatRun(runId, updates) {
  ensureGroupChatSchema()
  const allowed = ['status', 'claude_session_id', 'result_text', 'error', 'started_at', 'completed_at']
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key))
  if (!entries.length) return getChatRun(runId)
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ')
  const values = entries.map(([, value]) => value)
  getDatabase().prepare(`UPDATE group_chat_runs SET ${setClause}, updated_at = unixepoch() WHERE id = ?`).run(...values, runId)
  return getChatRun(runId)
}

function getChatRun(runId) {
  ensureGroupChatSchema()
  return normalizeRun(getDatabase().prepare('SELECT * FROM group_chat_runs WHERE id = ?').get(runId))
}

function trimText(text, limit = DEFAULT_MEMORY_LIMIT) {
  const value = String(text || '').replace(/\n{3,}/g, '\n\n').trim()
  return value.length > limit ? value.slice(value.length - limit) : value
}

function compactRoomMemory(roomId = DEFAULT_ROOM_ID) {
  const recentLimit = Math.max(8, Number(process.env.GROUP_CHAT_RECENT_LIMIT || DEFAULT_RECENT_LIMIT))
  const memoryLimit = Math.max(2000, Number(process.env.GROUP_CHAT_MEMORY_LIMIT || DEFAULT_MEMORY_LIMIT))
  const memory = getRoomMemory(roomId)
  const uncompressed = listMessagesAfter(roomId, memory.compressedUntilMs)

  if (uncompressed.length <= recentLimit) {
    return {
      ...memory,
      recentMessages: listGroupMessages(roomId, recentLimit),
    }
  }

  const archive = uncompressed.slice(0, uncompressed.length - recentLimit)
  const recentMessages = uncompressed.slice(-recentLimit)
  const archiveText = archive
    .map((message) => `- ${message.senderName}: ${message.content}`)
    .join('\n')
  const nextSummary = trimText([
    memory.memorySummary && `既有摘要：\n${memory.memorySummary}`,
    `新增压缩记录：\n${archiveText}`,
  ].filter(Boolean).join('\n\n'), memoryLimit)
  const compressedUntilMs = archive[archive.length - 1]?.timestamp || memory.compressedUntilMs
  updateRoomMemory(roomId, nextSummary, compressedUntilMs)

  return {
    roomId,
    memorySummary: nextSummary,
    compressedUntilMs,
    recentMessages,
  }
}

function buildGroupChatPrompt({ agentId, content, messages, roomMemory, agentMemory }) {
  const roleName = agentName(agentId)
  const recentMessages = messages
    .slice(-DEFAULT_RECENT_LIMIT)
    .map((message) => `${message.senderName}: ${message.content}`)
    .join('\n') || '暂无历史消息'

  return `你是${roleName}，正在“AI 团队群聊”中参与多人会话。

聊天规则：
- 像群聊成员一样自然回复，不要输出固定章节。
- 你的回复要简洁、直接、可继续追问。
- 可以利用群聊记忆和最近消息承接上下文；信息不足时说明你的假设。
- 默认不修改项目源码、不写文件、不读取 .env/密钥/系统目录。
- 如果用户只是聊天或让你自我介绍，就直接聊天式回答。

群聊压缩记忆：
${roomMemory || '暂无'}

你自己的连续会话记忆：
${agentMemory || '暂无'}

最近群聊消息：
${recentMessages}

当前用户对你说：
${content.trim()}

请直接回复当前用户。`
}

function emitGroupEvent(payload) {
  const event = { timestamp: Date.now(), ...payload }
  for (const res of clients) {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
}

function queueStatus() {
  return {
    running: activeRuns.size,
    queued: queuedRuns.length,
  }
}

function enqueueChatJob(job) {
  queuedRuns.push(job)
  emitGroupEvent({
    type: 'group.run.queued',
    roomId: job.roomId,
    agentId: job.agentId,
    runId: job.runId,
    message: `${agentName(job.agentId)} 已进入群聊队列`,
    ...queueStatus(),
  })
  pumpChatQueue()
}

function pumpChatQueue() {
  const config = getClaudeRuntimeConfig()
  while (activeRuns.size < config.maxConcurrency && queuedRuns.length > 0) {
    const job = queuedRuns.shift()
    activeRuns.set(job.runId, job)
    executeChatJob(job).finally(() => {
      activeRuns.delete(job.runId)
      pumpChatQueue()
    })
  }
}

async function executeChatJob(job) {
  const config = getClaudeRuntimeConfig()
  const controller = new AbortController()
  job.controller = controller
  let buffer = ''

  updateChatRun(job.runId, { status: 'running', started_at: nowSeconds() })
  emitGroupEvent({
    type: 'group.run.started',
    roomId: job.roomId,
    agentId: job.agentId,
    runId: job.runId,
    message: `${agentName(job.agentId)} 开始回复`,
    ...queueStatus(),
  })

  try {
    const result = await runClaudeQuery({
      prompt: job.prompt,
      config,
      resume: job.resumeSessionId || null,
      cwd: config.cwd,
      abortController: controller,
      onEvent: (event) => {
        if (event.sessionId) {
          updateChatRun(job.runId, { claude_session_id: event.sessionId })
        }
        if (event.type === 'assistant' && event.text) {
          if (event.snapshot) {
            buffer = event.text
            emitGroupEvent({
              type: 'group.agent.snapshot',
              roomId: job.roomId,
              agentId: job.agentId,
              runId: job.runId,
              message: event.text,
            })
          } else {
            buffer += event.text
            emitGroupEvent({
              type: 'group.agent.delta',
              roomId: job.roomId,
              agentId: job.agentId,
              runId: job.runId,
              message: event.text,
            })
          }
        }
      },
    })

    if (!result.ok) {
      throw new Error(result.error || 'Claude 群聊回复失败')
    }

    const reply = result.text || buffer || '我暂时没有生成有效回复。'
    saveGroupMessage({
      roomId: job.roomId,
      sender: 'agent',
      senderId: job.agentId,
      senderName: agentName(job.agentId),
      content: reply,
      runId: job.runId,
    })
    updateGroupAgentSession({
      roomId: job.roomId,
      agentId: job.agentId,
      claudeSessionId: result.sessionId || getChatRun(job.runId)?.claudeSessionId || null,
      memorySummary: trimText(`${job.agentMemory || ''}\n${agentName(job.agentId)} 最近回复：${reply}`, 3000),
      runId: job.runId,
    })
    updateChatRun(job.runId, {
      status: 'completed',
      claude_session_id: result.sessionId || getChatRun(job.runId)?.claudeSessionId || null,
      result_text: reply,
      completed_at: nowSeconds(),
    })
    compactRoomMemory(job.roomId)
    emitGroupEvent({
      type: 'group.run.completed',
      roomId: job.roomId,
      agentId: job.agentId,
      runId: job.runId,
      message: '回复完成',
      ...queueStatus(),
    })
  } catch (err) {
    const cancelled = controller.signal.aborted
    const message = cancelled ? '群聊回复已停止' : (err instanceof Error ? err.message : String(err || '群聊回复失败'))
    updateChatRun(job.runId, {
      status: cancelled ? 'cancelled' : 'failed',
      error: message,
      completed_at: nowSeconds(),
    })
    emitGroupEvent({
      type: cancelled ? 'group.run.cancelled' : 'group.run.failed',
      roomId: job.roomId,
      agentId: job.agentId,
      runId: job.runId,
      message,
      ...queueStatus(),
    })
  }
}

router.get('/group-chat/messages', (req, res) => {
  try {
    const roomId = String(req.query.roomId || DEFAULT_ROOM_ID)
    const limit = Number(req.query.limit || 120)
    res.json({ success: true, messages: listGroupMessages(roomId, limit), memory: getRoomMemory(roomId) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/group-chat/messages', (req, res) => {
  try {
    const { content = '', sender = 'user', senderId = 'user', senderName = '我', roomId = DEFAULT_ROOM_ID } = req.body || {}
    if (!content.trim()) return res.status(400).json({ success: false, error: 'content is required' })
    const message = saveGroupMessage({
      roomId,
      content: content.trim(),
      sender,
      senderId,
      senderName,
    })
    compactRoomMemory(roomId)
    res.json({ success: true, message })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/group-chat/messages', (req, res) => {
  try {
    ensureGroupChatSchema()
    const roomId = String(req.query.roomId || DEFAULT_ROOM_ID)
    for (let index = queuedRuns.length - 1; index >= 0; index -= 1) {
      const job = queuedRuns[index]
      if (job.roomId !== roomId) continue
      queuedRuns.splice(index, 1)
      updateChatRun(job.runId, { status: 'cancelled', error: '清除历史会话时取消排队回复', completed_at: nowSeconds() })
      emitGroupEvent({ type: 'group.run.cancelled', roomId, agentId: job.agentId, runId: job.runId, message: '群聊排队回复已取消', ...queueStatus() })
    }
    for (const [runId, job] of activeRuns.entries()) {
      if (job.roomId !== roomId) continue
      job.controller?.abort()
      emitGroupEvent({ type: 'group.run.cancelled', roomId, agentId: job.agentId, runId, message: '群聊运行回复已停止', ...queueStatus() })
    }
    const db = getDatabase()
    db.prepare('DELETE FROM group_chat_messages WHERE room_id = ?').run(roomId)
    db.prepare('DELETE FROM group_chat_rooms WHERE room_id = ?').run(roomId)
    db.prepare('DELETE FROM group_chat_agent_sessions WHERE room_id = ?').run(roomId)
    db.prepare('DELETE FROM group_chat_runs WHERE room_id = ?').run(roomId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/group-chat/agents/:agentId/run', (req, res) => {
  try {
    const { agentId } = req.params
    const { content = '', roomId = DEFAULT_ROOM_ID } = req.body || {}
    if (!RUNTIME_AGENT_MAP[agentId]) {
      return res.status(400).json({ success: false, error: `Unsupported group chat agent: ${agentId}` })
    }
    if (!content.trim()) {
      return res.status(400).json({ success: false, error: 'content is required' })
    }

    const compacted = compactRoomMemory(roomId)
    const agentSession = getGroupAgentSession(roomId, agentId)
    const prompt = buildGroupChatPrompt({
      agentId,
      content,
      messages: compacted.recentMessages,
      roomMemory: compacted.memorySummary,
      agentMemory: agentSession?.memory_summary || '',
    })
    const runId = makeRunId()
    const run = createChatRun({ id: runId, roomId, agentId, prompt })
    enqueueChatJob({
      runId,
      roomId,
      agentId,
      prompt,
      resumeSessionId: agentSession?.claude_session_id || null,
      agentMemory: agentSession?.memory_summary || '',
    })

    res.json({
      success: true,
      run,
      resumedSessionId: agentSession?.claude_session_id || null,
      message: `${agentName(agentId)} 已进入群聊队列`,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/group-chat/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  clients.add(res)
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now(), ...queueStatus() })}\n\n`)

  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now(), ...queueStatus() })}\n\n`)
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    clients.delete(res)
  })
})

router.post('/group-chat/runs/:id/cancel', (req, res) => {
  try {
    const runId = req.params.id
    const queuedIndex = queuedRuns.findIndex((job) => job.runId === runId)
    if (queuedIndex >= 0) {
      const [job] = queuedRuns.splice(queuedIndex, 1)
      updateChatRun(runId, { status: 'cancelled', error: '用户取消排队回复', completed_at: nowSeconds() })
      emitGroupEvent({ type: 'group.run.cancelled', roomId: job.roomId, agentId: job.agentId, runId, message: '群聊排队回复已取消', ...queueStatus() })
      return res.json({ success: true, result: { ok: true, cancelled: 'queued' } })
    }

    const active = activeRuns.get(runId)
    if (active?.controller) {
      active.controller.abort()
      return res.json({ success: true, result: { ok: true, cancelled: 'running' } })
    }

    res.status(404).json({ success: false, error: 'Run not found or already finished' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/group-chat/status', (_req, res) => {
  const config = getClaudeRuntimeConfig()
  res.json({
    success: true,
    status: {
      healthy: true,
      runtime: config.runtime,
      mock: config.mock,
      maxConcurrency: config.maxConcurrency,
      ...queueStatus(),
    },
  })
})

export default router
