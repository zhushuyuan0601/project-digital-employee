import express from 'express'
import {
  createSubtasksFromPlan,
  createTask,
  getTaskDetail,
  savePlan,
} from '../db/tasks.js'
import { cancelRun, enqueueSubtaskRun, getRuntimeStatus } from '../claude-runtime/index.js'
import { claudeRuntimeEvents } from '../claude-runtime/event-bus.js'
import { RUNTIME_AGENT_MAP } from '../claude-runtime/plan-utils.js'

const router = express.Router()
const groupRunContext = new Map()

function agentName(agentId) {
  return RUNTIME_AGENT_MAP[agentId]?.name || agentId
}

router.post('/group-chat/messages', (req, res) => {
  const { content = '', sender = 'user' } = req.body || {}
  if (!content.trim()) return res.status(400).json({ success: false, error: 'content is required' })
  res.json({
    success: true,
    message: {
      id: `group-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content,
      sender,
      createdAt: Date.now(),
    },
  })
})

router.post('/group-chat/agents/:agentId/run', (req, res) => {
  try {
    const { agentId } = req.params
    const { content = '' } = req.body || {}
    if (!RUNTIME_AGENT_MAP[agentId] || agentId === 'xiaomu') {
      return res.status(400).json({ success: false, error: `Unsupported group chat agent: ${agentId}` })
    }
    if (!content.trim()) {
      return res.status(400).json({ success: false, error: 'content is required' })
    }

    const task = createTask({
      title: `群聊指令 - ${agentName(agentId)}`,
      description: content.trim(),
      priority: 'normal',
      createdBy: 'group-chat',
    })
    const plan = {
      taskTitle: task.title,
      goal: content.trim(),
      subtasks: [
        {
          title: `响应群聊指令：${agentName(agentId)}`,
          description: content.trim(),
          assignedAgentId: agentId,
          expectedOutput: `${agentName(agentId)}群聊响应报告`,
        },
      ],
      acceptanceCriteria: ['生成 Markdown 报告', '给出结论、依据、风险和建议'],
    }
    savePlan(task.id, plan)
    createSubtasksFromPlan(task.id, plan, RUNTIME_AGENT_MAP)
    const updated = getTaskDetail(task.id)
    const subtask = updated.subtasks[0]
    const run = enqueueSubtaskRun(subtask.id)
    groupRunContext.set(task.id, {
      taskId: task.id,
      subtaskId: subtask.id,
      agentId,
      runId: run.id,
      prompt: content.trim(),
    })

    res.json({
      success: true,
      task: getTaskDetail(task.id),
      run,
      message: `${agentName(agentId)} 已进入 Claude Runtime 队列`,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/group-chat/events/stream', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)

  const resolveContext = (event) => {
    if (!event.taskId) return null
    const cached = groupRunContext.get(event.taskId)
    if (cached) return cached
    const task = getTaskDetail(event.taskId)
    if (task?.created_by !== 'group-chat') return null
    const subtask = task.subtasks?.[0]
    const context = {
      taskId: task.id,
      subtaskId: subtask?.id || event.subtaskId || null,
      agentId: subtask?.assigned_agent_id || event.agentId || null,
      runId: event.runId || subtask?.context_json?.lastRunId || null,
      prompt: task.description,
    }
    groupRunContext.set(task.id, context)
    return context
  }

  const writeGroupEvent = (payload) => {
    res.write(`data: ${JSON.stringify({ timestamp: Date.now(), ...payload })}\n\n`)
  }

  const handler = (event) => {
    const context = resolveContext(event)
    if (!context) return
    const log = event.log || null
    const logType = log?.type || ''
    const base = {
      taskId: context.taskId,
      subtaskId: context.subtaskId,
      agentId: context.agentId,
      runId: event.runId || context.runId || log?.run_id || null,
      taskUrl: `/task-center-2?task=${encodeURIComponent(context.taskId)}`,
    }

    if (event.type === 'agent.run.queued') {
      writeGroupEvent({ ...base, type: 'group.run.queued', message: `${agentName(context.agentId)} 已进入队列` })
    } else if (event.type === 'agent.start') {
      writeGroupEvent({ ...base, type: 'group.run.started', message: `${agentName(context.agentId)} 开始执行` })
    } else if (event.type === 'agent.error') {
      writeGroupEvent({ ...base, type: 'group.run.failed', message: event.error || event.message || '运行失败' })
    } else if (event.type === 'agent.cancelled') {
      writeGroupEvent({ ...base, type: 'group.run.cancelled', message: event.message || '运行已取消' })
    } else if (event.type === 'agent.done') {
      writeGroupEvent({ ...base, type: 'group.run.completed', message: '报告已生成', outputPath: event.outputPath || null })
    } else if (event.type === 'agent.log' && (logType === 'assistant.delta' || logType === 'assistant.snapshot')) {
      writeGroupEvent({
        ...base,
        type: logType === 'assistant.snapshot' ? 'group.agent.snapshot' : 'group.agent.delta',
        message: log?.message || '',
      })
    } else if (event.type === 'agent.log' && ['output', 'done', 'error', 'cancelled'].includes(logType)) {
      writeGroupEvent({ ...base, type: `group.log.${logType}`, message: log?.message || logType })
    }
  }

  claudeRuntimeEvents.on('event', handler)
  const keepAlive = setInterval(() => {
    writeGroupEvent({ type: 'ping' })
  }, 25000)

  _req.on('close', () => {
    clearInterval(keepAlive)
    claudeRuntimeEvents.off('event', handler)
  })
})

router.post('/group-chat/runs/:id/cancel', (req, res) => {
  try {
    const result = cancelRun(req.params.id)
    if (!result.ok) return res.status(404).json({ success: false, error: result.error })
    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/group-chat/status', (_req, res) => {
  res.json({ success: true, status: getRuntimeStatus() })
})

export default router
