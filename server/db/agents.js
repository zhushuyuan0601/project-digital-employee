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

function contractProfile({
  mission = '',
  rules = [],
  workflow = [],
  deliverables = [],
  outputSchema = {},
  handoffContext = [],
  failurePolicy = '',
  acceptanceCriteria = [],
} = {}) {
  return { mission, rules, workflow, deliverables, outputSchema, handoffContext, failurePolicy, acceptanceCriteria }
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
  const contract = contractProfile({
    mission: agent.contractProfile?.mission || agent.description || '',
    rules: agent.contractProfile?.rules || (agent.boundary ? [agent.boundary] : []),
    workflow: agent.contractProfile?.workflow || [],
    deliverables: agent.contractProfile?.deliverables || agent.outputContract || capability.outputArtifacts || ['report'],
    outputSchema: agent.contractProfile?.outputSchema || {},
    handoffContext: agent.contractProfile?.handoffContext || [],
    failurePolicy: agent.contractProfile?.failurePolicy || '失败时输出原因、已完成动作、可恢复建议和下游阻塞点。',
    acceptanceCriteria: agent.contractProfile?.acceptanceCriteria || [],
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
    contractProfile: contract,
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
  withProfiles({
    id: 'minimal_change_engineer',
    name: '最小变更工程师',
    roleName: '最小变更实现',
    description: '从现有代码结构出发，只做完成目标所需的最小代码修改，适合修复明确问题、吸收报告中的局部优化点和降低回归风险。',
    boundary: '只处理明确授权的代码变更范围；不得主动大规模重构、替换技术栈或改动无关文件。',
    runtimeAgentId: 'tech-lead',
    roleId: 'minimal-change-engineer',
    capabilities: ['minimal_change', 'code_reading', 'code_editing', 'regression_control', 'verification_notes'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'selected_report_items', 'repo_files', 'error_log'],
    outputContract: ['patch', 'implementation_report', 'changed_files', 'verification_result'],
    riskLevel: 'high',
    maxConcurrency: 1,
    sortOrder: 60,
    category: 'engineering',
    icon: 'EditPen',
    aliases: ['局部修复', '最小修改', '保守实现'],
    originAgentId: 'agency-agents-zh/engineering-minimal-change-engineer',
    instructions: '优先复用现有模式，先定位最小影响面，再改代码并说明未改动的边界。',
    capabilityProfile: capabilityProfile({
      intents: ['code_change', 'minimal_change', 'selective_followup_from_report'],
      domains: ['software'],
      skills: ['minimal_change', 'code_reading', 'code_editing', 'impact_analysis', 'verification_notes'],
      inputArtifacts: ['repo_files', 'selected_report_items', 'error_log', 'task_description'],
      outputArtifacts: ['patch', 'implementation_report', 'changed_files', 'verification_result'],
      antiCapabilities: ['large_rewrite', 'greenfield_architecture'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['最小变更', '小范围', '局部修改', '只修', '只做', '不要大改', '保守修改', '选取部分', '部分优化'],
      preferredWhen: ['用户强调只选取部分报告项落地，或要求低风险修复'],
      avoidWhen: ['需要从零设计系统架构或大规模重构'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: false,
      defaultPriority: 88,
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1 }),
    contractProfile: contractProfile({
      mission: '以最小可行代码变更完成明确目标，控制影响面，并把修改上下文交给验证 Agent。',
      rules: ['先确认变更边界和目标文件，再修改代码。', '不得顺手重构无关代码。', '无法确定报告选中项时先输出需要用户选择的清单。'],
      workflow: ['定位相关文件和现有模式', '列出最小修改点', '实施代码变更', '运行可用验证或说明阻塞', '输出变更文件与回归风险'],
      deliverables: ['代码补丁', '变更文件列表', '实现说明', '验证结果或阻塞说明'],
      outputSchema: {
        changedFiles: ['path'],
        implementationNotes: ['reason', 'scope', 'risk'],
        verification: { command: 'string', result: 'passed|failed|blocked' },
      },
      handoffContext: ['任务原文', '选中的报告条目', '变更文件', '验证命令和结果'],
      failurePolicy: '如果无法安全修改，必须输出阻塞原因、需要的上下文和建议的下一步，而不是扩大改动范围。',
      acceptanceCriteria: ['只修改任务相关文件', '输出包含 changedFiles', '说明验证状态和残余风险'],
    }),
  }),
  withProfiles({
    id: 'code_reviewer',
    name: '代码审查员',
    roleName: '代码审查',
    description: '审查代码变更、设计实现和潜在回归风险，优先给出阻塞级问题、证据和可执行修复建议。',
    boundary: '默认只读审查，不直接修改代码；除非任务明确要求修复，否则只输出审查报告。',
    runtimeAgentId: 'team-qa',
    roleId: 'code-reviewer',
    capabilities: ['code_review', 'risk_analysis', 'regression_review', 'maintainability_review'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
    inputContract: ['patch', 'repo_files', 'implementation_report', 'task_goal'],
    outputContract: ['review_report', 'risk_list', 'fix_recommendations'],
    riskLevel: 'medium',
    maxConcurrency: 2,
    sortOrder: 70,
    category: 'quality',
    icon: 'View',
    aliases: ['Code Review', '代码评审', '风险审查'],
    originAgentId: 'agency-agents-zh/engineering-code-reviewer',
    instructions: '以代码审查口径输出，发现必须修的问题时给出文件、原因、影响和建议修复方向。',
    capabilityProfile: capabilityProfile({
      intents: ['code_review', 'review', 'code_diagnosis'],
      domains: ['software'],
      skills: ['code_review', 'risk_analysis', 'regression_review', 'maintainability_review'],
      inputArtifacts: ['patch', 'repo_files', 'implementation_report', 'task_description'],
      outputArtifacts: ['review_report', 'risk_list', 'fix_recommendations'],
      antiCapabilities: ['code_editing_without_request'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['code review', '代码审查', '代码评审', 'review', '审查', '评审', '风险点', '阻塞问题'],
      preferredWhen: ['需要在修改前或修改后评估代码风险'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      defaultPriority: 82,
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 2 }),
    contractProfile: contractProfile({
      mission: '以审查者视角找出真实风险，按严重程度输出可被后续实现 Agent 消费的修复清单。',
      rules: ['发现必须带证据，避免泛泛建议。', '优先报告会导致错误、数据损坏、权限问题或回归的问题。', '不在无明确授权时改代码。'],
      workflow: ['理解任务目标和变更范围', '阅读关键文件和调用链', '按严重程度整理发现', '给出修复建议和验证建议'],
      deliverables: ['审查报告', '阻塞问题清单', '可选优化建议', '验证建议'],
      outputSchema: {
        findings: [{ severity: 'P0|P1|P2|P3', file: 'path', line: 'number', problem: 'string', recommendation: 'string' }],
        summary: 'string',
      },
      handoffContext: ['发现列表', '涉及文件', '建议验证命令'],
      failurePolicy: '如果证据不足，明确标注为假设或待确认，不升级为确定问题。',
      acceptanceCriteria: ['问题按严重程度排序', '每个高优先级问题包含文件依据', '输出可直接转成修复任务'],
    }),
  }),
  withProfiles({
    id: 'frontend_engineer',
    name: '前端实现工程师',
    roleName: '前端实现',
    description: '处理 Vue/TypeScript 页面、组件、交互状态和前端接口对接，适合 UI 改造、报错修复和体验优化。',
    boundary: '专注前端代码和用户交互，不擅自修改后端协议；需要接口变更时输出对后端 Agent 的交接项。',
    runtimeAgentId: 'tech-lead',
    roleId: 'frontend-engineer',
    capabilities: ['frontend_development', 'vue', 'typescript', 'ui_state', 'interaction_design', 'code_editing'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['ui_issue', 'product_plan', 'repo_files', 'api_contract'],
    outputContract: ['patch', 'implementation_report', 'ui_verification_notes'],
    riskLevel: 'high',
    maxConcurrency: 1,
    sortOrder: 80,
    category: 'engineering',
    icon: 'Monitor',
    aliases: ['前端开发', 'Vue 工程师', '交互实现'],
    originAgentId: 'agency-agents-zh/engineering-frontend-developer',
    instructions: '优先遵循现有组件、样式和状态管理模式，修复时同时考虑空状态、加载态、异常态。',
    capabilityProfile: capabilityProfile({
      intents: ['code_change', 'frontend', 'implementation'],
      domains: ['software', 'product'],
      skills: ['frontend_development', 'vue', 'typescript', 'ui_state', 'interaction_design', 'code_editing'],
      inputArtifacts: ['repo_files', 'ui_issue', 'product_plan', 'api_contract'],
      outputArtifacts: ['patch', 'implementation_report', 'ui_verification_notes'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['前端', '页面', '组件', 'Vue', '交互', '样式', '弹窗', '按钮', '控制台', '面板', 'UI'],
      preferredWhen: ['任务主要影响前端页面、组件或交互状态'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: false,
      defaultPriority: 78,
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1 }),
    contractProfile: contractProfile({
      mission: '落地前端页面和交互变更，保证状态完整、视觉一致，并给出可复验说明。',
      rules: ['沿用项目现有 UI 组件和样式变量。', '处理加载、空数据、异常和权限不足状态。', '涉及接口变更时明确交接给后端。'],
      workflow: ['定位页面和数据流', '确认状态和交互边界', '实施前端修改', '构建或运行可用检查', '输出验证说明'],
      deliverables: ['前端代码补丁', '交互说明', '验证结果'],
      handoffContext: ['修改组件', '依赖接口', '用户可见变化', '验证步骤'],
      failurePolicy: '如果缺少接口或数据样例，先用现有契约实现防御性 UI，并标注后端依赖。',
      acceptanceCriteria: ['页面无明显运行时错误', '关键状态有兜底', '输出包含用户可见变化'],
    }),
  }),
  withProfiles({
    id: 'backend_architect',
    name: '后端架构师',
    roleName: '后端架构与接口',
    description: '处理 Node 服务、数据模型、接口契约、任务运行时和执行队列，适合后端能力改造和跨模块风险判断。',
    boundary: '聚焦服务端接口、数据持久化和运行时流程；不直接设计前端视觉。',
    runtimeAgentId: 'tech-lead',
    roleId: 'backend-architect',
    capabilities: ['backend_architecture', 'api_design', 'data_modeling', 'runtime_flow', 'code_editing'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    inputContract: ['task_goal', 'api_contract', 'repo_files', 'runtime_logs'],
    outputContract: ['technical_plan', 'patch', 'migration_notes', 'verification_result'],
    riskLevel: 'high',
    maxConcurrency: 1,
    sortOrder: 90,
    category: 'engineering',
    icon: 'Cpu',
    aliases: ['后端开发', '接口架构', '运行时改造'],
    originAgentId: 'agency-agents-zh/engineering-backend-architect',
    instructions: '改后端时同步考虑接口兼容、数据迁移、任务恢复和日志可观测性。',
    capabilityProfile: capabilityProfile({
      intents: ['code_change', 'backend', 'architecture', 'implementation'],
      domains: ['software'],
      skills: ['backend_architecture', 'api_design', 'data_modeling', 'runtime_flow', 'code_editing'],
      inputArtifacts: ['repo_files', 'api_contract', 'runtime_logs', 'technical_findings'],
      outputArtifacts: ['technical_plan', 'patch', 'migration_notes', 'verification_result'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['后端', '接口', 'API', '数据库', '队列', '运行时', '调度', '服务端', 'schema', 'runtime'],
      preferredWhen: ['任务涉及服务端接口、数据库、执行队列或运行时状态'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: false,
      defaultPriority: 76,
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1 }),
    contractProfile: contractProfile({
      mission: '设计并实现后端侧能力改造，保证接口契约、数据兼容和运行时恢复路径清晰。',
      rules: ['先确认数据模型和 API 兼容性。', '涉及持久化时说明迁移和回滚影响。', '运行时改造必须考虑异常恢复和日志。'],
      workflow: ['梳理接口和数据流', '评估兼容性与风险', '实施后端修改', '运行语法或集成检查', '输出迁移和验证说明'],
      deliverables: ['技术方案', '代码补丁', '迁移说明', '验证结果'],
      handoffContext: ['接口变化', '数据表变化', '运行时影响', '前端对接点'],
      failurePolicy: '如果无法确认兼容性，暂停破坏性变更并输出需要用户确认的决策点。',
      acceptanceCriteria: ['接口契约明确', '数据变更有说明', '运行时异常路径有兜底'],
    }),
  }),
  withProfiles({
    id: 'security_reviewer',
    name: '安全审查员',
    roleName: '安全与权限审查',
    description: '审查权限边界、敏感数据、命令执行、文件读写和前后端安全风险，适合高风险改动前后的安全把关。',
    boundary: '默认只读审查，不替代正式安全测试；发现风险后输出可执行修复建议。',
    runtimeAgentId: 'team-qa',
    roleId: 'security-reviewer',
    capabilities: ['security_review', 'permission_audit', 'data_safety', 'command_safety', 'risk_analysis'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
    inputContract: ['repo_files', 'patch', 'runtime_logs', 'api_contract'],
    outputContract: ['security_report', 'risk_list', 'mitigation_plan'],
    riskLevel: 'medium',
    maxConcurrency: 1,
    sortOrder: 100,
    category: 'security',
    icon: 'Lock',
    aliases: ['安全审查', '权限审查', '漏洞检查'],
    originAgentId: 'agency-agents-zh/engineering-security-engineer',
    instructions: '重点审查权限、路径访问、命令执行、输入输出校验、敏感信息泄露和跨任务数据访问。',
    capabilityProfile: capabilityProfile({
      intents: ['security_review', 'review'],
      domains: ['software'],
      skills: ['security_review', 'permission_audit', 'data_safety', 'command_safety', 'risk_analysis'],
      inputArtifacts: ['repo_files', 'patch', 'runtime_logs', 'api_contract'],
      outputArtifacts: ['security_report', 'risk_list', 'mitigation_plan'],
      antiCapabilities: ['code_editing_without_request'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['安全', '权限', '漏洞', '敏感信息', '命令执行', '文件读取', '越权', '注入', 'XSS', 'secret'],
      preferredWhen: ['任务涉及权限、文件读写、命令执行、密钥或多用户数据边界'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: true,
      defaultPriority: 74,
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 1 }),
    contractProfile: contractProfile({
      mission: '识别代码和执行流程中的安全、权限与数据边界风险，并输出可落地缓解方案。',
      rules: ['风险必须绑定具体入口、数据流或文件。', '区分确认风险和假设风险。', '不在未授权时直接修改代码。'],
      workflow: ['识别安全敏感入口', '追踪权限和数据流', '评估影响与可利用条件', '输出修复建议和验证建议'],
      deliverables: ['安全审查报告', '风险清单', '缓解方案'],
      handoffContext: ['风险入口', '受影响文件', '建议修复点', '验证方式'],
      failurePolicy: '如果无法判断风险是否真实，标注所需运行环境或数据样例。',
      acceptanceCriteria: ['高风险项包含影响面', '建议可转成修复任务', '明确残余风险'],
    }),
  }),
  withProfiles({
    id: 'test_result_analyst',
    name: '测试结果分析师',
    roleName: '测试结果分析',
    description: '读取测试输出、构建日志和运行失败信息，归因失败类型，区分代码问题、环境问题和测试本身问题。',
    boundary: '负责分析和复现建议；不默认修改业务代码，除非任务明确要求修复。',
    runtimeAgentId: 'team-qa',
    roleId: 'test-result-analyst',
    capabilities: ['test_result_analysis', 'failure_triage', 'log_analysis', 'verification'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
    inputContract: ['test_log', 'build_log', 'error_log', 'repo_files'],
    outputContract: ['failure_analysis', 'root_cause_hypothesis', 'next_actions'],
    riskLevel: 'low',
    maxConcurrency: 2,
    sortOrder: 110,
    category: 'quality',
    icon: 'DataAnalysis',
    aliases: ['测试分析', '失败归因', '日志分析'],
    originAgentId: 'agency-agents-zh/testing-test-results-analyzer',
    instructions: '优先把失败归类为代码缺陷、测试断言、环境依赖、数据缺失或命令配置问题。',
    capabilityProfile: capabilityProfile({
      intents: ['verify', 'test_analysis', 'code_diagnosis'],
      domains: ['software'],
      skills: ['test_result_analysis', 'failure_triage', 'log_analysis', 'verification'],
      inputArtifacts: ['test_log', 'build_log', 'error_log', 'repo_files'],
      outputArtifacts: ['failure_analysis', 'root_cause_hypothesis', 'next_actions'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['测试失败', '构建失败', '日志', '报错日志', '失败原因', 'CI', '单测', 'npm run build', 'test failed'],
      preferredWhen: ['已有测试、构建或运行日志，需要判断失败原因'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      defaultPriority: 72,
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 2 }),
    contractProfile: contractProfile({
      mission: '把测试和构建失败转换成可执行的归因报告与下一步动作。',
      rules: ['先引用关键日志片段或错误位置。', '区分确定根因和候选假设。', '给出最小复现或验证命令。'],
      workflow: ['收集失败日志', '定位首个有效错误', '判断失败类别', '输出根因假设和下一步'],
      deliverables: ['失败分析', '根因假设', '建议命令', '修复/排查分工'],
      handoffContext: ['失败命令', '关键错误', '候选责任模块', '建议下一步'],
      failurePolicy: '如果日志不足，输出缺失日志类型和建议补跑命令。',
      acceptanceCriteria: ['明确失败类别', '包含关键错误证据', '下一步可直接执行'],
    }),
  }),
  withProfiles({
    id: 'documentation_drafter',
    name: '文档工程师',
    roleName: '技术文档',
    description: '把产品方案、代码变更、接口契约和执行结果整理成 README、变更说明、使用说明或交接文档。',
    boundary: '负责文档化和知识沉淀；不直接决定产品范围或修改核心实现。',
    runtimeAgentId: 'researcher',
    roleId: 'documentation-drafter',
    capabilities: ['technical_writing', 'release_notes', 'handoff_documentation', 'api_documentation'],
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit'],
    inputContract: ['implementation_report', 'product_plan', 'api_contract', 'repo_files'],
    outputContract: ['document', 'release_notes', 'handoff_doc'],
    riskLevel: 'medium',
    maxConcurrency: 1,
    sortOrder: 120,
    category: 'documentation',
    icon: 'Document',
    aliases: ['技术写作', 'README', '变更说明'],
    originAgentId: 'agency-agents-zh/engineering-technical-writer',
    instructions: '文档要面向下游使用者，保留路径、命令、限制和版本上下文，避免空泛总结。',
    capabilityProfile: capabilityProfile({
      intents: ['documentation', 'draft', 'summarize'],
      domains: ['software', 'product', 'business'],
      skills: ['technical_writing', 'release_notes', 'handoff_documentation', 'api_documentation'],
      inputArtifacts: ['implementation_report', 'product_plan', 'api_contract', 'repo_files'],
      outputArtifacts: ['document', 'release_notes', 'handoff_doc'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['文档', 'README', '说明', '使用说明', '变更说明', '发布说明', '交接文档', '接口文档'],
      preferredWhen: ['需要把实现、方案或报告整理成可交付文档'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      canRunInParallel: true,
      defaultPriority: 68,
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_write', maxConcurrency: 1 }),
    contractProfile: contractProfile({
      mission: '产出可维护、可交接、可复用的技术文档或变更说明。',
      rules: ['文档必须包含适用范围和限制。', '涉及命令或路径时保持可复制。', '不虚构未验证能力。'],
      workflow: ['收集输入材料', '确定读者和文档类型', '整理结构', '补齐路径/命令/限制', '输出文档或补丁'],
      deliverables: ['技术文档', '发布说明', '交接文档'],
      handoffContext: ['文档目标读者', '引用材料', '未确认事项'],
      failurePolicy: '如果输入材料不足，输出需要补充的上下文清单。',
      acceptanceCriteria: ['文档结构清晰', '包含操作或验收信息', '明确未覆盖范围'],
    }),
  }),
  withProfiles({
    id: 'requirements_analyst',
    name: '需求澄清 Agent',
    roleName: '需求澄清',
    description: '把模糊需求拆成目标、范围、约束、验收标准和待确认问题，适合在执行前降低返工。',
    boundary: '只负责澄清和结构化需求，不替研发实现，不替测试验收。',
    runtimeAgentId: 'pm',
    roleId: 'requirements-analyst',
    capabilities: ['requirement_analysis', 'scope_definition', 'acceptance_criteria', 'clarification'],
    allowedTools: ['Read', 'Glob', 'Grep'],
    inputContract: ['task_goal', 'business_context', 'source_report'],
    outputContract: ['clarified_requirements', 'acceptance_scope', 'open_questions'],
    riskLevel: 'low',
    maxConcurrency: 2,
    sortOrder: 130,
    category: 'product',
    icon: 'QuestionFilled',
    aliases: ['需求分析', '范围澄清', '验收口径'],
    originAgentId: 'agency-agents-zh/product-manager',
    instructions: '把模糊描述转成执行前可确认的范围和验收口径，尤其适合从报告中选点继续执行。',
    capabilityProfile: capabilityProfile({
      intents: ['requirements', 'clarification', 'selective_followup_from_report'],
      domains: ['product', 'business', 'software'],
      skills: ['requirement_analysis', 'scope_definition', 'acceptance_criteria', 'clarification'],
      inputArtifacts: ['plain_text', 'source_report', 'business_context'],
      outputArtifacts: ['clarified_requirements', 'acceptance_scope', 'open_questions'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['澄清', '不明确', '范围', '验收口径', '选取部分', '从报告中选择', '哪些点', '怎么拆'],
      preferredWhen: ['需求不完整，或用户希望从报告里挑选部分内容继续执行'],
      requiresTools: ['Read'],
      canRunInParallel: true,
      defaultPriority: 86,
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 2 }),
    contractProfile: contractProfile({
      mission: '把模糊任务转换成可执行、可路由、可验收的结构化需求。',
      rules: ['先区分已确认信息和待确认信息。', '从报告继续执行时必须保留来源报告路径或摘录。', '不把未确认假设当作执行指令。'],
      workflow: ['抽取目标和约束', '识别范围和非范围', '生成验收标准', '列出待确认问题', '给出建议执行节点'],
      deliverables: ['澄清后需求', '验收范围', '待确认问题', '建议下游 Agent'],
      handoffContext: ['确认范围', '排除范围', '来源报告', '待确认问题'],
      failurePolicy: '如果关键输入缺失，输出最少必要澄清问题，避免直接进入实现。',
      acceptanceCriteria: ['范围边界明确', '验收标准可测试', '下游 Agent 能直接消费'],
    }),
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
  const contract = contractProfile({
    mission: row.description || '',
    rules: row.boundary ? [row.boundary] : [],
    deliverables: outputContract,
    ...parseJsonObject(row.contract_profile_json),
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
    contractProfile: contract,
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
  ensureColumn(db, 'agent_definitions', 'contract_profile_json', "TEXT NOT NULL DEFAULT '{}'")
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
      market_profile_json, capability_profile_json, routing_profile_json, governance_profile_json, contract_profile_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      contract_profile_json = excluded.contract_profile_json,
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
        jsonObject(agent.contractProfile),
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
    contractProfile: contractProfile(payload.contractProfile || {}),
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
      market_profile_json, capability_profile_json, routing_profile_json, governance_profile_json, contract_profile_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    jsonObject(agent.contractProfile),
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
  const mergedContractProfile = { ...current.contractProfile, ...(updates.contractProfile || {}) }
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
    contractProfile: () => jsonObject(mergedContractProfile),
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
    contractProfile: 'contract_profile_json',
  }
  const normalizedUpdates = {
    ...updates,
    marketProfile: updates.marketProfile || undefined,
    capabilityProfile: updates.capabilityProfile || undefined,
    routingProfile: updates.routingProfile || undefined,
    governanceProfile: updates.governanceProfile || undefined,
    contractProfile: updates.contractProfile || undefined,
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
