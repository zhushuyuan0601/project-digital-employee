import {
  addTaskEvent,
  addAgentRunLog,
  createAgentRun,
  createSubtasksFromPlan,
  getAgentRun,
  getSubtask,
  getTaskDetail,
  listActiveAgentRuns,
  listActiveRunsForSubtask,
  listAgentRuns,
  markPlanInvalid,
  patchTaskRuntimeSession,
  patchSubtaskContext,
  refreshWorkflowReadiness,
  savePlan,
  updateAgentRun,
  updateSubtask,
  updateTask,
  upsertTaskOutput,
} from '../db/tasks.js'
import { getClaudeRuntimeConfig } from './config.js'
import { emitRuntimeEvent } from './event-bus.js'
import { writeRunReport } from './report-writer.js'
import {
  buildCoordinatorPlanPrompt,
  buildFinalSummaryPrompt,
  buildSubtaskPrompt,
  PLAN_OUTPUT_FORMAT,
  ROLE_DEFINITIONS,
} from './roles.js'
import { RUNTIME_AGENT_MAP, extractJsonPlan, validatePlan } from './plan-utils.js'
import { runClaudeQuery } from './sdk-runner.js'
import { ensureTaskWorkspace } from './workspace.js'

const terminalStatuses = new Set(['completed', 'failed', 'cancelled'])

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function makeRunId(prefix = 'run') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function summarize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000)
}

function logMessage(text, limit = 32000) {
  return String(text || '').slice(0, limit)
}

function emitTaskEvent(type, payload) {
  emitRuntimeEvent({
    type,
    created_at: nowSeconds(),
    timestamp: Date.now(),
    ...payload,
  })
}

function emitRunLog(job, type, message, payload = {}) {
  const log = addAgentRunLog({
    runId: job.run.id,
    taskId: job.taskId,
    subtaskId: job.subtaskId,
    agentId: job.agentId,
    type,
    message: logMessage(message),
    payload: {
      runId: job.run.id,
      kind: job.kind,
      ...payload,
    },
  })
  emitTaskEvent('agent.log', {
    taskId: job.taskId,
    subtaskId: job.subtaskId,
    agentId: job.agentId,
    runId: job.run.id,
    log,
  })
  return log
}

function inferRunKind(run) {
  if (run?.subtask_id) return 'subtask'
  if (String(run?.id || '').startsWith('summary-')) return 'summary'
  return 'plan'
}

function orphanReason(run, context = 'runtime') {
  const phase = run?.status === 'queued' ? '排队' : '运行'
  return context === 'startup'
    ? `Claude Runtime 服务启动时清理孤儿${phase}记录`
    : `检测到数据库中的孤儿${phase}记录，已自动清理后重新入队`
}

function sessionNow() {
  return new Date().toISOString()
}

function isLikelyResumeFailure(error) {
  return /resume|session|conversation|会话|not found|not exist|invalid|cannot resume|unable to resume/i.test(String(error || ''))
}

function taskCoordinatorSession(task) {
  if (!task?.id) return null
  const runtimeSession = task?.plan_json?.runtimeSessions?.coordinator
  if (runtimeSession?.claudeSessionId) return runtimeSession.claudeSessionId
  return listAgentRuns({ taskId: task?.id, limit: 50 })
    .find((run) => (
      !run.subtask_id &&
      run.agent_id === 'xiaomu' &&
      run.claude_session_id &&
      ['completed', 'failed', 'cancelled'].includes(run.status)
    ))?.claude_session_id || null
}

function coordinatorSessionPatch(task, result, job, phase) {
  const existing = task?.plan_json?.runtimeSessions?.coordinator || {}
  return {
    ...existing,
    sessionKey: task?.coordinator_session_key || `claude:task:${job.taskId}:xiaomu`,
    claudeSessionId: result.sessionId || getAgentRun(job.run.id)?.claude_session_id || null,
    lastRunId: job.run.id,
    lastPhase: phase,
    resumeCount: Number(existing.resumeCount || 0) + (job.resumeSessionId ? 1 : 0),
    fallbackCount: Number(existing.fallbackCount || 0) + (job.sessionFallback ? 1 : 0),
    updatedAt: sessionNow(),
  }
}

