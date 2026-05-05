export const RUNTIME_AGENT_MAP = {
  xiaomu: { name: '小呦', runtimeAgentId: 'ceo', sessionKey: 'claude:xiaomu:main', roleId: 'ceo' },
  xiaoyan: { name: '研究员', runtimeAgentId: 'researcher', sessionKey: 'claude:xiaoyan:main', roleId: 'researcher' },
  xiaochan: { name: '产品经理', runtimeAgentId: 'pm', sessionKey: 'claude:xiaochan:main', roleId: 'pm' },
  xiaokai: { name: '研发工程师', runtimeAgentId: 'tech-lead', sessionKey: 'claude:xiaokai:main', roleId: 'tech-lead' },
  xiaoce: { name: '测试员', runtimeAgentId: 'team-qa', sessionKey: 'claude:xiaoce:main', roleId: 'team-qa' },
}

const AGENT_IDS = ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']
const PHASES = ['research', 'product', 'design', 'engineering', 'testing', 'review', 'summary']
const EXECUTION_MODES = ['report', 'code', 'test']

export function extractJsonPlan(input) {
  if (!input) throw new Error('Plan content is required')
  if (typeof input === 'object') return input

  const trimmed = String(input).trim()
  try {
    return JSON.parse(trimmed)
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return JSON.parse(fenced[1])

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }
  throw new Error('No JSON object found in plan content')
}

function stringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function normalizeParticipant(raw, agentId) {
  const known = RUNTIME_AGENT_MAP[raw?.agentId] && raw.agentId !== 'xiaomu'
    ? raw.agentId
    : agentId
  return {
    agentId: known,
    needed: Boolean(raw?.needed),
    reason: String(raw?.reason || (raw?.needed ? '该角色参与当前任务。' : '当前任务暂不需要该角色。')).trim(),
  }
}

function normalizeParticipants(participants = [], workflow = []) {
  const byAgent = new Map()
  for (const item of participants || []) {
    if (!RUNTIME_AGENT_MAP[item?.agentId] || item.agentId === 'xiaomu') continue
    byAgent.set(item.agentId, normalizeParticipant(item, item.agentId))
  }

  const usedAgents = new Set(workflow.map((node) => node.assignedAgentId).filter(Boolean))
  for (const agentId of AGENT_IDS) {
    if (byAgent.has(agentId)) continue
    byAgent.set(agentId, {
      agentId,
      needed: usedAgents.has(agentId),
      reason: usedAgents.has(agentId)
        ? '该角色被分配了工作流节点。'
        : '小呦未为该角色生成执行节点，当前任务暂不需要参与。',
    })
  }

  return AGENT_IDS.map((agentId) => byAgent.get(agentId))
}

function normalizeWorkflowNode(raw, index, knownIds) {
  const explicitId = String(raw?.id || '').trim()
  const id = explicitId || `node-${String(index + 1).padStart(2, '0')}`
  const phase = PHASES.includes(raw?.phase) ? raw.phase : 'review'
  const assignedAgentId = RUNTIME_AGENT_MAP[raw?.assignedAgentId] && raw.assignedAgentId !== 'xiaomu'
    ? raw.assignedAgentId
    : ''
  const dependsOn = stringArray(raw?.dependsOn).filter((item) => knownIds.has(item))
  const objective = String(raw?.objective || raw?.description || '').trim()
  const expectedOutputs = stringArray(raw?.expectedOutputs?.length ? raw.expectedOutputs : [raw?.expectedOutput])

  return {
    id,
    title: String(raw?.title || '').trim(),
    phase,
    assignedAgentId,
    objective,
    description: objective,
    dependsOn,
    requiredInputs: stringArray(raw?.requiredInputs),
    expectedOutputs,
    expectedOutput: expectedOutputs.join('\n'),
    executionMode: EXECUTION_MODES.includes(raw?.executionMode) ? raw.executionMode : 'report',
    successCriteria: stringArray(raw?.successCriteria),
    skipCondition: String(raw?.skipCondition || '').trim(),
  }
}

function validateWorkflowGraph(nodes, errors) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  if (byId.size !== nodes.length) errors.push('workflow 节点 id 不能重复')
  for (const node of nodes) {
    if (!node.title) errors.push(`节点 ${node.id} 缺少 title`)
    if (!node.objective) errors.push(`节点 ${node.id} 缺少 objective`)
    if (!node.assignedAgentId) errors.push(`节点 ${node.id} assignedAgentId 不合法`)
    for (const depId of node.dependsOn) {
      if (!byId.has(depId)) errors.push(`节点 ${node.id} 依赖不存在：${depId}`)
      if (depId === node.id) errors.push(`节点 ${node.id} 不能依赖自己`)
    }
    if (node.executionMode === 'test') {
      const hasEngineeringDependency = node.dependsOn.some((depId) => byId.get(depId)?.phase === 'engineering')
      if (!hasEngineeringDependency) {
        errors.push(`测试节点 ${node.id} 必须依赖至少一个 engineering 节点`)
      }
    }
  }

  const visiting = new Set()
  const visited = new Set()
  const visit = (node) => {
    if (visited.has(node.id)) return
    if (visiting.has(node.id)) {
      errors.push(`工作流存在循环依赖：${node.id}`)
      return
    }
    visiting.add(node.id)
    for (const depId of node.dependsOn) {
      const dep = byId.get(depId)
      if (dep) visit(dep)
    }
    visiting.delete(node.id)
    visited.add(node.id)
  }
  nodes.forEach(visit)
}

