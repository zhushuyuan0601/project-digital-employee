const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean
}

function getAuthToken(): string {
  return import.meta.env.VITE_API_AUTH_TOKEN || ''
}

function isJsonRequestBody(body: RequestInit['body']): boolean {
  return !!body && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)
}

function prepareHeaders(options?: ApiRequestOptions): Headers {
  const headers = new Headers(options?.headers || {})
  if (isJsonRequestBody(options?.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAuthToken()
  if (options?.auth !== false && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

export function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  return `${API_BASE_URL}${endpoint}`
}

// EventSource cannot receive custom Authorization headers; this keeps URL resolution aligned with fetch helpers.
export function buildEventSourceUrl(endpoint: string): string {
  return buildApiUrl(endpoint)
}

export function buildWebSocketUrl(endpoint: string): string {
  const apiUrl = buildApiUrl(endpoint)
  const url = new URL(apiUrl, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

async function parseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const error = await response.json().catch(() => null) as {
      error?: string | { code?: string; message?: string; details?: Record<string, unknown> }
      message?: string
      traceId?: string
    } | null
    const message = typeof error?.error === 'string'
      ? error.error
      : error?.error?.message || error?.message || `HTTP ${response.status}`
    const trace = error?.traceId || response.headers.get('x-trace-id')
    return trace ? `${message}（Trace: ${trace}）` : message
  }
  const text = await response.text().catch(() => '')
  return text || `HTTP ${response.status}`
}

export async function requestRaw(endpoint: string, options?: ApiRequestOptions): Promise<Response> {
  const fetchOptions: ApiRequestOptions = { ...(options || {}) }
  delete fetchOptions.auth
  const response = await fetch(buildApiUrl(endpoint), {
    ...fetchOptions,
    headers: prepareHeaders(options),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return response
}

export async function requestJson<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  const response = await requestRaw(endpoint, options)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!text) return undefined as T
  const contentType = response.headers.get('Content-Type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON response from ${endpoint}, received ${contentType || 'unknown content type'}`)
  }
  return JSON.parse(text) as T
}

export async function request<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return requestJson<T>(endpoint, options)
}

export async function requestBlob(endpoint: string, options?: ApiRequestOptions): Promise<Blob> {
  const response = await requestRaw(endpoint, options)
  return response.blob()
}

export async function requestText(endpoint: string, options?: ApiRequestOptions): Promise<string> {
  const response = await requestRaw(endpoint, options)
  return response.text()
}

export async function requestStream(endpoint: string, options?: ApiRequestOptions): Promise<ReadableStream<Uint8Array>> {
  const response = await requestRaw(endpoint, options)
  const stream = response.body
  if (!stream) {
    throw new Error('Streaming is not supported by the current browser')
  }
  return stream
}
