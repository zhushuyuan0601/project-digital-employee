import express from 'express'
import { promises as fs } from 'fs'
import { accessSync, constants, existsSync, statSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'
import { execFile } from 'child_process'
import {
  addTaskEvent,
  completeTask,
  createSubtasksFromPlan,
  createTask,
  getSubtask,
  getTaskDetail,
  listTaskEvents,
  listTaskOutputs,
  listAgentRunLogs,
  listTasks,
  markPlanInvalid,
  savePlan,
  skipSubtask,
  updateSubtask,
  updateTask,
  updateTaskOutput,
  upsertTaskOutput,
} from '../db/tasks.js'
import { getDatabasePath } from '../db/index.js'
import {
  cancelRun,
  enqueuePlanRun,
  enqueueSubtaskRun,
  enqueueSummaryRun,
  getRun,
  getRuntimeStatus,
  listRuns,
  retrySubtaskRun,
  runReadyWorkflow,
} from '../claude-runtime/index.js'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'
import { claudeRuntimeEvents } from '../claude-runtime/event-bus.js'
import { RUNTIME_AGENT_MAP, extractJsonPlan as extractRuntimePlan, validatePlan as validateRuntimePlan } from '../claude-runtime/plan-utils.js'
import { DEFAULT_SERVER_CONFIG, PROJECT_ROOT, envString } from '../config/defaults.js'

const router = express.Router()
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || homedir()
const DEFAULT_EVENT_LIMIT = 100
const RUNTIME_ENV_KEYS = [
  'PORT',
  'DB_PATH',
  'CORS_ORIGIN',
  'AGENT_RUNTIME',
  'CLAUDE_AGENT_MAX_CONCURRENCY',
  'CLAUDE_AGENT_MAX_TURNS',
  'CLAUDE_REPORT_ONLY',
  'CLAUDE_RUNTIME_CWD',
  'CLAUDE_WORKSPACE_ISOLATION',
  'CLAUDE_WORKSPACE_ROOT',
  'CLAUDE_ALLOWED_TOOLS',
  'CLAUDE_OUTPUT_ROOT',
  'CLAUDE_RUNTIME_MOCK',
]

const AGENT_MAP = {
  xiaomu: { name: '小呦', runtimeAgentId: 'ceo', sessionKey: 'claude:xiaomu:main', roleId: 'ceo' },
  xiaoyan: { name: '研究员', runtimeAgentId: 'researcher', sessionKey: 'claude:xiaoyan:main', roleId: 'researcher' },
  xiaochan: { name: '产品经理', runtimeAgentId: 'pm', sessionKey: 'claude:xiaochan:main', roleId: 'pm' },
  xiaokai: { name: '研发工程师', runtimeAgentId: 'tech-lead', sessionKey: 'claude:xiaokai:main', roleId: 'tech-lead' },
  xiaoce: { name: '测试员', runtimeAgentId: 'team-qa', sessionKey: 'claude:xiaoce:main', roleId: 'team-qa' },
}

function resolvePath(path) {
  if (path.startsWith('~/')) return join(HOME_DIR, path.slice(2))
  if (path.startsWith('/')) return path
  return resolve(path)
}

function fileType(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['md', 'markdown'].includes(ext)) return 'markdown'
  if (['js', 'ts', 'tsx', 'vue', 'py', 'json', 'sh', 'yaml', 'yml'].includes(ext)) return 'code'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['ppt', 'pptx'].includes(ext)) return 'ppt'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'
  if (['html', 'htm'].includes(ext)) return 'html'
  return 'text'
}

function parseBooleanFlag(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function canWritePath(path) {
  try {
    accessSync(path, constants.W_OK)
    return true
  } catch {
    return false
  }
}

function isInsidePath(targetPath, rootPath) {
  const target = resolve(targetPath)
  const root = resolve(rootPath)
  return target === root || target.startsWith(`${root}/`)
}

function openableRoots() {
  const config = getClaudeRuntimeConfig()
  const fileRoots = envString('FILE_ROOTS', DEFAULT_SERVER_CONFIG.fileRoots)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(resolvePath)
  return [...new Set([
    PROJECT_ROOT,
    config.cwd,
    config.outputRoot,
    config.workspaceRoot,
    ...fileRoots,
  ].filter(Boolean).map((item) => resolve(item)))]
}

function isOpenPathAllowed(targetPath) {
  return openableRoots().some((root) => isInsidePath(targetPath, root))
}

function getOpenDirectoryTarget(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    const error = new Error('path is required')
    error.statusCode = 400
    throw error
  }

  const resolvedTarget = resolve(resolvePath(rawPath))
  if (!isOpenPathAllowed(resolvedTarget)) {
    const error = new Error('Access denied: path not in allowed roots')
    error.statusCode = 403
    throw error
  }

  if (!existsSync(resolvedTarget)) {
    const parent = dirname(resolvedTarget)
    if (!existsSync(parent)) {
      const error = new Error('File or directory not found')
      error.statusCode = 404
      throw error
    }
    return parent
  }

  const stat = statSync(resolvedTarget)
  return stat.isDirectory() ? resolvedTarget : dirname(resolvedTarget)
}

