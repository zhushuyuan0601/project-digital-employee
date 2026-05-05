export const RUNTIME_AGENT_MAP = {
  xiaomu: { name: '小呦', runtimeAgentId: 'ceo', sessionKey: 'claude:xiaomu:main', roleId: 'ceo' },
  xiaoyan: { name: '研究员', runtimeAgentId: 'researcher', sessionKey: 'claude:xiaoyan:main', roleId: 'researcher' },
  xiaochan: { name: '产品经理', runtimeAgentId: 'pm', sessionKey: 'claude:xiaochan:main', roleId: 'pm' },
  xiaokai: { name: '研发工程师', runtimeAgentId: 'tech-lead', sessionKey: 'claude:xiaokai:main', roleId: 'tech-lead' },
  xiaoce: { name: '测试员', runtimeAgentId: 'team-qa', sessionKey: 'claude:xiaoce:main', roleId: 'team-qa' },
}

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

export function validatePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') errors.push('计划必须是 JSON 对象')
  if (!Array.isArray(plan?.subtasks) || plan.subtasks.length === 0) errors.push('subtasks 至少需要 1 个')
  for (const [index, subtask] of (plan?.subtasks || []).entries()) {
    if (!subtask.title) errors.push(`第 ${index + 1} 个子任务缺少 title`)
    if (!subtask.description) errors.push(`第 ${index + 1} 个子任务缺少 description`)
    if (!RUNTIME_AGENT_MAP[subtask.assignedAgentId] || subtask.assignedAgentId === 'xiaomu') {
      errors.push(`第 ${index + 1} 个子任务 assignedAgentId 不合法：${subtask.assignedAgentId || '空'}`)
    }
  }
  if (errors.length) {
    const error = new Error(errors.join('；'))
    error.validationErrors = errors
    throw error
  }
  return {
    taskTitle: plan.taskTitle || '',
    goal: plan.goal || '',
    subtasks: plan.subtasks.map((subtask) => ({
      title: subtask.title,
      description: subtask.description,
      assignedAgentId: subtask.assignedAgentId,
      expectedOutput: subtask.expectedOutput || '',
    })),
    acceptanceCriteria: Array.isArray(plan.acceptanceCriteria) ? plan.acceptanceCriteria : [],
  }
}
