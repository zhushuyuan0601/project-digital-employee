import { getDatabase } from './index.js'

const LEGACY_EXECUTOR_IDS = new Set(['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce'])

function marketProfile({ source = 'builtin', installSource = 'system', version = '1.0.0', author = 'system', ratingAvg = 0, ratingCount = 0, pricing = { model: 'metadata', unit: 'task', estimate: 'low' }, marketVisible = true } = {}) {
  return { source, installSource, version, author, ratingAvg, ratingCount, pricing, marketVisible }
}

function capabilityProfile({ intents = [], domains = [], skills = [], inputArtifacts = [], outputArtifacts = [], antiCapabilities = [] } = {}) {
  return { intents, domains, skills, inputArtifacts, outputArtifacts, antiCapabilities }
}

function routingProfile({ routeKeywords = [], preferredWhen = [], avoidWhen = [], requiresTools = [], requiresAgents = [], canRunInParallel = true, defaultPriority = 50, latencyTier = 'medium', costTier = 'medium' } = {}) {
  return { routeKeywords, preferredWhen, avoidWhen, requiresTools, requiresAgents, canRunInParallel, defaultPriority, latencyTier, costTier }
}

function governanceProfile({ riskLevel = 'medium', permissionScope = 'workspace_read', maxConcurrency = 1, requiresApproval = false, costLimit = '', dataAccessLevel = 'task_context' } = {}) {
  return { riskLevel, permissionScope, maxConcurrency, requiresApproval, costLimit, dataAccessLevel }
}

function makeAgent(agent) {
  const category = agent.category || 'general'
  const marketVisible = agent.marketProfile?.marketVisible ?? true
  const riskLevel = agent.riskLevel || agent.governanceProfile?.riskLevel || 'medium'
  const maxConcurrency = Math.max(1, Number(agent.maxConcurrency || agent.governanceProfile?.maxConcurrency || 1))
  return {
    ...agent,
    reportName: `${agent.name}-报告`,
    boundary: '严格基于任务上下文、能力卡和输入输出契约执行，不越权处理不适合的任务。',
    runtimeAgentId: agent.id,
    roleId: agent.id,
    capabilities: agent.capabilities || agent.capabilityProfile?.skills || [],
    allowedTools: agent.allowedTools || ['Read', 'Glob', 'Grep'],
    inputContract: agent.inputContract || agent.capabilityProfile?.inputArtifacts || ['plain_text'],
    outputContract: agent.outputContract || agent.capabilityProfile?.outputArtifacts || ['report'],
    riskLevel,
    defaultModel: '',
    maxConcurrency,
    enabled: agent.enabled ?? marketVisible,
    sortOrder: 100,
    coordinator: agent.coordinator === true,
    source: agent.marketProfile?.source || 'builtin',
    category,
    icon: agent.icon || 'Connection',
    instructions: agent.instructions || '',
    version: agent.marketProfile?.version || '1.0.0',
    marketVisible,
    originAgentId: agent.originAgentId || '',
    aliases: agent.aliases || [],
    marketProfile: marketProfile({ ...(agent.marketProfile || {}), marketVisible }),
    capabilityProfile: capabilityProfile(agent.capabilityProfile),
    routingProfile: routingProfile(agent.routingProfile),
    governanceProfile: governanceProfile({ ...(agent.governanceProfile || {}), riskLevel, maxConcurrency }),
  }
}

