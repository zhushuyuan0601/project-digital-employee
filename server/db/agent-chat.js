/**
 * Agent Chat 数据库模块
 * 存储 Agent 信息、消息、Token 消耗等
 */

import { getDatabase } from '../db/index.js'

// 重新导出 getDatabase 供路由使用
export { getDatabase }

/**
 * 初始化 Agent Chat 相关表
 */
export function initializeAgentChatSchema() {
  const db = getDatabase()

  // 创建 agents 表 (添加 session_key 用于 Gateway 集成)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      display_name TEXT,
      session_key TEXT UNIQUE,
      soul_content TEXT,
      status TEXT DEFAULT 'offline',
      last_seen INTEGER,
      last_activity TEXT,
      config TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)

  // 迁移：添加 session_key 字段到已有表
  try {
    // 检查列是否存在
    const tableInfo = db.prepare("PRAGMA table_info(agents)").all()
    const hasSessionKey = tableInfo.some(col => col.name === 'session_key')
    const hasSoulContent = tableInfo.some(col => col.name === 'soul_content')

    if (!hasSessionKey) {
      db.exec(`ALTER TABLE agents ADD COLUMN session_key TEXT UNIQUE`)
      console.log('[DB] Migrated: added session_key column')
    }
    if (!hasSoulContent) {
      db.exec(`ALTER TABLE agents ADD COLUMN soul_content TEXT`)
      console.log('[DB] Migrated: added soul_content column')
    }
  } catch (e) {
    console.log('[DB] Migration error (may already exist):', e.message)
  }

  // 创建 conversations 表（不使用外键约束，避免插入问题）
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      agent_name TEXT,
      message_count INTEGER DEFAULT 0,
      last_message_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  // 创建 chat_messages 表（不使用外键约束，避免插入问题）
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      from_agent TEXT NOT NULL,
      to_agent TEXT,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      metadata TEXT,
      token_usage TEXT,
      tool_calls TEXT,
      tools_result TEXT,
      cost REAL,
      latency REAL,
      model TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)

  // 创建索引（包含 session_key 索引）
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_from ON chat_messages(from_agent)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_to ON chat_messages(to_agent)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at)')

  // 迁移：添加新字段到已有表
  try {
    // 检查列是否存在
    const tableInfo = db.prepare("PRAGMA table_info(agents)").all()
    const hasSessionKey = tableInfo.some(col => col.name === 'session_key')
    const hasSoulContent = tableInfo.some(col => col.name === 'soul_content')

    if (!hasSessionKey) {
      // SQLite 不能直接添加 UNIQUE 列，先添加列再创建唯一索引
      db.exec(`ALTER TABLE agents ADD COLUMN session_key TEXT`)
      console.log('[DB] Migrated: added session_key column')
    }
    if (!hasSoulContent) {
      db.exec(`ALTER TABLE agents ADD COLUMN soul_content TEXT`)
      console.log('[DB] Migrated: added soul_content column')
    }
  } catch (e) {
    console.log('[DB] Migration error:', e.message)
  }

  // 创建 session_key 唯一索引（在列添加后）
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_session_key ON agents(session_key)')
  } catch (e) {
    console.log('[DB] Index creation error:', e.message)
  }

  console.log('[DB] Agent Chat tables initialized')
}

/**
 * 获取所有 Agents
 */
export function getAgents(filters = {}) {
  const db = getDatabase()
  let query = 'SELECT * FROM agents WHERE 1=1'
  const params = []

  if (filters.status) {
    query += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters.role) {
    query += ' AND role = ?'
    params.push(filters.role)
  }

  query += ' ORDER BY updated_at DESC'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  const stmt = db.prepare(query)
  const agents = stmt.all(...params)

  return agents.map(agent => ({
    ...agent,
    config: agent.config ? JSON.parse(agent.config) : null
  }))
}

/**
 * 获取单个 Agent
 */
export function getAgent(name) {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM agents WHERE name = ?')
  const agent = stmt.get(name)

  if (agent) {
    agent.config = agent.config ? JSON.parse(agent.config) : null
  }

  return agent
}

/**
 * 创建或更新 Agent
 */
