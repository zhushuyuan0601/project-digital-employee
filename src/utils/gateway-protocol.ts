import {
  GATEWAY_CAPABILITIES,
  GATEWAY_OPERATOR_SCOPES,
  GATEWAY_PROTOCOL_VERSION,
} from '@/config/gateway'

export interface ConnectChallengePayload {
  nonce: string
  ts: number
}

export interface GatewayClientInfo {
  id: string
  displayName: string
  version?: string
  platform?: string
  mode?: string
  instanceId?: string
}

export function nextGatewayRequestId(prefix: string = 'req'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildConnectRequest(options: {
  token?: string
  client: GatewayClientInfo
  role?: string
  minProtocol?: number
  maxProtocol?: number
}) {
  return {
    type: 'req',
    id: nextGatewayRequestId(),
    method: 'connect',
    params: {
      minProtocol: options.minProtocol ?? GATEWAY_PROTOCOL_VERSION,
      maxProtocol: options.maxProtocol ?? GATEWAY_PROTOCOL_VERSION,
      client: {
        version: '1.0.0',
        platform: 'web',
        mode: 'webchat',
        ...options.client,
      },
      role: options.role ?? 'operator',
      scopes: GATEWAY_OPERATOR_SCOPES,
      caps: GATEWAY_CAPABILITIES,
      auth: options.token ? { token: options.token } : undefined,
    },
  }
}

export async function createChallengeResponse(token: string, nonce: string): Promise<string | null> {
  if (!window.crypto?.subtle) {
    return null
  }

  const encoder = new TextEncoder()
  const keyData = encoder.encode(token)
  const messageData = encoder.encode(nonce)
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await window.crypto.subtle.sign('HMAC', key, messageData)
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildChallengeResponseMessage(token: string, payload: ConnectChallengePayload) {
  const response = await createChallengeResponse(token, payload.nonce)
  if (!response) return null

  return {
    type: 'req',
    id: nextGatewayRequestId(),
    method: 'connect.challenge_response',
    params: {
      nonce: payload.nonce,
      response,
    },
  }
}

export function filterThoughts(text: string): string {
  if (!text) return text

  const thinkingTag = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\b[^<>]*>/gi
  const quickTag = /<\s*\/?\s*(?:think(?:ing)?|thought|antthinking)\b/i

  if (!quickTag.test(text)) {
    return text
  }

  let result = ''
  let lastIndex = 0
  let inThinking = false

  for (const match of text.matchAll(thinkingTag)) {
    const idx = match.index ?? 0
    const isClose = match[1] === '/'

    if (!inThinking) {
      result += text.slice(lastIndex, idx)
      if (!isClose) {
        inThinking = true
      }
    } else if (isClose) {
      inThinking = false
    }

    lastIndex = idx + match[0].length
  }

  if (!inThinking) {
    result += text.slice(lastIndex)
  }

  return result.trimStart()
}

function normalizeText(text: string | null): string | null {
  if (!text) return null
  const filtered = filterThoughts(text)
  return filtered.trim() ? filtered : null
}

function extractTextFromContent(content: any): string | null {
  if (typeof content === 'string') return normalizeText(content)
  if (Array.isArray(content)) {
    return normalizeText(content.map((item: any) => item?.text || '').join(''))
  }
  return null
}

export function extractText(payload: any): string | null {
  if (!payload?.data) return null
  if (typeof payload.data === 'string') return normalizeText(payload.data)
  if (payload.data.text) return normalizeText(payload.data.text)
  if (payload.data.content) return extractTextFromContent(payload.data.content)
  if (payload.data.delta) {
    return normalizeText(payload.data.delta.text || payload.data.delta.content || '')
  }
  return null
}

export function extractChatText(payload: any): string | null {
  if (!payload?.message) return null
  const message = payload.message
  if (typeof message === 'string') return normalizeText(message)
  if (message.text) return normalizeText(message.text)
  if (message.content) return extractTextFromContent(message.content)
  return null
}
