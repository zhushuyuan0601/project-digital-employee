import express from 'express'
import multer from 'multer'
import { Readable } from 'stream'
import { randomUUID } from 'crypto'
import dns from 'dns/promises'
import {
  deleteAnalysisSession,
  getAnalysisSession,
  listAnalysisSessions,
  patchAnalysisSession,
  upsertAnalysisSession,
} from '../db/analysis.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

const ANALYSIS_SERVICE_BASE_URL = (process.env.ANALYSIS_SERVICE_BASE_URL || 'http://127.0.0.1:18900').replace(/\/$/, '')
const ALLOW_PRIVATE_URLS = process.env.ALLOW_PRIVATE_URLS === 'true'

function isPrivateIP(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  const parts = ip.split('.').map(Number)
  if (parts.length === 4) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 169 && parts[1] === 254) return true
    if (parts[0] === 127) return true
    if (parts[0] === 0) return true
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

async function validateExternalUrl(urlString) {
  if (ALLOW_PRIVATE_URLS) return { ok: true }
  let parsed
  try {
    parsed = new URL(urlString)
  } catch {
    return { ok: false, error: 'Invalid URL format' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: 'Only http/https protocols allowed' }
  }
  const hostname = parsed.hostname
  if (isPrivateIP(hostname)) {
    return { ok: false, error: 'Private/internal URLs are not allowed' }
  }
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [])
    const addresses6 = await dns.resolve6(hostname).catch(() => [])
    for (const addr of [...addresses, ...addresses6]) {
      if (isPrivateIP(addr)) {
        return { ok: false, error: 'URL resolves to a private/internal IP address' }
      }
    }
  } catch {
    // DNS resolution failed — allow the request to fail naturally at fetch time
  }
  return { ok: true }
}

