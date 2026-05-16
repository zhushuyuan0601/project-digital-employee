import express from 'express'
import {
  createCronTask,
  createWebhook,
  cronStats,
  deleteCronTask,
  deleteWebhook,
  executeCronTask,
  getCronTask,
  getWebhook,
  listCronExecutions,
  listCronTasks,
  listWebhookDeliveries,
  listWebhooks,
  recordWebhookDelivery,
  toggleCronTask,
  toggleWebhook,
  updateCronTask,
  updateWebhook,
  webhookStats,
} from '../db/automation.js'
import { recordAuditLog } from '../db/audit.js'
import { sendError } from '../utils/http.js'

function audit(req, action, resourceType, resourceId, summary, before, after) {
  recordAuditLog({
    traceId: req.traceId,
    actor: req.headers['x-actor'] || 'system',
    action,
    resourceType,
    resourceId,
    summary,
    before,
    after,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })
}

function validateCronPayload(res, payload) {
  if (!String(payload?.name || '').trim()) {
    sendError(res, 400, 'CRON_NAME_REQUIRED', '定时任务名称不能为空')
    return false
  }
  if (!String(payload?.cron || '').trim()) {
    sendError(res, 400, 'CRON_EXPRESSION_REQUIRED', 'Cron 表达式不能为空')
    return false
  }
  if (String(payload.cron).trim().split(/\s+/).length !== 5) {
    sendError(res, 400, 'CRON_EXPRESSION_INVALID', 'Cron 表达式需要包含 5 段')
    return false
  }
  if (!String(payload?.agentId || '').trim()) {
    sendError(res, 400, 'CRON_AGENT_REQUIRED', '执行 Agent 不能为空')
    return false
  }
  return true
}

function validateWebhookPayload(res, payload) {
  if (!String(payload?.name || '').trim()) {
    sendError(res, 400, 'WEBHOOK_NAME_REQUIRED', 'Webhook 名称不能为空')
    return false
  }
  if (!/^https?:\/\//i.test(String(payload?.url || ''))) {
    sendError(res, 400, 'WEBHOOK_URL_INVALID', 'Webhook URL 必须以 http:// 或 https:// 开头')
    return false
  }
  if (!Array.isArray(payload?.events) || payload.events.length === 0) {
    sendError(res, 400, 'WEBHOOK_EVENTS_REQUIRED', 'Webhook 至少需要选择一个事件')
    return false
  }
  return true
}