function subtaskSessionPatch(subtask, result, job, extras = {}) {
  const existing = subtask?.context_json?.session || {}
  const claudeSessionId = result.sessionId || getAgentRun(job.run.id)?.claude_session_id || existing.claudeSessionId || null
  return {
    session: {
      ...existing,
      sessionKey: subtask?.session_key || existing.sessionKey || `claude:task:${job.taskId}:node:${job.subtaskId}:${job.agentId}`,
      claudeSessionId,
      lastRunId: job.run.id,
      updatedAt: sessionNow(),
      ...extras,
    },
    lastRunId: job.run.id,
    lastClaudeSessionId: claudeSessionId,
  }
}

class ClaudeRuntimeQueue {
  constructor() {
    this.jobs = []
    this.running = new Map()
    this.controllers = new Map()
  }

  get config() {
    return getClaudeRuntimeConfig()
  }

  status() {
    const config = this.config
    return {
      runtime: config.runtime,
      reportOnly: config.reportOnly,
      maxConcurrency: config.maxConcurrency,
      maxTurns: config.maxTurns,
      allowedTools: config.allowedTools,
      cwd: config.cwd,
      workspaceIsolation: config.workspaceIsolation,
      workspaceRoot: config.workspaceRoot,
      outputRoot: config.outputRoot,
      queued: this.jobs.length,
      running: this.running.size,
    }
  }

  trackedState(runId) {
    if (this.running.has(runId)) return 'running'
    if (this.jobs.some((job) => job.run.id === runId)) return 'queued'
    return null
  }

  enqueue(job) {
    this.jobs.push(job)
    emitRunLog(job, 'queue', `${ROLE_DEFINITIONS[job.agentId]?.name || job.agentId} 已进入 Claude Runtime 队列`, {
      queueDepth: this.jobs.length,
    })
    this.pump()
    return job.run
  }

  cancel(runId) {
    const queuedIndex = this.jobs.findIndex((job) => job.run.id === runId)
    if (queuedIndex >= 0) {
      const [job] = this.jobs.splice(queuedIndex, 1)
      updateAgentRun(runId, { status: 'cancelled', completed_at: nowSeconds(), error: '用户取消排队任务' })
      emitRunLog(job, 'cancelled', 'Claude Runtime 排队任务已取消')
      addTaskEvent({
        taskId: job.run.task_id,
        subtaskId: job.run.subtask_id,
        agentId: job.run.agent_id,
        type: 'agent.cancelled',
        message: 'Claude Runtime 排队任务已取消',
        payload: { runId },
      })
      emitTaskEvent('agent.cancelled', { taskId: job.run.task_id, subtaskId: job.run.subtask_id, agentId: job.run.agent_id, runId })
      if (job.run.subtask_id) {
        updateSubtask(job.run.subtask_id, { status: 'blocked', error: '排队任务已取消' })
      }
      return { ok: true, cancelled: 'queued' }
    }

    const controller = this.controllers.get(runId)
    if (controller) {
      controller.abort()
      return { ok: true, cancelled: 'running' }
    }

    return { ok: false, error: 'Run not found or already finished' }
  }

  pump() {
    const config = this.config
    while (this.running.size < config.maxConcurrency && this.jobs.length > 0) {
      const job = this.jobs.shift()
      this.running.set(job.run.id, job)
      this.execute(job).finally(() => {
        this.running.delete(job.run.id)
        this.controllers.delete(job.run.id)
        this.pump()
      })
    }
  }

