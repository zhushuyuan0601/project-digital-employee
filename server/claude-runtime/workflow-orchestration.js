import {
  addTaskEvent,
  getTaskDetail,
  listAgentRuns,
  refreshWorkflowReadiness,
} from '../db/tasks.js'

let runtimeApi = null

export function setWorkflowRuntimeApi(api) {
  runtimeApi = api
}

function runtimeEngineForTask(task) {
  return task?.runtime_engine === 'codex' ? 'codex' : 'claudecode'
}

function runtimeMode(engine) {
  return engine === 'codex' ? 'codex-runtime' : 'claude-runtime'
}

function runtimeQueueLabel(engine) {
  return engine === 'codex' ? 'Codex Runtime' : 'Claude Code Runtime'
}

function requireRuntimeApi() {
  if (!runtimeApi?.enqueueSubtaskRun || !runtimeApi?.enqueueSummaryRun) {
    throw new Error('Workflow runtime API has not been configured')
  }
  return runtimeApi
}

export function enqueueSubtasksForTask(taskId) {
  refreshWorkflowReadiness(taskId)
  const task = getTaskDetail(taskId)
  if (!task) throw new Error('Task not found')
  const { enqueueSubtaskRun } = requireRuntimeApi()
  const runs = []
  for (const subtask of task.subtasks || []) {
    if (['ready', 'failed'].includes(subtask.status)) {
      const run = enqueueSubtaskRun(subtask.id)
      if (run) runs.push(run)
    }
  }
  return runs
}

export function hasActiveSummaryRun(taskId) {
  return listAgentRuns({ taskId, limit: 100 }).some((run) => (
    String(run.id || '').startsWith('summary-') &&
    ['queued', 'running', 'completed'].includes(run.status)
  ))
}

export function enqueueSummaryRun(taskId) {
  const { enqueueSummaryRun: enqueueRuntimeSummaryRun } = requireRuntimeApi()
  return enqueueRuntimeSummaryRun(taskId)
}

export function runWorkflowScheduler(taskId) {
  const { task } = refreshWorkflowReadiness(taskId)
  if (!task) return []
  const runs = enqueueSubtasksForTask(taskId)
  const allDone = task.subtasks.length > 0 && task.subtasks.every((subtask) => ['completed', 'skipped'].includes(subtask.status))
  if (allDone && !hasActiveSummaryRun(taskId) && task.status !== 'completed') {
    const runtimeEngine = runtimeEngineForTask(task)
    addTaskEvent({
      taskId,
      agentId: 'xiaomu',
      type: 'workflow.completed',
      message: '所有必要流程节点已完成，自动请求小呦最终汇总',
    })
    addTaskEvent({
      taskId,
      agentId: 'xiaomu',
      type: 'summary.request.queued',
      message: `所有流程节点已完成，小呦最终汇总已自动进入 ${runtimeQueueLabel(runtimeEngine)} 队列`,
      payload: { sessionKey: task.coordinator_session_key, mode: runtimeMode(runtimeEngine), runtimeEngine, trigger: 'auto' },
    })
    runs.push(enqueueSummaryRun(taskId))
  }
  return runs
}
