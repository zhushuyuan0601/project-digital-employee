import { getDatabase } from './index.js'

const DEFAULT_AGENT_DEFINITIONS = [
  {
    id: 'xiaomu',
    name: '小呦',
    roleName: '项目统筹',
    reportName: '小呦-任务拆解',
    description: '统筹、任务拆解、最终汇总',
    boundary: '只负责诊断、规划、协调、阶段复盘和最终汇总，不承担具体调研、产品、研发或测试执行。',
    runtimeAgentId: 'ceo',
    roleId: 'coordinator',
    capabilities: ['task_diagnosis', 'workflow_planning', 'orchestration', 'final_summary'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_title', 'task_description', 'clarification_answers', 'plan_feedback'],
    outputContract: ['workflow_plan', 'clarification_questions', 'final_summary'],
    riskLevel: 'medium',
    defaultModel: '',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 10,
    coordinator: true,
  },
  {
    id: 'xiaoyan',
    name: '研究员',
    roleName: '调研分析',
    reportName: '研究员-调研报告',
    description: '调研、竞品、资料分析',
    boundary: '负责背景、市场、竞品、资料和事实依据分析；不得直接给出工程实现或测试验收结论。',
    runtimeAgentId: 'researcher',
    roleId: 'researcher',
    capabilities: ['research', 'competitive_analysis', 'fact_checking', 'market_scan'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_goal', 'research_questions', 'source_materials'],
    outputContract: ['research_report', 'evidence_summary', 'risk_notes'],
    riskLevel: 'low',
    defaultModel: '',
    maxConcurrency: 2,
    enabled: true,
    sortOrder: 20,
    coordinator: false,
  },
  {
    id: 'xiaochan',
    name: '产品经理',
    roleName: '产品设计',
    reportName: '产品经理-需求分析报告',
    description: '需求分析、PRD、流程方案',
    boundary: '负责需求、PRD、流程、用户场景和验收口径；不得替研发做实现，不得替测试执行验证。',
    runtimeAgentId: 'pm',
    roleId: 'pm',
    capabilities: ['requirement_analysis', 'prd', 'user_flow', 'acceptance_scope'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_goal', 'research_report', 'business_context'],
    outputContract: ['product_plan', 'prd', 'acceptance_scope'],
    riskLevel: 'medium',
    defaultModel: '',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 30,
    coordinator: false,
  },
  {
    id: 'xiaokai',
    name: '研发工程师',
    roleName: '技术开发',
    reportName: '研发工程师-技术方案报告',
    description: '技术方案、代码阅读、实现建议',
    boundary: '负责技术方案、代码阅读、工程实现和落地建议；不得替产品定义需求，不得替测试出最终验收结论。',
    runtimeAgentId: 'tech-lead',
    roleId: 'tech-lead',
    capabilities: ['code_reading', 'architecture', 'implementation_plan', 'technical_risk', 'code_editing'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'product_plan', 'codebase_context'],
    outputContract: ['technical_plan', 'implementation_notes', 'risk_list'],
    riskLevel: 'high',
    defaultModel: '',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 40,
    coordinator: false,
  },
  {
    id: 'xiaoce',
    name: '测试员',
    roleName: '质量检查',
    reportName: '测试员-测试验收报告',
    description: '测试方案、验收标准、风险清单',
    boundary: '负责基于产品/研发产物做测试设计、风险验证和验收建议；没有可验证产物时必须说明阻塞。',
    runtimeAgentId: 'team-qa',
    roleId: 'team-qa',
    capabilities: ['test_plan', 'acceptance_criteria', 'quality_risk', 'verification', 'test_execution'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'product_plan', 'technical_plan', 'deliverables'],
    outputContract: ['test_plan', 'acceptance_report', 'quality_risks'],
    riskLevel: 'medium',
    defaultModel: '',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 50,
    coordinator: false,
  },
]

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function parseJson(value, fallback = []) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function jsonValue(value) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function normalizeAgent(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    roleName: row.role_name,
    reportName: row.report_name,
    description: row.description,
    boundary: row.boundary,
    runtimeAgentId: row.runtime_agent_id,
    roleId: row.role_id,
    capabilities: parseJson(row.capabilities_json),
    allowedTools: parseJson(row.allowed_tools_json),
    inputContract: parseJson(row.input_contract_json),
    outputContract: parseJson(row.output_contract_json),
    riskLevel: row.risk_level,
    defaultModel: row.default_model || '',
    maxConcurrency: Math.max(1, Number(row.max_concurrency || 1)),
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order || 0),
    coordinator: Boolean(row.coordinator),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function defaultAgentDefinitions() {
  return DEFAULT_AGENT_DEFINITIONS.map((agent) => ({ ...agent }))
}

export function initializeAgentSchema() {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_name TEXT NOT NULL,
      report_name TEXT,
      description TEXT NOT NULL,
      boundary TEXT NOT NULL,
      runtime_agent_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      allowed_tools_json TEXT NOT NULL DEFAULT '[]',
      input_contract_json TEXT NOT NULL DEFAULT '[]',
      output_contract_json TEXT NOT NULL DEFAULT '[]',
      risk_level TEXT NOT NULL DEFAULT 'medium',
      default_model TEXT DEFAULT '',
      max_concurrency INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 100,
      coordinator INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_enabled ON agent_definitions(enabled, sort_order)')
  seedDefaultAgents()
  console.log('[DB] Agent definitions table initialized')
}

export function seedDefaultAgents() {
  const db = getDatabase()
  const insert = db.prepare(`
    INSERT INTO agent_definitions (
      id, name, role_name, report_name, description, boundary, runtime_agent_id, role_id,
      capabilities_json, allowed_tools_json, input_contract_json, output_contract_json,
      risk_level, default_model, max_concurrency, enabled, sort_order, coordinator, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role_name = excluded.role_name,
      report_name = excluded.report_name,
      description = excluded.description,
      boundary = excluded.boundary,
      runtime_agent_id = excluded.runtime_agent_id,
      role_id = excluded.role_id,
      capabilities_json = excluded.capabilities_json,
      input_contract_json = excluded.input_contract_json,
      output_contract_json = excluded.output_contract_json,
      coordinator = excluded.coordinator,
      updated_at = unixepoch()
  `)
  const tx = db.transaction(() => {
    for (const agent of DEFAULT_AGENT_DEFINITIONS) {
      const timestamp = nowSeconds()
      insert.run(
        agent.id,
        agent.name,
        agent.roleName,
        agent.reportName,
        agent.description,
        agent.boundary,
        agent.runtimeAgentId,
        agent.roleId,
        jsonValue(agent.capabilities),
        jsonValue(agent.allowedTools),
        jsonValue(agent.inputContract),
        jsonValue(agent.outputContract),
        agent.riskLevel,
        agent.defaultModel,
        agent.maxConcurrency,
        agent.enabled ? 1 : 0,
        agent.sortOrder,
        agent.coordinator ? 1 : 0,
        timestamp,
        timestamp
      )
    }
  })
  tx()
}

export function listAgentDefinitions({ enabledOnly = false, includeCoordinator = true } = {}) {
  const db = getDatabase()
  const clauses = []
  if (enabledOnly) clauses.push('enabled = 1')
  if (!includeCoordinator) clauses.push('coordinator = 0')
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return db.prepare(`
    SELECT *
    FROM agent_definitions
    ${where}
    ORDER BY sort_order ASC, id ASC
  `).all().map(normalizeAgent)
}

export function getAgentDefinition(agentId) {
  const db = getDatabase()
  return normalizeAgent(db.prepare('SELECT * FROM agent_definitions WHERE id = ?').get(agentId))
}

export function updateAgentDefinition(agentId, updates = {}) {
  const allowed = {
    enabled: (value) => value ? 1 : 0,
    maxConcurrency: (value) => Math.max(1, Number(value) || 1),
    allowedTools: (value) => jsonValue(value),
    riskLevel: (value) => String(value || 'medium').trim() || 'medium',
    sortOrder: (value) => Number(value) || 100,
    defaultModel: (value) => String(value || ''),
  }
  const columnMap = {
    enabled: 'enabled',
    maxConcurrency: 'max_concurrency',
    allowedTools: 'allowed_tools_json',
    riskLevel: 'risk_level',
    sortOrder: 'sort_order',
    defaultModel: 'default_model',
  }
  const entries = Object.entries(updates).filter(([key, value]) => allowed[key] && value !== undefined)
  if (!entries.length) return getAgentDefinition(agentId)
  const db = getDatabase()
  const setClause = entries.map(([key]) => `${columnMap[key]} = ?`).join(', ')
  const values = entries.map(([key, value]) => allowed[key](value))
  db.prepare(`
    UPDATE agent_definitions
    SET ${setClause}, updated_at = unixepoch()
    WHERE id = ?
  `).run(...values, agentId)
  return getAgentDefinition(agentId)
}
