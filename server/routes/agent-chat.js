/**
 * Agent Chat API 路由
 * 提供 Agent 管理、消息收发、Token 统计等功能
 * 集成 OpenClaw Gateway 消息转发
 */

import express from 'express'
import {
  getAgents,
  getAgent,
  updateAgentStatus,
  getAgentStats,
  getMessages,
  createMessage,
  getOrCreateConversation,
  initializeDefaultAgents,
  getDatabase
} from '../db/agent-chat.js'
import { sendMessageViaGateway, checkGatewayHealth } from '../lib/command.js'

const router = express.Router()

export function initAgentChatRoutes() {
  // 初始化默认 Agents（在数据库初始化后调用）
  initializeDefaultAgents()
}

/**
 * GET /api/agents
 * 获取 Agent 列表
 */
router.get('/agents', (req, res) => {
  try {
    const { status, role, limit } = req.query
    const agents = getAgents({ status, role, limit: limit ? parseInt(limit) : 100 })

    res.json({
      agents,
      total: agents.length,
      page: 1,
      limit: agents.length
    })
  } catch (err) {
    console.error('[AgentChat API] Get agents error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/agents/:name
 * 获取单个 Agent 详情
 */
router.get('/agents/:name', (req, res) => {
  try {
    const { name } = req.params
    const agent = getAgent(name)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const stats = getAgentStats(name)

    res.json({ agent, stats })
  } catch (err) {
    console.error('[AgentChat API] Get agent error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/agents/:name/messages
 * 获取 Agent 的消息列表
 */
router.get('/agents/:name/messages', (req, res) => {
  try {
    const { name } = req.params
    const { limit, since } = req.query

    // 使用数据库直接查询获取该Agent发送或接收的消息
    const db = getDatabase()
    let query = `
      SELECT * FROM chat_messages
      WHERE from_agent = ? OR to_agent = ?
    `
    const params = [name, name]

    if (since) {
      query += ' AND created_at > ?'
      params.push(parseInt(since))
    }

    query += ' ORDER BY created_at DESC'

    if (limit) {
      query += ' LIMIT ?'
      params.push(parseInt(limit))
    }

    const stmt = db.prepare(query)
    const rows = stmt.all(...params)

    // 解析JSON字段
    const messages = rows.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      token_usage: msg.token_usage ? JSON.parse(msg.token_usage) : null,
      tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : null,
      tools_result: msg.tools_result ? JSON.parse(msg.tools_result) : null
    })).reverse() // 按时间正序排列

    const stats = getAgentStats(name)

    res.json({ messages, stats })
  } catch (err) {
    console.error('[AgentChat API] Get agent messages error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/agents/:name/status
 * 更新 Agent 状态
 */
router.put('/agents/:name/status', (req, res) => {
  try {
    const { name } = req.params
    const { status, activity } = req.body

    updateAgentStatus(name, status, activity)

    res.json({ success: true, name, status })
  } catch (err) {
    console.error('[AgentChat API] Update agent status error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/agents/:name/detail
 * 获取单个 Agent 详情（包含统计信息）
 */
router.get('/agents/:name/detail', (req, res) => {
  try {
    const { name } = req.params
    const agent = getAgent(name)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const stats = getAgentStats(name)

    res.json({
      agent,
      stats,
      config: agent.config || {}
    })
  } catch (err) {
    console.error('[AgentChat API] Get agent detail error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/agents/:name/conversation
 * 获取 Agent 的活跃会话
 */
router.get('/agents/:name/conversation', (req, res) => {
  try {
    const { name } = req.params
    const db = req.app.locals.db || getDatabase()

    // 获取 Agent 的最新会话
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE agent_name = ?
      ORDER BY last_message_at DESC
      LIMIT 1
    `)
    const conversation = stmt.get(name)

    // 判断会话是否活跃（20秒内有消息）
    const isActive = conversation && conversation.last_message_at &&
      (Date.now() / 1000 - conversation.last_message_at) < 20

    res.json({
      conversation: conversation || null,
      isActive: !!isActive
    })
  } catch (err) {
    console.error('[AgentChat API] Get agent conversation error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/chat/messages
 * 获取消息列表
 */
router.get('/chat/messages', (req, res) => {
  try {
    const { conversation_id, from_agent, to_agent, limit, since } = req.query

    const messages = getMessages({
      conversation_id,
      from_agent,
      to_agent,
      limit: limit ? parseInt(limit) : 50,
      since: since ? parseInt(since) : undefined
    })

    res.json({
      messages,
      total: messages.length,
      page: 1,
      limit: messages.length
    })
  } catch (err) {
    console.error('[AgentChat API] Get messages error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/chat/messages
 * 发送消息（支持 Gateway 转发）
 */
router.post('/chat/messages', async (req, res) => {
  try {
    const {
      from,
      to,
      content,
      conversation_id,
      message_type = 'text',
      metadata,
      token_usage,
      tool_calls,
      tools_result,
      cost,
      latency,
      model
    } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // 获取或创建会话
    const targetAgent = to || from
    const conversation = getOrCreateConversation(targetAgent)

    // 创建消息
    const message = createMessage({
      conversation_id: conversation_id || conversation.id,
      from_agent: from || 'human',
      to_agent: to,
      content,
      message_type,
      metadata,
      token_usage,
      tool_calls,
      tools_result,
      cost,
      latency,
      model
    })

    // 更新 Agent 状态
    if (to) {
      updateAgentStatus(to, 'busy', 'Processing message')
    }

    // 尝试通过 Gateway 转发消息
    let forwardResult = {
      attempted: false,
      delivered: false,
      reason: null
    }

    if (to && to !== 'human') {
      // 从完整的 agent 名称中提取简化名称（如 agent:ceo:main -> ceo）
      const coreName = to.replace(/^agent:/, '').replace(/:main$/, '')

      forwardResult.attempted = true
      console.log('[AgentChat] Sending message via Gateway with agent:', coreName)

      try {
        const { sendMessageViaGatewayDirect } = await import('../lib/command.js')
        const gatewayResult = await sendMessageViaGatewayDirect(
          coreName,  // 使用简化名称
          content,
          from || 'human'
        )
        forwardResult.delivered = gatewayResult.success
        if (!gatewayResult.success) {
          forwardResult.reason = gatewayResult.error
        }
      } catch (e) {
        forwardResult.reason = 'Gateway send failed: ' + e.message
      }
    }

    res.json({
      message,
      forward: forwardResult
    })
  } catch (err) {
    console.error('[AgentChat API] Create message error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/chat/conversations
 * 获取会话列表
 */
router.get('/chat/conversations', (req, res) => {
  try {
    const { agent, limit } = req.query

    // 使用本地数据库
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM conversations ORDER BY last_message_at DESC LIMIT ?')
    const conversations = stmt.all(limit ? parseInt(limit) : 50)

    res.json({
      conversations,
      total: conversations.length,
      page: 1,
      limit: conversations.length
    })
  } catch (err) {
    console.error('[AgentChat API] Get conversations error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * PUT /api/agents/:name/session
 * 更新 Agent 的 session_key（用于 Gateway 集成）
 */
router.put('/agents/:name/session', (req, res) => {
  try {
    const { name } = req.params
    const { session_key } = req.body

    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE agents
      SET session_key = ?, updated_at = unixepoch()
      WHERE name = ?
    `)
    stmt.run(session_key, name)

    res.json({ success: true, name, session_key })
  } catch (err) {
    console.error('[AgentChat API] Update agent session error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/agents/:name/message
 * 发送消息到指定 Agent（通过 Gateway）
 */
router.post('/agents/:name/message', async (req, res) => {
  try {
    const { name } = req.params
    const { message, from = 'human' } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const db = getDatabase()
    const agent = db.prepare('SELECT * FROM agents WHERE name = ?').get(name)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    if (!agent.session_key) {
      return res.status(400).json({ error: 'Agent has no session_key configured' })
    }

    // 通过 Gateway 发送消息
    const result = await sendMessageViaGateway(agent.session_key, message, from)

    if (result.success) {
      res.json({ success: true, message: 'Message sent via Gateway' })
    } else {
      res.status(500).json({ error: 'Failed to send message', details: result.error })
    }
  } catch (err) {
    console.error('[AgentChat API] Send agent message error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/gateway/health
 * 检查 Gateway 健康状态
 */
router.get('/gateway/health', async (req, res) => {
  try {
    const isHealthy = await checkGatewayHealth()
    res.json({
      healthy: isHealthy,
      timestamp: Date.now()
    })
  } catch (err) {
    res.json({
      healthy: false,
      error: err.message,
      timestamp: Date.now()
    })
  }
})

/**
 * SSE 事件流
 * GET /api/events
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // 发送初始连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)

  // 保持连接
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`)
  }, 30000)

  req.on('close', () => {
    clearInterval(keepAlive)
  })
})

/**
 * 模拟 Agent 回复
 * POST /api/chat/simulate-reply
 * 用于测试，模拟 Agent 自动回复
 */
router.post('/chat/simulate-reply', async (req, res) => {
  try {
    const { agent, content, delay = 1000 } = req.body

    // 延迟后创建回复消息
    setTimeout(() => {
      const conversation = getOrCreateConversation(agent)

      const reply = createMessage({
        conversation_id: conversation.id,
        from_agent: agent,
        to_agent: 'human',
        content: `收到：${content}\n\n正在处理中...`,
        message_type: 'text',
        token_usage: {
          prompt_tokens: Math.floor(content.length / 4),
          completion_tokens: 20,
          total_tokens: Math.floor(content.length / 4) + 20
        },
        model: 'claude-3-sonnet'
      })

      // 更新 Agent 状态为忙碌
      updateAgentStatus(agent, 'busy', 'Replying to message')

      // 20秒后自动恢复为空闲
      setTimeout(() => {
        updateAgentStatus(agent, 'idle', 'Ready')
      }, 20000)

      console.log(`[AgentChat] Simulated reply from ${agent}`)
    }, delay)

    res.json({ success: true, message: 'Reply scheduled' })
  } catch (err) {
    console.error('[AgentChat API] Simulate reply error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
