import express from 'express'
import {
  checkRiskAlerts,
  createAlertRule,
  createRisk,
  deleteAlertRule,
  deleteRisk,
  getRisk,
  listAlertRules,
  listRisks,
  riskStats,
  updateAlertRule,
  updateRisk,
} from '../db/risks.js'
import { recordAuditLog } from '../db/audit.js'
import { sendError } from '../utils/http.js'

const router = express.Router()

function audit(req, action, resourceId, summary, before, after, resourceType = 'risk') {
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

router.get('/risks', (req, res) => {
  const result = listRisks(req.query)
  res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize })
})

router.get('/risks/stats', (_req, res) => {
  res.json({ success: true, data: riskStats() })
})

router.get('/risks/alerts/check', (_req, res) => {
  res.json({ notifications: checkRiskAlerts() })
})

router.get('/risks/alert-rules', (_req, res) => {
  res.json({ success: true, data: listAlertRules() })
})

router.post('/risks/alert-rules', (req, res) => {
  const rules = createAlertRule(req.body || {})
  const created = rules.at(-1)
  audit(req, 'risk-alert-rule.create', created?.id, `创建风险预警规则 ${created?.name || ''}`, null, created, 'risk-alert-rule')
  res.json({ success: true, data: rules })
})

router.patch('/risks/alert-rules/:id', (req, res) => {
  const before = listAlertRules().find(rule => rule.id === req.params.id)
  if (!before) return sendError(res, 404, 'RISK_RULE_NOT_FOUND', '预警规则不存在')
  const rules = updateAlertRule(req.params.id, req.body || {})
  const after = rules.find(rule => rule.id === req.params.id)
  audit(req, 'risk-alert-rule.update', req.params.id, `更新风险预警规则 ${after?.name || req.params.id}`, before, after, 'risk-alert-rule')
  res.json({ success: true, data: rules })
})

router.delete('/risks/alert-rules/:id', (req, res) => {
  const before = listAlertRules().find(rule => rule.id === req.params.id)
  if (!before) return sendError(res, 404, 'RISK_RULE_NOT_FOUND', '预警规则不存在')
  deleteAlertRule(req.params.id)
  audit(req, 'risk-alert-rule.delete', req.params.id, `删除风险预警规则 ${before.name}`, before, null, 'risk-alert-rule')
  res.json({ success: true })
})

router.get('/risks/:id', (req, res) => {
  const risk = getRisk(req.params.id)
  if (!risk) return sendError(res, 404, 'RISK_NOT_FOUND', '风险事项不存在')
  res.json({ success: true, data: risk })
})

router.post('/risks', (req, res) => {
  const risk = createRisk(req.body || {})
  audit(req, 'risk.create', risk.id, `创建风险 ${risk.title}`, null, risk)
  res.json({ success: true, data: risk })
})

router.patch('/risks/:id', (req, res) => {
  const before = getRisk(req.params.id)
  if (!before) return sendError(res, 404, 'RISK_NOT_FOUND', '风险事项不存在')
  const risk = updateRisk(req.params.id, req.body || {})
  audit(req, 'risk.update', risk.id, `更新风险 ${risk.title}`, before, risk)
  res.json({ success: true, data: risk })
})

router.delete('/risks/:id', (req, res) => {
  const before = getRisk(req.params.id)
  if (!before) return sendError(res, 404, 'RISK_NOT_FOUND', '风险事项不存在')
  deleteRisk(req.params.id)
  audit(req, 'risk.delete', req.params.id, `删除风险 ${before.title}`, before, null)
  res.json({ success: true })
})

export default router
