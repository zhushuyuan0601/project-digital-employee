<template>
  <div class="memory-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">
          <span class="title-icon">🧠</span>
          <span class="title-main">内存图谱</span>
          <span class="title-sub">MEMORY GRAPH // 知识与关系网络</span>
        </h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" @click="refreshMemory">
          <span>⟳</span> 刷新
        </button>
        <button class="btn btn-primary btn-sm" @click="showImportModal = true">
          <span>⬆</span> 导入知识
        </button>
      </div>
    </div>

    <!-- 存储概览 -->
    <div class="storage-overview">
      <div class="storage-card">
        <div class="storage-info">
          <span class="storage-icon">📁</span>
          <div class="storage-details">
            <span class="storage-label">知识文件</span>
            <span class="storage-value">{{ fileCount }} 个</span>
          </div>
        </div>
        <div class="storage-chart">
          <div class="donut-chart" :style="fileChartStyle">
            <svg viewBox="0 0 100 100">
              <circle class="donut-bg" cx="50" cy="50" r="40" />
              <circle class="donut-progress" cx="50" cy="50" r="40" :style="fileChartProgress" />
            </svg>
          </div>
          <span class="donut-value">{{ storagePercent }}%</span>
        </div>
      </div>

      <div class="storage-card">
        <div class="storage-info">
          <span class="storage-icon">🔗</span>
          <div class="storage-details">
            <span class="storage-label">关系节点</span>
            <span class="storage-value">{{ nodeCount }} 个</span>
          </div>
        </div>
        <div class="storage-chart">
          <div class="donut-chart" :style="nodeChartStyle">
            <svg viewBox="0 0 100 100">
              <circle class="donut-bg" cx="50" cy="50" r="40" />
              <circle class="donut-progress" cx="50" cy="50" r="40" :style="nodeChartProgress" />
            </svg>
          </div>
          <span class="donut-value">{{ connectionsCount }} 连接</span>
        </div>
      </div>

      <div class="storage-card">
        <div class="storage-info">
          <span class="storage-icon">💾</span>
          <div class="storage-details">
            <span class="storage-label">存储使用</span>
            <span class="storage-value">{{ usedStorage }} / {{ totalStorage }}</span>
          </div>
        </div>
        <div class="storage-bar">
          <div class="bar-fill" :style="{ width: storagePercent + '%' }"></div>
          <span class="bar-value">{{ storagePercent }}%</span>
        </div>
      </div>
    </div>

    <!-- 主体内容：左右布局 -->
    <div class="memory-layout">
      <!-- 左侧：文件树 -->
      <div class="file-tree-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span class="panel-icon">📁</span>
            知识文件系统
          </h3>
          <div class="panel-actions">
            <button class="icon-btn" @click="expandAll" title="展开全部">⟳</button>
            <button class="icon-btn" @click="collapseAll" title="折叠全部">⊞</button>
          </div>
        </div>
        <div class="tree-content">
          <tree-node
            v-for="node in fileTree"
            :key="node.id"
            :node="node"
            :selected="selectedNode?.id === node.id"
            @select="selectNode"
            @expand="toggleExpand"
          />
        </div>
      </div>

      <!-- 中间：关系图谱 -->
      <div class="graph-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span class="panel-icon">🕸️</span>
            关系网络
          </h3>
          <div class="panel-actions">
            <select v-model="graphLayout" class="layout-select">
              <option value="force">力导向</option>
              <option value="hierarchy">层级</option>
              <option value="circular">环形</option>
            </select>
            <button class="icon-btn" @click="refreshGraph" title="刷新图谱">⟳</button>
          </div>
        </div>
        <div class="graph-container" ref="graphContainer">
          <!-- 模拟关系图谱可视化 -->
          <div class="graph-visualization">
            <div class="graph-node center" :style="{ transform: `translate(0px, 0px)` }">
              <span class="node-icon">🧠</span>
              <span class="node-label">核心记忆</span>
            </div>
            <div
              v-for="(node, index) in graphNodes"
              :key="node.id"
              class="graph-node"
              :class="node.type"
              :style="getNodePosition(index, graphNodes.length)"
            >
              <span class="node-icon">{{ node.icon }}</span>
              <span class="node-label">{{ node.label }}</span>
            </div>
            <!-- 连接线 -->
            <svg class="graph-links" viewBox="0 0 600 400">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary-dim)" />
                </marker>
              </defs>
              <line
                v-for="(link, index) in graphLinks"
                :key="index"
                :x1="link.x1"
                :y1="link.y1"
                :x2="link.x2"
                :y2="link.y2"
                class="graph-link"
                marker-end="url(#arrowhead)"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 右侧：节点详情 -->
      <div class="detail-panel">
        <div class="panel-header">
          <h3 class="panel-title">
            <span class="panel-icon">📄</span>
            节点详情
          </h3>
          <button class="icon-btn" @click="closeDetail" title="关闭">✕</button>
        </div>
        <div v-if="selectedNode" class="detail-content">
          <div class="detail-header">
            <span class="detail-icon">{{ selectedNode.icon }}</span>
            <div class="detail-info">
              <span class="detail-name">{{ selectedNode.name }}</span>
              <span class="detail-type">{{ selectedNode.type }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">基本信息</h4>
            <div class="detail-row">
              <span class="detail-label">创建时间</span>
              <span class="detail-value">{{ selectedNode.createdAt }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">更新时间</span>
              <span class="detail-value">{{ selectedNode.updatedAt }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">大小</span>
              <span class="detail-value">{{ selectedNode.size }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">连接数</span>
              <span class="detail-value">{{ selectedNode.connections }} 个</span>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">内容预览</h4>
            <div class="content-preview">
              {{ selectedNode.preview }}
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-section-title">关联节点</h4>
            <div class="related-nodes">
              <div
                v-for="related in selectedNode.related"
                :key="related.id"
                class="related-node"
                @click="selectNode(related)"
              >
                <span class="related-icon">{{ related.icon }}</span>
                <span class="related-name">{{ related.name }}</span>
              </div>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn btn-primary btn-full" @click="viewContent">
              查看完整内容
            </button>
            <button class="btn btn-secondary btn-full" @click="exportNode">
              导出
            </button>
          </div>
        </div>
        <div v-else class="empty-detail">
          <span class="empty-icon">👈</span>
          <p class="empty-text">选择节点查看详情</p>
        </div>
      </div>
    </div>

    <!-- 底部：最近活动 -->
    <div class="recent-activities">
      <div class="section-header">
        <h3 class="section-title">最近活动</h3>
      </div>
      <div class="activity-list">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
        >
          <span :class="['activity-icon', activity.type]">{{ activity.icon }}</span>
          <div class="activity-info">
            <span class="activity-text">{{ activity.text }}</span>
            <span class="activity-time">{{ activity.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMemoryStore } from '@/stores/memory'
import type { MemoryFile } from '@/api'

// TreeNode 组件
const TreeNode = {
  name: 'TreeNode',
  props: ['node', 'selected'],
  emits: ['select', 'expand'],
  template: `
    <div class="tree-node">
      <div
        :class="['tree-node-header', { selected }]"
        @click="$emit('select', node)"
      >
        <span
          :class="['tree-node-toggle', node.children ? 'expandable' : 'leaf']"
          @click.stop="$emit('expand', node)"
        >
          {{ node.expanded ? '▼' : node.children ? '▶' : '○' }}
        </span>
        <span class="tree-node-icon">{{ node.icon }}</span>
        <span class="tree-node-name">{{ node.name }}</span>
        <span class="tree-node-meta">{{ node.meta }}</span>
      </div>
      <div v-if="node.children && node.expanded" class="tree-children">
        <tree-node
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected="selected && selected.id === child.id"
          @select="$emit('select', $event)"
          @expand="$emit('expand', $event)"
        />
      </div>
    </div>
  `
}

const memoryStore = useMemoryStore()
const selectedNode = ref<any>(null)
const graphLayout = ref('force')
const showImportModal = ref(false)

// 从 store 获取数据
const stats = computed(() => memoryStore.stats)
const fileTree = computed(() => memoryStore.fileTree)
const graphData = computed(() => memoryStore.graphData)
const activities = computed(() => memoryStore.activities)
const loading = computed(() => memoryStore.loading)

// 计算存储概览数据
const fileCount = computed(() => stats.value?.fileCount || 0)
const nodeCount = computed(() => stats.value?.nodeCount || 0)
const connectionsCount = computed(() => stats.value?.connectionCount || 0)
const usedStorage = computed(() => stats.value?.usedStorage || '0 GB')
const totalStorage = computed(() => stats.value?.totalStorage || '10 GB')
const storagePercent = computed(() => {
  if (!stats.value) return 0
  const used = parseFloat(stats.value.usedStorage) || 0
  const total = parseFloat(stats.value.totalStorage) || 1
  return Math.round((used / total) * 100)
})

// 图谱节点（从 graphData 转换）
const graphNodes = computed(() => {
  return graphData.value.nodes.map((node: any) => ({
    id: node.id,
    label: node.name,
    icon: getIconForType(node.type),
    type: node.type
  }))
})

// 图谱连线（从 graphData 转换）
const graphLinks = computed(() => {
  return graphData.value.links.map((link: any, index: number) => {
    const sourceNode = graphNodes.value.find((n: any) => n.id === link.source)
    const targetNode = graphNodes.value.find((n: any) => n.id === link.target)
    const sourceIndex = graphNodes.value.findIndex((n: any) => n.id === link.source)
    const targetIndex = graphNodes.value.findIndex((n: any) => n.id === link.target)

    // 计算节点位置
    const angle1 = (sourceIndex / graphNodes.value.length) * 2 * Math.PI - Math.PI / 2
    const angle2 = (targetIndex / graphNodes.value.length) * 2 * Math.PI - Math.PI / 2
    const radius = 150

    return {
      x1: 300 + Math.cos(angle1) * radius,
      y1: 200 + Math.sin(angle1) * radius,
      x2: 300 + Math.cos(angle2) * radius,
      y2: 200 + Math.sin(angle2) * radius
    }
  })
})

// 最近活动
const recentActivities = computed(() => {
  return activities.value.map((activity: any, index: number) => ({
    id: index + 1,
    type: activity.type || 'update',
    icon: getActivityIcon(activity.type),
    text: activity.description || activity.text,
    time: formatTime(activity.timestamp)
  }))
})

// 辅助函数
const getIconForType = (type: string) => {
  const icons: Record<string, string> = {
    folder: '📁',
    file: '📄',
    note: '📝',
    doc: '📄',
    image: '🖼️',
    code: '💻',
    default: '📄'
  }
  return icons[type] || icons.default
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    create: '+',
    update: '⟳',
    delete: '✕',
    link: '🔗',
    import: '⬆',
    export: '⬇',
    default: '•'
  }
  return icons[type] || icons.default
}

const formatTime = (timestamp?: string | number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const fileChartStyle = computed(() => ({
  '--chart-percent': Math.min((fileCount.value / 200) * 100, 100)
}))

const fileChartProgress = computed(() => ({
  strokeDasharray: `${2 * Math.PI * 40}`,
  strokeDashoffset: `${2 * Math.PI * 40 * (1 - Math.min(fileCount.value / 200, 1))}`
}))

const nodeChartStyle = computed(() => ({
  '--chart-percent': Math.min((nodeCount.value / 150) * 100, 100)
}))

const nodeChartProgress = computed(() => ({
  strokeDasharray: `${2 * Math.PI * 40}`,
  strokeDashoffset: `${2 * Math.PI * 40 * (1 - Math.min(nodeCount.value / 150, 1))}`
}))

const getNodePosition = (index: number, total: number) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const radius = 150
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  return { transform: `translate(${x}px, ${y}px)` }
}

const selectNode = (node: MemoryFile) => {
  selectedNode.value = {
    ...node,
    createdAt: (node as any).createdAt || new Date().toISOString(),
    updatedAt: (node as any).updatedAt || new Date().toISOString(),
    size: node.size || '0 KB',
    connections: (node as any).connections?.length || 0,
    preview: (node as any).preview || '暂无预览内容',
    related: (node as any).related || []
  }
}

const toggleExpand = (node: MemoryFile) => {
  if (node.children) {
    node.expanded = !node.expanded
  }
}

const expandAll = () => {
  const expandNode = (node: MemoryFile) => {
    if (node.children) {
      node.expanded = true
      node.children.forEach(expandNode)
    }
  }
  fileTree.value.forEach(expandNode)
}

const collapseAll = () => {
  const collapseNode = (node: MemoryFile) => {
    if (node.children) {
      node.expanded = false
      node.children.forEach(collapseNode)
    }
  }
  fileTree.value.forEach(collapseNode)
}

const refreshMemory = async () => {
  await memoryStore.fetchMemoryData()
}

const refreshGraph = async () => {
  await memoryStore.fetchMemoryData()
}

const closeDetail = () => {
  selectedNode.value = null
}

const viewContent = () => {
  console.log('Viewing content...', selectedNode.value?.name)
}

const exportNode = () => {
  console.log('Exporting node...', selectedNode.value?.name)
}

onMounted(async () => {
  await memoryStore.fetchMemoryData()
})
</script>

<style scoped>
.memory-page {
  max-width: 1600px;
  margin: 0 auto;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line);
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.title-main {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
  letter-spacing: 0.1em;
}

.title-sub {
  font-size: 12px;
  color: var(--color-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.title-icon {
  display: none;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ========== 存储概览 ========== */
.storage-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.storage-card {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.storage-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.15);
}

.storage-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.storage-icon {
  font-size: 32px;
}

.storage-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.storage-label {
  font-size: 12px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.storage-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  font-family: var(--font-mono);
}

.storage-chart {
  position: relative;
  width: 80px;
  height: 80px;
}

.donut-chart {
  width: 100%;
  height: 100%;
}

.donut-bg {
  fill: none;
  stroke: var(--bg-base);
  stroke-width: 12;
}

.donut-progress {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 12;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.5s;
}

.donut-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
}

.storage-bar {
  flex: 1;
  margin-left: 16px;
  height: 8px;
  background: var(--bg-base);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--grid-line-dim);
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 4px;
  transition: width 0.5s;
}

.bar-value {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

/* ========== 主体布局 ========== */
.memory-layout {
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 16px;
  margin-bottom: 24px;
  min-height: 500px;
}

@media (max-width: 1200px) {
  .memory-layout {
    grid-template-columns: 240px 1fr;
  }
  .detail-panel {
    display: none;
  }
}

/* ========== 面板通用样式 ========== */
.file-tree-panel,
.graph-panel,
.detail-panel {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.panel-title span {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.layout-select {
  padding: 4px 8px;
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: pointer;
  outline: none;
}

/* ========== 文件树 ========== */
.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-node {
  margin-bottom: 4px;
}

.tree-node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tree-node-header:hover {
  background: rgba(0, 240, 255, 0.08);
}

.tree-node-header.selected {
  background: rgba(0, 240, 255, 0.15);
  border: 1px solid rgba(0, 240, 255, 0.3);
}

.tree-node-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-tertiary);
  cursor: pointer;
}

.tree-node-toggle.expandable:hover {
  color: var(--color-primary);
}

.tree-node-icon {
  font-size: 16px;
}

.tree-node-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.tree-node-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.tree-children {
  padding-left: 24px;
}

/* ========== 关系图谱 ========== */
.graph-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-base);
}

.graph-visualization {
  width: 100%;
  height: 100%;
  position: relative;
}

.graph-node {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-panel);
  border: 2px solid var(--grid-line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 1;
}

.graph-node:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
  transform: translate(-50%, -50%) scale(1.05);
}

.graph-node.center {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(189, 0, 255, 0.1) 100%);
  border-color: var(--color-primary);
  padding: 20px 24px;
}

.node-icon {
  font-size: 24px;
}

.node-label {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
}

.graph-links {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.graph-link {
  stroke: var(--color-primary-dim);
  stroke-width: 2;
  fill: none;
}

/* ========== 详情面板 ========== */
.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--grid-line-dim);
  margin-bottom: 16px;
}

