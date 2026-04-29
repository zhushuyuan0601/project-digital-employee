import { request } from './base'

export interface AnalysisSession {
  id: string
  title: string
  status: string
  model?: string | null
  last_user_message?: string | null
  last_report_path?: string | null
  created_at: number
  updated_at: number
}

export interface WorkspaceFile {
  name: string
  path: string
  size: number
  category: 'table' | 'image' | 'other'
  is_generated: boolean
  download_url: string
  preview_url: string
}

export interface AnalysisMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function listAnalysisSessions() {
  return request<{ sessions: AnalysisSession[] }>('/api/analysis/sessions')
}

export async function createAnalysisSession(payload?: { title?: string; model?: string }) {
  return request<{ session: AnalysisSession }>('/api/analysis/sessions', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export async function patchAnalysisSession(id: string, payload: Partial<AnalysisSession>) {
  return request<{ session: AnalysisSession }>(`/api/analysis/sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAnalysisSession(id: string) {
  return request<{ success: boolean }>(`/api/analysis/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getAnalysisState(sessionId: string) {
  return request<{
    session_id: string
    messages: AnalysisMessage[]
    generated_files: Array<{ name: string; url: string }>
    updated_at: number
  }>(`/api/analysis/workspace/state?session_id=${encodeURIComponent(sessionId)}`)
}

export async function listAnalysisFiles(sessionId: string) {
  return request<{ files: WorkspaceFile[] }>(`/api/analysis/workspace/files?session_id=${encodeURIComponent(sessionId)}`)
}

export async function previewAnalysisFile(
  sessionId: string,
  path: string,
  extra?: { page?: number; pageSize?: number; tableName?: string; sheetName?: string },
) {
  const query = new URLSearchParams({
    session_id: sessionId,
    path,
  })
  if (extra?.page) query.set('page', String(extra.page))
  if (extra?.pageSize) query.set('page_size', String(extra.pageSize))
  if (extra?.tableName) query.set('table_name', extra.tableName)
  if (extra?.sheetName) query.set('sheet_name', extra.sheetName)
  return request<any>(`/api/analysis/workspace/preview?${query.toString()}`)
}

export async function uploadAnalysisFiles(sessionId: string, files: File[]) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return request<{ files: Array<{ name: string; path: string; size: number }> }>(
    `/api/analysis/workspace/upload?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: 'POST',
      body: formData,
    },
  )
}

export async function deleteAnalysisFile(sessionId: string, path: string) {
  const query = new URLSearchParams({ session_id: sessionId, path })
  return request<{ success: boolean }>(`/api/analysis/workspace/file?${query.toString()}`, {
    method: 'DELETE',
  })
}

export async function clearAnalysisWorkspace(sessionId: string) {
  return request<{ success: boolean }>(`/api/analysis/workspace/clear?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
  })
}

export async function listAnalysisModels() {
  return request<{ object: string; data: Array<{ id: string }> }>('/api/analysis/models')
}

export async function exportAnalysisReport(payload: { session_id: string; format: 'md' | 'pdf' }) {
  const response = await fetch('/api/analysis/export/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json()
}

export async function streamAnalysisChat(
  payload: Record<string, unknown>,
  onChunk: (chunk: { content?: string; session_id?: string; files?: Array<{ name: string; url: string }>; done?: boolean }) => void,
) {
  const response = await fetch('/api/analysis/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Streaming is not supported by the current browser')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (buffer.includes('\n\n')) {
      const boundary = buffer.indexOf('\n\n')
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const line = rawEvent
        .split('\n')
        .map((item) => item.trim())
        .find((item) => item.startsWith('data:'))
      if (!line) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        onChunk({ done: true })
        continue
      }
      const payload = JSON.parse(data)
      const choice = payload?.choices?.[0]
      const delta = choice?.delta || {}
      onChunk({
        content: delta.content,
        session_id: delta.session_id,
        files: delta.files,
        done: choice?.finish_reason === 'stop',
      })
    }
  }
}