const DEFAULT_AGENT_DEFINITIONS = [
  makeAgent({
    id: 'xiaomu',
    name: '小呦',
    roleName: '任务路由器',
    reportName: '小呦-路由规划',
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
      latencyTier: 'medium',
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({
      riskLevel: 'medium',
      permissionScope: 'task_routing',
      maxConcurrency: 1,
      requiresApproval: false,
    }),
  }),
  makeAgent({
    id: 'xiaoyan',
    name: '研究员',
    roleName: '历史兼容：调研分析',
    description: '历史任务兼容记录。新任务不再默认使用该固定岗位 Agent。',
    boundary: '仅用于历史显示和旧数据兼容。',
    runtimeAgentId: 'researcher',
    roleId: 'legacy-researcher',
    enabled: false,
    sortOrder: 910,
    category: 'legacy',
    marketVisible: false,
    originAgentId: 'xiaoyan',
    aliases: ['调研分析', '研究员'],
    marketProfile: marketProfile({ marketVisible: false }),
    capabilityProfile: capabilityProfile({ intents: ['research'], domains: ['legacy'], skills: ['legacy_display'] }),
    routingProfile: routingProfile({ routeKeywords: ['legacy'], avoidWhen: ['新任务路由'], canRunInParallel: false }),
  }),
  makeAgent({
    id: 'xiaochan',
    name: '产品经理',
    roleName: '历史兼容：产品设计',
    description: '历史任务兼容记录。新任务不再默认使用该固定岗位 Agent。',
    boundary: '仅用于历史显示和旧数据兼容。',
    runtimeAgentId: 'pm',
    roleId: 'legacy-pm',
    enabled: false,
    sortOrder: 920,
    category: 'legacy',
    marketVisible: false,
    originAgentId: 'xiaochan',
    aliases: ['产品经理', '需求分析'],
    marketProfile: marketProfile({ marketVisible: false }),
    capabilityProfile: capabilityProfile({ intents: ['requirements'], domains: ['legacy'], skills: ['legacy_display'] }),
    routingProfile: routingProfile({ routeKeywords: ['legacy'], avoidWhen: ['新任务路由'], canRunInParallel: false }),
  }),
  makeAgent({
    id: 'xiaokai',
    name: '研发工程师',
    roleName: '历史兼容：技术开发',
    description: '历史任务兼容记录。新任务不再默认使用该固定岗位 Agent。',
    boundary: '仅用于历史显示和旧数据兼容。',
    runtimeAgentId: 'tech-lead',
    roleId: 'legacy-engineer',
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    enabled: false,
    sortOrder: 930,
    category: 'legacy',
    marketVisible: false,
    originAgentId: 'xiaokai',
    aliases: ['研发工程师', '技术开发'],
    marketProfile: marketProfile({ marketVisible: false }),
    capabilityProfile: capabilityProfile({ intents: ['code_change'], domains: ['legacy'], skills: ['legacy_display'] }),
    routingProfile: routingProfile({ routeKeywords: ['legacy'], avoidWhen: ['新任务路由'], canRunInParallel: false }),
  }),
  makeAgent({
    id: 'xiaoce',
    name: '测试员',
    roleName: '历史兼容：质量检查',
    description: '历史任务兼容记录。新任务不再默认使用该固定岗位 Agent。',
    boundary: '仅用于历史显示和旧数据兼容。',
    runtimeAgentId: 'team-qa',
    roleId: 'legacy-qa',
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    enabled: false,
    sortOrder: 940,
    category: 'legacy',
    marketVisible: false,
    originAgentId: 'xiaoce',
    aliases: ['测试员', '质量检查'],
    marketProfile: marketProfile({ marketVisible: false }),
    capabilityProfile: capabilityProfile({ intents: ['verify'], domains: ['legacy'], skills: ['legacy_display'] }),
    routingProfile: routingProfile({ routeKeywords: ['legacy'], avoidWhen: ['新任务路由'], canRunInParallel: false }),
  }),
  makeAgent({
    id: 'general_researcher',
    name: '资料研究 Agent',
    roleName: '资料收集与整理',
    description: '收集、阅读、整理背景资料，形成带依据的研究报告。',
    originAgentId: 'xiaoyan',
    category: 'information',
    icon: 'Search',
    sortOrder: 110,
    capabilityProfile: capabilityProfile({
      intents: ['research', 'synthesize'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['source_review', 'evidence_summary', 'context_mapping'],
      inputArtifacts: ['plain_text', 'source_materials', 'repo_files'],
      outputArtifacts: ['research_report', 'evidence_summary'],
      antiCapabilities: ['code_change', 'final_verification'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['资料', '调研', '背景', '研究', '搜索', '了解'],
      preferredWhen: ['任务需要收集或整理背景资料'],
      avoidWhen: ['任务只需要直接写代码或执行验证'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 3 }),
  }),
  makeAgent({
    id: 'competitive_analyst',
    name: '对比分析 Agent',
    roleName: '竞品与选项对比',
    description: '比较多个产品、方案或选项，输出差异、取舍和建议。',
    originAgentId: 'xiaoyan',
    category: 'information',
    icon: 'DataAnalysis',
    sortOrder: 120,
    capabilityProfile: capabilityProfile({
      intents: ['compare', 'research', 'decision_support'],
      domains: ['product', 'business', 'software', 'daily_ops'],
      skills: ['competitive_analysis', 'option_matrix', 'tradeoff_analysis'],
      inputArtifacts: ['plain_text', 'source_materials', 'requirements_doc'],
      outputArtifacts: ['comparison_matrix', 'decision_report'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['竞品', '比较', '对比', '选型', '方案比较', 'compare'],
      preferredWhen: ['任务要求比较多个对象或形成决策依据'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'fact_checker',
    name: '事实核查 Agent',
    roleName: '事实核查',
    description: '核查陈述、假设和证据链，指出不确定性与缺口。',
    originAgentId: 'xiaoyan',
    category: 'information',
    icon: 'CircleCheck',
    sortOrder: 130,
    capabilityProfile: capabilityProfile({
      intents: ['fact_check', 'verify_claims'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['claim_checking', 'evidence_review', 'uncertainty_labeling'],
      inputArtifacts: ['plain_text', 'source_materials', 'report'],
      outputArtifacts: ['fact_check_report', 'risk_notes'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['核查', '事实', '证据', '准确', '验证说法'],
      preferredWhen: ['任务存在事实准确性或来源可靠性风险'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'synthesis_writer',
    name: '综合归纳 Agent',
    roleName: '多来源信息综合',
    description: '把多个输入材料压缩成结构化结论、摘要和行动建议。',
    originAgentId: 'xiaoyan',
    category: 'information',
    icon: 'Memo',
    sortOrder: 140,
    capabilityProfile: capabilityProfile({
      intents: ['synthesize', 'summarize'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['structured_summary', 'insight_extraction', 'action_items'],
      inputArtifacts: ['plain_text', 'research_report', 'meeting_notes', 'source_materials'],
      outputArtifacts: ['summary', 'action_plan'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['总结', '归纳', '综合', '摘要', '提炼'],
      preferredWhen: ['已有多个上游材料需要整理成结论'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'workspace_read', maxConcurrency: 3 }),
  }),
  makeAgent({
    id: 'requirements_analyst',
    name: '需求澄清 Agent',
    roleName: '需求澄清',
    description: '把模糊需求拆成目标、范围、约束、用户场景和开放问题。',
    originAgentId: 'xiaochan',
    category: 'product',
    icon: 'DocumentChecked',
    sortOrder: 210,
    capabilityProfile: capabilityProfile({
      intents: ['requirements', 'clarify', 'scope'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['requirement_analysis', 'scope_definition', 'question_design'],
      inputArtifacts: ['plain_text', 'business_context', 'source_materials'],
      outputArtifacts: ['requirements_doc', 'clarification_questions'],
      antiCapabilities: ['code_change', 'test_execution'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['需求', '范围', '目标', 'PRD', '澄清', '用户场景'],
      preferredWhen: ['任务目标或范围需要先澄清'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'task_context', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'workflow_designer',
    name: '流程拆解 Agent',
    roleName: '流程与步骤设计',
    description: '将目标拆成可执行步骤、依赖关系和协作流程。',
    originAgentId: 'xiaochan',
    category: 'product',
    icon: 'Share',
    sortOrder: 220,
    capabilityProfile: capabilityProfile({
      intents: ['plan', 'workflow_design', 'decompose'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['process_mapping', 'dependency_design', 'milestone_planning'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'research_report'],
      outputArtifacts: ['workflow_plan', 'task_breakdown'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['流程', '步骤', '拆解', '计划', 'DAG', '依赖'],
      preferredWhen: ['需要把任务转成多步骤计划'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'task_context', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'acceptance_designer',
    name: '验收口径 Agent',
    roleName: '验收标准设计',
    description: '定义可验证的验收标准、完成定义和边界条件。',
    originAgentId: 'xiaochan',
    category: 'product',
    icon: 'Finished',
    sortOrder: 230,
    capabilityProfile: capabilityProfile({
      intents: ['acceptance', 'verify_plan'],
      domains: ['software', 'product', 'business', 'daily_ops'],
      skills: ['acceptance_criteria', 'definition_of_done', 'edge_case_mapping'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'technical_plan'],
      outputArtifacts: ['acceptance_criteria', 'verification_plan'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['验收', '完成标准', '通过标准', '验收口径', 'acceptance'],
      preferredWhen: ['任务需要明确通过/不通过标准'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'task_context', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'code_reader',
    name: '代码理解 Agent',
    roleName: '代码阅读与问题定位',
    description: '阅读仓库代码、定位问题、提炼实现上下文，不直接修改文件。',
    originAgentId: 'xiaokai',
    category: 'engineering',
    icon: 'Reading',
    sortOrder: 310,
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
    capabilityProfile: capabilityProfile({
      intents: ['code_diagnosis', 'code_change', 'debug'],
      domains: ['software'],
      skills: ['code_reading', 'error_localization', 'dependency_mapping'],
      inputArtifacts: ['plain_text', 'repo_files', 'error_log'],
      outputArtifacts: ['technical_findings', 'implementation_context'],
      antiCapabilities: ['final_verification'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['代码', '报错', 'bug', '500', '定位', '排查', 'debug'],
      preferredWhen: ['任务需要先理解代码或定位问题'],
      requiresTools: ['Read', 'Glob', 'Grep'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'architecture_planner',
    name: '架构方案 Agent',
    roleName: '技术方案设计',
    description: '设计技术方案、接口边界、迁移路径和工程风险。',
    originAgentId: 'xiaokai',
    category: 'engineering',
    icon: 'Cpu',
    sortOrder: 320,
    allowedTools: ['Read', 'Glob', 'Grep'],
    capabilityProfile: capabilityProfile({
      intents: ['architecture', 'technical_plan', 'code_change'],
      domains: ['software'],
      skills: ['architecture_design', 'interface_design', 'migration_planning'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'repo_files', 'technical_findings'],
      outputArtifacts: ['technical_plan', 'risk_notes'],
      antiCapabilities: ['test_execution'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['架构', '技术方案', '接口', '迁移', '重构', '设计'],
      preferredWhen: ['实现前需要方案或边界设计'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 1 }),
  }),
  makeAgent({
    id: 'implementation_engineer',
    name: '实现执行 Agent',
    roleName: '代码实现',
    description: '在明确需求和上下文后修改代码、补充实现并说明验证结果。',
    originAgentId: 'xiaokai',
    category: 'engineering',
    icon: 'Monitor',
    sortOrder: 330,
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    capabilityProfile: capabilityProfile({
      intents: ['code_change', 'implement', 'fix'],
      domains: ['software'],
      skills: ['code_editing', 'implementation', 'bug_fixing'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'repo_files', 'technical_findings', 'technical_plan'],
      outputArtifacts: ['patch', 'implementation_report'],
      antiCapabilities: ['requirements_clarification_only', 'final_summary_only'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['实现', '修复', '修改代码', '开发', '补丁', 'bug', '500'],
      preferredWhen: ['任务明确需要修改项目文件'],
      requiresTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
      canRunInParallel: false,
      defaultPriority: 80,
      latencyTier: 'high',
      costTier: 'high',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1, requiresApproval: false, costLimit: 'medium' }),
  }),
  makeAgent({
    id: 'integration_engineer',
    name: '集成改造 Agent',
    roleName: '集成与系统改造',
    description: '处理跨模块接线、接口适配、迁移和兼容性改造。',
    originAgentId: 'xiaokai',
    category: 'engineering',
    icon: 'Connection',
    sortOrder: 340,
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    capabilityProfile: capabilityProfile({
      intents: ['integrate', 'code_change', 'migration'],
      domains: ['software'],
      skills: ['integration', 'api_wiring', 'compatibility'],
      inputArtifacts: ['repo_files', 'technical_plan', 'requirements_doc'],
      outputArtifacts: ['patch', 'migration_notes'],
      antiCapabilities: ['simple_draft'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['集成', '接入', '接口', '迁移', '兼容', '联调'],
      preferredWhen: ['改动跨多个模块或接口'],
      requiresTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
      canRunInParallel: false,
      costTier: 'high',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'high', permissionScope: 'workspace_write', maxConcurrency: 1, requiresApproval: false }),
  }),
  makeAgent({
    id: 'test_planner',
    name: '测试方案 Agent',
    roleName: '测试设计',
    description: '设计测试策略、用例矩阵、验证路径和风险覆盖。',
    originAgentId: 'xiaoce',
    category: 'quality',
    icon: 'List',
    sortOrder: 410,
    capabilityProfile: capabilityProfile({
      intents: ['test_plan', 'verify_plan'],
      domains: ['software', 'product'],
      skills: ['test_design', 'case_matrix', 'risk_coverage'],
      inputArtifacts: ['requirements_doc', 'technical_plan', 'patch'],
      outputArtifacts: ['test_plan', 'case_matrix'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['测试方案', '测试用例', '验证路径', '覆盖'],
      preferredWhen: ['需要先设计验证策略'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'verification_runner',
    name: '验证执行 Agent',
    roleName: '验证执行',
    description: '执行可用测试、构建或检查命令，记录结果和阻塞。',
    originAgentId: 'xiaoce',
    category: 'quality',
    icon: 'Select',
    sortOrder: 420,
    allowedTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
    capabilityProfile: capabilityProfile({
      intents: ['verify', 'test_execution', 'code_change'],
      domains: ['software'],
      skills: ['test_execution', 'build_verification', 'result_reporting'],
      inputArtifacts: ['repo_files', 'patch', 'test_plan'],
      outputArtifacts: ['verification_result', 'test_report'],
      antiCapabilities: ['requirements_clarification_only'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['验证', '测试', '构建', '运行检查', 'npm run', 'test'],
      preferredWhen: ['已有产物需要验收'],
      requiresTools: ['Read', 'Glob', 'Grep', 'Bash'],
      canRunInParallel: false,
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_write', maxConcurrency: 1 }),
  }),
  makeAgent({
    id: 'risk_reviewer',
    name: '风险审查 Agent',
    roleName: '风险审查',
    description: '审查方案、实现或结论的风险、遗漏和上线注意事项。',
    originAgentId: 'xiaoce',
    category: 'quality',
    icon: 'Warning',
    sortOrder: 430,
    capabilityProfile: capabilityProfile({
      intents: ['risk_review', 'review', 'verify'],
      domains: ['software', 'product', 'business'],
      skills: ['risk_review', 'edge_case_review', 'release_notes'],
      inputArtifacts: ['requirements_doc', 'technical_plan', 'patch', 'report'],
      outputArtifacts: ['risk_review', 'release_risk_notes'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['风险', '审查', 'review', '上线', '遗漏'],
      preferredWhen: ['任务风险较高或需要独立复核'],
      costTier: 'medium',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'workspace_read', maxConcurrency: 2 }),
  }),
  makeAgent({
    id: 'general_task_agent',
    name: '通用事务 Agent',
    roleName: '通用事务处理',
    description: '处理没有明显专门能力要求的日常任务，输出清晰可执行的结果。',
    category: 'daily',
    icon: 'MagicStick',
    sortOrder: 510,
    capabilityProfile: capabilityProfile({
      intents: ['general', 'draft', 'plan', 'summarize'],
      domains: ['daily_ops', 'business', 'product'],
      skills: ['general_assistance', 'structured_response', 'action_planning'],
      inputArtifacts: ['plain_text'],
      outputArtifacts: ['response', 'action_plan', 'summary'],
      antiCapabilities: ['code_change_requires_repo'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['帮我', '处理', '安排', '日常', '事务', '简单'],
      preferredWhen: ['没有更专门 Agent 或任务很轻量'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'task_context', maxConcurrency: 4 }),
  }),
  makeAgent({
    id: 'document_drafter',
    name: '文档起草 Agent',
    roleName: '文档与邮件起草',
    description: '起草邮件、通知、说明、汇报和结构化文档。',
    category: 'daily',
    icon: 'EditPen',
    sortOrder: 520,
    capabilityProfile: capabilityProfile({
      intents: ['draft', 'write', 'communicate'],
      domains: ['daily_ops', 'business', 'product'],
      skills: ['document_drafting', 'tone_control', 'business_writing'],
      inputArtifacts: ['plain_text', 'requirements_doc', 'meeting_notes'],
      outputArtifacts: ['document', 'email', 'message'],
      antiCapabilities: ['code_change', 'test_execution'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['写一封', '邮件', '文档', '通知', '说明', '起草', '汇报'],
      preferredWhen: ['任务目标是生成可直接发送或归档的文字'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'task_context', maxConcurrency: 3 }),
  }),
  makeAgent({
    id: 'meeting_summarizer',
    name: '会议纪要 Agent',
    roleName: '会议纪要整理',
    description: '把会议记录整理为结论、决定、待办和责任人。',
    category: 'daily',
    icon: 'Notebook',
    sortOrder: 530,
    capabilityProfile: capabilityProfile({
      intents: ['summarize', 'meeting_notes'],
      domains: ['daily_ops', 'business', 'product'],
      skills: ['meeting_summary', 'action_items', 'decision_log'],
      inputArtifacts: ['meeting_notes', 'plain_text', 'transcript'],
      outputArtifacts: ['meeting_summary', 'action_items'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['会议', '纪要', '会议记录', '待办', '责任人'],
      preferredWhen: ['输入是会议材料或需要提炼待办'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'task_context', maxConcurrency: 3 }),
  }),
  makeAgent({
    id: 'schedule_planner',
    name: '日程计划 Agent',
    roleName: '日程与行动计划',
    description: '把目标、约束和时间线整理成行动计划或日程安排。',
    category: 'daily',
    icon: 'Calendar',
    sortOrder: 540,
    capabilityProfile: capabilityProfile({
      intents: ['schedule', 'plan', 'organize'],
      domains: ['daily_ops', 'business'],
      skills: ['timeline_planning', 'priority_ordering', 'constraint_handling'],
      inputArtifacts: ['plain_text', 'requirements_doc'],
      outputArtifacts: ['schedule_plan', 'action_plan'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['日程', '安排', '计划', '时间表', '行动计划'],
      preferredWhen: ['任务需要时间线或步骤安排'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'low', permissionScope: 'task_context', maxConcurrency: 3 }),
  }),
  makeAgent({
    id: 'decision_helper',
    name: '决策辅助 Agent',
    roleName: '选项比较与建议',
    description: '把多个选择转成标准、权重、取舍和建议。',
    category: 'daily',
    icon: 'Guide',
    sortOrder: 550,
    capabilityProfile: capabilityProfile({
      intents: ['decision_support', 'compare', 'recommend'],
      domains: ['daily_ops', 'business', 'product', 'software'],
      skills: ['criteria_design', 'weighted_tradeoffs', 'recommendation'],
      inputArtifacts: ['plain_text', 'comparison_matrix', 'research_report'],
      outputArtifacts: ['decision_report', 'recommendation'],
      antiCapabilities: ['code_change'],
    }),
    routingProfile: routingProfile({
      routeKeywords: ['决策', '选择', '建议', '推荐', '怎么选', '取舍'],
      preferredWhen: ['任务需要在多个选项之间做判断'],
      costTier: 'low',
    }),
    governanceProfile: governanceProfile({ riskLevel: 'medium', permissionScope: 'task_context', maxConcurrency: 2 }),
  }),
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

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
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
  const marketProfileValue = {
    ...marketProfile(),
    ...parseJsonObject(row.market_profile_json, {}),
    source: row.source || parseJsonObject(row.market_profile_json, {}).source || 'builtin',
    version: row.version || parseJsonObject(row.market_profile_json, {}).version || '1.0.0',
    marketVisible: Boolean(row.market_visible),
  }
  const governanceProfileValue = {
    ...governanceProfile(),
    ...parseJsonObject(row.governance_profile_json, {}),
    riskLevel: row.risk_level,
    maxConcurrency: Math.max(1, Number(row.max_concurrency || 1)),
  }
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
    source: row.source || marketProfileValue.source,
    category: row.category || '',
    icon: row.icon || '',
    instructions: row.instructions || '',
    version: row.version || marketProfileValue.version,
    marketVisible: Boolean(row.market_visible),
    originAgentId: row.origin_agent_id || '',
    aliases: parseJson(row.aliases_json),
    marketProfile: marketProfileValue,
    capabilityProfile: {
      ...capabilityProfile(),
      ...parseJsonObject(row.capability_profile_json, {}),
    },
    routingProfile: {
      ...routingProfile(),
      ...parseJsonObject(row.routing_profile_json, {}),
    },
    governanceProfile: governanceProfileValue,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function seedClone(agent) {
  return JSON.parse(JSON.stringify(agent))
}

export function defaultAgentDefinitions() {
  return DEFAULT_AGENT_DEFINITIONS.map(seedClone)
}

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column)
}

function addColumn(db, table, column, definition) {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
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
      source TEXT NOT NULL DEFAULT 'builtin',
      category TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      version TEXT DEFAULT '1.0.0',
      market_visible INTEGER NOT NULL DEFAULT 1,
      origin_agent_id TEXT DEFAULT '',
      aliases_json TEXT NOT NULL DEFAULT '[]',
      market_profile_json TEXT NOT NULL DEFAULT '{}',
      capability_profile_json TEXT NOT NULL DEFAULT '{}',
      routing_profile_json TEXT NOT NULL DEFAULT '{}',
      governance_profile_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `)
  addColumn(db, 'agent_definitions', 'source', "TEXT NOT NULL DEFAULT 'builtin'")
  addColumn(db, 'agent_definitions', 'category', "TEXT DEFAULT ''")
  addColumn(db, 'agent_definitions', 'icon', "TEXT DEFAULT ''")
  addColumn(db, 'agent_definitions', 'instructions', "TEXT DEFAULT ''")
  addColumn(db, 'agent_definitions', 'version', "TEXT DEFAULT '1.0.0'")
  addColumn(db, 'agent_definitions', 'market_visible', 'INTEGER NOT NULL DEFAULT 1')
  addColumn(db, 'agent_definitions', 'origin_agent_id', "TEXT DEFAULT ''")
  addColumn(db, 'agent_definitions', 'aliases_json', "TEXT NOT NULL DEFAULT '[]'")
  addColumn(db, 'agent_definitions', 'market_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  addColumn(db, 'agent_definitions', 'capability_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  addColumn(db, 'agent_definitions', 'routing_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  addColumn(db, 'agent_definitions', 'governance_profile_json', "TEXT NOT NULL DEFAULT '{}'")
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_enabled ON agent_definitions(enabled, sort_order)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_market ON agent_definitions(market_visible, enabled, coordinator, sort_order)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_agent_definitions_category ON agent_definitions(category, sort_order)')
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
      market_visible = excluded.market_visible,
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
      const marketProfileValue = { ...agent.marketProfile, marketVisible: agent.marketVisible }
      const governanceProfileValue = { ...agent.governanceProfile, riskLevel: agent.riskLevel, maxConcurrency: agent.maxConcurrency }
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
        agent.enabled ? 1 : 0,
        agent.sortOrder,
        agent.coordinator ? 1 : 0,
        agent.source,
        agent.category,
        agent.icon,
        agent.instructions,
        agent.version,
        agent.marketVisible ? 1 : 0,
        agent.originAgentId,
        jsonArray(agent.aliases),
        jsonObject(marketProfileValue),
        jsonObject(agent.capabilityProfile),
        jsonObject(agent.routingProfile),
        jsonObject(governanceProfileValue),
        timestamp,
        timestamp
      )
      if (LEGACY_EXECUTOR_IDS.has(agent.id)) {
        db.prepare('UPDATE agent_definitions SET enabled = 0, market_visible = 0, updated_at = unixepoch() WHERE id = ?').run(agent.id)
      }
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
  const market = marketProfile({ source: 'local', installSource: 'user', ...(payload.marketProfile || {}), marketVisible: payload.marketVisible !== false })
  return makeAgent({
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
    version: String(payload.version || market.version || '1.0.0').trim(),
    marketVisible: payload.marketVisible !== false,
    originAgentId: String(payload.originAgentId || '').trim(),
    aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
    marketProfile: market,
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
    reportName: (value) => String(value || ''),
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
    governanceProfile: () => jsonObject({ ...mergedGovernanceProfile, riskLevel: updates.riskLevel || current.riskLevel, maxConcurrency: updates.maxConcurrency || current.maxConcurrency }),
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
  if (current.source === 'builtin' || current.marketProfile.source === 'builtin') {
    return updateAgentDefinition(agentId, { enabled: false, marketVisible: false })
  }
  const db = getDatabase()
  db.prepare('DELETE FROM agent_definitions WHERE id = ?').run(agentId)
  return current
}
