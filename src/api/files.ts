import { request } from './base'

export interface FileContentResponse {
  success: boolean
  content?: string
  error?: string
  [key: string]: unknown
}

export function getFileContent(params: { path: string; taskId?: string | null; outputId?: string | number | null }) {
  const search = new URLSearchParams({ path: params.path })
  if (params.taskId) search.set('taskId', params.taskId)
  if (params.outputId !== undefined && params.outputId !== null && params.outputId !== '') {
    search.set('outputId', String(params.outputId))
  }
  return request<FileContentResponse>(`/api/files/content?${search.toString()}`)
}