export function createAutomationRouter() {
  const router = express.Router()

  router.get('/cron/tasks', (_req, res) => {
    res.json({
      success: true,
      dataSource: 'database',
      stats: cronStats(),
      tasks: listCronTasks(),
      executions: listCronExecutions(),
    })
  })

  router.post('/cron/tasks', (req, res) => {
    if (!validateCronPayload(res, req.body)) return
    const task = createCronTask(req.body)
    audit(req, 'cron.create', 'cron', task.id, `创建定时任务 ${task.name}`, null, task)
    res.json({ success: true, task })
  })

  router.put('/cron/tasks/:id', (req, res) => {
    const before = getCronTask(req.params.id)
    if (!before) return sendError(res, 404, 'CRON_NOT_FOUND', '定时任务不存在')
    const payload = {
      ...before,
      ...req.body,
      agentId: req.body.agentId ?? before.agentId,
      cron: req.body.cron ?? before.cron,
      name: req.body.name ?? before.name,
    }
    if (!validateCronPayload(res, payload)) return
    const task = updateCronTask(req.params.id, req.body)
    audit(req, 'cron.update', 'cron', task.id, `更新定时任务 ${task.name}`, before, task)
    res.json({ success: true, task })
  })

  router.delete('/cron/tasks/:id', (req, res) => {
    const before = getCronTask(req.params.id)
    if (!before) return sendError(res, 404, 'CRON_NOT_FOUND', '定时任务不存在')
    deleteCronTask(req.params.id)
    audit(req, 'cron.delete', 'cron', req.params.id, `删除定时任务 ${before.name}`, before, null)
    res.json({ success: true })
  })

  router.post('/cron/tasks/:id/toggle', (req, res) => {
    const before = getCronTask(req.params.id)
    if (!before) return sendError(res, 404, 'CRON_NOT_FOUND', '定时任务不存在')
    const task = toggleCronTask(req.params.id)
    audit(req, 'cron.toggle', 'cron', task.id, `${task.enabled ? '启用' : '暂停'}定时任务 ${task.name}`, before, task)
    res.json({ success: true, enabled: task.enabled, task })
  })

  router.post('/cron/tasks/:id/execute', (req, res) => {
    const result = executeCronTask(req.params.id)
    if (!result) return sendError(res, 404, 'CRON_NOT_FOUND', '定时任务不存在')
    audit(req, 'cron.execute', 'cron', result.task.id, `立即执行定时任务 ${result.task.name}`, null, result)
    res.json({ success: true, executionId: result.executionId, task: result.task })
  })

  router.get('/webhooks', (_req, res) => {
    res.json({
      success: true,
      dataSource: 'database',
      stats: webhookStats(),
      webhooks: listWebhooks(),
      deliveries: listWebhookDeliveries(null, 20),
    })
  })

  router.post('/webhooks', (req, res) => {
    if (!validateWebhookPayload(res, req.body)) return
    const webhook = createWebhook(req.body)
    audit(req, 'webhook.create', 'webhook', webhook.id, `创建 Webhook ${webhook.name}`, null, webhook)
    res.json({ success: true, webhook })
  })

  router.put('/webhooks/:id', (req, res) => {
    const before = getWebhook(req.params.id)
    if (!before) return sendError(res, 404, 'WEBHOOK_NOT_FOUND', 'Webhook 不存在')
    const payload = { ...before, ...req.body }
    if (!validateWebhookPayload(res, payload)) return
    const webhook = updateWebhook(req.params.id, req.body)
    audit(req, 'webhook.update', 'webhook', webhook.id, `更新 Webhook ${webhook.name}`, before, webhook)
    res.json({ success: true, webhook })
  })

  router.delete('/webhooks/:id', (req, res) => {
    const before = getWebhook(req.params.id)
    if (!before) return sendError(res, 404, 'WEBHOOK_NOT_FOUND', 'Webhook 不存在')
    deleteWebhook(req.params.id)
    audit(req, 'webhook.delete', 'webhook', req.params.id, `删除 Webhook ${before.name}`, before, null)
    res.json({ success: true })
  })

  router.post('/webhooks/:id/toggle', (req, res) => {
    const before = getWebhook(req.params.id)
    if (!before) return sendError(res, 404, 'WEBHOOK_NOT_FOUND', 'Webhook 不存在')
    const webhook = toggleWebhook(req.params.id)
    audit(req, 'webhook.toggle', 'webhook', webhook.id, `${webhook.enabled ? '启用' : '暂停'} Webhook ${webhook.name}`, before, webhook)
    res.json({ success: true, enabled: webhook.enabled, webhook })
  })

  router.post('/webhooks/:id/test', async (req, res) => {
    const delivery = recordWebhookDelivery(req.params.id, req.body?.event || 'test.event')
    if (!delivery) return sendError(res, 404, 'WEBHOOK_NOT_FOUND', 'Webhook 不存在')
    audit(req, 'webhook.test', 'webhook', req.params.id, `测试 Webhook ${req.params.id}`, null, delivery)
    res.json({ success: true, delivery })
  })

  router.get('/webhooks/:id/deliveries', (req, res) => {
    if (!getWebhook(req.params.id)) return sendError(res, 404, 'WEBHOOK_NOT_FOUND', 'Webhook 不存在')
    res.json({
      success: true,
      deliveries: listWebhookDeliveries(req.params.id, req.query.limit),
    })
  })

  return router
}