function buildAnalysisUrl(path, query = undefined) {
  const url = new URL(`${ANALYSIS_SERVICE_BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url
}

async function proxyJson(path, init = {}, query = undefined) {
  let response
  try {
    response = await fetch(buildAnalysisUrl(path, query), init)
  } catch (error) {
    const err = new Error(`Analysis service unavailable: ${error.message}`)
    err.status = 502
    err.payload = { error: err.message }
    throw err
  }
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() }

  if (!response.ok) {
    const message = payload?.detail || payload?.error || `Analysis service error (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

function deriveSessionTitle(text = '') {
  return text.trim().slice(0, 48) || '未命名分析会话'
}

router.get('/sessions', (req, res) => {
  try {
    const sessions = listAnalysisSessions()
    res.json({ sessions })
  } catch (err) {
    console.error('[Analysis API] List sessions error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/sessions', (req, res) => {
  try {
    const { title, model } = req.body || {}
    const session = upsertAnalysisSession({
      id: `analysis-${randomUUID().slice(0, 8)}`,
      title: title || '未命名分析会话',
      status: 'idle',
      model: model || null,
      last_user_message: null,
      last_report_path: null,
    })
    res.status(201).json({ session })
  } catch (err) {
    console.error('[Analysis API] Create session error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/sessions/:id', (req, res) => {
  try {
    const session = getAnalysisSession(req.params.id)
    if (!session) {
      return res.status(404).json({ error: 'Analysis session not found' })
    }
    res.json({ session })
  } catch (err) {
    console.error('[Analysis API] Get session error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.patch('/sessions/:id', (req, res) => {
  try {
    const session = patchAnalysisSession(req.params.id, req.body || {})
    if (!session) {
      return res.status(404).json({ error: 'Analysis session not found' })
    }
    res.json({ session })
  } catch (err) {
    console.error('[Analysis API] Patch session error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = getAnalysisSession(req.params.id)
    if (!session) {
      return res.status(404).json({ error: 'Analysis session not found' })
    }
    await proxyJson('/workspace/clear', { method: 'DELETE' }, { session_id: req.params.id }).catch(() => null)
    deleteAnalysisSession(req.params.id)
    res.json({ success: true })
  } catch (err) {
    console.error('[Analysis API] Delete session error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.get('/models', async (req, res) => {
  try {
    const payload = await proxyJson('/v1/models')
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Models error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.post('/test-connection', async (req, res) => {
  console.log('[Analysis API] test-connection called, body:', JSON.stringify(req.body))
  res.setHeader('Content-Type', 'application/json')
  try {
    const { api_base, api_key } = req.body || {}
    if (!api_base) {
      console.log('[Analysis API] test-connection: api_base missing')
      return res.status(400).send(JSON.stringify({ ok: false, error: 'api_base is required' }))
    }
    const validation = await validateExternalUrl(api_base)
    if (!validation.ok) {
      return res.status(403).send(JSON.stringify({ ok: false, error: validation.error }))
    }
    const base = String(api_base).replace(/\/+$/, '')
    const fetchHeaders = {}
    if (api_key) fetchHeaders['Authorization'] = `Bearer ${api_key}`
    console.log('[Analysis API] test-connection: fetching', `${base}/models`)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const start = Date.now()
    try {
      const response = await fetch(`${base}/models`, {
        method: 'GET',
        headers: fetchHeaders,
        signal: controller.signal,
      })
      clearTimeout(timer)
      const ms = Date.now() - start
      console.log('[Analysis API] test-connection: response status', response.status, 'ms:', ms)
      res.send(JSON.stringify({ ok: true, ms, status: response.status }))
    } catch (fetchErr) {
      clearTimeout(timer)
      console.error('[Analysis API] test-connection fetch error:', fetchErr.message)
      res.send(JSON.stringify({ ok: false, error: fetchErr.message || 'Connection failed' }))
    }
  } catch (err) {
    console.error('[Analysis API] test-connection error:', err.message)
    res.status(500).send(JSON.stringify({ ok: false, error: err.message || 'Connection failed' }))
  }
})

router.get('/workspace/state', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/state', {}, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace state error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.get('/workspace/files', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/files', {}, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace files error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.get('/workspace/tree', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/tree', {}, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace tree error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.get('/workspace/preview', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/preview', {}, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace preview error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.get('/workspace/download', async (req, res) => {
  try {
    const response = await fetch(buildAnalysisUrl('/workspace/download', req.query))
    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({ error: text || 'Download failed' })
    }
    const contentType = response.headers.get('content-type')
    const disposition = response.headers.get('content-disposition')
    if (contentType) res.setHeader('Content-Type', contentType)
    if (disposition) res.setHeader('Content-Disposition', disposition)
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res)
      return
    }
    res.end()
  } catch (err) {
    console.error('[Analysis API] Workspace download error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/workspace/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || []
    if (!files.length) {
      return res.status(400).json({ error: 'At least one file is required' })
    }
    const form = new FormData()
    for (const file of files) {
      form.append('files', new File([file.buffer], file.originalname, { type: file.mimetype || 'application/octet-stream' }))
    }
    const response = await fetch(buildAnalysisUrl('/workspace/upload', req.query), {
      method: 'POST',
      body: form,
    })
    const payload = await response.json().catch(() => ({ error: 'Upload failed' }))
    res.status(response.status).json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/workspace/file', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/file', { method: 'DELETE' }, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace delete error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.post('/workspace/clear', async (req, res) => {
  try {
    const payload = await proxyJson('/workspace/clear', { method: 'POST' }, req.query)
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Workspace clear error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.post('/export/report', async (req, res) => {
  try {
    const payload = await proxyJson('/export/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    })
    const sessionId = req.body?.session_id
    if (sessionId && payload?.file?.path) {
      patchAnalysisSession(sessionId, { last_report_path: payload.file.path })
    }
    res.json(payload)
  } catch (err) {
    console.error('[Analysis API] Export report error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

router.post('/chat/completions', async (req, res) => {
  try {
    const body = { ...(req.body || {}) }
    const sessionId = String(body.session_id || '')
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id is required' })
    }

    const userMessages = Array.isArray(body.messages)
      ? body.messages.filter(message => message?.role === 'user')
      : []
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
    const existing = getAnalysisSession(sessionId)
    upsertAnalysisSession({
      id: sessionId,
      title: existing?.title || deriveSessionTitle(typeof lastUserMessage === 'string' ? lastUserMessage : ''),
      status: 'running',
      model: body.model || existing?.model || null,
      last_user_message: typeof lastUserMessage === 'string' ? lastUserMessage : '',
      last_report_path: existing?.last_report_path || null,
    })

    let response
    try {
      response = await fetch(buildAnalysisUrl('/v1/chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (error) {
      patchAnalysisSession(sessionId, { status: 'error' })
      return res.status(502).json({ error: `Analysis service unavailable: ${error.message}` })
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Chat request failed' }))
      patchAnalysisSession(sessionId, { status: 'error' })
      return res.status(response.status).json(payload)
    }

    if (!body.stream) {
      const payload = await response.json()
      patchAnalysisSession(sessionId, { status: 'idle' })
      return res.json(payload)
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    if (!response.body) {
      patchAnalysisSession(sessionId, { status: 'error' })
      return res.status(502).json({ error: 'Analysis service returned an empty stream' })
    }

    const stream = Readable.fromWeb(response.body)
    stream.on('end', () => {
      patchAnalysisSession(sessionId, { status: 'idle' })
      res.end()
    })
    stream.on('error', (err) => {
      patchAnalysisSession(sessionId, { status: 'error' })
      console.error('[Analysis API] Stream proxy error:', err)
      res.end()
    })
    stream.pipe(res, { end: false })
  } catch (err) {
    console.error('[Analysis API] Chat completions error:', err)
    res.status(err.status || 500).json(err.payload || { error: err.message })
  }
})

export default router
