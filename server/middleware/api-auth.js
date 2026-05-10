import { timingSafeEqual } from 'crypto'

function safeTokenEquals(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''))
  const expectedBuffer = Buffer.from(String(expected || ''))
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

function readRequestToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim()
  }

  const queryToken = req.query?.access_token || req.query?.api_token
  return Array.isArray(queryToken) ? queryToken[0] : queryToken
}

export function createApiAuthMiddleware(configuredToken = '') {
  const expectedToken = String(configuredToken || '').trim()

  return function requireAuth(req, res, next) {
    if (!expectedToken) return next()

    const token = readRequestToken(req)
    if (token && safeTokenEquals(token, expectedToken)) return next()

    return res.status(401).json({ error: 'Unauthorized: invalid or missing token' })
  }
}