  async runClaudeForJob(job, workspace, controller) {
    const config = this.config
    const base = {
      prompt: job.prompt,
      config,
      outputFormat: job.outputFormat,
      cwd: workspace.cwd,
      executionMode: job.executionMode || 'report',
      abortController: controller,
      onEvent: (event) => this.handleSdkEvent(job, event),
    }
    let first
    try {
      first = await runClaudeQuery({
        ...base,
        resume: job.resume,
      })
    } catch (err) {
      if (!job.resume || !isLikelyResumeFailure(err instanceof Error ? err.message : String(err))) throw err
      first = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
    if (first.ok || !job.resume || !isLikelyResumeFailure(first.error)) return first

    emitRunLog(job, 'session.resume_failed', `续接 Claude session 失败，已切换为新 session：${first.error}`, {
      resumeSessionId: job.resume,
      error: first.error,
    })
    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'session.resume_failed',
      message: 'Claude session 续接失败，已自动创建新 session 继续执行',
      payload: { runId: job.run.id, resumeSessionId: job.resume, error: first.error },
    })
    job.resume = null
    job.sessionFallback = true
    updateAgentRun(job.run.id, { claude_session_id: null })
    if (job.subtaskId) {
      const subtask = getSubtask(job.subtaskId)
      const session = subtask?.context_json?.session || {}
      patchSubtaskContext(job.subtaskId, {
        session: {
          ...session,
          fallbackCount: Number(session.fallbackCount || 0) + 1,
          updatedAt: sessionNow(),
        },
      })
    }
    const second = await runClaudeQuery({
      ...base,
      resume: null,
    })
    if (second.ok) {
      emitRunLog(job, 'session.fallback_created', '已创建新的 Claude session 并继续执行', {
        sessionId: second.sessionId || null,
      })
    }
    return second
  }

  async execute(job) {
    const config = this.config
    const run = job.run
    const controller = new AbortController()
    this.controllers.set(run.id, controller)
    const task = getTaskDetail(job.taskId)
    const workspace = await ensureTaskWorkspace({ config, task })

    updateAgentRun(run.id, { status: 'running', started_at: nowSeconds(), cwd: workspace.cwd })
    emitRunLog(job, 'start', `${ROLE_DEFINITIONS[job.agentId]?.name || job.agentId} 开始执行`, {
      cwd: workspace.cwd,
      sourceCwd: config.cwd,
      workspaceIsolation: workspace.isolated,
      allowedTools: config.allowedTools,
      maxTurns: config.maxTurns,
    })
    if (job.subtaskId) {
      updateSubtask(job.subtaskId, {
        status: 'running',
        progress: Math.max(Number(getSubtask(job.subtaskId)?.progress || 0), 30),
        started_at: getSubtask(job.subtaskId)?.started_at || nowSeconds(),
        error: null,
      })
    }

    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'agent.start',
      message: `${ROLE_DEFINITIONS[job.agentId]?.name || job.agentId} 开始执行 Claude Runtime run`,
      payload: { runId: run.id, kind: job.kind },
    })
    emitTaskEvent('agent.start', { taskId: job.taskId, subtaskId: job.subtaskId, agentId: job.agentId, runId: run.id, kind: job.kind })

    try {
      const result = await this.runClaudeForJob(job, workspace, controller)

      if (!result.ok) {
        await this.failJob(job, result.error || 'Claude Runtime 执行失败', result)
        return
      }

      if (job.kind === 'plan') {
        await this.completePlanJob(job, result)
      } else if (job.kind === 'summary') {
        await this.completeSummaryJob(job, result)
      } else {
        await this.completeSubtaskJob(job, result)
      }
    } catch (err) {
      if (controller.signal.aborted) {
        await this.cancelRunningJob(job)
      } else {
        await this.failJob(job, err instanceof Error ? err.message : String(err || 'Claude Runtime 执行失败'))
      }
    }
  }

  handleSdkEvent(job, event) {
    if (event.sessionId) {
      updateAgentRun(job.run.id, { claude_session_id: event.sessionId })
      if (job.subtaskId) {
        const subtask = getSubtask(job.subtaskId)
        const session = subtask?.context_json?.session || {}
        patchSubtaskContext(job.subtaskId, {
          session: {
            ...session,
            sessionKey: subtask?.session_key || session.sessionKey || '',
            claudeSessionId: event.sessionId,
            lastRunId: job.run.id,
            updatedAt: sessionNow(),
          },
          lastClaudeSessionId: event.sessionId,
        })
      }
    }

    if (event.type === 'start') {
      emitRunLog(job, 'system', `Claude session 已初始化${event.sessionId ? `: ${event.sessionId}` : ''}`, {
        sessionId: event.sessionId || null,
      })
    }

    if (event.type === 'assistant' && event.text) {
      emitRunLog(job, event.snapshot ? 'assistant.snapshot' : 'assistant.delta', event.text, {
        sessionId: event.sessionId || null,
        snapshot: Boolean(event.snapshot),
      })
    }

    if (event.type === 'tool') {
      emitRunLog(job, 'tool', `Claude Code 使用只读工具：${event.toolName}`, {
        toolName: event.toolName,
        sessionId: event.sessionId || null,
      })
      addTaskEvent({
        taskId: job.taskId,
        subtaskId: job.subtaskId,
        agentId: job.agentId,
        type: 'agent.tool',
        message: `Claude Code 使用只读工具：${event.toolName}`,
        payload: { runId: job.run.id, toolName: event.toolName },
      })
      emitTaskEvent('agent.tool', { taskId: job.taskId, subtaskId: job.subtaskId, agentId: job.agentId, runId: job.run.id, toolName: event.toolName })
    }

    if (event.type === 'result') {
      emitRunLog(job, event.ok ? 'result' : 'error', event.ok ? 'Claude Code 返回成功结果' : (event.error || 'Claude Code 返回失败结果'), {
        sessionId: event.sessionId || null,
        costUsd: event.costUsd || 0,
        durationMs: event.durationMs || 0,
        subtype: event.subtype || null,
      })
    }
  }

  async completePlanJob(job, result) {
    const rawPlan = result.structuredOutput || extractJsonPlan(result.text)
    let plan
    try {
      plan = validatePlan(rawPlan)
    } catch (err) {
      markPlanInvalid(job.taskId, `拆解计划校验失败：${err.message}`, {
        raw: rawPlan,
        errors: err.validationErrors || [err.message],
        runId: job.run.id,
      })
      await this.failJob(job, err.message, result)
      return
    }

    const task = getTaskDetail(job.taskId)
    savePlan(job.taskId, plan, {
      runtimeSessions: {
        coordinator: coordinatorSessionPatch(task, result, job, 'plan'),
      },
    })
    updateAgentRun(job.run.id, {
      status: 'completed',
      claude_session_id: result.sessionId,
      result_summary: summarize(result.text || JSON.stringify(plan)),
      completed_at: nowSeconds(),
    })
    const isClarifying = plan.decision === 'need_clarification'
    emitRunLog(job, 'done', isClarifying ? '小呦需要用户补充信息' : '小呦已完成动态协作计划', {
      sessionId: result.sessionId,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
    })
    addTaskEvent({
      taskId: job.taskId,
      agentId: job.agentId,
      type: 'agent.done',
      message: isClarifying
        ? '小呦已完成任务诊断，等待用户补充关键信息'
        : '小呦已完成动态协作计划，等待用户确认后启动工作流',
      payload: { runId: job.run.id, sessionId: result.sessionId, costUsd: result.costUsd, durationMs: result.durationMs },
    })
    emitTaskEvent('agent.done', { taskId: job.taskId, agentId: job.agentId, runId: job.run.id })
  }

  async completeSubtaskJob(job, result) {
    const report = await writeRunReport({
      config: this.config,
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      content: result.text,
    })

    upsertTaskOutput({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      name: report.name,
      type: 'markdown',
      path: report.path,
      mtime: report.mtime,
    })

    updateSubtask(job.subtaskId, {
      status: 'completed',
      progress: 100,
      result_summary: summarize(result.text),
      completed_at: nowSeconds(),
      error: null,
    })
    const completedSubtask = getSubtask(job.subtaskId)
    patchSubtaskContext(job.subtaskId, {
      ...subtaskSessionPatch(completedSubtask, result, job, {
        lastCompletedRunId: job.run.id,
      }),
      lastReportPath: report.path,
    })
    updateAgentRun(job.run.id, {
      status: 'completed',
      claude_session_id: result.sessionId,
      result_summary: summarize(result.text),
      output_path: report.path,
      completed_at: nowSeconds(),
    })
    emitRunLog(job, 'output', `已生成并绑定报告：${report.name}`, { path: report.path })
    emitRunLog(job, 'done', `${ROLE_DEFINITIONS[job.agentId]?.name || job.agentId} 已完成报告`, {
      sessionId: result.sessionId,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
      path: report.path,
    })
    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'outputs.bound',
      message: `已生成并绑定报告：${report.name}`,
      payload: { runId: job.run.id, path: report.path },
    })
    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'workflow.node.completed',
      message: `${ROLE_DEFINITIONS[job.agentId]?.name || job.agentId} 已完成报告`,
      payload: { runId: job.run.id, sessionId: result.sessionId, costUsd: result.costUsd, durationMs: result.durationMs },
    })
    emitTaskEvent('workflow.node.completed', { taskId: job.taskId, subtaskId: job.subtaskId, agentId: job.agentId, runId: job.run.id, outputPath: report.path })
    runWorkflowScheduler(job.taskId)
  }

  async completeSummaryJob(job, result) {
    const report = await writeRunReport({
      config: this.config,
      taskId: job.taskId,
      agentId: job.agentId,
      kind: 'summary',
      content: result.text,
    })
    upsertTaskOutput({
      taskId: job.taskId,
      agentId: job.agentId,
      name: report.name,
      type: 'markdown',
      path: report.path,
      mtime: report.mtime,
    })
    updateTask(job.taskId, { status: 'reviewing', summary: summarize(result.text) })
    const task = getTaskDetail(job.taskId)
    patchTaskRuntimeSession(job.taskId, 'coordinator', coordinatorSessionPatch(task, result, job, 'summary'))
    updateAgentRun(job.run.id, {
      status: 'completed',
      claude_session_id: result.sessionId,
      result_summary: summarize(result.text),
      output_path: report.path,
      completed_at: nowSeconds(),
    })
    emitRunLog(job, 'output', `已生成最终汇总：${report.name}`, { path: report.path })
    emitRunLog(job, 'done', '小呦已完成最终汇总', {
      sessionId: result.sessionId,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
      path: report.path,
    })
    addTaskEvent({
      taskId: job.taskId,
      agentId: job.agentId,
      type: 'agent.done',
      message: `小呦已生成最终汇总：${report.name}`,
      payload: { runId: job.run.id, sessionId: result.sessionId, path: report.path },
    })
    emitTaskEvent('agent.done', { taskId: job.taskId, agentId: job.agentId, runId: job.run.id, outputPath: report.path })
  }

  async failJob(job, error, result = {}) {
    const failedSessionId = result.sessionId || getAgentRun(job.run.id)?.claude_session_id || null
    updateAgentRun(job.run.id, {
      status: 'failed',
      claude_session_id: failedSessionId,
      error,
      completed_at: nowSeconds(),
    })
    emitRunLog(job, 'error', error, {
      sessionId: failedSessionId,
    })
    if (job.subtaskId) {
      const subtask = getSubtask(job.subtaskId)
      if (failedSessionId) {
        patchSubtaskContext(job.subtaskId, subtaskSessionPatch(subtask, { sessionId: failedSessionId }, job))
      }
      updateSubtask(job.subtaskId, {
        status: 'failed',
        progress: Math.max(Number(getSubtask(job.subtaskId)?.progress || 0), 5),
        error,
      })
    } else if (job.kind === 'plan' || job.kind === 'summary') {
      if (failedSessionId) {
        const task = getTaskDetail(job.taskId)
        patchTaskRuntimeSession(job.taskId, 'coordinator', coordinatorSessionPatch(task, { sessionId: failedSessionId }, job, `${job.kind}_failed`))
      }
      if (job.kind === 'plan') updateTask(job.taskId, { status: 'failed' })
    }
    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'agent.error',
      message: error,
      payload: { runId: job.run.id, sessionId: result.sessionId },
    })
    emitTaskEvent('agent.error', { taskId: job.taskId, subtaskId: job.subtaskId, agentId: job.agentId, runId: job.run.id, error })
  }

  async cancelRunningJob(job) {
    updateAgentRun(job.run.id, { status: 'cancelled', completed_at: nowSeconds(), error: '用户取消运行中任务' })
    emitRunLog(job, 'cancelled', 'Claude Runtime 运行中任务已取消')
    if (job.subtaskId) {
      updateSubtask(job.subtaskId, { status: 'blocked', error: '运行已取消' })
    }
    addTaskEvent({
      taskId: job.taskId,
      subtaskId: job.subtaskId,
      agentId: job.agentId,
      type: 'agent.cancelled',
      message: 'Claude Runtime 运行中任务已取消',
      payload: { runId: job.run.id },
    })
    emitTaskEvent('agent.cancelled', { taskId: job.taskId, subtaskId: job.subtaskId, agentId: job.agentId, runId: job.run.id })
  }
}