.detail-icon {
  font-size: 32px;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-type {
  font-size: 12px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.1em;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--grid-line-dim);
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.content-preview {
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  font-family: var(--font-mono);
  max-height: 120px;
  overflow-y: auto;
}

.related-nodes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.related-node:hover {
  border-color: var(--color-primary);
  background: rgba(0, 240, 255, 0.05);
}

.related-icon {
  font-size: 18px;
}

.related-name {
  font-size: 13px;
  color: var(--text-primary);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

/* ========== 最近活动 ========== */
.recent-activities {
  background: var(--bg-panel);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  padding: 20px;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--bg-base);
  border: 1px solid var(--grid-line-dim);
  border-radius: 8px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
}

.activity-icon.create {
  background: rgba(0, 255, 136, 0.15);
  color: var(--color-success);
}

.activity-icon.update {
  background: rgba(0, 217, 255, 0.15);
  color: #00d9ff;
}

.activity-icon.link {
  background: rgba(189, 0, 255, 0.15);
  color: var(--color-secondary);
}

.activity-icon.delete {
  background: rgba(255, 51, 102, 0.15);
  color: var(--color-error);
}

.activity-icon.import {
  background: rgba(255, 170, 0, 0.15);
  color: var(--color-warning);
}

.activity-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.activity-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ========== 通用按钮 ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-full {
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-color: transparent;
  color: var(--text-inverse);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

/* ========== 亮色主题 ========== */
:root.light-theme .page-header {
  border-bottom-color: #e5e7eb;
}

:root.light-theme .title-main {
  color: #1e293b;
  text-shadow: none;
  font-weight: 800;
}

:root.light-theme .file-tree-panel,
:root.light-theme .graph-panel,
:root.light-theme .detail-panel,
:root.light-theme .recent-activities {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .panel-header {
  border-bottom-color: #f3f4f6;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, transparent 100%);
}

:root.light-theme .tree-node-header:hover {
  background: rgba(37, 99, 235, 0.08);
}

:root.light-theme .tree-node-header.selected {
  background: rgba(37, 99, 235, 0.15);
  border-color: #bfdbfe;
}

:root.light-theme .graph-container {
  background: #f9fafb;
}

:root.light-theme .graph-node {
  background: #ffffff;
  border-color: #e5e7eb;
}

:root.light-theme .graph-node:hover {
  border-color: #2563eb;
}

:root.light-theme .graph-node.center {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-color: #2563eb;
}
</style>