function openPathInFileManager(targetPath) {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'explorer'
      : 'xdg-open'

  return new Promise((resolveOpen, rejectOpen) => {
    execFile(command, [targetPath], (error) => {
      if (error) rejectOpen(error)
      else resolveOpen()
    })
  })
}

async function runtimeDiagnostics() {
  const config = getClaudeRuntimeConfig()
  let sdkAvailable = false
  try {
    await import('@anthropic-ai/claude-agent-sdk')
    sdkAvailable = true
  } catch {}

  return {
    dbPath: getDatabasePath(),
    dbWritable: canWritePath(join(getDatabasePath(), '..')) || canWritePath(resolve(getDatabasePath(), '..')),
    cwdExists: existsSync(config.cwd),
    outputRootWritable: existsSync(config.outputRoot) && canWritePath(config.outputRoot),
    workspaceRootWritable: existsSync(config.workspaceRoot) && canWritePath(config.workspaceRoot),
    sdkAvailable,
    hasEnvFile: existsSync(join(PROJECT_ROOT, '.env')),
    configSource: existsSync(join(PROJECT_ROOT, '.env')) ? 'defaults + .env overrides' : 'built-in defaults',
    envOverrides: Object.fromEntries(
      RUNTIME_ENV_KEYS.map((key) => [key, process.env[key] != null && process.env[key] !== ''])
    ),
  }
}

async function scanFiles(basePath, startTime = null, endTime = null, limit = 200) {
  const resolvedPath = resolvePath(basePath)
  const files = []

  async function walk(dir) {
    let entries = []
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && files.length < limit) await walk(full)
        continue
      }
      const stat = await fs.stat(full)
      if (startTime && stat.mtimeMs < startTime) continue
      if (endTime && stat.mtimeMs > endTime) continue
      files.push({
        name: entry.name,
        type: fileType(entry.name),
        path: full,
        mtime: Math.floor(stat.mtimeMs),
        mtimeStr: new Date(stat.mtimeMs).toLocaleString('zh-CN', { hour12: false }),
      })
      if (files.length >= limit) return
    }
  }

  await walk(resolvedPath)
  files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
  return files.slice(0, limit)
}

function extractJsonPlan(input) {
  if (!input) throw new Error('Plan content is required')
  if (typeof input === 'object') return input

  const trimmed = String(input).trim()
  try {
    return JSON.parse(trimmed)
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return JSON.parse(fenced[1])

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }
  throw new Error('No JSON object found in plan content')
}

function validatePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') errors.push('计划必须是 JSON 对象')
  if (!Array.isArray(plan?.subtasks) || plan.subtasks.length === 0) errors.push('subtasks 至少需要 1 个')
  for (const [index, subtask] of (plan?.subtasks || []).entries()) {
    if (!subtask.title) errors.push(`第 ${index + 1} 个子任务缺少 title`)
    if (!subtask.description) errors.push(`第 ${index + 1} 个子任务缺少 description`)
    if (!AGENT_MAP[subtask.assignedAgentId] || subtask.assignedAgentId === 'xiaomu') {
      errors.push(`第 ${index + 1} 个子任务 assignedAgentId 不合法：${subtask.assignedAgentId || '空'}`)
    }
  }
  if (errors.length) {
    const error = new Error(errors.join('；'))
    error.validationErrors = errors
    throw error
  }
  return {
    taskTitle: plan.taskTitle || '',
    goal: plan.goal || '',
    subtasks: plan.subtasks.map((subtask) => ({
      title: subtask.title,
      description: subtask.description,
      assignedAgentId: subtask.assignedAgentId,
      expectedOutput: subtask.expectedOutput || '',
    })),
    acceptanceCriteria: Array.isArray(plan.acceptanceCriteria) ? plan.acceptanceCriteria : [],
  }
}

