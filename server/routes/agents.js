import express from 'express'
import {
  createAgentDefinition,
  deleteAgentDefinition,
  getAgentDefinition,
  listAgentDefinitions,
  listMarketAgents,
  listRoutableAgents,
  updateAgentDefinition,
} from '../claude-runtime/agent-registry.js'
import { previewAgentRoute } from '../claude-runtime/agent-router.js'

const router = express.Router()

function parseBooleanFlag(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

router.get('/agents', (req, res) => {
  try {
    const enabledOnly = parseBooleanFlag(req.query.enabledOnly, false)
    const includeCoordinator = parseBooleanFlag(req.query.includeCoordinator, true)
    const includeHidden = parseBooleanFlag(req.query.includeHidden, false)
    const marketOnly = parseBooleanFlag(req.query.marketOnly, true)
    const agents = marketOnly
      ? listMarketAgents({ enabledOnly, includeCoordinator, includeHidden })
      : listAgentDefinitions({ enabledOnly, includeCoordinator, includeHidden })
    res.json({ success: true, agents })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/agents/routable', (_req, res) => {
  try {
    res.json({ success: true, agents: listRoutableAgents() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/agents/route-preview', (req, res) => {
  try {
    const body = req.body || {}
    const taskDescription = String(body.taskDescription || body.description || '').trim()
    if (!taskDescription) {
      return res.status(400).json({ success: false, error: 'taskDescription is required' })
    }
    res.json({
      success: true,
      preview: previewAgentRoute({
        taskDescription,
        constraints: body.constraints || {},
      }),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/agents/:id', (req, res) => {
  try {
    const agent = getAgentDefinition(req.params.id)
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })
    res.json({ success: true, agent })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/agents', (req, res) => {
  try {
    const agent = createAgentDefinition(req.body || {})
    res.status(201).json({ success: true, agent, agents: listMarketAgents() })
  } catch (err) {
    const status = /required|may only|UNIQUE/i.test(err.message) ? 400 : 500
    res.status(status).json({ success: false, error: err.message })
  }
})

router.patch('/agents/:id', (req, res) => {
  try {
    const current = getAgentDefinition(req.params.id)
    if (!current) return res.status(404).json({ success: false, error: 'Agent not found' })
    const agent = updateAgentDefinition(req.params.id, req.body || {})
    res.json({ success: true, agent, agents: listMarketAgents() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/agents/:id', (req, res) => {
  try {
    const agent = deleteAgentDefinition(req.params.id)
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })
    res.json({ success: true, agent, agents: listMarketAgents() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
