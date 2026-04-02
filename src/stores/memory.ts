import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { memoryApi, type MemoryFile, type MemoryNode, type MemoryStats, type MemoryActivity } from '@/api'

export const useMemoryStore = defineStore('memory', () => {
  // State
  const stats = ref<MemoryStats | null>(null)
  const files = ref<MemoryFile[]>([])
  const nodes = ref<MemoryNode[]>([])
  const activities = ref<MemoryActivity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 文件系统树根节点
  const fileTree = computed(() => {
    const root: MemoryFile[] = []
    const fileMap = new Map<string, MemoryFile>()

    // 先创建所有文件/目录的映射
    files.value.forEach(file => {
      fileMap.set(file.path, { ...file })
    })

    // 构建树形结构
    files.value.forEach(file => {
      const filePath = file.path
      // 查找父目录
      let parentPath = filePath.substring(0, filePath.lastIndexOf('/'))

      if (!parentPath) {
        // 根目录文件
        root.push(fileMap.get(filePath)!)
      } else {
        const parent = fileMap.get(parentPath)
        if (parent) {
          if (!parent.children) {
            parent.children = []
          }
          parent.children.push(fileMap.get(filePath)!)
        } else {
          // 父目录不存在，直接添加到根目录
          root.push(fileMap.get(filePath)!)
        }
      }
    })

    return root
  })

  // 节点连接图数据
  const graphData = computed(() => {
    const nodeData = nodes.value.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      description: node.description,
    }))

    const links = nodes.value.flatMap(node =>
      node.connections.map(conn => ({
        source: node.id,
        target: conn.targetId,
        type: conn.type,
        weight: conn.weight,
      }))
    )

    return { nodes: nodeData, links }
  })

  // Actions
  async function fetchMemoryData() {
    loading.value = true
    error.value = null
    try {
      const response = await memoryApi.getMemoryData()
      stats.value = response.stats
      files.value = response.files || []
      nodes.value = response.nodes || []
      activities.value = response.activities || []
    } catch (e: any) {
      error.value = e.message || '加载内存数据失败'
      console.error('Failed to fetch memory:', e)
      stats.value = null
      files.value = []
      nodes.value = []
      activities.value = []
    } finally {
      loading.value = false
    }
  }

  async function importMemoryFile(file: File) {
    loading.value = true
    try {
      const result = await memoryApi.importMemory(file)
      if (result.success) {
        await fetchMemoryData()
      }
      return result
    } catch (e: any) {
      console.error('Failed to import memory:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function exportMemoryData() {
    try {
      const blob = await memoryApi.exportMemory()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'memory-export.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error('Failed to export memory:', e)
      throw e
    }
  }

  return {
    // State
    stats,
    files,
    nodes,
    activities,
    loading,
    error,
    // Getters
    fileTree,
    graphData,
    // Actions
    fetchMemoryData,
    importMemoryFile,
    exportMemoryData,
  }
})
