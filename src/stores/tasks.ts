import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { taskApi } from '@/api/tasks'
import type { CreateTaskRequest, Task, TaskEvent, TaskOutput, TaskStatus } from '@/types/task'

const DEFAULT_EVENT_LIMIT = 400
const LOCAL_EVENT_WINDOW_SECONDS = 2

type FetchTaskOptions = {
  refreshEvents?: boolean
  eventLimit?: number
  includeEvents?: boolean
}

type RuntimeEventPayload = {
  type: string
  taskId: string
  subtaskId?: string
  agentId?: string
  message?: string
  created_at?: number
  timestamp?: number
  runId?: string
  kind?: string
  toolName?: string
  sessionId?: string
  outputPath?: string
  error?: string
}

function taskWithoutEvents(task: Task): Task {
  const next = { ...task }
  delete next.events
  return next
}

function eventTimestamp(event: TaskEvent) {
  return Number(event.created_at || 0)
}

function runtimeEventPayload(event: RuntimeEventPayload) {
  const payload: Record<string, unknown> = {}
  if (event.runId) payload.runId = event.runId
  if (event.kind) payload.kind = event.kind
  if (event.toolName) payload.toolName = event.toolName
  if (event.sessionId) payload.sessionId = event.sessionId
  if (event.outputPath) payload.path = event.outputPath
  if (event.error) payload.error = event.error
  return Object.keys(payload).length > 0 ? payload : null
}

