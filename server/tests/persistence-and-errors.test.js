import test from 'node:test'
import assert from 'node:assert/strict'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'
import { initializeAutomationSchema, listCronTasks, createCronTask, listWebhooks, createWebhook } from '../db/automation.js'
import { initializeRiskSchema, listRisks, createRisk, riskStats } from '../db/risks.js'
import { initializeAuditSchema, recordAuditLog, listAuditLogs } from '../db/audit.js'

test('automation schema seeds data and persists created cron and webhook records', () => {
  const env = withRuntimeTestDb()
  try {
    initializeAutomationSchema()
    assert.equal(listCronTasks().length, 3)
    assert.equal(listWebhooks().length, 2)

    const cron = createCronTask({ name: '持久化测试', cron: '0 8 * * *', agentId: 'pm', enabled: true })
    assert.equal(cron.name, '持久化测试')
    assert.ok(listCronTasks().some(task => task.id === cron.id))

    const webhook = createWebhook({ name: '测试 Webhook', url: 'https://example.com/hook', events: ['task.completed'] })
    assert.deepEqual(webhook.events, ['task.completed'])
    assert.ok(listWebhooks().some(item => item.id === webhook.id))
  } finally {
    env.cleanup()
  }
})

test('risk schema seeds data and calculates stats from sqlite rows', () => {
  const env = withRuntimeTestDb()
  try {
    initializeRiskSchema()
    const seeded = listRisks({ pageSize: 20 })
    assert.equal(seeded.total, 5)

    const created = createRisk({
      projectId: 'default',
      title: '测试风险',
      description: '用于验证持久化',
      category: 'technical',
      level: 'high',
      status: 'open',
      probability: 4,
      impact: 4,
      owner: 'QA',
      createdBy: 'QA',
      mitigationPlan: '',
      resolution: '',
      alertStatus: 'none',
      tags: ['测试'],
    })
    assert.equal(created.title, '测试风险')
    assert.equal(riskStats().total, 6)
  } finally {
    env.cleanup()
  }
})

test('audit schema records and lists audit logs', () => {
  const env = withRuntimeTestDb()
  try {
    initializeAuditSchema()
    recordAuditLog({
      traceId: 'trace_test',
      actor: 'tester',
      action: 'risk.create',
      resourceType: 'risk',
      resourceId: 'risk-test',
      summary: 'create risk',
      status: 'success',
    })
    const logs = listAuditLogs({ resourceType: 'risk', resourceId: 'risk-test' })
    assert.equal(logs.length, 1)
    assert.equal(logs[0].traceId, 'trace_test')
  } finally {
    env.cleanup()
  }
})
