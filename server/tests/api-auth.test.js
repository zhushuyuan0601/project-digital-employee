import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiAuthMiddleware } from '../middleware/api-auth.js'

function runAuth({ configuredToken, authorization, query = {} }) {
  const middleware = createApiAuthMiddleware(configuredToken)
  let statusCode = 200
  let payload = null
  let nextCalled = false

  middleware(
    { headers: authorization ? { authorization } : {}, query },
    {
      status(code) {
        statusCode = code
        return this
      },
      json(body) {
        payload = body
      },
    },
    () => {
      nextCalled = true
    },
  )

  return { statusCode, payload, nextCalled }
}

test('API auth skips validation when no token is configured', () => {
  const result = runAuth({ configuredToken: '' })

  assert.equal(result.nextCalled, true)
  assert.equal(result.payload, null)
})

test('API auth accepts bearer token header', () => {
  const result = runAuth({
    configuredToken: 'secret-token',
    authorization: 'Bearer secret-token',
  })

  assert.equal(result.nextCalled, true)
  assert.equal(result.payload, null)
})

test('API auth accepts access token query for EventSource streams', () => {
  const result = runAuth({
    configuredToken: 'secret-token',
    query: { access_token: 'secret-token' },
  })

  assert.equal(result.nextCalled, true)
  assert.equal(result.payload, null)
})

test('API auth rejects missing or invalid token', () => {
  const missing = runAuth({ configuredToken: 'secret-token' })
  const invalid = runAuth({
    configuredToken: 'secret-token',
    authorization: 'Bearer wrong-token',
  })

  assert.equal(missing.nextCalled, false)
  assert.equal(missing.statusCode, 401)
  assert.equal(missing.payload.error, 'Unauthorized: invalid or missing token')
  assert.equal(invalid.nextCalled, false)
  assert.equal(invalid.statusCode, 401)
})
