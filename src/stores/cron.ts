import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cronApi, type CronTask, type CronExecution, type CronStats } from '@/api'

export const useCronStore = defineStore('cron', () => {
  // State
  const stats = ref<CronStats | null>(null)
  const tasks = ref<CronTask[]>([])
  const executions = ref<CronExecution[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 统计
  const enabledTasks = computed(() => tasks.value.filter(t => t.enabled).length)
  const disabledTasks = computed(() => tasks.value.filter(t => !t.enabled).length)

  // Actions
  async function fetchTasks() {
    loading.value = true
    error.value = null
    try {
      const response = await cronApi.getCronTasks()
      stats.value = response.stats
      tasks.value = response.tasks || []
      executions.value = response.executions || []
    } catch (e: any) {
      error.value = e.message || '加载定时任务失败'
      console.error('Failed to fetch cron tasks:', e)
      stats.value = null
      tasks.value = []
      executions.value = []
    } finally {
      loading.value = false
    }
  }

  async function createTask(task: { name: string; cron: string; agentId: string; enabled?: boolean }) {
    try {
      const result = await cronApi.createTask(task)
      if (result.success) {
        await fetchTasks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to create task:', e)
      throw e
    }
  }

  async function updateTask(taskId: string, updates: Partial<CronTask>) {
    try {
      const result = await cronApi.updateTask(taskId, updates)
      if (result.success) {
        await fetchTasks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to update task:', e)
      throw e
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const result = await cronApi.deleteTask(taskId)
      if (result.success) {
        await fetchTasks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to delete task:', e)
      throw e
    }
  }

  async function toggleTask(taskId: string) {
    try {
      const result = await cronApi.toggleTask(taskId)
      if (result.success) {
        await fetchTasks()
      }
      return result
    } catch (e: any) {
      console.error('Failed to toggle task:', e)
      throw e
    }
  }

  async function executeTask(taskId: string) {
    try {
      const result = await cronApi.executeTask(taskId)
      if (result.success) {
        // 立即刷新可能看不到执行中状态，稍后刷新
        setTimeout(() => fetchTasks(), 1000)
      }
      return result
    } catch (e: any) {
      console.error('Failed to execute task:', e)
      throw e
    }
  }

  // Cron 表达式转自然语言
  function cronToHuman(cron: string): string {
    const parts = cron.split(' ')
    if (parts.length !== 5) return cron

    const [minute, hour, day, month, weekday] = parts

    const descriptions: string[] = []

    // 分钟
    if (minute === '*') {
      descriptions.push('每分钟')
    } else if (minute === '0') {
      descriptions.push('整点')
    } else {
      descriptions.push(`第${minute}分钟`)
    }

    // 小时
    if (hour === '*') {
      descriptions.push('每小时')
    } else if (hour !== '*' && minute === '0') {
      descriptions.push(`${hour}点`)
    }

    // 日期
    if (day === '*') {
      // 不添加
    } else {
      descriptions.push(`${day}日`)
    }

    // 月份
    if (month === '*') {
      // 不添加
    } else {
      descriptions.push(`${month}月`)
    }

    // 星期
    if (weekday === '*') {
      // 不添加
    } else {
      const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const w = parseInt(weekday)
      descriptions.push(weekdayNames[w] || `周${w}`)
    }

    // 特殊表达式
    if (cron === '0 * * * *') return '每小时整点'
    if (cron === '0 0 * * *') return '每天午夜'
    if (cron === '0 9 * * *') return '每天早上 9 点'
    if (cron === '0 0 * * 0') return '每周日凌晨'
    if (cron === '0 0 1 * *') return '每月 1 日午夜'

    return descriptions.join(' ')
  }

  return {
    // State
    stats,
    tasks,
    executions,
    loading,
    error,
    // Getters
    enabledTasks,
    disabledTasks,
    // Actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    executeTask,
    cronToHuman,
  }
})
