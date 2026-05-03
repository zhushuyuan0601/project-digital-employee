import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { taskApi } from '@/api/tasks'
import type { CreateTaskRequest, Task, TaskOutput } from '@/types/task'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const selectedTaskId = ref<string>('')
  const selectedTask = ref<Task | null>(null)
  const outputs = ref<TaskOutput[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeTasks = computed(() =>
    tasks.value.filter(task => !['completed', 'cancelled'].includes(task.status))
  )

  async function fetchTasks() {
    loading.value = true
    error.value = null
    try {
      const response = await taskApi.listTasks({ limit: 100 })
      tasks.value = response.tasks || []
      if (!selectedTaskId.value && tasks.value.length > 0) {
        selectedTaskId.value = tasks.value[0].id
      }
      if (selectedTaskId.value) {
        await fetchTask(selectedTaskId.value)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载任务失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchTask(taskId: string) {
    selectedTaskId.value = taskId
    const response = await taskApi.getTask(taskId)
    selectedTask.value = response.task
    upsertTask(response.task)
    return response.task
  }

  async function createTask(payload: CreateTaskRequest) {
    const response = await taskApi.createTask(payload)
    upsertTask(response.task)
    selectedTaskId.value = response.task.id
    selectedTask.value = response.task
    return response
  }

  async function applyPlan(taskId: string, content: string | Record<string, unknown>) {
    const response = await taskApi.applyPlan(taskId, content)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response
  }

  async function retrySubtask(subtaskId: string) {
    const response = await taskApi.retrySubtask(subtaskId)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response
  }

  async function recordTaskDispatchResult(taskId: string, payload: { phase?: 'plan' | 'summary'; ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordTaskDispatchResult(taskId, payload)
    upsertTask(response.task)
    if (selectedTaskId.value === response.task.id) selectedTask.value = response.task
    return response.task
  }

  async function recordSubtaskDispatchResult(subtaskId: string, payload: { ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordSubtaskDispatchResult(subtaskId, payload)
    upsertTask(response.task)
    if (selectedTaskId.value === response.task.id) selectedTask.value = response.task
    return response.task
  }

  async function recordSubtaskAgentEvent(subtaskId: string, payload: { eventType: 'start' | 'assistant' | 'final' | 'done' | 'error'; message?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordSubtaskAgentEvent(subtaskId, payload)
    upsertTask(response.task)
    if (selectedTaskId.value === response.task.id) selectedTask.value = response.task
    return response.task
  }

  async function completeSubtask(subtaskId: string, resultSummary = '') {
    const response = await taskApi.completeSubtask(subtaskId, resultSummary)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response.task
  }

  async function finalizeTask(taskId: string) {
    const response = await taskApi.finalizeTask(taskId)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response
  }

  async function completeTask(taskId: string, summary = '') {
    const response = await taskApi.completeTask(taskId, summary)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response
  }

  async function scanOutputs(taskId: string) {
    const response = await taskApi.scanOutputs(taskId)
    upsertTask(response.task)
    selectedTask.value = response.task
    return response.task
  }

  async function fetchOutputs(params: { taskId?: string; agentId?: string; status?: string } = {}) {
    const response = await taskApi.listOutputs(params)
    outputs.value = response.outputs || []
    return outputs.value
  }

  function upsertTask(task: Task) {
    const index = tasks.value.findIndex(item => item.id === task.id)
    if (index >= 0) {
      tasks.value[index] = { ...tasks.value[index], ...task }
    } else {
      tasks.value.unshift(task)
    }
  }

  return {
    tasks,
    activeTasks,
    selectedTaskId,
    selectedTask,
    outputs,
    loading,
    error,
    fetchTasks,
    fetchTask,
    createTask,
    applyPlan,
    retrySubtask,
    recordTaskDispatchResult,
    recordSubtaskDispatchResult,
    recordSubtaskAgentEvent,
    completeSubtask,
    finalizeTask,
    completeTask,
    scanOutputs,
    fetchOutputs,
  }
})
