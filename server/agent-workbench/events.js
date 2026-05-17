import { EventEmitter } from 'events'
import { addEvent, listEvents } from './db.js'

const emitter = new EventEmitter()
emitter.setMaxListeners(300)

function serializeEvent(row, extra = {}) {
  return {
    eventId: row.id,
    sessionId: row.session_id,
    type: row.type,
    payload: row.payload_json || {},
    createdAt: row.created_at,
    createdAtMs: row.created_at_ms,
    ...extra,
  }
}

export function emitWorkbenchEvent(sessionId, type, payload = {}) {
  const row = addEvent({ sessionId, type, payload })
  const event = serializeEvent(row)
  emitter.emit('event', event)
  emitter.emit(`session:${sessionId}`, event)
  return event
}

export function writeSseEvent(res, event) {
  if (event.eventId != null) res.write(`id: ${event.eventId}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

export function attachSessionStream(req, res, sessionId, { since = null } = {}) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  writeSseEvent(res, {
    eventId: since || 0,
    sessionId,
    type: 'connected',
    payload: {},
    createdAt: Math.floor(Date.now() / 1000),
    createdAtMs: Date.now(),
  })

  for (const row of listEvents(sessionId, { since, limit: 500 })) {
    writeSseEvent(res, serializeEvent(row, { replay: true }))
  }

  const handler = (event) => {
    writeSseEvent(res, event)
  }
  emitter.on(`session:${sessionId}`, handler)

  const keepAlive = setInterval(() => {
    writeSseEvent(res, {
      sessionId,
      type: 'ping',
      payload: {},
      createdAt: Math.floor(Date.now() / 1000),
      createdAtMs: Date.now(),
    })
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    emitter.off(`session:${sessionId}`, handler)
  })
}
