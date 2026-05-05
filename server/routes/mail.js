import express from 'express'
import {
  createMailChannel,
  deleteMailChannel,
  getMailChannel,
  listMailChannels,
  listMailTriggers,
  updateMailChannel,
} from '../db/mail.js'
import {
  getMailStatus,
  scanDueMailChannels,
  scanMailChannel,
  testMailChannel,
} from '../mail/mail-service.js'

const router = express.Router()

router.get('/mail/status', (_req, res) => {
  try {
    res.json({ success: true, status: getMailStatus() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/mail/channels', (_req, res) => {
  try {
    res.json({ success: true, channels: listMailChannels() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/mail/channels', (req, res) => {
  try {
    const channel = createMailChannel(req.body || {})
    res.json({ success: true, channel })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.patch('/mail/channels/:id', (req, res) => {
  try {
    const channel = updateMailChannel(req.params.id, req.body || {})
    if (!channel) return res.status(404).json({ success: false, error: 'Mail channel not found' })
    res.json({ success: true, channel })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/mail/channels/:id', (req, res) => {
  try {
    const ok = deleteMailChannel(req.params.id)
    if (!ok) return res.status(404).json({ success: false, error: 'Mail channel not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/mail/channels/:id/test', async (req, res) => {
  try {
    const result = await testMailChannel(req.params.id)
    res.json({ success: true, result, channel: getMailChannel(req.params.id) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, channel: getMailChannel(req.params.id) })
  }
})

router.post('/mail/channels/:id/scan', async (req, res) => {
  try {
    const result = await scanMailChannel(req.params.id, { manual: true })
    res.json({ success: true, result, channel: getMailChannel(req.params.id), triggers: listMailTriggers({ channelId: req.params.id, limit: 10 }) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, channel: getMailChannel(req.params.id) })
  }
})

router.post('/mail/scan', async (_req, res) => {
  try {
    const result = await scanDueMailChannels()
    res.json({ success: true, result, status: getMailStatus() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/mail/triggers', (req, res) => {
  try {
    res.json({
      success: true,
      triggers: listMailTriggers({
        channelId: req.query.channelId ? String(req.query.channelId) : null,
        limit: req.query.limit ? Number(req.query.limit) : 30,
      }),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
