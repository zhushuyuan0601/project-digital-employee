import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, Project, Agent, TaskComment, ChatMessage, TaskStatus } from '@/types/task-board'
import { BOARD_COLUMNS, TARGET_AGENTS } from '@/types/task-board'
import * as taskBoardAPI from '@/api/task-board'

/**
 * 任务看板 Store
 */
export const useTaskBoardStore = defineStore('taskBoard', () => {
  // ========== State ==========
  const tasks = ref<Task[]>([])
  const projects = ref<Project[]>([])
  const agents = ref<Agent[]>([])
  const comments = ref<Record<number, TaskComment[]>>({})
  const messages = ref<Record<string, ChatMessage[]>>({})

  const isLoading = ref(false)
  const isLoadingTasks = ref(false)
  const error = ref<string | null>(null)

  const selectedTask = ref<Task | null>(null)
  const selectedProject = ref<number | undefined>(undefined)
  const selectedAgent = ref<string | undefined>(undefined)

  // ========== Getters ==========

  // 按状态分组的任务
  const tasksByStatus = computed(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      inbox: [],
      assigned: [],
      in_progress: [],
      review: [],
      quality_review: [],
      done: [],
      awaiting_owner: [],
    }

    for (const task of tasks.value) {
      const status = task.status || 'inbox'
      if (!grouped[status]) {
        grouped[status] = []
      }
      grouped[status].push(task)
    }

    // 每个状态内按优先级排序
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort((a, b) => {
        const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
    }

    return grouped
  })

  // 看板列配置
  const boardColumns = computed(() => BOARD_COLUMNS)

  // 获取 Agent 显示配置
  const getAgentDisplay = (agentName: string) => {
    return (
      TARGET_AGENTS.find(a => a.name === agentName) || {
        id: 'unknown',
        name: agentName,
        displayName: agentName,
        role: 'Agent',
        icon: '',
        color: '#909399',
      }
    )
  }

  // 获取 Agent 状态
  const getAgentStatus = (agentName: string): AgentStatus => {
    // 尝试精确匹配
    const agent = agents.value.find(a => a.name === agentName)
    if (agent) return agent.status

    // 尝试部分匹配（如 agent:ceo:main 匹配 ceo）
    const shortName = agentName.replace(/^agent:/, '').replace(/:main$/, '')
    const agentByShortName = agents.value.find(a => {
      const aShort = a.name.replace(/^agent:/, '').replace(/:main$/, '')
      return aShort === shortName
    })
    if (agentByShortName) return agentByShortName.status

    // 尝试反向匹配（如 ceo 匹配 agent:ceo:main）
    const agentByPartial = agents.value.find(a => {
      return a.name.includes(shortName) || shortName.includes(a.name.replace(/^agent:/, '').replace(/:main$/, ''))
    })
    if (agentByPartial) return agentByPartial.status

    return 'offline'
  }

  // 获取任务分配给哪个 Agent
  const getTaskAgent = (task: Task) => {
    if (!task.assigned_to) return null
    return getAgentDisplay(task.assigned_to)
  }

  // 获取任务的对话消息
  const getTaskMessages = (task: Task): ChatMessage[] => {
    if (!task.assigned_to) return []
    return messages.value[task.assigned_to] || []
  }

  // ========== Actions ==========

  // 加载所有数据
  async function loadBoardData() {
    isLoading.value = true
    error.value = null

    try {
      // 并行加载任务、项目和 Agent
      const [tasksRes, projectsRes, agentsRes] = await Promise.all([
        taskBoardAPI.getTasks({ limit: 100 }),
        taskBoardAPI.getProjects(),
        taskBoardAPI.getAgents(),
      ])

      tasks.value = tasksRes.tasks
      projects.value = projectsRes.projects
      agents.value = agentsRes.agents

      // 加载目标 Agent 的消息
      await loadAgentMessages()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
      console.error('[TaskBoard] 加载失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 加载任务列表
  async function loadTasks() {
    isLoadingTasks.value = true
    try {
      const params: Parameters<typeof taskBoardAPI.getTasks>[0] = { limit: 100 }
      if (selectedProject.value !== undefined) {
        params.project_id = selectedProject.value
      }
      if (selectedAgent.value !== undefined) {
        params.assigned_to = selectedAgent.value
      }

      const res = await taskBoardAPI.getTasks(params)
      tasks.value = res.tasks
    } catch (err) {
      console.error('[TaskBoard] 加载任务失败:', err)
    } finally {
      isLoadingTasks.value = false
    }
  }

  // 加载 Agent 消息
  async function loadAgentMessages() {
    for (const agent of TARGET_AGENTS) {
      try {
        const res = await taskBoardAPI.getChatMessages({
          to_agent: agent.name,
          limit: 20,
        })
        messages.value[agent.name] = res.messages
      } catch (err) {
        // 忽略消息加载错误
      }
    }
  }

  // 选择任务
  function selectTask(task: Task | null) {
    selectedTask.value = task
    if (task) {
      loadTaskComments(task.id)
    }
  }

  // 加载任务评论
  async function loadTaskComments(taskId: number) {
    try {
      const res = await taskBoardAPI.getTaskComments(taskId)
      comments.value[taskId] = res.comments
    } catch (err) {
      console.error('[TaskBoard] 加载评论失败:', err)
    }
  }

  // 更新任务状态
  async function updateTaskStatus(taskId: number, status: TaskStatus) {
    try {
      const res = await taskBoardAPI.updateTask(taskId, { status })
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index >= 0) {
        tasks.value[index] = res.task
      }
      return res.task
    } catch (err) {
      console.error('[TaskBoard] 更新任务状态失败:', err)
      throw err
    }
  }

  // 分配任务给 Agent
  async function assignTask(taskId: number, agentName: string) {
    try {
      const res = await taskBoardAPI.updateTask(taskId, {
        assigned_to: agentName,
        status: 'assigned',
      })
      const index = tasks.value.findIndex(t => t.id === taskId)
      if (index >= 0) {
        tasks.value[index] = res.task
      }
      return res.task
    } catch (err) {
      console.error('[TaskBoard] 分配任务失败:', err)
      throw err
    }
  }

  // 创建任务
  async function createTask(payload: Partial<Task>) {
    try {
      const res = await taskBoardAPI.createTask(payload)
      tasks.value.unshift(res.task)
      return res.task
    } catch (err) {
      console.error('[TaskBoard] 创建任务失败:', err)
      throw err
    }
  }

  // 设置筛选条件
  function setProjectFilter(projectId: number | undefined) {
    selectedProject.value = projectId
    loadTasks()
  }

  function setAgentFilter(agentName: string | undefined) {
    selectedAgent.value = agentName
    loadTasks()
  }

  // 刷新数据
  async function refresh() {
    await loadBoardData()
  }

  return {
    // State
    tasks,
    projects,
    agents,
    comments,
    messages,
    isLoading,
    isLoadingTasks,
    error,
    selectedTask,
    selectedProject,
    selectedAgent,

    // Getters
    tasksByStatus,
    boardColumns,

    // Actions
    loadBoardData,
    loadTasks,
    loadAgentMessages,
    selectTask,
    loadTaskComments,
    updateTaskStatus,
    assignTask,
    createTask,
    setProjectFilter,
    setAgentFilter,
    getAgentDisplay,
    getAgentStatus,
    getTaskAgent,
    getTaskMessages,
    refresh,
  }
})
