export interface GatewayConnectionSettings {
  wsUrl: string
  token: string
  autoConnect: boolean
}

export const GATEWAY_PROTOCOL_VERSION = 3
export const GATEWAY_STORAGE_TOKEN_KEY = 'mc-gateway-token'
export const GATEWAY_OPERATOR_SCOPES = ['operator.admin', 'operator.write', 'operator.read']
export const GATEWAY_CAPABILITIES = ['tool-events']

export function getGatewayBaseWsUrl(): string {
  const envWsUrl = import.meta.env.VITE_GATEWAY_WS_URL
  if (envWsUrl) return envWsUrl

  const host = import.meta.env.VITE_GATEWAY_HOST || '127.0.0.1'
  const port = import.meta.env.VITE_GATEWAY_PORT || '18789'
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  const protocol = isLocal ? 'ws' : (window.location.protocol === 'https:' ? 'wss' : 'ws')
  return `${protocol}://${host}:${port}`
}

export function getGatewayToken(): string {
  const envToken = import.meta.env.VITE_GATEWAY_TOKEN
  if (envToken) return envToken
  return localStorage.getItem(GATEWAY_STORAGE_TOKEN_KEY) || ''
}

export function setGatewayToken(token: string): void {
  localStorage.setItem(GATEWAY_STORAGE_TOKEN_KEY, token)
}

export function clearGatewayToken(): void {
  localStorage.removeItem(GATEWAY_STORAGE_TOKEN_KEY)
}

export function getDefaultGatewayConnectionSettings(): GatewayConnectionSettings {
  return {
    wsUrl: getGatewayBaseWsUrl(),
    token: getGatewayToken(),
    autoConnect: true,
  }
}

export function buildGatewaySocketUrl(wsUrl: string, token?: string): string {
  if (!token) return wsUrl
  return `${wsUrl}?token=${encodeURIComponent(token)}`
}
