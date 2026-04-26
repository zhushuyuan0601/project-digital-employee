import { request } from './base'

export interface CronTask {
  id: string
  name: string
  cron: string
  cronDescription?: string
  agentId: string
  agentName: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  successCount: number
  failureCount: number
  lastStatus?: 'success' | 'failure' | 'running'
  lastError?: string
}

export interface CronExecution {
  id: string
  taskId: string
  taskName: string
  startTime: string
  endTime?: string
  status: 'success' | 'failure' | 'running'
  error?: string
  output?: string
}

export interface CronStats {
  totalTasks: number
  enabledTasks: number
  disabledTasks: number
  todayExecutions: number
}

export interface CronResponse {
  success: boolean
  stats: CronStats
  tasks: CronTask[]
  executions: CronExecution[]
}

export const cronApi = {
  async getCronTasks(): Promise<CronResponse> {
    return request('/api/cron/tasks')
  },

  async createTask(task: {
    name: string
    cron: string
    agentId: string
    enabled?: boolean
  }): Promise<{ success: boolean; task: CronTask }> {
    return request('/api/cron/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    })
  },

  async updateTask(taskId: string, updates: Partial<CronTask>): Promise<{ success: boolean }> {
    return request(`/api/cron/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  },

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return request(`/api/cron/tasks/${taskId}`, {
      method: 'DELETE',
    })
  },

  async toggleTask(taskId: string): Promise<{ success: boolean; enabled: boolean }> {
    return request(`/api/cron/tasks/${taskId}/toggle`, {
      method: 'POST',
    })
  },

  async executeTask(taskId: string): Promise<{ success: boolean; executionId: string }> {
    return request(`/api/cron/tasks/${taskId}/execute`, {
      method: 'POST',
    })
  },
}
