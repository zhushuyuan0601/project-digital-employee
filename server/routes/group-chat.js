import express from 'express'
import {
  createSubtasksFromPlan,
  createTask,
  getTaskDetail,
  savePlan,
} from '../db/tasks.js'
import { enqueueSubtaskRun, getRuntimeStatus } from '../claude-runtime/index.js'
import { RUNTIME_AGENT_MAP } from '../claude-runtime/plan-utils.js'

const router = express.Router()

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
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
})

router.post('/group-chat/runs/:id/cancel', (_req, res) => {
  res.status(501).json({ success: false, error: 'Please cancel the linked task run from Task Center in this release.' })
})

router.get('/group-chat/status', (_req, res) => {
  res.json({ success: true, status: getRuntimeStatus() })
})

export default router
