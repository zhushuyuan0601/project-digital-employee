import { requestBlob, request } from './base'

export interface MemoryFile {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime: string
  children?: MemoryFile[]
  expanded?: boolean
  icon?: string
  meta?: string
  preview?: string
  related?: Array<{ id: string; name: string; icon?: string }>
  createdAt?: string
  updatedAt?: string
  connections?: Array<{ targetId: string; type: string; weight: number }>
}

export interface MemoryNode {
  id: string
  name: string
  type: 'concept' | 'entity' | 'event' | 'document'
  description?: string
  connections: Array<{
    targetId: string
    type: string
    weight: number
  }>
  metadata?: Record<string, any>
}

export interface MemoryStats {
  fileCount: number
  nodeCount: number
  storageUsed: number
  storageUsedFormatted: string
  connectionCount?: number
  usedStorage?: string
  totalStorage?: string
}

export interface MemoryActivity {
  id: string
  type: 'create' | 'update' | 'delete' | 'connect'
  nodeId: string
  nodeName: string
  timestamp: string
  description: string
}

export interface MemoryResponse {
  success: boolean
  stats: MemoryStats
  files: MemoryFile[]
  nodes: MemoryNode[]
  activities: MemoryActivity[]
}

export const memoryApi = {
  async getMemoryData(): Promise<MemoryResponse> {
    return request('/api/memory')
  },

  async importMemory(file: File): Promise<{ success: boolean }> {
    const formData = new FormData()
    formData.append('file', file)
    return request('/api/memory/import', {
      method: 'POST',
      body: formData,
    })
  },

  async exportMemory(): Promise<Blob> {
    return requestBlob('/api/memory/export')
  },
}