function coordinatorPrompt(task) {
  return `你是小呦/ceo，负责多 Agent 任务拆解和最终汇总。

请把下面任务拆解成可由执行 Agent 完成的结构化 JSON。只返回 JSON，不要输出解释文字。

任务 ID: ${task.id}
任务标题: ${task.title}
任务描述:
${task.description}

可选执行 Agent:
- xiaoyan: 研究员，负责调研分析和报告
- xiaochan: 产品经理，负责需求分析和产品方案
- xiaokai: 研发工程师，负责技术方案和代码实现
- xiaoce: 测试员，负责质量检查和测试报告

JSON 格式:
{
  "taskTitle": "string",
  "goal": "string",
  "subtasks": [
    {
      "title": "string",
      "description": "string",
      "assignedAgentId": "xiaoyan | xiaochan | xiaokai | xiaoce",
      "expectedOutput": "string"
    }
  ],
  "acceptanceCriteria": ["string"]
}`
}

function subtaskPrompt(task, subtask) {
  return `你正在执行 Claude Runtime 多 Agent 协作任务中的一个子任务。

taskId: ${task.id}
subTaskId: ${subtask.id}
主任务目标: ${task.plan_json?.goal || task.title}
子任务标题: ${subtask.title}
子任务目标:
${subtask.description}

期望产出:
${subtask.expected_output || '请输出清晰的执行结果、关键依据和下一步建议。'}

请只输出 Markdown 报告内容，不要直接修改项目源码。报告会由后端写入受控成果目录。`
}

function finalPrompt(task) {
  const subtasks = task.subtasks.map((subtask) => `- ${subtask.title} (${AGENT_MAP[subtask.assigned_agent_id]?.name || subtask.assigned_agent_id}): ${subtask.result_summary || subtask.status}`).join('\n')
  const outputs = task.outputs.map((output) => `- ${output.name} (${output.agent_id || 'unknown'})`).join('\n') || '- 暂无文件产出'
  return `你是小呦/ceo，请基于子任务执行结果生成最终汇总。

任务 ID: ${task.id}
任务标题: ${task.title}
任务目标: ${task.plan_json?.goal || task.description}

子任务状态:
${subtasks}

成果文件:
${outputs}

请输出：整体结论、各 Agent 贡献、可验收产出、风险和下一步建议。`
}

function coordinatorDispatch(task, phase = 'plan') {
  return {
    taskId: task.id,
    phase,
    agentId: 'xiaomu',
    sessionKey: task.coordinator_session_key,
    message: phase === 'summary' ? finalPrompt(task) : coordinatorPrompt(task),
  }
}

function subtaskDispatch(task, subtask) {
  return {
    taskId: task.id,
    subtaskId: subtask.id,
    agentId: subtask.assigned_agent_id,
    sessionKey: subtask.session_key,
    message: subtaskPrompt(task, subtask),
  }
}

function subtaskDispatches(task) {
  return task.subtasks.map((subtask) => subtaskDispatch(task, subtask))
}

