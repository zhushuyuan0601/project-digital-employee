import { getDatabase } from './index.js'

function marketProfile({
  source = 'builtin',
  installSource = 'system',
  version = '1.0.0',
  author = 'system',
  ratingAvg = 0,
  ratingCount = 0,
  pricing = { model: 'metadata', unit: 'task', estimate: 'low' },
  marketVisible = true,
} = {}) {
  return { source, installSource, version, author, ratingAvg, ratingCount, pricing, marketVisible }
}

function capabilityProfile({
  intents = [],
  domains = [],
  skills = [],
  inputArtifacts = [],
  outputArtifacts = [],
  antiCapabilities = [],
} = {}) {
  return { intents, domains, skills, inputArtifacts, outputArtifacts, antiCapabilities }
}

function routingProfile({
  routeKeywords = [],
  preferredWhen = [],
  avoidWhen = [],
  requiresTools = [],
  requiresAgents = [],
  canRunInParallel = true,
  defaultPriority = 50,
  latencyTier = 'medium',
  costTier = 'medium',
} = {}) {
  return { routeKeywords, preferredWhen, avoidWhen, requiresTools, requiresAgents, canRunInParallel, defaultPriority, latencyTier, costTier }
}

function governanceProfile({
  riskLevel = 'medium',
  permissionScope = 'workspace_read',
  maxConcurrency = 1,
  requiresApproval = false,
  costLimit = '',
  dataAccessLevel = 'task_context',
} = {}) {
  return { riskLevel, permissionScope, maxConcurrency, requiresApproval, costLimit, dataAccessLevel }
}

function withProfiles(agent) {
  const capability = capabilityProfile(agent.capabilityProfile || {})
  const routing = routingProfile(agent.routingProfile || {})
  const governance = governanceProfile({
    ...(agent.governanceProfile || {}),
    riskLevel: agent.riskLevel || agent.governanceProfile?.riskLevel || 'medium',
    maxConcurrency: agent.maxConcurrency || agent.governanceProfile?.maxConcurrency || 1,
  })
  const visible = agent.marketVisible !== false && agent.marketProfile?.marketVisible !== false
  const market = marketProfile({
    ...(agent.marketProfile || {}),
    source: agent.source || agent.marketProfile?.source || 'builtin',
    version: agent.version || agent.marketProfile?.version || '1.0.0',
    marketVisible: visible,
  })

  return {
    ...agent,
    reportName: agent.reportName || `${agent.name}-报告`,
    roleId: agent.roleId || agent.id,
    capabilities: agent.capabilities || capability.skills,
    allowedTools: agent.allowedTools || ['Read', 'Glob', 'Grep'],
    inputContract: agent.inputContract || capability.inputArtifacts || ['plain_text'],
    outputContract: agent.outputContract || capability.outputArtifacts || ['report'],
    riskLevel: governance.riskLevel,
    defaultModel: agent.defaultModel || '',
    maxConcurrency: Math.max(1, Number(agent.maxConcurrency || governance.maxConcurrency || 1)),
    enabled: agent.enabled !== false,
    sortOrder: Number(agent.sortOrder || 100),
    coordinator: agent.coordinator === true,
    source: agent.source || market.source || 'builtin',
    category: agent.category || 'general',
    icon: agent.icon || 'Connection',
    instructions: agent.instructions || '',
    version: agent.version || market.version || '1.0.0',
    marketVisible: visible,
    originAgentId: agent.originAgentId || '',
    aliases: agent.aliases || [],
    marketProfile: market,
    capabilityProfile: capability,
    routingProfile: routing,
    governanceProfile: governance,
  }
}