function normalizeLegacyPlan(plan) {
  const subtasks = Array.isArray(plan?.subtasks) ? plan.subtasks : []
  const workflow = subtasks.map((subtask, index) => ({
    id: subtask.id || `node-${String(index + 1).padStart(2, '0')}`,
    title: subtask.title,
    phase: subtask.phase || 'review',
    assignedAgentId: subtask.assignedAgentId,
    objective: subtask.description,
    description: subtask.description,
    dependsOn: stringArray(subtask.dependsOn),
    requiredInputs: stringArray(subtask.requiredInputs),
    expectedOutputs: stringArray(subtask.expectedOutputs?.length ? subtask.expectedOutputs : [subtask.expectedOutput]),
    expectedOutput: subtask.expectedOutput || '',
    executionMode: subtask.executionMode || 'report',
    successCriteria: stringArray(subtask.successCriteria),
    skipCondition: subtask.skipCondition || '',
  }))
  return {
    decision: 'ready_to_plan',
    taskTitle: plan.taskTitle || '',
    goal: plan.goal || '',
    planningNotes: stringArray(plan.planningNotes),
    changeSummary: stringArray(plan.changeSummary),
    participants: normalizeParticipants(plan.participants, workflow),
    workflow,
    subtasks,
    acceptanceCriteria: stringArray(plan.acceptanceCriteria),
  }
}

export function validatePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') errors.push('计划必须是 JSON 对象')

  if (plan?.decision === 'need_clarification') {
    const questions = Array.isArray(plan.questions) ? plan.questions : []
    if (!questions.length) errors.push('need_clarification 必须提供 questions')
    const normalized = {
      decision: 'need_clarification',
      taskTitle: String(plan.taskTitle || '').trim(),
      knownFacts: stringArray(plan.knownFacts),
      missingInformation: stringArray(plan.missingInformation),
      questions: questions.map((question, index) => ({
        id: String(question?.id || `q${index + 1}`).trim(),
        question: String(question?.question || '').trim(),
        reason: String(question?.reason || '').trim(),
        required: question?.required !== false,
      })),
    }
    for (const [index, question] of normalized.questions.entries()) {
      if (!question.question) errors.push(`第 ${index + 1} 个澄清问题缺少 question`)
    }
    if (errors.length) {
      const error = new Error(errors.join('；'))
      error.validationErrors = errors
      throw error
    }
    return normalized
  }

  const source = Array.isArray(plan?.workflow) ? plan : normalizeLegacyPlan(plan)
  if (source.decision && source.decision !== 'ready_to_plan') {
    errors.push(`未知 decision：${source.decision}`)
  }

  const rawWorkflow = Array.isArray(source.workflow) ? source.workflow : []
  if (!rawWorkflow.length) errors.push('workflow 至少需要 1 个节点')
  const knownIds = new Set(rawWorkflow.map((node, index) => String(node?.id || `node-${String(index + 1).padStart(2, '0')}`).trim()))
  const workflow = rawWorkflow.map((node, index) => normalizeWorkflowNode(node, index, knownIds))
  validateWorkflowGraph(workflow, errors)

  if (errors.length) {
    const error = new Error(errors.join('；'))
    error.validationErrors = errors
    throw error
  }

  return {
    decision: 'ready_to_plan',
    taskTitle: source.taskTitle || '',
    goal: source.goal || '',
    planningNotes: stringArray(source.planningNotes),
    changeSummary: stringArray(source.changeSummary),
    participants: normalizeParticipants(source.participants, workflow),
    workflow,
    subtasks: workflow.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.objective,
      assignedAgentId: node.assignedAgentId,
      expectedOutput: node.expectedOutputs.join('\n'),
      phase: node.phase,
      dependsOn: node.dependsOn,
      requiredInputs: node.requiredInputs,
      expectedOutputs: node.expectedOutputs,
      executionMode: node.executionMode,
      successCriteria: node.successCriteria,
      skipCondition: node.skipCondition,
    })),
    acceptanceCriteria: stringArray(source.acceptanceCriteria),
  }
}

export function isClarificationDecision(plan) {
  return plan?.decision === 'need_clarification'
}

export function isWorkflowPlan(plan) {
  return plan?.decision === 'ready_to_plan' && Array.isArray(plan.workflow)
}
