import express from 'express'

export function createAutomationRouter({ proxyToGateway }) {
  const router = express.Router()

  const cronTasks = [
    {
      id: 'cron1',
      name: '每日数据备份',
      cron: '0 2 * * *',
      agentId: 'xiaokai',
      agentName: '小开',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      nextRun: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
      successCount: 128,
      failureCount: 3,
      lastStatus: 'success'
    },
    {
      id: 'cron2',
      name: '周报生成',
      cron: '0 9 * * 1',
      agentId: 'xiaochan',
      agentName: '小产',
      enabled: true,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
      successCount: 45,
      failureCount: 1,
      lastStatus: 'success'
    },
    {
      id: 'cron3',
      name: '日志清理',
      cron: '0 0 * * 0',
      agentId: 'xiaokai',
      agentName: '小开',
      enabled: false,
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      successCount: 24,
      failureCount: 0,
      lastStatus: 'success'
    }
  ]

  const webhooks = [
    {
      id: 'wh1',
      name: '生产环境告警',
      url: 'https://api.example.com/webhooks/alerts',
      description: '发送所有错误和告警事件到监控系统',
      events: ['agent.error', 'log.error', 'security.alert'],
      secret: 'whsec_xxxxxxxxxxxxxxxx',
      algorithm: 'HMAC-SHA256',
      retryPolicy: 'exponential',
      maxRetries: 3,
      timeout: 30,
      enabled: true,
      successCount: 1247,
      failureCount: 12,
      avgResponseTime: 156,
      lastDelivery: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    {
      id: 'wh2',
      name: '任务状态同步',
      url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
      description: '任务状态变更通知到 Slack 频道',
      events: ['task.created', 'task.completed', 'task.failed'],
      secret: '',
      algorithm: 'HMAC-SHA256',
      retryPolicy: 'fixed',
      maxRetries: 2,
      timeout: 15,
      enabled: true,
      successCount: 856,
      failureCount: 3,
      avgResponseTime: 234,
      lastDelivery: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    }
  ]

  router.get('/cron/tasks', async (_req, res) => {
    try {
      const gatewayData = await proxyToGateway('/api/cron/tasks').catch(() => null)
      if (gatewayData?.success) return res.json(gatewayData)

      res.json({
        success: true,
        dataSource: 'mock',
        stats: {
          totalTasks: cronTasks.length,
          enabledTasks: cronTasks.filter(t => t.enabled).length,
          disabledTasks: cronTasks.filter(t => !t.enabled).length,
          todayExecutions: 5
        },
        tasks: cronTasks,
        executions: []
      })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  router.post('/cron/tasks', (req, res) => {
    const { name, cron, agentId, enabled = true } = req.body
    const task = {
      id: `cron-${Date.now()}`,
      name,
      cron,
      agentId,
      agentName: '小开',
      enabled,
      successCount: 0,
      failureCount: 0,
      lastStatus: null
    }
    cronTasks.push(task)
    res.json({ success: true, task })
  })

  router.put('/cron/tasks/:id', (req, res) => {
    const task = cronTasks.find(t => t.id === req.params.id)
    if (task) Object.assign(task, req.body)
    res.json({ success: true })
  })

  router.delete('/cron/tasks/:id', (req, res) => {
    const index = cronTasks.findIndex(t => t.id === req.params.id)
    if (index > -1) cronTasks.splice(index, 1)
    res.json({ success: true })
  })

  router.post('/cron/tasks/:id/toggle', (req, res) => {
    const task = cronTasks.find(t => t.id === req.params.id)
    if (task) task.enabled = !task.enabled
    res.json({ success: true, enabled: task?.enabled })
  })

  router.post('/cron/tasks/:id/execute', (req, res) => {
    res.json({ success: true, executionId: `exec-${Date.now()}` })
  })

  router.get('/webhooks', async (_req, res) => {
    try {
      const gatewayData = await proxyToGateway('/api/webhooks').catch(() => null)
      if (gatewayData?.success) return res.json(gatewayData)

      res.json({
        success: true,
        dataSource: 'mock',
        stats: {
          totalWebhooks: webhooks.length,
          enabledWebhooks: webhooks.filter(w => w.enabled).length,
          disabledWebhooks: webhooks.filter(w => !w.enabled).length,
          todayDeliveries: webhooks.reduce((sum, w) => sum + w.successCount + w.failureCount, 0)
        },
        webhooks,
        deliveries: []
      })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  router.post('/webhooks', (req, res) => {
    const webhook = {
      id: `wh-${Date.now()}`,
      ...req.body,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      lastDelivery: null
    }
    webhooks.push(webhook)
    res.json({ success: true, webhook })
  })

  router.put('/webhooks/:id', (req, res) => {
    const webhook = webhooks.find(w => w.id === req.params.id)
    if (webhook) Object.assign(webhook, req.body)
    res.json({ success: true })
  })

  router.delete('/webhooks/:id', (req, res) => {
    const index = webhooks.findIndex(w => w.id === req.params.id)
    if (index > -1) webhooks.splice(index, 1)
    res.json({ success: true })
  })

  router.post('/webhooks/:id/toggle', (req, res) => {
    const webhook = webhooks.find(w => w.id === req.params.id)
    if (webhook) webhook.enabled = !webhook.enabled
    res.json({ success: true, enabled: webhook?.enabled })
  })

  router.post('/webhooks/:id/test', async (_req, res) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    res.json({ success: true })
  })

  router.get('/webhooks/:id/deliveries', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 50)
    const deliveries = Array.from({ length: limit }, (_, i) => ({
      id: `del-${i}`,
      webhookId: req.params.id,
      event: ['task.created', 'task.completed', 'agent.error'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
      status: Math.random() > 0.1 ? 'success' : 'failed',
      responseCode: Math.random() > 0.1 ? 200 : 500,
      duration: Math.floor(Math.random() * 500) + 50,
      error: Math.random() > 0.1 ? null : 'Connection timeout'
    }))
    res.json({ success: true, deliveries })
  })

  return router
}
