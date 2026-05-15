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
    intent: 'requirements',
    domains: ['product', 'business', 'software'],
    inputArtifacts: ['plain_text', 'business_context'],
    outputArtifacts: ['product_plan', 'prd', 'acceptance_scope'],
    requiredTools: ['Read'],
    riskLevel: 'medium',
    keywords: ['需求', 'PRD', '流程', '用户故事', '验收标准', '产品方案'],
  },
  {
    intent: 'verify',
    domains: ['software', 'product'],
    inputArtifacts: ['patch', 'deliverables'],
    outputArtifacts: ['verification_result', 'acceptance_report'],
    requiredTools: ['Read', 'Glob', 'Grep'],
    riskLevel: 'medium',
    keywords: ['测试', '验证', '验收', '质量', '回归', 'test', 'verify'],
  },
]

function unique(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function containsAny(text, keywords = []) {
  const source = String(text || '').toLowerCase()
  return keywords.some((keyword) => source.includes(String(keyword).toLowerCase()))
}

function intersects(left = [], right = []) {
  const rightSet = new Set(right.map((item) => String(item).toLowerCase()))
  return left.some((item) => rightSet.has(String(item).toLowerCase()))
}

function tierRank(tier = '') {
  return { unknown: 0, low: 1, medium: 2, high: 3 }[String(tier || '').toLowerCase()] ?? 0
}

function tierScore(tier, values) {
  return values[tier] ?? 0
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null))
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
  if (!agent || agent.coordinator || !agent.enabled || agent.marketVisible === false || agent.marketProfile?.marketVisible === false) {
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
  if (missingRequiredTools.length) return null

  const taskRequiresWrite = intent.intents.includes('code_change')
  if (taskRequiresWrite && (capability.outputArtifacts || []).includes('patch') && !agent.allowedTools.some((tool) => ['Edit', 'Write', 'MultiEdit'].includes(tool))) {
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

function candidateByCapability(candidates, agents, intent, capabilityIntent, fallbackIndex = 0) {
  const candidate = candidates.find((item) => {
    const agent = agents.find((entry) => entry.id === item.agentId)
    return agent?.capabilityProfile?.intents?.includes(capabilityIntent)
  })
  return candidate || candidates[fallbackIndex]
}

function nodeFromCandidate(candidate, index, overrides = {}) {
  const expected = overrides.expectedOutputArtifacts || ['report']
  return {
    id: overrides.id || `node-${String(index + 1).padStart(2, '0')}`,
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

function composeWorkflow(intent, candidates, agents, gaps) {
  if (!candidates.length) return []
  if (intent.intents.includes('code_change')) {
    const implementer = candidateByCapability(candidates, agents, intent, 'code_change')
    const verifier = candidateByCapability(candidates, agents, intent, 'verify', 1)
    const nodes = []
    if (implementer) {
      nodes.push(nodeFromCandidate(implementer, 0, {
        id: 'node-01',
        title: '实现或修复代码',
        phase: 'implementation',
        intent: 'code_change',
        requiredCapabilities: ['code_reading', 'code_editing'],
        objective: '阅读相关代码，完成必要实现或修复，并记录变更依据。',
        inputArtifacts: ['repo_files', 'error_log', 'task_description'],
        expectedOutputArtifacts: ['patch', 'implementation_report'],
        expectedOutputs: ['代码补丁', '实现说明'],
        executionMode: 'code',
        requiredTools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'Bash'],
        acceptanceCriteria: ['代码已修改且说明覆盖变更文件和原因'],
      }))
    } else {
      gaps.push('缺少可执行代码变更的 Agent')
    }
    if (verifier && verifier.agentId !== implementer?.agentId) {
      nodes.push(nodeFromCandidate(verifier, 1, {
        id: 'node-02',
        title: '验证交付结果',
        phase: 'verification',
        intent: 'verify',
        requiredCapabilities: ['test_execution', 'acceptance_criteria'],
        objective: '运行可用验证命令并形成验收记录。',
        dependsOn: ['node-01'],
        inputArtifacts: ['patch', 'repo_files'],
        expectedOutputArtifacts: ['verification_result'],
        expectedOutputs: ['验证报告'],
        executionMode: 'test',
        requiredTools: ['Read', 'Glob', 'Grep', 'Bash'],
        acceptanceCriteria: ['验证报告包含命令、结果和失败阻塞'],
      }))
    }
    return nodes
  }

  if (intent.intents.includes('compare')) {
    return candidates.slice(0, 2).map((candidate, index) => nodeFromCandidate(candidate, index, {
      title: index === 0 ? '收集并整理对比材料' : '形成对比结论',
      phase: index === 0 ? 'research' : 'decision',
      intent: index === 0 ? 'research' : 'compare',
      dependsOn: index === 0 ? [] : ['node-01'],
      inputArtifacts: index === 0 ? ['plain_text', 'source_materials'] : ['research_report'],
      expectedOutputArtifacts: index === 0 ? ['research_report'] : ['comparison_matrix', 'decision_report'],
    }))
  }

  const candidate = candidates[0]
  return [nodeFromCandidate(candidate, 0, {
    intent: intent.intents[0] || 'general',
    phase: intent.intents[0] || 'general',
    inputArtifacts: intent.inputArtifacts,
    expectedOutputArtifacts: intent.outputArtifacts,
  })]
}

function governanceForWorkflow(workflow = [], constraints = {}, fallbackRiskLevel = 'low') {
  const riskLevel = workflow.some((node) => node.riskLevel === 'high') ? 'high' : workflow.some((node) => node.riskLevel === 'medium') ? 'medium' : fallbackRiskLevel
  const costLimit = constraints.costLimit || ''
  return {
    requiresApproval: workflow.some((node) => node.requiresApproval) || Boolean(costLimit && workflow.some((node) => tierRank(node.costEstimate) > tierRank(costLimit))),
    riskLevel,
    costLimit,
  }
}

export function buildDeterministicPreview({ taskDescription = '', constraints = {}, agents = listRoutableAgents() } = {}) {
  const intent = understandTaskIntent(taskDescription)
  const candidates = agents
    .map((agent) => scoreAgentForTask(agent, intent))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.agentId.localeCompare(right.agentId))
  const gaps = []
  const workflow = composeWorkflow(intent, candidates, agents, gaps)
  if (!workflow.length) gaps.push('没有找到满足当前任务的可路由 Agent')
  return {
    source: 'deterministic',
    available: true,
    confidence: candidates.length ? 0.72 : 0.12,
    intent,
    candidates,
    workflow,
    gaps: unique(gaps),
    governance: governanceForWorkflow(workflow, constraints, intent.riskLevel),
    notes: ['本预览由本地确定性路由规则生成。'],
  }
}

export function previewAgentRoute({ taskDescription = '', constraints = {} } = {}) {
  const deterministicPreview = buildDeterministicPreview({ taskDescription, constraints })
  return {
    deterministicPreview: cloneJson(deterministicPreview),
    validatedRoute: cloneJson(deterministicPreview),
    intent: deterministicPreview.intent,
    candidates: deterministicPreview.candidates,
    workflow: deterministicPreview.workflow,
    gaps: deterministicPreview.gaps,
    governance: deterministicPreview.governance,
  }
}

export function buildRouterPromptContext() {
  return listRoutableAgents().map((agent) => ({
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