export const claudeRuntimeQueue = new ClaudeRuntimeQueue()

function cleanupOrphanRun(run, { context = 'runtime', preserveSubtaskState = false } = {}) {
  const reason = orphanReason(run, context)
  updateAgentRun(run.id, {
    status: 'failed',
    error: reason,
    completed_at: nowSeconds(),
  })

  const kind = inferRunKind(run)
  if (run.subtask_id) {
    const subtask = getSubtask(run.subtask_id)
    if (subtask && !preserveSubtaskState && subtask.status !== 'completed') {
      updateSubtask(run.subtask_id, {
        status: 'failed',
        progress: Math.max(Number(subtask.progress || 0), 5),
        error: reason,
      })
    }
  } else if (kind === 'plan') {
    updateTask(run.task_id, { status: 'failed' })
  }

  addTaskEvent({
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    type: 'agent.orphaned',
    message: reason,
    payload: { runId: run.id, previousStatus: run.status, kind },
  })
  addAgentRunLog({
    runId: run.id,
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    type: 'error',
    message: reason,
    payload: { runId: run.id, previousStatus: run.status, kind },
  })
  emitTaskEvent('agent.orphaned', {
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    runId: run.id,
    previousStatus: run.status,
    kind,
  })
}

function reconcileActiveRunsForSubtask(subtaskId) {
  const activeRuns = listActiveRunsForSubtask(subtaskId)
  if (!activeRuns.length) return null

  let trackedRun = null
  const orphanRuns = []

  for (const run of activeRuns) {
    const trackedState = claudeRuntimeQueue.trackedState(run.id)
    if (trackedState && !trackedRun) {
      trackedRun = run
      continue
    }
    orphanRuns.push(run)
  }

  for (const run of orphanRuns) {
    cleanupOrphanRun(run, {
      context: 'runtime',
      preserveSubtaskState: Boolean(trackedRun),
    })
  }

  return trackedRun
}

