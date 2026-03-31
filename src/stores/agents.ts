import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Agent, AgentRole, AgentStatus } from '@/types/agent'

// Agent 到 Gateway Agent 的映射配置
export const AGENT_TO_GATEWAY_MAP: Record<string, string> = {
  xiaomu: 'ceo',           // 项目管理/小呦 <-> ceo (项目统筹)
  xiaokai: 'tech-lead',    // 研发工程师 <-> tech-lead (技术开发)
  xiaochan: 'pm',          // 产品经理 <-> pm (产品设计)
  xiaoyan: 'researcher',   // 研究员 <-> researcher (调研分析)
  xiaoce: 'team-qa'        // 测试员 <-> team-qa (质量检查)
}

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
    // 从 localStorage 加载已完成任务数
    const savedStats = loadCompletedTasksFromStorage()

    agents.value = [
      {
        id: 'xiaomu',
        name: '小呦',
        role: 'assistant',
        icon: '/avatars/avatar-xiaomu.jpeg',
        status: 'idle',
        completedTasks: savedStats['xiaomu'] || 0,
        description: '项目统筹 - 任务调度、分配、汇报',
        gatewayAgentId: 'ceo'
      },
      {
        id: 'xiaokai',
        name: '研发工程师',
        role: 'developer',
        icon: '/avatars/avatar-xiaokai.jpeg',
        status: 'idle',
        completedTasks: savedStats['xiaokai'] || 0,
        description: '技术开发 - 技术规划&研发管理',
        gatewayAgentId: 'tech-lead'
      },
      {
        id: 'xiaochan',
        name: '产品经理',
        role: 'product',
        icon: '/avatars/avatar-xiaochan.jpeg',
        status: 'idle',
        completedTasks: savedStats['xiaochan'] || 0,
        description: '产品设计 - 产品需求分析',
        gatewayAgentId: 'pm'
      },
      {
        id: 'xiaoyan',
        name: '研究员',
        role: 'analyst',
        icon: '/avatars/avatar-xiaoyan.jpeg',
        status: 'idle',
        completedTasks: savedStats['xiaoyan'] || 0,
        description: '调研分析 - 市场调研',
        gatewayAgentId: 'researcher'
      },
      {
        id: 'xiaoce',
        name: '测试员',
        role: 'tester',
        icon: '/avatars/avatar-xiaoce.jpeg',
        status: 'idle',
        completedTasks: savedStats['xiaoce'] || 0,
        description: '质量检查 - 测试验证&质量保障',
        gatewayAgentId: 'team-qa'
      }
    ]
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
