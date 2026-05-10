const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_AUTH_TOKEN_STORAGE_KEY = 'unicom_api_auth_token'

export function getApiAuthToken(): string {
  const bundledToken = import.meta.env.VITE_API_AUTH_TOKEN || ''
  if (bundledToken) return bundledToken
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(API_AUTH_TOKEN_STORAGE_KEY) || ''
}

export function setApiAuthToken(token: string) {
  if (typeof localStorage === 'undefined') return
  const normalized = token.trim()
  if (normalized) {
    localStorage.setItem(API_AUTH_TOKEN_STORAGE_KEY, normalized)
  } else {
    localStorage.removeItem(API_AUTH_TOKEN_STORAGE_KEY)
  }
}

export function clearApiAuthToken() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(API_AUTH_TOKEN_STORAGE_KEY)
}

export function apiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  if (!API_BASE_URL) return endpoint
  return `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
}

export function apiUrlWithAuthToken(endpoint: string): string {
  const token = getApiAuthToken()
  const url = apiUrl(endpoint)
  if (!token) return url

  const absolute = /^https?:\/\//i.test(url)
  const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  parsed.searchParams.set('access_token', token)
  return absolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers || {})
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getApiAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(apiUrl(endpoint), {
    ...options,
    headers,
  })
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function requestBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
  const response = await apiFetch(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.blob()
}