export function cleanupOrphanAgentRunsOnStartup() {
  const activeRuns = listActiveAgentRuns({ limit: 1000 })
  let cleaned = 0
  for (const run of activeRuns) {
    if (claudeRuntimeQueue.trackedState(run.id)) continue
    cleanupOrphanRun(run, { context: 'startup' })
    cleaned += 1
  }
  return { cleaned }
}

function createRunAndJob({ taskId, subtaskId = null, agentId, kind, prompt, outputFormat, resume = null }) {
  const config = getClaudeRuntimeConfig()
  const task = getTaskDetail(taskId)
  const cwd = config.workspaceIsolation
    ? `${config.workspaceRoot}/${taskId}/project`
    : config.cwd
  const run = createAgentRun({
    id: makeRunId(kind),
    taskId,
    subtaskId,
    agentId,
    roleName: ROLE_DEFINITIONS[agentId]?.roleName || agentId,
    claudeSessionId: resume || null,
    status: 'queued',
    cwd,
    prompt,
  })
  addTaskEvent({
    taskId,
    subtaskId,
    agentId,
    type: 'agent.run.queued',
    message: `${ROLE_DEFINITIONS[agentId]?.name || agentId} 已进入 Claude Runtime 队列`,
    payload: { runId: run.id, kind, resumeSessionId: resume || null },
  })
  emitTaskEvent('agent.run.queued', { taskId, subtaskId, agentId, runId: run.id, kind, sessionId: resume || undefined })
  return {
    run,
    taskId,
    subtaskId,
    agentId,
    kind,
    prompt,
    outputFormat,
    resume,
    resumeSessionId: resume,
    sessionFallback: false,
    executionMode: subtaskId ? getSubtask(subtaskId)?.context_json?.executionMode || 'report' : 'report',
  }
}