router.get('/tasks', (req, res) => {
  try {
    const tasks = listTasks({ status: req.query.status, limit: req.query.limit ? Number(req.query.limit) : 50 })
    res.json({ success: true, tasks })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/outputs', (req, res) => {
  try {
    const outputs = listTaskOutputs({
      taskId: req.query.taskId,
      agentId: req.query.agentId,
      status: req.query.status,
    })
    res.json({ success: true, outputs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.patch('/tasks/outputs/:id', (req, res) => {
  try {
    const { status } = req.body || {}
    if (!['pending_review', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid output status' })
    }
    const output = updateTaskOutput(Number(req.params.id), { status })
    if (!output) return res.status(404).json({ success: false, error: 'Output not found' })
    res.json({ success: true, output })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/files/open-directory', async (req, res) => {
  try {
    const targetPath = getOpenDirectoryTarget(req.body?.path || req.query.path)
    if (!isOpenPathAllowed(targetPath)) {
      return res.status(403).json({ success: false, error: 'Access denied: path not in allowed roots' })
    }
    await openPathInFileManager(targetPath)
    res.json({ success: true, path: targetPath })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/open-workspace', async (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })

    const config = getClaudeRuntimeConfig()
    const isolatedWorkspace = resolve(join(config.workspaceRoot, task.id, 'project'))
    const fallbackProject = resolve(config.cwd)
    const targetPath = config.workspaceIsolation && existsSync(isolatedWorkspace)
      ? isolatedWorkspace
      : fallbackProject

    if (!isOpenPathAllowed(targetPath)) {
      return res.status(403).json({ success: false, error: 'Access denied: path not in allowed roots' })
    }
    if (!existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: 'Project folder not found' })
    }

    await openPathInFileManager(targetPath)
    res.json({
      success: true,
      path: targetPath,
      workspaceAvailable: targetPath === isolatedWorkspace,
    })
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
})

router.post('/tasks', (req, res) => {
  try {
    const { title, description, priority } = req.body || {}
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'title and description are required' })
    }

    const task = createTask({ title, description, priority })
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'plan.request.queued',
      message: '已生成小呦任务诊断请求，进入 Claude Runtime 队列',
      payload: { sessionKey: task.coordinator_session_key, mode: 'claude-runtime' },
    })

    const run = enqueuePlanRun(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), planRunId: run.id, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/runtime/status', async (_req, res) => {
  try {
    res.json({ success: true, status: { ...getRuntimeStatus(), ...(await runtimeDiagnostics()) } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/runtime/config', (_req, res) => {
  try {
    res.json({ success: true, config: getClaudeRuntimeConfig() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.patch('/runtime/config', (req, res) => {
  try {
    const body = req.body || {}
    if (body.maxConcurrency != null) process.env.CLAUDE_AGENT_MAX_CONCURRENCY = String(Math.max(1, Number(body.maxConcurrency) || 3))
    if (body.maxTurns != null) process.env.CLAUDE_AGENT_MAX_TURNS = String(Math.max(1, Number(body.maxTurns) || 256))
    if (body.reportOnly != null) process.env.CLAUDE_REPORT_ONLY = body.reportOnly ? 'true' : 'false'
    if (body.workspaceIsolation != null) process.env.CLAUDE_WORKSPACE_ISOLATION = body.workspaceIsolation ? 'true' : 'false'
    if (body.mock != null) process.env.CLAUDE_RUNTIME_MOCK = body.mock ? 'true' : 'false'
    if (Array.isArray(body.allowedTools)) process.env.CLAUDE_ALLOWED_TOOLS = body.allowedTools.join(',')
    res.json({ success: true, config: getClaudeRuntimeConfig(), status: getRuntimeStatus() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/runs', (req, res) => {
  try {
    const runs = listRuns({
      taskId: req.query.taskId,
      subtaskId: req.query.subtaskId,
      status: req.query.status,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    })
    res.json({ success: true, runs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/runs/:id', (req, res) => {
  try {
    const run = getRun(req.params.id)
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' })
    res.json({ success: true, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/runs/:id/logs', (req, res) => {
  try {
    const run = getRun(req.params.id)
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' })
    const limit = parsePositiveInt(req.query.limit, 2000)
    const beforeId = req.query.beforeId != null ? parsePositiveInt(req.query.beforeId, null) : null
    res.json({
      success: true,
      logs: listAgentRunLogs({ runId: req.params.id, limit, beforeId }),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/runs/:id/cancel', (req, res) => {
  try {
    const result = cancelRun(req.params.id)
    if (!result.ok) return res.status(404).json({ success: false, error: result.error })
    res.json({ success: true, result, run: getRun(req.params.id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/:id', (req, res) => {
  try {
    const includeEvents = parseBooleanFlag(req.query.includeEvents, false)
    const eventLimit = includeEvents ? parsePositiveInt(req.query.eventLimit, DEFAULT_EVENT_LIMIT) : null
    const beforeEventId = includeEvents && req.query.beforeEventId != null
      ? parsePositiveInt(req.query.beforeEventId, null)
      : null
    const task = getTaskDetail(req.params.id, { includeEvents, eventLimit, beforeEventId })
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    res.json({ success: true, task })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/:id/events', (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, DEFAULT_EVENT_LIMIT)
    const beforeId = req.query.beforeId != null ? parsePositiveInt(req.query.beforeId, null) : null
    res.json({
      success: true,
      events: listTaskEvents(req.params.id, { limit, beforeId }),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/:id/events/stream', (req, res) => {
  const taskId = req.params.id
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  res.write(`data: ${JSON.stringify({ type: 'connected', taskId, timestamp: Date.now() })}\n\n`)

  const handler = (event) => {
    if (event.taskId !== taskId) return
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  claudeRuntimeEvents.on('event', handler)

  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', taskId, timestamp: Date.now() })}\n\n`)
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    claudeRuntimeEvents.off('event', handler)
  })
})

router.post('/tasks/:id/plan/run', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    updateTask(task.id, { status: 'planning' })
    const run = enqueuePlanRun(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), planRunId: run.id, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/plan', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })

    let plan
    try {
      plan = validateRuntimePlan(extractRuntimePlan(req.body.plan || req.body.content || req.body))
    } catch (err) {
      const failed = markPlanInvalid(req.params.id, `拆解计划校验失败：${err.message}`, {
        raw: req.body,
        errors: err.validationErrors || [err.message],
      })
      return res.status(400).json({ success: false, error: err.message, task: failed })
    }

    const updated = savePlan(req.params.id, plan)
    res.json({ success: true, task: updated, dispatches: [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/plan/feedback', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    if (task.subtasks?.length) {
      return res.status(400).json({ success: false, error: 'Workflow already started; plan feedback is only available before confirmation' })
    }
    const feedback = String(req.body?.feedback || '').trim()
    if (!feedback) return res.status(400).json({ success: false, error: 'feedback is required' })

    const previousPlan = task.plan_json || {}
    const feedbackItem = {
      feedback,
      createdAt: new Date().toISOString(),
    }
    updateTask(task.id, {
      status: 'planning',
      plan_json: {
        ...previousPlan,
        planFeedback: feedback,
        planFeedbackAt: feedbackItem.createdAt,
        planFeedbackHistory: [
          ...(Array.isArray(previousPlan.planFeedbackHistory) ? previousPlan.planFeedbackHistory : []),
          feedbackItem,
        ].slice(-10),
      },
    })
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'plan.feedback.queued',
      message: '用户已提交对方案的提问或修改意见，小呦将重新规划',
      payload: { feedback },
    })
    const run = enqueuePlanRun(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), planRunId: run.id, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/clarifications', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    const answers = req.body?.answers || {}
    const previousPlan = task.plan_json || {}
    updateTask(task.id, {
      status: 'planning',
      plan_json: {
        ...previousPlan,
        clarificationAnswers: answers,
        clarificationAnsweredAt: new Date().toISOString(),
      },
    })
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'coordinator.clarification_answered',
      message: '用户已补充关键信息，小呦将重新诊断并规划协作流程',
      payload: { answers },
    })
    const run = enqueuePlanRun(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), planRunId: run.id, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/plan/confirm', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    if (!task.plan_json) return res.status(400).json({ success: false, error: 'Task has no accepted plan_json' })
    const plan = validateRuntimePlan(task.plan_json)
    if (plan.decision === 'need_clarification') {
      return res.status(400).json({ success: false, error: 'Task still needs clarification before confirmation' })
    }
    createSubtasksFromPlan(req.params.id, plan, RUNTIME_AGENT_MAP)
    const updated = getTaskDetail(req.params.id)
    res.json({ success: true, task: getTaskDetail(updated.id), runs: [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/workflow/run', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    const runs = runReadyWorkflow(task.id)
    addTaskEvent({
      taskId: task.id,
      type: 'task.dispatch.queued',
      message: `依赖调度器已启动，本轮入队 ${runs.length} 个可执行节点`,
      payload: { runCount: runs.length, mode: 'claude-runtime' },
    })
    res.json({ success: true, task: getTaskDetail(task.id), runs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/tasks/:id/workflow', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id, { includeEvents: true, eventLimit: DEFAULT_EVENT_LIMIT })
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    const nodes = task.subtasks.map((subtask) => ({
      ...subtask,
      workflow: subtask.context_json || {},
      blockedBy: (subtask.context_json?.dependsOn || []).filter((nodeId) => {
        const upstream = task.subtasks.find((item) => (item.context_json?.workflowNodeId || item.id) === nodeId)
        return upstream && !['completed', 'skipped'].includes(upstream.status)
      }),
    }))
    res.json({ success: true, task, workflow: { plan: task.plan_json, nodes } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/dispatch', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    if (!task.subtasks.length) {
      if (!task.plan_json) return res.status(400).json({ success: false, error: 'Task has no accepted plan_json' })
      createSubtasksFromPlan(req.params.id, validateRuntimePlan(task.plan_json), RUNTIME_AGENT_MAP)
    }
    const runs = runReadyWorkflow(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), runs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/subtasks/run', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    const runs = runReadyWorkflow(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), runs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/dispatch-result', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    const { phase = 'plan', ok, error, payload } = req.body || {}
    const isSummary = phase === 'summary'
    const type = ok
      ? (isSummary ? 'summary.requested' : 'plan.requested')
      : (isSummary ? 'summary.request_failed' : 'plan.request_failed')
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type,
      message: ok
        ? (isSummary ? '前端已通过 WebSocket 请求小呦生成最终汇总' : '前端已通过 WebSocket 请求小呦生成结构化拆解计划')
        : (error || (isSummary ? '最终汇总请求发送失败' : '小呦拆解请求发送失败')),
      payload: payload || { error },
    })
    res.json({ success: true, task: getTaskDetail(task.id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/subtasks/:id/retry', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    updateSubtask(subtask.id, { status: 'ready', progress: 10, error: null })
    addTaskEvent({
      taskId: subtask.task_id,
      subtaskId: subtask.id,
      agentId: subtask.assigned_agent_id,
      type: 'subtask.retry.queued',
      message: '已生成流程节点重试请求，进入 Claude Runtime 队列',
      payload: { sessionKey: subtask.session_key, mode: 'claude-runtime' },
    })
    const run = retrySubtaskRun(subtask.id)
    res.json({ success: true, task: getTaskDetail(subtask.task_id), run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/workflow-nodes/:id/retry', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Workflow node not found' })
    updateSubtask(subtask.id, { status: 'ready', progress: 10, error: null })
    const run = retrySubtaskRun(subtask.id)
    res.json({ success: true, task: getTaskDetail(subtask.task_id), run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/workflow-nodes/:id/skip', (req, res) => {
  try {
    const task = skipSubtask(req.params.id, req.body?.reason || '用户确认跳过该流程节点')
    if (!task) return res.status(404).json({ success: false, error: 'Workflow node not found' })
    const runs = runReadyWorkflow(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), runs })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/subtasks/:id/run', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    const run = enqueueSubtaskRun(subtask.id)
    res.json({ success: true, task: getTaskDetail(subtask.task_id), run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/subtasks/:id/logs', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    const limit = parsePositiveInt(req.query.limit, 2000)
    const beforeId = req.query.beforeId != null ? parsePositiveInt(req.query.beforeId, null) : null
    res.json({
      success: true,
      logs: listAgentRunLogs({ subtaskId: req.params.id, limit, beforeId }),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/subtasks/:id/dispatch-result', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    const { ok, error, payload } = req.body || {}
    if (ok) {
      updateSubtask(subtask.id, {
        status: 'running',
        progress: Math.max(Number(subtask.progress || 0), 20),
        error: null,
        started_at: subtask.started_at || Math.floor(Date.now() / 1000),
      })
    } else {
      updateSubtask(subtask.id, {
        status: 'blocked',
        progress: Math.max(Number(subtask.progress || 0), 5),
        error: error || '前端 WebSocket 派发失败',
      })
    }
    addTaskEvent({
      taskId: subtask.task_id,
      subtaskId: subtask.id,
      agentId: subtask.assigned_agent_id,
      type: ok ? 'subtask.dispatched' : 'runtime.dispatch.error',
      message: ok
        ? `子任务已派发给 ${AGENT_MAP[subtask.assigned_agent_id]?.name || subtask.assigned_agent_id}`
        : (error || 'Runtime 派发失败'),
      payload: payload || { sessionKey: subtask.session_key, error },
    })
    res.json({ success: true, task: getTaskDetail(subtask.task_id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/subtasks/:id/agent-event', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    const { eventType = 'assistant', message = '', payload } = req.body || {}
    const text = String(message || '')
    const now = Math.floor(Date.now() / 1000)

    if (eventType === 'start') {
      updateSubtask(subtask.id, {
        status: 'running',
        progress: Math.max(Number(subtask.progress || 0), 30),
        started_at: subtask.started_at || now,
        error: null,
      })
    } else if (eventType === 'assistant') {
      updateSubtask(subtask.id, {
        status: 'running',
        progress: Math.max(Number(subtask.progress || 0), 70),
        started_at: subtask.started_at || now,
        error: null,
      })
    } else if (eventType === 'final' || eventType === 'done') {
      updateSubtask(subtask.id, {
        status: 'completed',
        progress: 100,
        result_summary: text.slice(0, 2000),
        started_at: subtask.started_at || now,
        completed_at: now,
        error: null,
      })
    } else if (eventType === 'error') {
      updateSubtask(subtask.id, {
        status: 'failed',
        progress: Math.max(Number(subtask.progress || 0), 5),
        error: text || 'Agent 执行失败',
      })
    }

    addTaskEvent({
      taskId: subtask.task_id,
      subtaskId: subtask.id,
      agentId: subtask.assigned_agent_id,
      type: `agent.${eventType}`,
      message: text ? text.slice(0, 4000) : `Agent 事件：${eventType}`,
      payload: payload || null,
    })

    res.json({ success: true, task: getTaskDetail(subtask.task_id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/subtasks/:id/complete', (req, res) => {
  try {
    const subtask = getSubtask(req.params.id)
    if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' })
    updateSubtask(req.params.id, {
      status: 'completed',
      progress: 100,
      result_summary: req.body?.resultSummary || '',
      completed_at: Math.floor(Date.now() / 1000),
    })
    addTaskEvent({
      taskId: subtask.task_id,
      subtaskId: subtask.id,
      agentId: subtask.assigned_agent_id,
      type: 'workflow.node.completed',
      message: '流程节点已标记完成',
      payload: { resultSummary: req.body?.resultSummary || '' },
    })
    runReadyWorkflow(subtask.task_id)
    res.json({ success: true, task: getTaskDetail(subtask.task_id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/finalize', (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })
    if (!task.subtasks.length || !task.subtasks.every((subtask) => ['completed', 'skipped'].includes(subtask.status))) {
      return res.status(400).json({ success: false, error: 'All subtasks must be completed before finalize' })
    }
    updateTask(task.id, { status: 'reviewing' })
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'summary.request.queued',
      message: '已生成最终汇总请求，进入 Claude Runtime 队列',
      payload: { sessionKey: task.coordinator_session_key, mode: 'claude-runtime' },
    })
    const run = enqueueSummaryRun(task.id)
    res.json({ success: true, task: getTaskDetail(task.id), summaryRunId: run.id, run })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/complete', (req, res) => {
  try {
    const task = completeTask(req.params.id, req.body?.summary || '')
    res.json({ success: true, task })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/tasks/:id/outputs/scan', async (req, res) => {
  try {
    const task = getTaskDetail(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' })

    const config = getClaudeRuntimeConfig()
    const discovered = []
    const outputFiles = await scanFiles(join(config.outputRoot, task.id))
    for (const file of outputFiles) {
      const subtask = task.subtasks.find(item => file.path.includes(`/${item.id}/`))
      discovered.push({
        ...file,
        subtaskId: subtask?.id || null,
        agentId: subtask?.assigned_agent_id || task.coordinator_agent_id,
      })
    }

    for (const file of discovered) {
      upsertTaskOutput({
        taskId: task.id,
        subtaskId: file.subtaskId,
        agentId: file.agentId,
        name: file.name,
        type: file.type,
        path: file.path,
        mtime: file.mtime,
      })
    }

    const filesBySubtask = discovered.reduce((acc, file) => {
      if (!file.subtaskId) return acc
      if (!acc[file.subtaskId]) acc[file.subtaskId] = []
      acc[file.subtaskId].push(file)
      return acc
    }, {})
    for (const [subtaskId, files] of Object.entries(filesBySubtask)) {
      const subtask = getSubtask(subtaskId)
      if (!subtask || subtask.status === 'completed') continue
      updateSubtask(subtaskId, {
        status: subtask.status === 'assigned' || subtask.status === 'pending' ? 'running' : subtask.status,
        progress: Math.max(Number(subtask.progress || 0), 80),
        started_at: subtask.started_at || Math.floor(Date.now() / 1000),
      })
      addTaskEvent({
        taskId: task.id,
        subtaskId,
        agentId: subtask.assigned_agent_id,
        type: 'outputs.bound',
        message: `已绑定 ${files.length} 个成果文件`,
        payload: { files: files.map((file) => ({ name: file.name, path: file.path, mtime: file.mtime })) },
      })
    }

    addTaskEvent({
      taskId: task.id,
      type: 'outputs.scanned',
      message: `成果扫描完成，发现 ${discovered.length} 个文件`,
      payload: { count: discovered.length },
    })

    res.json({ success: true, task: getTaskDetail(task.id), outputs: listTaskOutputs({ taskId: task.id }) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
