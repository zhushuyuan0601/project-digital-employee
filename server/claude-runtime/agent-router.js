import { listRoutableAgents } from './agent-registry.js'

const INTENT_RULES = [
  {
    intent: 'code_change',
    domains: ['software'],
    inputArtifacts: ['repo_files', 'error_log'],
    outputArtifacts: ['patch', 'verification_result'],
    requiredTools: ['Read', 'Glob', 'Grep'],
    riskLevel: 'high',
    keywords: ['代码', '修复', 'bug', '500', '报错', '实现', '开发', '仓库', '构建', '测试', 'code', 'fix'],
  },
  {
    intent: 'draft',
    domains: ['daily_ops', 'business'],
    inputArtifacts: ['plain_text'],
    outputArtifacts: ['document', 'email', 'message'],
    requiredTools: [],
    riskLevel: 'low',
    keywords: ['写一封', '邮件', '文档', '说明', '通知', '起草', '汇报', 'draft', 'email'],
  },
  {
    intent: 'compare',
    domains: ['business', 'product', 'software'],
    inputArtifacts: ['plain_text', 'source_materials'],
    outputArtifacts: ['comparison_matrix', 'decision_report'],
    requiredTools: ['Read'],
    riskLevel: 'medium',
    keywords: ['竞品', '对比', '比较', '选型', '怎么选', '取舍', 'compare'],
  },
  {
    intent: 'meeting_notes',
    domains: ['daily_ops', 'business'],
    inputArtifacts: ['meeting_notes', 'plain_text'],
    outputArtifacts: ['meeting_summary', 'action_items'],
    requiredTools: [],
    riskLevel: 'low',
    keywords: ['会议', '纪要', '会议记录', '待办', '责任人'],
  },
  {
    intent: 'schedule',
    domains: ['daily_ops', 'business'],
    inputArtifacts: ['plain_text'],
    outputArtifacts: ['schedule_plan', 'action_plan'],
    requiredTools: [],
    riskLevel: 'low',
    keywords: ['日程', '安排', '时间表', '计划'],
  },
]