export function enqueuePlanRun(taskId) {
  const task = getTaskDetail(taskId)
  if (!task) throw new Error('Task not found')
  const activePlanRun = listActiveAgentRuns({ taskId, limit: 50 })
    .find((run) => !run.subtask_id && run.agent_id === 'xiaomu' && String(run.id || '').startsWith('plan-'))
  if (activePlanRun) return activePlanRun
  const job = createRunAndJob({
    taskId,
    agentId: 'xiaomu',
    kind: 'plan',
    prompt: buildCoordinatorPlanPrompt(task),
    outputFormat: PLAN_OUTPUT_FORMAT,
    resume: taskCoordinatorSession(task),
  })
  return claudeRuntimeQueue.enqueue(job)
}

export function enqueueSubtaskRun(subtaskId, { resume = null, prompt = null, kind = 'subtask' } = {}) {
  const subtask = getSubtask(subtaskId)
  if (!subtask) throw new Error('Subtask not found')
  if (subtask.status === 'blocked') {
    refreshWorkflowReadiness(subtask.task_id)
    const refreshed = getSubtask(subtaskId)
    if (refreshed?.status === 'blocked') {
      throw new Error('该节点前置依赖尚未完成，暂不能执行')
    }
  }
  if (['completed', 'skipped'].includes(subtask.status)) return subtask
  const active = reconcileActiveRunsForSubtask(subtaskId)
  if (active) return active
  const task = getTaskDetail(subtask.task_id)
  const job = createRunAndJob({
    taskId: task.id,
    subtaskId: subtask.id,
    agentId: subtask.assigned_agent_id,
    kind,
    prompt: prompt || buildSubtaskPrompt(task, subtask),
    resume,
  })
  const session = subtask.context_json?.session || {}
  patchSubtaskContext(subtask.id, {
    session: {
      ...session,
      sessionKey: subtask.session_key || session.sessionKey || '',
      claudeSessionId: resume || session.claudeSessionId || null,
      lastRunId: job.run.id,
      resumeCount: Number(session.resumeCount || 0) + (resume ? 1 : 0),
      updatedAt: sessionNow(),
    },
    lastRunId: job.run.id,
    retryCount: Number(subtask.context_json?.retryCount || 0) + (resume ? 1 : 0),
  })
  updateSubtask(subtask.id, { status: 'queued', progress: Math.max(Number(subtask.progress || 0), 15), error: null })
  addTaskEvent({
    taskId: task.id,
    subtaskId: subtask.id,
    agentId: subtask.assigned_agent_id,
    type: 'workflow.node.ready',
    message: `${subtask.title} 已满足依赖并进入 Claude Runtime 队列`,
    payload: { runId: job.run.id, executionMode: subtask.context_json?.executionMode || 'report' },
  })
  return claudeRuntimeQueue.enqueue(job)
}

