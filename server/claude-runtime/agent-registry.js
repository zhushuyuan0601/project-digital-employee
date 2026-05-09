import {
  defaultAgentDefinitions,
  getAgentDefinition as getDbAgentDefinition,
  listAgentDefinitions as listDbAgentDefinitions,
  updateAgentDefinition as updateDbAgentDefinition,
} from '../db/agents.js'

function fallbackAgents() {
  return defaultAgentDefinitions()
}

function safeListAgents(options = {}) {
  try {
    const agents = listDbAgentDefinitions(options)
    return agents.length ? agents : fallbackAgents().filter((agent) => {
      if (options.enabledOnly && !agent.enabled) return false
      if (options.includeCoordinator === false && agent.coordinator) return false
      return true
    })
  } catch {
    return fallbackAgents().filter((agent) => {
      if (options.enabledOnly && !agent.enabled) return false
      if (options.includeCoordinator === false && agent.coordinator) return false
      return true
    })
  }
}

export function listAgentDefinitions(options = {}) {
  return safeListAgents(options)
}

export function listEnabledAgents(options = {}) {
  return safeListAgents({ ...options, enabledOnly: true })
}

export function getAgentDefinition(agentId) {
  try {
    return getDbAgentDefinition(agentId) || fallbackAgents().find((agent) => agent.id === agentId) || null
  } catch {
    return fallbackAgents().find((agent) => agent.id === agentId) || null
  }
}

export function getExecutableAgents() {
  return listEnabledAgents({ includeCoordinator: false })
}

export function getCoordinatorAgent() {
  return listEnabledAgents().find((agent) => agent.coordinator) || getAgentDefinition('xiaomu')
}

export function updateAgentDefinition(agentId, updates) {
  return updateDbAgentDefinition(agentId, updates)
}

export function runtimeAgentMap() {
  return Object.fromEntries(
    listAgentDefinitions().map((agent) => [
      agent.id,
      {
        name: agent.name,
        runtimeAgentId: agent.runtimeAgentId,
        sessionKey: `claude:${agent.id}:main`,
        roleId: agent.roleId,
      },
    ])
  )
}

export function roleDefinitions() {
  return Object.fromEntries(
    listAgentDefinitions().map((agent) => [
      agent.id,
      {
        name: agent.name,
        roleName: agent.roleName,
        reportName: agent.reportName || `${agent.name}-报告`,
        description: agent.description,
        boundary: agent.boundary,
      },
    ])
  )
}

export function agentDefinitionsVersion() {
  const agents = listAgentDefinitions()
  return agents.reduce((latest, agent) => Math.max(latest, Number(agent.updatedAt || 0)), 0)
}

export function agentPromptList() {
  return getExecutableAgents()
    .map((agent) => [
      `- ${agent.id}: ${agent.name}，${agent.description}`,
      `  能力: ${agent.capabilities.join('、') || '未配置'}`,
      `  角色边界: ${agent.boundary}`,
      `  输入契约: ${agent.inputContract.join('、') || '按任务上下文判断'}`,
      `  输出契约: ${agent.outputContract.join('、') || 'Markdown 报告'}`,
      `  工具范围: ${agent.allowedTools.join('、') || '无工具'}`,
      `  风险等级: ${agent.riskLevel}`,
    ].join('\n'))
    .join('\n')
}

export function intersectTools(...toolSets) {
  const normalized = toolSets
    .filter((set) => Array.isArray(set) && set.length)
    .map((set) => new Set(set.map((tool) => String(tool).trim()).filter(Boolean)))
  if (!normalized.length) return []
  const [first, ...rest] = normalized
  return [...first].filter((tool) => rest.every((set) => set.has(tool)))
}

export function effectiveToolsForJob({ systemTools = [], agentId, requiredTools = [] }) {
  const agent = getAgentDefinition(agentId)
  const agentTools = agent?.allowedTools || []
  if (Array.isArray(requiredTools) && requiredTools.length) {
    return intersectTools(systemTools, agentTools, requiredTools)
  }
  return intersectTools(systemTools, agentTools)
}