function unique(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function intersects(left = [], right = []) {
  const rightSet = new Set(right.map((item) => String(item).toLowerCase()))
  return left.some((item) => rightSet.has(String(item).toLowerCase()))
}

function containsAny(text, keywords = []) {
  const source = String(text || '').toLowerCase()
  return keywords.some((keyword) => source.includes(String(keyword).toLowerCase()))
}

function tierScore(tier, values) {
  return values[tier] ?? 0
}

export function understandTaskIntent(taskDescription = '') {
  const matched = INTENT_RULES.filter((rule) => containsAny(taskDescription, rule.keywords))
  const selected = matched.length ? matched : [{
    intent: 'general',
    domains: ['daily_ops'],
    inputArtifacts: ['plain_text'],
    outputArtifacts: ['response'],
    requiredTools: [],
    riskLevel: 'low',
    keywords: [],
  }]

  return {
    text: String(taskDescription || ''),
    intents: unique(selected.map((rule) => rule.intent)),
    domains: unique(selected.flatMap((rule) => rule.domains)),
    inputArtifacts: unique(selected.flatMap((rule) => rule.inputArtifacts)),
    outputArtifacts: unique(selected.flatMap((rule) => rule.outputArtifacts)),
    requiredTools: unique(selected.flatMap((rule) => rule.requiredTools)),
    riskLevel: selected.some((rule) => rule.riskLevel === 'high') ? 'high' : selected.some((rule) => rule.riskLevel === 'medium') ? 'medium' : 'low',
  }
}

function antiCapabilityMatches(agent, intent) {
  const anti = agent.capabilityProfile?.antiCapabilities || []
  return anti.some((item) => {
    const normalized = String(item).toLowerCase()
    return intent.intents.some((taskIntent) => normalized.includes(String(taskIntent).toLowerCase())) ||
      containsAny(intent.text, [normalized.replace(/_/g, ' ')])
  })
}

export function scoreAgentForTask(agent, intent) {
  if (!agent || agent.coordinator || !agent.enabled || agent.marketProfile?.marketVisible === false || agent.marketVisible === false) {
    return null
  }
  if (antiCapabilityMatches(agent, intent)) return null

  const capability = agent.capabilityProfile || {}
  const routing = agent.routingProfile || {}
  let score = 0
  const reasons = []

  if (intersects(capability.intents, intent.intents)) {
    score += 45
    reasons.push('任务意图匹配')
  }
  if (intersects(capability.domains, intent.domains)) {
    score += 18
    reasons.push('领域匹配')
  }
  if (intersects(capability.inputArtifacts, intent.inputArtifacts)) {
    score += 8
    reasons.push('输入契约匹配')
  }
  if (intersects(capability.outputArtifacts, intent.outputArtifacts)) {
    score += 8
    reasons.push('输出契约匹配')
  }
  if (containsAny(intent.text, routing.routeKeywords)) {
    score += 20
    reasons.push('路由关键词命中')
  }

  const missingRequiredTools = (routing.requiresTools || []).filter((tool) => !agent.allowedTools.includes(tool))
  if (missingRequiredTools.length) {
    return null
  }

  const taskRequiresWrite = intent.intents.includes('code_change')
  if (taskRequiresWrite && agent.capabilityProfile?.outputArtifacts?.includes('patch') && !agent.allowedTools.some((tool) => ['Edit', 'Write', 'MultiEdit'].includes(tool))) {
    return null
  }

  score += tierScore(routing.costTier || 'medium', { low: 6, medium: 3, high: 0 })
  score += tierScore(agent.riskLevel || 'medium', { low: 6, medium: 3, high: 0 })
  score += Math.min(5, Number(agent.marketProfile?.ratingAvg || 0))

  if (score <= 0) return null
  return {
    agentId: agent.id,
    name: agent.name,
    category: agent.category,
    score,
    reasons,
    costTier: routing.costTier || 'medium',
    riskLevel: agent.riskLevel || 'medium',
    canRunInParallel: routing.canRunInParallel !== false,
    requiresApproval: Boolean(agent.governanceProfile?.requiresApproval),
  }
}

function candidateById(candidates, id) {
  return candidates.find((candidate) => candidate.agentId === id)
}

function nodeFromCandidate(candidate, index, overrides = {}) {
  const nodeId = overrides.id || `node-${String(index + 1).padStart(2, '0')}`
  const expected = overrides.expectedOutputArtifacts || ['report']
  return {
    id: nodeId,
    title: overrides.title || candidate.name,
    phase: overrides.phase || overrides.intent || 'route',
    intent: overrides.intent || 'general',
    requiredCapabilities: overrides.requiredCapabilities || candidate.reasons,
    assignedAgentId: candidate.agentId,
    routingReason: overrides.routingReason || `${candidate.name} 分数 ${candidate.score}，${candidate.reasons.join('、') || '能力匹配'}。`,
    objective: overrides.objective || `完成 ${overrides.intent || 'general'} 节点。`,
    dependsOn: overrides.dependsOn || [],
    parallelGroup: overrides.parallelGroup || '',
    inputArtifacts: overrides.inputArtifacts || ['plain_text'],
    expectedOutputArtifacts: expected,
    requiredInputs: overrides.requiredInputs || ['任务描述'],
    expectedOutputs: overrides.expectedOutputs || expected,
    executionMode: overrides.executionMode || 'report',
    requiredTools: overrides.requiredTools || [],
    successCriteria: overrides.successCriteria || ['产出满足节点目标并可供下游使用'],
    acceptanceCriteria: overrides.acceptanceCriteria || ['输出内容非空且覆盖关键问题'],
    riskLevel: overrides.riskLevel || candidate.riskLevel,
    costEstimate: overrides.costEstimate || candidate.costTier,
    requiresApproval: overrides.requiresApproval ?? candidate.requiresApproval,
    agentCapabilityHints: overrides.agentCapabilityHints || candidate.reasons,
  }
}

function composeWorkflow(intent, candidates, gaps) {
  const nodes = []
  if (intent.intents.includes('code_change')) {
    const reader = candidateById(candidates, 'code_reader')
    const implementer = candidateById(candidates, 'implementation_engineer')
    const verifier = candidateById(candidates, 'verification_runner')
    if (reader) {
      nodes.push(nodeFromCandidate(reader, nodes.length, {
        id: 'node-01',
        title: '理解代码与定位问题',
        phase: 'diagnosis',
        intent: 'code_diagnosis',
        requiredCapabilities: ['code_reading', 'error_localization'],
        objective: '阅读相关代码和错误上下文，定位 500 或运行异常的来源。',
        inputArtifacts: ['repo_files', 'error_log'],
        expectedOutputArtifacts: ['technical_findings'],
        expectedOutputs: ['问题定位报告'],
        requiredTools: ['Read', 'Glob', 'Grep'],
        acceptanceCriteria: ['报告包含相关文件、触发路径和修复建议'],
      }))
    } else {
      gaps.push('缺少代码理解能力 Agent')
    }
    if (implementer) {
      nodes.push(nodeFromCandidate(implementer, nodes.length, {
        id: 'node-02',
        title: '实现修复',
        phase: 'implementation',
        intent: 'code_change',
        requiredCapabilities: ['code_editing', 'bug_fixing'],
        objective: '基于定位结果修改代码并记录实现说明。',
        dependsOn: reader ? ['node-01'] : [],
        inputArtifacts: ['repo_files', 'technical_findings'],
        expectedOutputArtifacts: ['patch', 'implementation_report'],
        expectedOutputs: ['代码补丁', '实现说明'],
        executionMode: 'code',
        requiredTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
        acceptanceCriteria: ['代码已修改且说明覆盖变更文件和原因'],
      }))
    } else {
      gaps.push('缺少代码实现能力 Agent')
    }
    if (verifier) {
      nodes.push(nodeFromCandidate(verifier, nodes.length, {
        id: 'node-03',
        title: '运行验证',
        phase: 'verification',
        intent: 'verify',
        requiredCapabilities: ['test_execution', 'build_verification'],
        objective: '运行可用验证命令并记录结果。',
        dependsOn: implementer ? ['node-02'] : reader ? ['node-01'] : [],
        inputArtifacts: ['patch', 'repo_files'],
        expectedOutputArtifacts: ['verification_result'],
        expectedOutputs: ['验证报告'],
        executionMode: 'test',
        requiredTools: ['Read', 'Glob', 'Grep', 'Bash'],
        acceptanceCriteria: ['验证报告包含命令、结果和失败阻塞'],
      }))
    } else {
      gaps.push('缺少验证执行能力 Agent')
    }
    return nodes
  }

  if (intent.intents.includes('draft')) {
    const drafter = candidateById(candidates, 'document_drafter') || candidateById(candidates, 'general_task_agent') || candidates[0]
    if (drafter) {
      return [nodeFromCandidate(drafter, 0, {
        id: 'node-01',
        title: '起草可交付文本',
        phase: 'draft',
        intent: 'draft',
        requiredCapabilities: ['document_drafting', 'tone_control'],
        objective: '根据用户要求起草邮件、说明或文档。',
        inputArtifacts: ['plain_text'],
        expectedOutputArtifacts: ['document', 'email'],
        expectedOutputs: ['可直接使用的文本草稿'],
        acceptanceCriteria: ['文本语气符合要求', '信息完整且可直接发送或归档'],
        routingReason: `${drafter.name} 命中文档/邮件起草能力，适合处理 draft 类日常事务。`,
      })]
    }
  }

  if (intent.intents.includes('compare')) {
    const selected = ['general_researcher', 'competitive_analyst', 'decision_helper']
      .map((id) => candidateById(candidates, id))
      .filter(Boolean)
    return selected.map((candidate, index) => nodeFromCandidate(candidate, index, {
      id: `node-${String(index + 1).padStart(2, '0')}`,
      title: index === 0 ? '收集对比资料' : index === 1 ? '形成对比矩阵' : '输出决策建议',
      phase: index === 0 ? 'research' : index === 1 ? 'compare' : 'decision',
      intent: index === 0 ? 'research' : index === 1 ? 'compare' : 'decision_support',
      dependsOn: index === 0 ? [] : [`node-${String(index).padStart(2, '0')}`],
      expectedOutputArtifacts: index === 1 ? ['comparison_matrix'] : ['decision_report'],
      expectedOutputs: index === 1 ? ['对比矩阵'] : ['决策建议'],
      acceptanceCriteria: ['说明选择依据、取舍和不确定性'],
    }))
  }

  const fallback = candidateById(candidates, 'general_task_agent') || candidates[0]
  if (!fallback) {
    gaps.push('没有可用的可路由 Agent')
    return []
  }
  return [nodeFromCandidate(fallback, 0, {
    id: 'node-01',
    title: '处理通用事务',
    phase: 'general',
    intent: intent.intents[0] || 'general',
    requiredCapabilities: ['general_assistance'],
    objective: '根据任务描述产出结构化结果。',
    expectedOutputArtifacts: intent.outputArtifacts.length ? intent.outputArtifacts : ['response'],
    expectedOutputs: ['结构化结果'],
    acceptanceCriteria: ['结果覆盖用户目标并包含下一步建议'],
  })]
}

export function previewAgentRoute({ taskDescription = '', constraints = {} } = {}) {
  const intent = understandTaskIntent(taskDescription)
  const agents = listRoutableAgents()
  const candidates = agents
    .map((agent) => scoreAgentForTask(agent, intent))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.agentId.localeCompare(right.agentId))
  const gaps = []
  const workflow = composeWorkflow(intent, candidates, gaps)
  const requiresApproval = workflow.some((node) => node.requiresApproval) ||
    (constraints.costLimit && workflow.some((node) => node.costEstimate === 'high'))

  return {
    intent,
    candidates,
    workflow,
    gaps,
    governance: {
      requiresApproval,
      riskLevel: intent.riskLevel,
      costLimit: constraints.costLimit || '',
    },
  }
}

export function buildRouterPromptContext() {
  const agents = listRoutableAgents()
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    category: agent.category,
    capabilities: agent.capabilityProfile,
    routing: agent.routingProfile,
    governance: agent.governanceProfile,
    inputContract: agent.inputContract,
    outputContract: agent.outputContract,
    allowedTools: agent.allowedTools,
  }))
}

export function validateRoutedWorkflowPlan(plan, validatePlan) {
  if (typeof validatePlan !== 'function') throw new Error('validatePlan function is required')
  return validatePlan(plan)
}