export function enqueueSubtasksForTask(taskId) {
  refreshWorkflowReadiness(taskId)
  const task = getTaskDetail(taskId)
  if (!task) throw new Error('Task not found')
  const runs = []
  for (const subtask of task.subtasks || []) {
    if (['ready', 'failed'].includes(subtask.status)) {
      runs.push(enqueueSubtaskRun(subtask.id))
    }
  }
  return runs
}

function hasActiveSummaryRun(taskId) {
  return listAgentRuns({ taskId, limit: 100 }).some((run) => (
    String(run.id || '').startsWith('summary-') &&
    ['queued', 'running', 'completed'].includes(run.status)
  ))
}

function runWorkflowScheduler(taskId) {
  const { task } = refreshWorkflowReadiness(taskId)
  if (!task) return []
  const runs = enqueueSubtasksForTask(taskId)
  const allDone = task.subtasks.length > 0 && task.subtasks.every((subtask) => ['completed', 'skipped'].includes(subtask.status))
  if (allDone && !hasActiveSummaryRun(taskId) && task.status !== 'completed') {
    addTaskEvent({
      taskId,
      agentId: 'xiaomu',
      type: 'workflow.completed',
      message: '所有必要流程节点已完成，自动请求小呦最终汇总',
    })
    runs.push(enqueueSummaryRun(taskId))
  }
  return runs
}

export function runReadyWorkflow(taskId) {
  return runWorkflowScheduler(taskId)
}

export function enqueueSummaryRun(taskId) {
  const task = getTaskDetail(taskId)
  if (!task) throw new Error('Task not found')
  const job = createRunAndJob({
    taskId,
    agentId: 'xiaomu',
    kind: 'summary',
    prompt: buildFinalSummaryPrompt(task),
    resume: taskCoordinatorSession(task),
  })
  return claudeRuntimeQueue.enqueue(job)
}

