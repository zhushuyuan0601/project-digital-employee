import crypto from 'crypto'

const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_ERROR',
}

export function traceMiddleware(req, res, next) {
  const incoming = req.headers['x-trace-id']
  req.traceId = typeof incoming === 'string' && incoming.trim()
    ? incoming.trim()
    : `trace_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
  res.setHeader('x-trace-id', req.traceId)

  const originalJson = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      const current = body
      const message = typeof current.error === 'string'
        ? current.error
        : current.error?.message || current.message || `HTTP ${res.statusCode}`
      const details = { ...current }
      delete details.success
      delete details.error
      delete details.message
      delete details.code
      delete details.traceId
      return originalJson({
        success: false,
        error: {
          code: current.code || STATUS_CODES[res.statusCode] || 'REQUEST_FAILED',
          message,
          details,
        },
        traceId: req.traceId,
      })
    }
    return originalJson(body)
  }

  next()
}

export function sendError(res, status, code, message, details = {}) {
  return res.status(status).json({
    success: false,
    error: { code, message, details },
    traceId: res.req?.traceId,
  })
}

export function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return
  const status = Number(err?.status || err?.statusCode || 500)
  const safeStatus = status >= 400 && status < 600 ? status : 500
  sendError(
    res,
    safeStatus,
    err?.code || STATUS_CODES[safeStatus] || 'INTERNAL_ERROR',
    err instanceof Error ? err.message : String(err || 'Internal server error'),
  )
}
