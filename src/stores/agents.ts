import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Agent, AgentRole, AgentStatus } from '@/types/agent'
import { AGENT_DEFINITIONS, AGENT_TO_GATEWAY_MAP } from '@/config/agents'

export { AGENT_TO_GATEWAY_MAP }

// localStorage key
const AGENT_STATS_KEY = 'agent_completed_tasks'

// 从 localStorage 加载已完成任务数
function loadCompletedTasksFromStorage(): Record<string, number> {
  try {
    const saved = localStorage.getItem(AGENT_STATS_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载 Agent 统计失败:', e)
  }
  return {}
}

// 保存已完成任务数到 localStorage
function saveCompletedTasksToStorage(stats: Record<string, number>) {
  try {
    localStorage.setItem(AGENT_STATS_KEY, JSON.stringify(stats))
  } catch (e) {
    console.error('保存 Agent 统计失败:', e)
  }
}

export const useAgentsStore = defineStore('agents', () => {
  // 状态
  const agents = ref<Agent[]>([])
  const loading = ref(false)

  // 计算属性
  const getAgent = computed(() => (id: string) =>
    agents.value.find(agent => agent.id === id)
  )

  const getAgentsByRole = computed(() => (role: AgentRole) =>
    agents.value.filter(agent => agent.role === role)
  )

  const availableAgents = computed(() =>
    agents.value.filter(agent => agent.status === 'idle')
  )

  const busyAgents = computed(() =>
    agents.value.filter(agent => agent.status === 'busy')
  )

  // 方法
  function setAgents(newAgents: Agent[]) {
    agents.value = newAgents
  }

  function updateAgentStatus(id: string, status: AgentStatus) {
    const agent = agents.value.find(a => a.id === id)
    if (agent) {
      agent.status = status
    }
  }

  function assignTaskToAgent(agentId: string, task: any) {
    const agent = agents.value.find(a => a.id === agentId)
    if (agent) {
      agent.currentTask = task
      agent.status = 'busy'
    }
  }

  function completeAgentTask(agentId: string) {
    const agent = agents.value.find(a => a.id === agentId)
    if (agent) {
      agent.currentTask = undefined
      agent.status = 'idle'
      agent.completedTasks++
      // 保存到 localStorage
      const stats = loadCompletedTasksFromStorage()
      stats[agentId] = agent.completedTasks
      saveCompletedTasksToStorage(stats)
    }
  }

  function incrementCompletedTasks(agentId: string) {
    const agent = agents.value.find(a => a.id === agentId)
    if (agent) {
      agent.completedTasks++
      // 保存到 localStorage
      const stats = loadCompletedTasksFromStorage()
      stats[agentId] = agent.completedTasks
      saveCompletedTasksToStorage(stats)
    }
  }

  // 清空所有 Agent 的已完成任务统计
  function clearCompletedTasks() {
    agents.value.forEach(agent => {
      agent.completedTasks = 0
    })
    // 清空 localStorage
    localStorage.removeItem(AGENT_STATS_KEY)
  }

  // 重置所有 Agent 状态（保留已完成任务统计）
  function resetAgentStatus() {
    agents.value.forEach(agent => {
      agent.currentTask = undefined
      agent.status = 'idle'
      // 注意：不重置 completedTasks，保留历史统计
    })
  }

  // 初始化默认 agents（从 localStorage 恢复统计）
  function initializeDefaultAgents() {
    const savedStats = loadCompletedTasksFromStorage()
    agents.value = AGENT_DEFINITIONS.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.roleType,
      icon: agent.icon,
      status: 'idle',
      completedTasks: savedStats[agent.id] || 0,
      description: agent.description,
      gatewayAgentId: agent.gatewayAgentId,
    }))
  }

  return {
    // State
    agents,
    loading,
    // Getters
    getAgent,
    getAgentsByRole,
    availableAgents,
    busyAgents,
    // Actions
    setAgents,
    updateAgentStatus,
    assignTaskToAgent,
    completeAgentTask,
    incrementCompletedTasks,
    resetAgentStatus,
    clearCompletedTasks,
    initializeDefaultAgents
  }
})