export function retrySubtaskRun(subtaskId) {
  const subtask = getSubtask(subtaskId)
  if (!subtask) throw new Error('Subtask not found')
  const resume = subtask.context_json?.session?.claudeSessionId || subtask.context_json?.lastClaudeSessionId || null
  return enqueueSubtaskRun(subtaskId, { resume })
}

export function cancelRun(runId) {
  return claudeRuntimeQueue.cancel(runId)
}

export function getRun(runId) {
  return getAgentRun(runId)
}

export function listRuns(params) {
  return listAgentRuns(params)
}

export function getRuntimeStatus() {
  const queueStatus = claudeRuntimeQueue.status()
  const recentRuns = listAgentRuns({ limit: 500 })
  const compactRuns = recentRuns.map((run) => ({
    id: run.id,
    task_id: run.task_id,
    subtask_id: run.subtask_id,
    agent_id: run.agent_id,
    role_name: run.role_name,
    claude_session_id: run.claude_session_id,
    status: run.status,
    cwd: run.cwd,
    output_path: run.output_path,
    error: run.error ? `${run.error.slice(0, 240)}${run.error.length > 240 ? '...' : ''}` : null,
    started_at: run.started_at,
    completed_at: run.completed_at,
    created_at: run.created_at,
    updated_at: run.updated_at,
  }))
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = Math.floor(todayStart.getTime() / 1000)
  const completedRuns = recentRuns.filter((run) => run.status === 'completed')
  const finishedRuns = recentRuns.filter((run) => run.started_at && run.completed_at)
  const avgDurationMs = finishedRuns.length
    ? Math.round(finishedRuns.reduce((sum, run) => sum + Math.max(0, Number(run.completed_at) - Number(run.started_at)) * 1000, 0) / finishedRuns.length)
    : 0
  const avgQueueWaitMs = recentRuns.filter((run) => run.started_at && run.created_at).length
    ? Math.round(recentRuns
      .filter((run) => run.started_at && run.created_at)
      .reduce((sum, run) => sum + Math.max(0, Number(run.started_at) - Number(run.created_at)) * 1000, 0) / recentRuns.filter((run) => run.started_at && run.created_at).length)
    : 0
  const runCounts = recentRuns.reduce((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1
    return acc
  }, {})
  const agentStatsMap = new Map()
  for (const run of recentRuns) {
    const stat = agentStatsMap.get(run.agent_id) || {
      agentId: run.agent_id,
      roleName: run.role_name || run.agent_id,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
      avgDurationMs: 0,
      _durationTotal: 0,
      _durationCount: 0,
    }
    stat[run.status] = (stat[run.status] || 0) + 1
    stat.total += 1
    if (run.started_at && run.completed_at) {
      stat._durationTotal += Math.max(0, Number(run.completed_at) - Number(run.started_at)) * 1000
      stat._durationCount += 1
    }
    agentStatsMap.set(run.agent_id, stat)
  }
  const agentStats = [...agentStatsMap.values()].map((stat) => ({
    agentId: stat.agentId,
    roleName: stat.roleName,
    queued: stat.queued,
    running: stat.running,
    completed: stat.completed,
    failed: stat.failed,
    cancelled: stat.cancelled,
    total: stat.total,
    avgDurationMs: stat._durationCount ? Math.round(stat._durationTotal / stat._durationCount) : 0,
  }))
  const failureReasons = recentRuns
    .filter((run) => run.status === 'failed' && run.error)
    .reduce((acc, run) => {
      const label = String(run.error || '').slice(0, 120)
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})
  return {
    ...queueStatus,
    completedToday: completedRuns.filter((run) => Number(run.completed_at || 0) >= today).length,
    failedToday: recentRuns.filter((run) => run.status === 'failed' && Number(run.completed_at || 0) >= today).length,
    avgDurationMs,
    avgQueueWaitMs,
    successRate: recentRuns.length ? Math.round((completedRuns.length / recentRuns.length) * 1000) / 10 : 100,
    runCounts,
    agentStats,
    failureReasons: Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    recentRuns: compactRuns.slice(0, 100),
    healthy: true,
  }
}
