import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskStatus, TaskLog } from '@/types/task'

// 生成唯一 ID
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useTasksStore = defineStore('tasks', () => {
  // 状态
  const tasks = ref<Task[]>([])
  const taskLogs = ref<TaskLog[]>([])
  const loading = ref(false)
  const currentTaskId = ref<string | null>(null)

  // 计算属性
  const allTasks = computed(() => tasks.value)

  const pendingTasks = computed(() =>
    tasks.value.filter(task => task.status === 'pending')
  )

  const inProgressTasks = computed(() =>
    tasks.value.filter(task => task.status === 'in_progress')
  )

  const completedTasks = computed(() =>
    tasks.value.filter(task => task.status === 'completed')
  )

  const failedTasks = computed(() =>
    tasks.value.filter(task => task.status === 'failed')
  )

  const getCurrentTask = computed(() =>
    tasks.value.find(task => task.id === currentTaskId.value)
  )

  const getTasksByAgent = computed(() => (agentId: string) =>
    tasks.value.filter(task => task.assignedTo === agentId)
  )

  // 方法
  function createTask(title: string, description: string): Task {
    const newTask: Task = {
      id: generateId(),
      title,
      description,
      status: 'pending',
      createdAt: Date.now(),
      progress: 0
    }
    tasks.value.unshift(newTask)
    return newTask
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = status
      if (status === 'in_progress') {
        task.startedAt = Date.now()
      } else if (status === 'completed') {
        task.completedAt = Date.now()
        task.progress = 100
      } else if (status === 'failed') {
        task.completedAt = Date.now()
      }
    }
  }

  function assignTask(taskId: string, agentId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.assignedTo = agentId
      addLog(taskId, agentId, 'assign', `任务分配给 ${agentId}`)
    }
  }

  function updateTaskProgress(taskId: string, progress: number) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress))
    }
  }

  function setTaskResult(taskId: string, result: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.result = result
    }
  }

  function addLog(
    taskId: string,
    agentId: string,
    action: 'assign' | 'start' | 'complete' | 'fail',
    message: string
  ) {
    const log: TaskLog = {
      id: generateId(),
      taskId,
      agentId,
      action,
      message,
      timestamp: Date.now()
    }
    taskLogs.value.unshift(log)
  }

  function getTaskLogs(taskId: string) {
    return taskLogs.value.filter(log => log.taskId === taskId)
  }

  function setCurrentTask(taskId: string | null) {
    currentTaskId.value = taskId
  }

  function removeTask(taskId: string) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
    }
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(task => task.status !== 'completed')
  }

  return {
    // State
    tasks,
    taskLogs,
    loading,
    currentTaskId,
    // Getters
    allTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    failedTasks,
    getCurrentTask,
    getTasksByAgent,
    // Actions
    createTask,
    updateTaskStatus,
    assignTask,
    updateTaskProgress,
    setTaskResult,
    addLog,
    getTaskLogs,
    setCurrentTask,
    removeTask,
    clearCompletedTasks
  }
})