export function upsertAgent(agent) {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO agents (name, role, display_name, status, config, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(name) DO UPDATE SET
      role = excluded.role,
      display_name = excluded.display_name,
      status = excluded.status,
      config = excluded.config,
      updated_at = unixepoch()
  `)

  stmt.run(
    agent.name,
    agent.role,
    agent.display_name || agent.name,
    agent.status || 'offline',
    agent.config ? JSON.stringify(agent.config) : null
  )

  return getAgent(agent.name)
}

/**
 * 更新 Agent 状态
 */
export function updateAgentStatus(name, status, activity) {
  const db = getDatabase()
  const stmt = db.prepare(`
    UPDATE agents
    SET status = ?, last_seen = unixepoch(), last_activity = ?, updated_at = unixepoch()
    WHERE name = ?
  `)
  stmt.run(status, activity, name)
}

/**
 * 获取 Agent 统计信息
 */
export function getAgentStats(name) {
  const db = getDatabase()

  // 获取消息统计
  const messageStmt = db.prepare(`
    SELECT COUNT(*) as count,
           SUM(CASE WHEN token_usage IS NOT NULL THEN 1 ELSE 0 END) as with_tokens
    FROM chat_messages
    WHERE from_agent = ? OR to_agent = ?
  `)
  const messageStats = messageStmt.get(name, name)

  // 获取 Token 统计
  const tokenStmt = db.prepare(`
    SELECT
      COALESCE(SUM(json_extract(token_usage, '$.prompt_tokens')), 0) as prompt_tokens,
      COALESCE(SUM(json_extract(token_usage, '$.completion_tokens')), 0) as completion_tokens,
      COALESCE(SUM(json_extract(token_usage, '$.total_tokens')), 0) as total_tokens
    FROM chat_messages
    WHERE from_agent = ? AND token_usage IS NOT NULL
  `)
  const tokenStats = tokenStmt.get(name)

  // 获取工具调用统计
  const toolStmt = db.prepare(`
    SELECT COUNT(*) as tool_calls
    FROM chat_messages
    WHERE from_agent = ? AND tool_calls IS NOT NULL
  `)
  const toolStats = toolStmt.get(name)

  // 获取最后消息时间
  const lastStmt = db.prepare(`
    SELECT MAX(created_at) as last_message_at
    FROM chat_messages
    WHERE from_agent = ? OR to_agent = ?
  `)
  const lastStats = lastStmt.get(name, name)

  return {
    message_count: messageStats.count,
    token_usage: {
      prompt_tokens: tokenStats.prompt_tokens,
      completion_tokens: tokenStats.completion_tokens,
      total_tokens: tokenStats.total_tokens
    },
    tool_calls: toolStats.tool_calls,
    cost: 0, // 可计算
    last_message_at: lastStats.last_message_at || 0
  }
}

/**
 * 获取消息列表
 */
export function getMessages(filters = {}) {
  const db = getDatabase()
  let query = 'SELECT * FROM chat_messages WHERE 1=1'
  const params = []

  if (filters.conversation_id) {
    query += ' AND conversation_id = ?'
    params.push(filters.conversation_id)
  }
  if (filters.from_agent) {
    query += ' AND from_agent = ?'
    params.push(filters.from_agent)
  }
  if (filters.to_agent) {
    query += ' AND to_agent = ?'
    params.push(filters.to_agent)
  }
  if (filters.since) {
    query += ' AND created_at > ?'
    params.push(filters.since)
  }

  query += ' ORDER BY created_at ASC'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  const stmt = db.prepare(query)
  const messages = stmt.all(...params)

  return messages.map(msg => ({
    ...msg,
    metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
    token_usage: msg.token_usage ? JSON.parse(msg.token_usage) : null,
    tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : null,
    tools_result: msg.tools_result ? JSON.parse(msg.tools_result) : null
  }))
}

/**
 * 创建消息
 */
export function createMessage(message) {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO chat_messages (
      conversation_id, from_agent, to_agent, content, message_type,
      metadata, token_usage, tool_calls, tools_result, cost, latency, model
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    message.conversation_id,
    message.from_agent,
    message.to_agent,
    message.content,
    message.message_type || 'text',
    message.metadata ? JSON.stringify(message.metadata) : null,
    message.token_usage ? JSON.stringify(message.token_usage) : null,
    message.tool_calls ? JSON.stringify(message.tool_calls) : null,
    message.tools_result ? JSON.stringify(message.tools_result) : null,
    message.cost || 0,
    message.latency || 0,
    message.model || null
  )

  // 更新会话最后消息时间
  const updateStmt = db.prepare(`
    UPDATE conversations
    SET last_message_at = unixepoch(), message_count = message_count + 1
    WHERE id = ?
  `)
  updateStmt.run(message.conversation_id)

  return {
    id: result.lastInsertRowid,
    ...message,
    created_at: Math.floor(Date.now() / 1000)
  }
}

/**
 * 获取或创建会话
 * 支持简化名称（ceo）和完整名称（agent:ceo:main）
 */
export function getOrCreateConversation(agentName) {
  const db = getDatabase()
  const conversationId = `agent_${agentName}`

  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?')
  let conversation = stmt.get(conversationId)

  if (!conversation) {
    // 检查 agent 是否存在，如果不存在则创建
    let actualAgentName = agentName

    // 尝试查找匹配的 agent
    const agentStmt = db.prepare('SELECT name FROM agents WHERE name = ?')
    let agent = agentStmt.get(agentName)

    if (!agent) {
      // 尝试查找匹配的完整名称
      const allAgents = db.prepare('SELECT name FROM agents').all()
      for (const a of allAgents) {
        const coreName = extractCoreName(a.name)
        if (coreName === agentName.toLowerCase()) {
          actualAgentName = a.name
          agent = a
          break
        }
      }

      // 如果仍然找不到，确保 agent 存在（自动创建）
      if (!agent) {
        try {
          const createAgentStmt = db.prepare(`
            INSERT INTO agents (name, role, display_name, status, created_at, updated_at)
            VALUES (?, ?, ?, 'idle', unixepoch(), unixepoch())
          `)
          createAgentStmt.run(agentName, agentName, agentName)
          actualAgentName = agentName
        } catch (e) {
          console.log('[DB] Could not create agent:', e.message)
        }
      }
    }

    // 创建会话
    try {
      const insertStmt = db.prepare(`
        INSERT INTO conversations (id, agent_name, title, created_at)
        VALUES (?, ?, ?, unixepoch())
      `)
      insertStmt.run(conversationId, actualAgentName, `与 ${agentName} 的会话`)
      conversation = stmt.get(conversationId)
    } catch (e) {
      console.error('[DB] Failed to create conversation:', e.message)
      // 如果外键约束仍然失败，修改表结构移除外键
      try {
        // 创建新表不带外键约束
        db.exec(`
          CREATE TABLE IF NOT EXISTS conversations_new (
            id TEXT PRIMARY KEY,
            title TEXT,
            agent_name TEXT,
            message_count INTEGER DEFAULT 0,
            last_message_at INTEGER,
            created_at INTEGER DEFAULT (unixepoch())
          )
        `)
        // 复制数据
        db.exec(`INSERT OR IGNORE INTO conversations_new SELECT * FROM conversations`)
        // 删除旧表
        db.exec(`DROP TABLE conversations`)
        // 重命名新表
        db.exec(`ALTER TABLE conversations_new RENAME TO conversations`)

        // 重新插入
        const insertStmt = db.prepare(`
          INSERT INTO conversations (id, agent_name, title, created_at)
          VALUES (?, ?, ?, unixepoch())
        `)
        insertStmt.run(conversationId, actualAgentName, `与 ${agentName} 的会话`)
        conversation = stmt.get(conversationId)
      } catch (e2) {
        console.error('[DB] Failed to recreate table:', e2.message)
      }
    }
  }

  return conversation
}

/**
 * 从 Agent 名称中提取核心标识
 */
function extractCoreName(name) {
  let core = name.toLowerCase()
    .replace(/^agent:/, '')
    .replace(/^agent_/, '')
    .replace(/^agent-/, '')
    .replace(/:main$/, '')
    .replace(/_main$/, '')
    .replace(/-main$/, '')
    .replace(/:primary$/, '')
    .replace(/_primary$/, '')

  if (core === 'claudecode' || core === 'claude-code' || core === 'claude_code') {
    return 'claudecode'
  }

  return core
}

/**
 * 初始化默认 Agents
 */
export function initializeDefaultAgents() {
  const defaultAgents = [
    { name: 'agent:ceo:main', role: 'agent:ceo:main', display_name: '小呦' },
    { name: 'agent:researcher:main', role: 'agent:researcher:main', display_name: '研究员' },
    { name: 'agent:pm:main', role: 'agent:pm:main', display_name: '产品经理' },
    { name: 'agent:tech-lead:main', role: 'agent:tech-lead:main', display_name: '研发工程师' },
    { name: 'agent:team-qa:main', role: 'agent:team-qa:main', display_name: '测试工程师' },
    { name: 'claudecode', role: 'claudecode', display_name: 'Claude Code' }
  ]

  for (const agent of defaultAgents) {
    upsertAgent(agent)
  }

  console.log('[DB] Default agents initialized')
}