function trimAndSortEvents(events: TaskEvent[], limit = DEFAULT_EVENT_LIMIT) {
  const deduped = new Map<string, TaskEvent>()
  for (const event of events) {
    deduped.set(String(event.id), event)
  }

  return [...deduped.values()]
    .sort((a, b) => {
      const timeDiff = eventTimestamp(a) - eventTimestamp(b)
      if (timeDiff !== 0) return timeDiff
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(-limit)
}

function computeTaskProgress(task: Task) {
  const subtasks = task.subtasks || []
  if (!subtasks.length) return 0
  const total = subtasks.reduce((sum, subtask) => sum + Number(subtask.progress || 0), 0)
  return Math.round(total / subtasks.length)
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const selectedTaskId = ref<string>('')
  const selectedTask = ref<Task | null>(null)
  const taskEvents = ref<Record<string, TaskEvent[]>>({})
  const outputs = ref<TaskOutput[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeTasks = computed(() =>
    tasks.value.filter(task => !['completed', 'cancelled'].includes(task.status))
  )

  function eventsForTask(taskId: string) {
    return taskEvents.value[taskId] || []
  }

  function attachEvents(task: Task): Task {
    return {
      ...taskWithoutEvents(task),
      events: eventsForTask(task.id),
    }
  }

  function syncSelectedTask(taskId = selectedTaskId.value) {
    if (!taskId) return
    const baseTask = tasks.value.find(task => task.id === taskId)
    if (baseTask) {
      selectedTask.value = attachEvents(baseTask)
    } else if (selectedTask.value?.id === taskId) {
      selectedTask.value = attachEvents(selectedTask.value)
    }
  }

  function cacheTaskEvents(taskId: string, events: TaskEvent[], limit = DEFAULT_EVENT_LIMIT) {
    taskEvents.value = {
      ...taskEvents.value,
      [taskId]: trimAndSortEvents(events, limit),
    }
    syncSelectedTask(taskId)
    return taskEvents.value[taskId]
  }

  function appendTaskEvent(taskId: string, event: TaskEvent, limit = DEFAULT_EVENT_LIMIT) {
    const current = eventsForTask(taskId)
    const previous = current[current.length - 1]

    if (
      previous &&
      previous.type === 'agent.tool' &&
      event.type === 'agent.tool' &&
      previous.agent_id === event.agent_id &&
      previous.subtask_id === event.subtask_id &&
      previous.message === event.message &&
      eventTimestamp(event) - eventTimestamp(previous) <= LOCAL_EVENT_WINDOW_SECONDS
    ) {
      const nextEvent = {
        ...previous,
        created_at: event.created_at,
        payload_json: {
          ...(previous.payload_json || {}),
          localCount: Number((previous.payload_json as Record<string, unknown> | null)?.localCount || 1) + 1,
        },
        message: `${previous.message} · x${Number((previous.payload_json as Record<string, unknown> | null)?.localCount || 1) + 1}`,
      }
      const nextEvents = [...current.slice(0, -1), nextEvent]
      return cacheTaskEvents(taskId, nextEvents, limit)
    }

    return cacheTaskEvents(taskId, [...current, event], limit)
  }

  function upsertTask(task: Task) {
    const normalizedTask = taskWithoutEvents(task)
    const index = tasks.value.findIndex(item => item.id === normalizedTask.id)
    if (index >= 0) {
      tasks.value[index] = { ...tasks.value[index], ...normalizedTask }
    } else {
      tasks.value.unshift(normalizedTask)
    }

    if (selectedTaskId.value === normalizedTask.id || selectedTask.value?.id === normalizedTask.id) {
      selectedTask.value = attachEvents(normalizedTask)
    }
  }

  function mutateTaskLocal(taskId: string, mutator: (task: Task) => void) {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index === -1) return

    const cloned: Task = {
      ...tasks.value[index],
      subtasks: tasks.value[index].subtasks.map(subtask => ({ ...subtask })),
      outputs: [...tasks.value[index].outputs],
    }
    mutator(cloned)
    cloned.progress = computeTaskProgress(cloned)
    tasks.value[index] = taskWithoutEvents(cloned)
    syncSelectedTask(taskId)
  }

  function applyRuntimeEventPatch(event: RuntimeEventPayload) {
    mutateTaskLocal(event.taskId, (task) => {
      const subtask = event.subtaskId
        ? task.subtasks.find(item => item.id === event.subtaskId)
        : null

      switch (event.type) {
        case 'plan.accepted':
          task.status = 'dispatching'
          break
        case 'task.dispatch.queued':
          task.status = 'running'
          break
        case 'plan.invalid':
          task.status = 'failed'
          break
        case 'summary.request.queued':
          task.status = 'reviewing'
          break
        case 'task.completed':
          task.status = 'completed'
          break
        case 'subtask.retry.queued':
        case 'agent.run.queued':
          if (subtask) {
            subtask.status = 'assigned'
            subtask.progress = Math.max(Number(subtask.progress || 0), 10)
            subtask.error = null
          }
          break
        case 'agent.start':
          if (subtask) {
            subtask.status = 'running'
            subtask.progress = Math.max(Number(subtask.progress || 0), 30)
            subtask.error = null
          }
          break
        case 'outputs.bound':
          if (subtask) {
            subtask.status = subtask.status === 'completed' ? 'completed' : 'running'
            subtask.progress = Math.max(Number(subtask.progress || 0), 80)
          }
          break
        case 'agent.done':
          if (subtask) {
            subtask.status = 'completed'
            subtask.progress = 100
            subtask.error = null
          }
          break
        case 'agent.error':
        case 'agent.orphaned':
          if (subtask) {
            subtask.status = 'failed'
            subtask.progress = Math.max(Number(subtask.progress || 0), 5)
            subtask.error = event.error || event.message || '任务执行失败'
          } else {
            task.status = 'failed'
          }
          break
        case 'agent.cancelled':
          if (subtask) {
            subtask.status = 'blocked'
            subtask.error = event.message || '运行已取消'
          }
          break
      }
    })
  }

  async function fetchTaskEvents(taskId: string, { limit = DEFAULT_EVENT_LIMIT, beforeId }: { limit?: number; beforeId?: number } = {}) {
    const response = await taskApi.listEvents(taskId, { limit, beforeId })
    cacheTaskEvents(taskId, [...eventsForTask(taskId), ...(response.events || [])], limit)
    return taskEvents.value[taskId] || []
  }

  async function fetchTasks() {
    loading.value = true
    error.value = null
    try {
      const response = await taskApi.listTasks({ limit: 100 })
      tasks.value = (response.tasks || []).map(taskWithoutEvents)
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

  async function fetchTask(taskId: string, options: FetchTaskOptions = {}) {
    const {
      refreshEvents = true,
      eventLimit = DEFAULT_EVENT_LIMIT,
      includeEvents = false,
    } = options

    selectedTaskId.value = taskId
    const response = await taskApi.getTask(taskId, includeEvents ? { includeEvents: true, eventLimit } : {})
    if (includeEvents && response.task.events) {
      cacheTaskEvents(taskId, response.task.events, eventLimit)
    }
    upsertTask(response.task)
    if (refreshEvents && !includeEvents) {
      await fetchTaskEvents(taskId, { limit: eventLimit })
    } else {
      syncSelectedTask(taskId)
    }
    return selectedTask.value || attachEvents(response.task)
  }

  function applyTaskResponse(task: Task) {
    if (task.events) {
      cacheTaskEvents(task.id, task.events)
    }
    upsertTask(task)
    return selectedTask.value || attachEvents(task)
  }

  async function createTask(payload: CreateTaskRequest) {
    const response = await taskApi.createTask(payload)
    const task = applyTaskResponse(response.task)
    selectedTaskId.value = task.id
    selectedTask.value = task
    return response
  }

  async function applyPlan(taskId: string, content: string | Record<string, unknown>) {
    const response = await taskApi.applyPlan(taskId, content)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function dispatchTask(taskId: string) {
    const response = await taskApi.dispatchTask(taskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function retrySubtask(subtaskId: string) {
    const response = await taskApi.retrySubtask(subtaskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function runPlan(taskId: string) {
    const response = await taskApi.runPlan(taskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function runSubtasks(taskId: string) {
    const response = await taskApi.runSubtasks(taskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function runSubtask(subtaskId: string) {
    const response = await taskApi.runSubtask(subtaskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function recordTaskDispatchResult(taskId: string, payload: { phase?: 'plan' | 'summary'; ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordTaskDispatchResult(taskId, payload)
    const task = applyTaskResponse(response.task)
    if (selectedTaskId.value === task.id) selectedTask.value = task
    return task
  }

  async function recordSubtaskDispatchResult(subtaskId: string, payload: { ok: boolean; error?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordSubtaskDispatchResult(subtaskId, payload)
    const task = applyTaskResponse(response.task)
    if (selectedTaskId.value === task.id) selectedTask.value = task
    return task
  }

  async function recordSubtaskAgentEvent(subtaskId: string, payload: { eventType: 'start' | 'assistant' | 'final' | 'done' | 'error'; message?: string; payload?: Record<string, unknown> }) {
    const response = await taskApi.recordSubtaskAgentEvent(subtaskId, payload)
    const task = applyTaskResponse(response.task)
    if (selectedTaskId.value === task.id) selectedTask.value = task
    return task
  }

  async function completeSubtask(subtaskId: string, resultSummary = '') {
    const response = await taskApi.completeSubtask(subtaskId, resultSummary)
    const task = applyTaskResponse(response.task)
    selectedTask.value = task
    return task
  }

  async function finalizeTask(taskId: string) {
    const response = await taskApi.finalizeTask(taskId)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function completeTask(taskId: string, summary = '') {
    const response = await taskApi.completeTask(taskId, summary)
    selectedTask.value = applyTaskResponse(response.task)
    return response
  }

  async function scanOutputs(taskId: string) {
    const response = await taskApi.scanOutputs(taskId)
    const task = applyTaskResponse(response.task)
    selectedTask.value = task
    return task
  }

  async function fetchOutputs(params: { taskId?: string; agentId?: string; status?: string } = {}) {
    const response = await taskApi.listOutputs(params)
    outputs.value = response.outputs || []
    return outputs.value
  }

  async function updateOutputStatus(outputId: number, status: 'pending_review' | 'accepted' | 'rejected') {
    const response = await taskApi.updateOutputStatus(outputId, status)
    outputs.value = outputs.value.map(output => output.id === outputId ? response.output : output)
    if (selectedTask.value) {
      selectedTask.value = {
        ...selectedTask.value,
        outputs: selectedTask.value.outputs.map(output => output.id === outputId ? response.output : output),
      }
    }
    return response.output
  }

  function ingestRuntimeEvent(event: RuntimeEventPayload) {
    if (!event.taskId) return null

    appendTaskEvent(event.taskId, {
      id: `live-${event.type}-${event.subtaskId || 'task'}-${event.timestamp || Date.now()}`,
      task_id: event.taskId,
      subtask_id: event.subtaskId || null,
      agent_id: event.agentId || null,
      type: event.type,
      message: event.message || event.error || event.type,
      payload_json: runtimeEventPayload(event),
      created_at: event.created_at || Math.floor((event.timestamp || Date.now()) / 1000),
    })

    applyRuntimeEventPatch(event)
    return selectedTask.value
  }

  function clearTaskEvents(taskId: string) {
    if (!taskEvents.value[taskId]) return
    const next = { ...taskEvents.value }
    delete next[taskId]
    taskEvents.value = next
    syncSelectedTask(taskId)
  }

  return {
    tasks,
    activeTasks,
    selectedTaskId,
    selectedTask,
    taskEvents,
    outputs,
    loading,
    error,
    fetchTasks,
    fetchTask,
    fetchTaskEvents,
    createTask,
    applyPlan,
    dispatchTask,
    retrySubtask,
    runPlan,
    runSubtasks,
    runSubtask,
    recordTaskDispatchResult,
    recordSubtaskDispatchResult,
    recordSubtaskAgentEvent,
    completeSubtask,
    finalizeTask,
    completeTask,
    scanOutputs,
    fetchOutputs,
    updateOutputStatus,
    ingestRuntimeEvent,
    clearTaskEvents,
  }
})