const DEFAULT_AGENT_DEFINITIONS = [
  withProfiles({
    id: 'xiaomu',
    name: '小呦',
    roleName: '任务路由器',
    description: '理解任务意图，在 Agent Market 中选择能力组合，编排 DAG，控制权限、风险和成本，并负责最终汇总。',
    boundary: '只负责意图理解、路由规划、编排、验收和最终汇总，不作为普通执行 Agent 处理具体节点。',
    runtimeAgentId: 'ceo',
    roleId: 'coordinator',
    capabilities: ['intent_understanding', 'agent_routing', 'workflow_orchestration', 'governance', 'final_summary'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_title', 'task_description', 'clarification_answers', 'plan_feedback'],
    outputContract: ['routed_workflow_plan', 'clarification_questions', 'final_summary'],
    riskLevel: 'medium',
    maxConcurrency: 1,
    enabled: true,
    sortOrder: 10,
    coordinator: true,
    category: 'coordination',
    icon: 'Connection',
    instructions: '以任务路由器身份工作，基于能力卡而不是岗位名称选择 Agent。',
    marketVisible: false,
    capabilityProfile: capabilityProfile({
      intents: ['route', 'orchestrate', 'summarize'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['intent_understanding', 'dag_planning', 'agent_selection', 'governance'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'repo_files', 'plan_feedback'],
      outputArtifacts: ['workflow_plan', 'final_summary'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['规划', '拆解', '调度', '路由', 'workflow', 'agent'],
      preferredWhen: ['需要选择多个 Agent 或形成 DAG'],
      canRunInParallel: false,
      defaultPriority: 100,
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'task_routing', maxConcurrency: 1 }),
  }),
  withProfiles({
    id: 'xiaoyan',
    name: '研究员',
    roleName: '调研分析',
    description: '调研、竞品、资料分析，适合事实整理、背景研究、对比材料和证据摘要。',
    boundary: '负责背景、市场、竞品、资料和事实依据分析；不得直接给出工程实现或测试验收结论。',
    runtimeAgentId: 'researcher',
    roleId: 'researcher',
    capabilities: ['research', 'competitive_analysis', 'fact_checking', 'market_scan'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_goal', 'research_questions', 'source_materials'],
    outputContract: ['research_report', 'evidence_summary', 'risk_notes'],
    riskLevel: 'low',
    maxConcurrency: 2,
    sortOrder: 20,
    category: 'research',
    icon: 'Search',
    aliases: ['资料研究', '竞品分析'],
    capabilityProfile: capabilityProfile({
      intents: ['research', 'compare', 'fact_check'],
      domains: ['business', 'product', 'software', 'daily_ops'],
      skills: ['research', 'competitive_analysis', 'fact_checking', 'market_scan'],
      inputArtifacts: ['plain_text', 'source_materials', 'requirements_doc'],
      outputArtifacts: ['research_report', 'evidence_summary', 'comparison_matrix'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['调研', '竞品', '资料', '事实', '背景', '对比', 'research', 'compare'],
      preferredWhen: ['需要收集事实、整理依据或形成对比分析'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  withProfiles({
    id: 'xiaochan',
    name: '产品经理',
    roleName: '产品设计',
    description: '需求分析、PRD、流程方案，适合把业务目标转成范围、流程和验收口径。',
    boundary: '负责需求、PRD、流程、用户场景和验收口径；不得替研发做实现，不得替测试执行验证。',
    runtimeAgentId: 'pm',
    roleId: 'pm',
    capabilities: ['requirement_analysis', 'prd', 'user_flow', 'acceptance_scope'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_goal', 'research_report', 'business_context'],
    outputContract: ['product_plan', 'prd', 'acceptance_scope'],
    riskLevel: 'medium',
    maxConcurrency: 1,
    sortOrder: 30,
    category: 'product',
    icon: 'DocumentChecked',
    aliases: ['需求分析', 'PRD'],
    capabilityProfile: capabilityProfile({
      intents: ['requirements', 'product_design', 'workflow_design'],
      domains: ['product', 'business', 'software'],
      skills: ['requirement_analysis', 'prd', 'user_flow', 'acceptance_scope'],
      inputArtifacts: ['plain_text', 'research_report', 'business_context'],
      outputArtifacts: ['product_plan', 'prd', 'acceptance_scope'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['需求', 'PRD', '流程', '产品', '用户故事', '验收', '范围'],
      preferredWhen: ['需要定义范围、用户流程或验收标准'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 1 }),
  }),
  withProfiles({
    id: 'xiaokai',
    name: '研发工程师',
    roleName: '技术开发',
    description: '技术方案、代码阅读、工程实现和修复，适合代码变更与技术风险判断。',
    boundary: '负责技术方案、代码阅读、工程实现和落地建议；不得替产品定义需求，不得替测试出最终验收结论。',
    runtimeAgentId: 'tech-lead',
    roleId: 'tech-lead',
    capabilities: ['code_reading', 'architecture', 'implementation_plan', 'technical_risk', 'code_editing'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'product_plan', 'codebase_context'],
    outputContract: ['technical_plan', 'implementation_notes', 'patch', 'risk_list'],
    riskLevel: 'high',
    maxConcurrency: 1,
    sortOrder: 40,
    category: 'engineering',
    icon: 'Cpu',
    aliases: ['代码实现', '技术方案'],
    capabilityProfile: capabilityProfile({
      intents: ['code_change', 'code_diagnosis', 'implementation', 'architecture'],
      domains: ['software'],
      skills: ['code_reading', 'architecture', 'implementation_plan', 'technical_risk', 'code_editing'],
      inputArtifacts: ['repo_files', 'error_log', 'product_plan', 'technical_findings'],
      outputArtifacts: ['technical_plan', 'implementation_notes', 'patch', 'risk_list'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['代码', '修复', 'bug', '实现', '开发', '报错', '构建', 'code', 'fix'],
      preferredWhen: ['需要读取或修改代码'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: false,
      costTier: 'high',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1, requiresApproval: false }),
  }),
  withProfiles({
    id: 'xiaoce',
    name: '测试员',
    roleName: '质量检查',
    description: '测试方案、验证执行、验收标准和风险清单，适合对可交付产物做质量闭环。',
    boundary: '负责基于产品/研发产物做测试设计、风险验证和验收建议；没有可验证产物时必须说明阻塞。',
    runtimeAgentId: 'team-qa',
    roleId: 'team-qa',
    capabilities: ['test_plan', 'acceptance_criteria', 'quality_risk', 'verification', 'test_execution'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'product_plan', 'technical_plan', 'deliverables'],
    outputContract: ['test_plan', 'acceptance_report', 'quality_risks', 'verification_result'],
    riskLevel: 'medium',
    maxConcurrency: 1,
    sortOrder: 50,
    category: 'quality',
    icon: 'CircleCheck',
    aliases: ['测试验收', '验证执行'],
    capabilityProfile: capabilityProfile({
      intents: ['verify', 'test', 'review'],
      domains: ['software', 'product'],
      skills: ['test_plan', 'acceptance_criteria', 'quality_risk', 'verification', 'test_execution'],
      inputArtifacts: ['patch', 'deliverables', 'technical_plan', 'product_plan'],
      outputArtifacts: ['test_plan', 'acceptance_report', 'quality_risks', 'verification_result'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['测试', '验证', '验收', '质量', '回归', 'test', 'verify'],
      preferredWhen: ['需要验证实现结果或设计验收标准'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_write', maxConcurrency: 1 }),
  }),
]

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function parseJson(value, fallback = []) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

function parseJsonArray(value, fallback = []) {
  const parsed = parseJson(value, fallback)
  return Array.isArray(parsed) ? parsed : fallback
}

function parseJsonObject(value, fallback = {}) {
  const parsed = parseJson(value, fallback)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
}

function jsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function jsonObject(value) {
  return JSON.stringify(value && typeof value === 'object' && !Array.isArray(value) ? value : {})
}

function boolInt(value) {
  return value ? 1 : 0
}

function normalizeAgent(row) {
  if (!row) return null
  const capabilities = parseJsonArray(row.capabilities_json)
  const inputContract = parseJsonArray(row.input_contract_json)
  const outputContract = parseJsonArray(row.output_contract_json)
  const riskLevel = row.risk_level || 'medium'
  const maxConcurrency = Math.max(1, Number(row.max_concurrency || 1))
  const marketVisible = row.market_visible == null ? true : Boolean(row.market_visible)
  const capability = capabilityProfile({
    skills: capabilities,
    inputArtifacts: inputContract,
    outputArtifacts: outputContract,
    ...parseJsonObject(row.capability_profile_json),
  })
  const routing = routingProfile(parseJsonObject(row.routing_profile_json))
  const governance = governanceProfile({
    riskLevel,
    maxConcurrency,
    ...parseJsonObject(row.governance_profile_json),
  })
  const market = marketProfile({
    source: row.source || 'builtin',
    version: row.version || '1.0.0',
    marketVisible,
    ...parseJsonObject(row.market_profile_json),
  })

  return {
    id: row.id,
    name: row.name,
    roleName: row.role_name,
    reportName: row.report_name,
    description: row.description,
    boundary: row.boundary,
    runtimeAgentId: row.runtime_agent_id,
    roleId: row.role_id,
    capabilities,
    allowedTools: parseJsonArray(row.allowed_tools_json),
    inputContract,
    outputContract,
    riskLevel,
    defaultModel: row.default_model || '',
    maxConcurrency,
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order || 0),
    coordinator: Boolean(row.coordinator),
    source: row.source || market.source || 'builtin',
    category: row.category || 'general',
    icon: row.icon || 'Connection',
    instructions: row.instructions || '',
    version: row.version || market.version || '1.0.0',
    marketVisible,
    originAgentId: row.origin_agent_id || '',
    aliases: parseJsonArray(row.aliases_json),
    marketProfile: market,
    capabilityProfile: capability,
    routingProfile: routing,
    governanceProfile: governance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ensureColumn(db, table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name)
  if (!columns.includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}

export function defaultAgentDefinitions() {
  return DEFAULT_AGENT_DEFINITIONS.map((agent) => JSON.parse(JSON.stringify(agent)))
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
  ensureColumn(db, 'agent_definitions', 'source', "TEXT NOT NULL DEFAULT 'builtin'")
  ensureColumn(db, 'agent_definitions', 'category', "TEXT NOT NULL DEFAULT 'general'")
  ensureColumn(db, 'agent_definitions', 'icon', "TEXT NOT NULL DEFAULT 'Connection'")
  ensureColumn(db, 'agent_definitions', 'instructions', "TEXT NOT NULL DEFAULT ''")
  ensureColumn(db, 'agent_definitions', 'version', "TEXT NOT NULL DEFAULT '1.0.0'")
  ensureColumn(db, 'agent_definitions', 'market_visible', 'INTEGER NOT NULL DEFAULT 1')
  ensureColumn(db, 'agent_definitions', 'origin_agent_id', "TEXT NOT NULL DEFAULT ''")
  ensureColumn(db, 'agent_definitions', 'aliases_json', "TEXT NOT NULL DEFAULT '[]'")
  ensureColumn(db, 'agent_definitions', 'market_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  ensureColumn(db, 'agent_definitions', 'capability_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  ensureColumn(db, 'agent_definitions', 'routing_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  ensureColumn(db, 'agent_definitions', 'governance_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_enabled ON agent_definitions(enabled, sort_order)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_market ON agent_definitions(market_visible, enabled, sort_order)')
  seedDefaultAgents()
  console.log('[DB] Agent definitions table initialized')
}

export function seedDefaultAgents() {
  const db = getDatabase()
  const insert = db.prepare(`
    INSERT INTO agent_definitions (
      id, name, role_name, report_name, description, boundary, runtime_agent_id, role_id,
      capabilities_json, allowed_tools_json, input_contract_json, output_contract_json,
      risk_level, default_model, max_concurrency, enabled, sort_order, coordinator,
      source, category, icon, instructions, version, market_visible, origin_agent_id, aliases_json,
      market_profile_json, capability_profile_json, routing_profile_json, governance_profile_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      source = excluded.source,
      category = excluded.category,
      icon = excluded.icon,
      instructions = excluded.instructions,
      version = excluded.version,
      market_visible = CASE
        WHEN agent_definitions.coordinator = 1 THEN excluded.market_visible
        ELSE agent_definitions.market_visible
      END,
      origin_agent_id = excluded.origin_agent_id,
      aliases_json = excluded.aliases_json,
      market_profile_json = excluded.market_profile_json,
      capability_profile_json = excluded.capability_profile_json,
      routing_profile_json = excluded.routing_profile_json,
      governance_profile_json = excluded.governance_profile_json,
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
        jsonArray(agent.capabilities),
        jsonArray(agent.allowedTools),
        jsonArray(agent.inputContract),
        jsonArray(agent.outputContract),
        agent.riskLevel,
        agent.defaultModel,
        agent.maxConcurrency,
        boolInt(agent.enabled),
        agent.sortOrder,
        boolInt(agent.coordinator),
        agent.source,
        agent.category,
        agent.icon,
        agent.instructions,
        agent.version,
        boolInt(agent.marketVisible),
        agent.originAgentId,
        jsonArray(agent.aliases),
        jsonObject({ ...agent.marketProfile, marketVisible: agent.marketVisible }),
        jsonObject(agent.capabilityProfile),
        jsonObject(agent.routingProfile),
        jsonObject({ ...agent.governanceProfile, riskLevel: agent.riskLevel, maxConcurrency: agent.maxConcurrency }),
        timestamp,
        timestamp
      )
    }
  })
  tx()
}

export function listAgentDefinitions({ enabledOnly = false, includeCoordinator = true, includeHidden = true, marketVisibleOnly = false } = {}) {
  const db = getDatabase()
  const clauses = []
  if (enabledOnly) clauses.push('enabled = 1')
  if (!includeCoordinator) clauses.push('coordinator = 0')
  if (!includeHidden || marketVisibleOnly) clauses.push('market_visible = 1')
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return db.prepare(`
    SELECT *
    FROM agent_definitions
    ${where}
    ORDER BY sort_order ASC, id ASC
  `).all().map(normalizeAgent)
}

export function listMarketAgents(options = {}) {
  return listAgentDefinitions({ ...options, includeHidden: false })
}

export function listRoutableAgentDefinitions() {
  return listAgentDefinitions({ enabledOnly: true, includeCoordinator: false, includeHidden: false })
}

export function getAgentDefinition(agentId) {
  const db = getDatabase()
  return normalizeAgent(db.prepare('SELECT * FROM agent_definitions WHERE id = ?').get(agentId))
}

function normalizeIncomingAgent(payload = {}) {
  const id = String(payload.id || '').trim()
  if (!id) throw new Error('Agent id is required')
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Agent id may only contain letters, numbers, underscore, and dash')
  const capability = capabilityProfile(payload.capabilityProfile || {})
  const routing = routingProfile(payload.routingProfile || {})
  const governance = governanceProfile(payload.governanceProfile || {})
  const marketVisible = payload.marketVisible !== false
  return withProfiles({
    id,
    name: String(payload.name || id).trim(),
    roleName: String(payload.roleName || payload.name || id).trim(),
    reportName: String(payload.reportName || `${payload.name || id}-报告`).trim(),
    description: String(payload.description || '本地创建的能力 Agent。').trim(),
    boundary: String(payload.boundary || '按能力卡和任务上下文执行，不越权处理不适合的任务。').trim(),
    runtimeAgentId: String(payload.runtimeAgentId || id).trim(),
    roleId: String(payload.roleId || id).trim(),
    capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : capability.skills,
    allowedTools: Array.isArray(payload.allowedTools) ? payload.allowedTools : ['Read', 'Glob', 'Grep'],
    inputContract: Array.isArray(payload.inputContract) ? payload.inputContract : capability.inputArtifacts,
    outputContract: Array.isArray(payload.outputContract) ? payload.outputContract : capability.outputArtifacts,
    riskLevel: String(payload.riskLevel || governance.riskLevel || 'medium').trim(),
    defaultModel: String(payload.defaultModel || ''),
    maxConcurrency: Math.max(1, Number(payload.maxConcurrency || governance.maxConcurrency || 1)),
    enabled: payload.enabled !== false,
    sortOrder: Number(payload.sortOrder || 700),
    coordinator: payload.coordinator === true,
    source: 'local',
    category: String(payload.category || 'local').trim(),
    icon: String(payload.icon || 'MagicStick').trim(),
    instructions: String(payload.instructions || '').trim(),
    version: String(payload.version || '1.0.0').trim(),
    marketVisible,
    originAgentId: String(payload.originAgentId || '').trim(),
    aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
    marketProfile: marketProfile({ source: 'local', installSource: 'user', ...(payload.marketProfile || {}), marketVisible }),
    capabilityProfile: capability,
    routingProfile: routing,
    governanceProfile: governance,
  })
}

export function createAgentDefinition(payload = {}) {
  const agent = normalizeIncomingAgent(payload)
  const db = getDatabase()
  const timestamp = nowSeconds()
  db.prepare(`
    INSERT INTO agent_definitions (
      id, name, role_name, report_name, description, boundary, runtime_agent_id, role_id,
      capabilities_json, allowed_tools_json, input_contract_json, output_contract_json,
      risk_level, default_model, max_concurrency, enabled, sort_order, coordinator,
      source, category, icon, instructions, version, market_visible, origin_agent_id, aliases_json,
      market_profile_json, capability_profile_json, routing_profile_json, governance_profile_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    agent.id,
    agent.name,
    agent.roleName,
    agent.reportName,
    agent.description,
    agent.boundary,
    agent.runtimeAgentId,
    agent.roleId,
    jsonArray(agent.capabilities),
    jsonArray(agent.allowedTools),
    jsonArray(agent.inputContract),
    jsonArray(agent.outputContract),
    agent.riskLevel,
    agent.defaultModel,
    agent.maxConcurrency,
    boolInt(agent.enabled),
    agent.sortOrder,
    boolInt(agent.coordinator),
    agent.source,
    agent.category,
    agent.icon,
    agent.instructions,
    agent.version,
    boolInt(agent.marketVisible),
    agent.originAgentId,
    jsonArray(agent.aliases),
    jsonObject({ ...agent.marketProfile, marketVisible: agent.marketVisible }),
    jsonObject(agent.capabilityProfile),
    jsonObject(agent.routingProfile),
    jsonObject({ ...agent.governanceProfile, riskLevel: agent.riskLevel, maxConcurrency: agent.maxConcurrency }),
    timestamp,
    timestamp
  )
  return getAgentDefinition(agent.id)
}

export function updateAgentDefinition(agentId, updates = {}) {
  const current = getAgentDefinition(agentId)
  if (!current) return null
  const mergedMarketProfile = { ...current.marketProfile, ...(updates.marketProfile || {}) }
  const mergedCapabilityProfile = { ...current.capabilityProfile, ...(updates.capabilityProfile || {}) }
  const mergedRoutingProfile = { ...current.routingProfile, ...(updates.routingProfile || {}) }
  const mergedGovernanceProfile = { ...current.governanceProfile, ...(updates.governanceProfile || {}) }
  const allowed = {
    name: (value) => String(value || current.name).trim() || current.name,
    roleName: (value) => String(value || current.roleName).trim() || current.roleName,
    reportName: (value) => String(value || '').trim(),
    description: (value) => String(value || current.description).trim() || current.description,
    boundary: (value) => String(value || current.boundary).trim() || current.boundary,
    runtimeAgentId: (value) => String(value || current.runtimeAgentId).trim() || current.runtimeAgentId,
    roleId: (value) => String(value || current.roleId).trim() || current.roleId,
    capabilities: (value) => jsonArray(value),
    allowedTools: (value) => jsonArray(value),
    inputContract: (value) => jsonArray(value),
    outputContract: (value) => jsonArray(value),
    riskLevel: (value) => String(value || 'medium').trim() || 'medium',
    sortOrder: (value) => Number(value) || 100,
    defaultModel: (value) => String(value || ''),
    enabled: (value) => boolInt(value),
    maxConcurrency: (value) => Math.max(1, Number(value) || 1),
    coordinator: (value) => boolInt(value),
    category: (value) => String(value || '').trim(),
    icon: (value) => String(value || '').trim(),
    instructions: (value) => String(value || ''),
    version: (value) => String(value || '1.0.0').trim() || '1.0.0',
    marketVisible: (value) => boolInt(value),
    originAgentId: (value) => String(value || '').trim(),
    aliases: (value) => jsonArray(value),
    marketProfile: () => jsonObject({ ...mergedMarketProfile, marketVisible: updates.marketVisible ?? current.marketVisible }),
    capabilityProfile: () => jsonObject(mergedCapabilityProfile),
    routingProfile: () => jsonObject(mergedRoutingProfile),
    governanceProfile: () => jsonObject({
      ...mergedGovernanceProfile,
      riskLevel: updates.riskLevel || current.riskLevel,
      maxConcurrency: updates.maxConcurrency || current.maxConcurrency,
    }),
  }
  const columnMap = {
    name: 'name',
    roleName: 'role_name',
    reportName: 'report_name',
    description: 'description',
    boundary: 'boundary',
    runtimeAgentId: 'runtime_agent_id',
    roleId: 'role_id',
    capabilities: 'capabilities_json',
    allowedTools: 'allowed_tools_json',
    inputContract: 'input_contract_json',
    outputContract: 'output_contract_json',
    riskLevel: 'risk_level',
    sortOrder: 'sort_order',
    defaultModel: 'default_model',
    enabled: 'enabled',
    maxConcurrency: 'max_concurrency',
    coordinator: 'coordinator',
    category: 'category',
    icon: 'icon',
    instructions: 'instructions',
    version: 'version',
    marketVisible: 'market_visible',
    originAgentId: 'origin_agent_id',
    aliases: 'aliases_json',
    marketProfile: 'market_profile_json',
    capabilityProfile: 'capability_profile_json',
    routingProfile: 'routing_profile_json',
    governanceProfile: 'governance_profile_json',
  }
  const normalizedUpdates = {
    ...updates,
    marketProfile: updates.marketProfile || undefined,
    capabilityProfile: updates.capabilityProfile || undefined,
    routingProfile: updates.routingProfile || undefined,
    governanceProfile: updates.governanceProfile || undefined,
  }
  const entries = Object.entries(normalizedUpdates).filter(([key, value]) => allowed[key] && value !== undefined)
  if (!entries.length) return current
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

export function deleteAgentDefinition(agentId) {
  const current = getAgentDefinition(agentId)
  if (!current) return null
  if (current.source === 'builtin' || current.marketProfile?.source === 'builtin') {
    return updateAgentDefinition(agentId, { enabled: false, marketVisible: false })
  }
  const db = getDatabase()
  db.prepare('DELETE FROM agent_definitions WHERE id = ?').run(agentId)
  return current
}
