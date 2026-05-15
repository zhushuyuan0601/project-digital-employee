import { request } from './base'

export interface DashboardStats {
  totalProjects?: number
  inProgress?: number
  notStarted?: number
  todayCommits?: number
}

export interface DashboardResponse {
  success: boolean
  dataSource?: 'database' | 'workspace' | 'mock' | 'mixed'
  stats: DashboardStats
  projects: unknown[]
  todayWork: unknown[]
  outputs: unknown[]
}

export interface ActivityItem {
  id: string
  type: string
  actor?: string
  description?: string
  date?: string
  person?: string
  task?: string
  status?: string
  time?: string
  createdAt?: number
}

export interface ActivitiesResponse {
  success: boolean
  dataSource?: 'database' | 'mock' | 'mixed'
  activities: ActivityItem[]
  total: number
}

export function getDashboard() {
  return request<DashboardResponse>('/api/dashboard')
}

export function getActivities(limit = 5) {
  return request<ActivitiesResponse>(`/api/activities?limit=${limit}`)
}

export function getRecentActivities(params: { hours?: number; limit?: number } = {}) {
  const search = new URLSearchParams()
  if (params.hours) search.set('hours', String(params.hours))
  if (params.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  return request<ActivitiesResponse>(`/api/activities${query ? `?${query}` : ''}`)
}
