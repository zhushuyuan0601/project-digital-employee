<template>
  <div class="digital-employee-page">
    <!-- 背景效果 -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <!-- 内容区域 -->
    <div class="content-wrapper relative z-10">
      <!-- 顶部导航栏 -->
    <nav v-if="showShellHeader" class="glass-card border-b border-white/10 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span class="text-2xl">🤖</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold glow-text">
                <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">数字员工监控中心</span>
              </h1>
              <p class="text-xs text-gray-400 mono">AI Digital Employee Command Center · 实时数据流</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="glass-card px-4 py-2 flex items-center space-x-3">
              <button @click="refreshData" class="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30">
                <i :class="['fas fa-sync-alt', { refreshing: refreshing }]"></i>
                <span>刷新</span>
              </button>
              <div class="text-right">
                <p class="text-xs text-gray-500">最后更新</p>
                <p class="text-sm font-semibold text-gray-200 mono">{{ lastUpdate }}</p>
              </div>
              <div class="w-2.5 h-2.5 bg-green-400 rounded-full status-dot" style="color: #22C55E;"></div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-6 py-8 relative z-10">
      <!-- 统计卡片 -->
      <div v-if="showStatsCards" class="stats-grid mb-8">
        <div class="stat-card stat-card--blue">
          <div class="stat-card-inner">
            <div class="stat-info">
              <p class="stat-label-upper">项目总数</p>
              <p class="stat-value-large mono">{{ stats.totalProjects }}</p>
            </div>
            <div class="stat-icon stat-icon--blue">
              <i class="fas fa-folder"></i>
            </div>
          </div>
        </div>
        <div class="stat-card stat-card--green">
          <div class="stat-card-inner">
            <div class="stat-info">
              <p class="stat-label-upper">开发中</p>
              <p class="stat-value-large mono">{{ stats.inProgress }}</p>
            </div>
            <div class="stat-icon stat-icon--green">
              <i class="fas fa-code"></i>
            </div>
          </div>
        </div>
        <div class="stat-card stat-card--yellow">
          <div class="stat-card-inner">
            <div class="stat-info">
              <p class="stat-label-upper">规划中</p>
              <p class="stat-value-large mono">{{ stats.notStarted }}</p>
            </div>
            <div class="stat-icon stat-icon--yellow">
              <i class="fas fa-clipboard"></i>
            </div>
          </div>
        </div>
        <div class="stat-card stat-card--purple">
          <div class="stat-card-inner">
            <div class="stat-info">
              <p class="stat-label-upper">今日提交</p>
              <p class="stat-value-large mono">{{ stats.todayCommits }}</p>
            </div>
            <div class="stat-icon stat-icon--purple">
              <i class="fas fa-git-alt"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 数字员工 -->
      <h2 v-if="showTeamSection" class="section-title">
        <i class="fas fa-users"></i>
        <span>数字员工</span>
      </h2>
      <div v-if="showTeamSection" class="team-members-grid mb-8">
        <DigitalEmployeeAgentCard
          v-for="member in teamMembers"
          :key="member.id"
          :member="member"
        />
      </div>

      <!-- 工作成果 -->
      <h2 v-if="showOutputsSection" class="section-title">
        <i class="fas fa-trophy"></i>
        <span>工作成果</span>
        <span class="section-title__sub">OPC · 数字员工团队所有任务输出</span>
      </h2>
      <div v-if="showOutputsSection" class="glass-card outputs-panel mb-8">
        <!-- 筛选工具栏 -->
        <div class="outputs-filter-bar">
          <div class="filter-group">
            <div class="filter-item">
              <i class="fas fa-calendar-alt filter-icon"></i>
              <input v-model="filterOutputDateStart" @change="applyOutputFilters" type="date" class="dark-input">
              <span class="filter-separator">至</span>
              <input v-model="filterOutputDateEnd" @change="applyOutputFilters" type="date" class="dark-input">
            </div>
            <div class="filter-item">
              <i class="fas fa-user-tag filter-icon"></i>
              <select v-model="filterOutputRole" @change="applyOutputFilters" class="dark-input">
                <option value="all">全部角色</option>
                <option value="小 U">小 U · 项目管理</option>
                <option value="小开">小开 · 研发工程师</option>
                <option value="小研">小研 · 竞品分析师</option>
                <option value="小产">小产 · 产品经理</option>
              </select>
            </div>
            <div class="filter-item">
              <i class="fas fa-file-type filter-icon"></i>
              <select v-model="filterOutputType" @change="applyOutputFilters" class="dark-input">
                <option value="all">全部类型</option>
                <option value="report">
                  <i class="fas fa-chart-bar"></i> 报告
                </option>
                <option value="doc">
                  <i class="fas fa-file-alt"></i> 文档
                </option>
                <option value="code">
                  <i class="fas fa-code"></i> 代码
                </option>
              </select>
            </div>
          </div>
          <div class="filter-actions">
            <button @click="setOutputQuickDate('today')" class="filter-chip" :class="{ active: isTodayFilter }">
              <i class="fas fa-calendar-day"></i>
              今天
            </button>
            <button @click="setOutputQuickDate('week')" class="filter-chip" :class="{ active: isWeekFilter }">
              <i class="fas fa-calendar-week"></i>
              本周
            </button>
            <div class="results-count">
              <i class="fas fa-layer-group"></i>
              <span class="count-value">{{ filteredOutputs.length }}</span>
              <span class="count-label">项</span>
            </div>
          </div>
        </div>

        <!-- 输出卡片网格 -->
        <div class="outputs-grid">
          <div v-if="loading" class="loading-state col-span-full">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
            </div>
            <p class="loading-text">加载工作成果...</p>
          </div>
          <div v-else-if="!filteredOutputs.length" class="empty-state col-span-full">
            <div class="empty-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <p class="empty-title">暂无成果</p>
            <p class="empty-hint">筛选条件可能没有匹配的结果</p>
          </div>
          <div
            v-for="output in filteredOutputs"
            :key="output.name + output.date"
            class="output-card"
            @click="previewFile(output)"
          >
            <div class="output-card__header">
              <div class="output-icon" :style="{ background: getTypeIconColor(output.type) + '20', color: getTypeIconColor(output.type) }">
                <i :class="getTypeIcon(output.type)"></i>
              </div>
              <div class="output-meta">
                <span class="output-date">
                  <i class="fas fa-clock"></i>
                  {{ output.date }}
                </span>
                <span class="output-type">{{ getOutputFileTypeName(output.type) }}</span>
              </div>
            </div>
            <div class="output-card__body">
              <h4 class="output-name">{{ output.name }}</h4>
              <p class="output-author">
                <i class="fas fa-user-circle"></i>
                {{ output.person }}
              </p>
            </div>
            <div class="output-card__footer">
              <span class="file-badge" :class="'file-badge--' + output.type">
                <i :class="getTypeIcon(output.type)"></i>
                {{ getOutputFileTypeName(output.type) }}
              </span>
              <button class="preview-btn">
                <i class="fas fa-eye"></i>
                预览
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时工作流 -->
      <h2 v-if="showWorkflowSection" class="text-lg font-bold mb-4 flex items-center space-x-2">
        <i class="fas fa-calendar-day text-green-400"></i>
        <span>实时工作流</span>
      </h2>
      <div v-if="showWorkflowSection" class="glass-card p-5 mb-8">
        <div class="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-white/10">
          <input v-model="filterDateStart" @change="applyFilters" type="date" class="dark-input text-sm">
          <span class="text-gray-500">至</span>
          <input v-model="filterDateEnd" @change="applyFilters" type="date" class="dark-input text-sm">
          <select v-model="filterRole" @change="applyFilters" class="dark-input text-sm">
            <option value="all">全部角色</option>
            <option value="小 U">小 U</option>
            <option value="小开">小开</option>
            <option value="小研">小研</option>
            <option value="小产">小产</option>
          </select>
          <button @click="setQuickDate('today')" class="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-all">今天</button>
          <button @click="setQuickDate('week')" class="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-all">本周</button>
          <span class="ml-auto text-xs text-gray-500 mono">显示 <span class="text-green-400">{{ filteredWork.length }}</span> 条</span>
        </div>
        <div class="space-y-2">
          <div v-if="loading" class="text-center py-8 text-gray-400">
            <i class="fas fa-spinner fa-spin text-2xl"></i>
          </div>
          <div v-else-if="!filteredWork.length" class="text-center py-8 text-gray-500">
            <i class="fas fa-inbox text-3xl mb-2"></i>
            <p>暂无记录</p>
          </div>
          <div v-else v-for="work in filteredWork" :key="work.date + work.time + work.task" class="flex items-start justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-indigo-500/30 transition-all">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-1">
                <span class="text-xs text-gray-500 mono">{{ work.date || '' }}</span>
                <span class="text-xs text-gray-400 mono">{{ work.time }}</span>
                <span class="text-gray-600">|</span>
                <span class="text-xs text-indigo-400">{{ work.person }}</span>
              </div>
              <p class="text-sm text-gray-200">{{ work.task }}</p>
            </div>
            <span :class="['text-xs px-2 py-1 rounded', work.status?.includes('完成') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30']">
              {{ work.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- 项目进度 -->
      <h2 v-if="showProjectsSection" class="section-title">
        <i class="fas fa-chart-line"></i>
        <span>项目进度</span>
        <span class="section-title__sub">PROJECT MONITORING</span>
      </h2>
      <div v-if="showProjectsSection" class="glass-card projects-panel" id="projectsList">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <p class="loading-text">正在加载项目数据...</p>
        </div>
        <div v-else class="projects-grid">
          <ProjectCard
            v-for="project in projects"
            :key="project.id"
            :project="project"
          />
        </div>
      </div>

      <!-- 文件预览对话框 -->
      <el-dialog
        v-model="showPreviewDialog"
        :title="previewFileItem?.name || '文件预览'"
        width="900px"
        :close-on-click-modal="true"
      >
        <div class="file-preview-container">
          <div v-if="previewLoading" class="preview-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载文件中...</span>
          </div>
          <div v-else-if="previewError" class="preview-error">
            <el-icon><Warning /></el-icon>
            <span>{{ previewError }}</span>
          </div>
          <div v-else class="preview-content">
            <div v-if="previewContent.type === 'markdown' || previewContent.type === 'report' || previewContent.type === 'doc'" class="markdown-rendered" v-html="renderPreviewContent()"></div>
            <pre v-else-if="previewContent.type === 'text'" v-html="escapeHtml(previewContent.content)"></pre>
            <div v-else-if="previewContent.type === 'html'" v-html="previewContent.content"></div>
            <div v-else-if="previewContent.type === 'pdf'" class="pdf-preview">
              <iframe :src="previewContent.content" frameborder="0" width="100%" height="600px"></iframe>
            </div>
            <div v-else-if="previewContent.type === 'code'" class="markdown-rendered" v-html="renderPreviewContent()"></div>
            <div v-else class="preview-unsupported">
              <el-icon><Document /></el-icon>
              <p>该文件类型暂不支持在线预览</p>
              <p class="hint">{{ previewFileItem?.name }}</p>
              <el-button type="primary" @click="downloadFile">下载文件</el-button>
            </div>
          </div>
        </div>
      </el-dialog>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useAgentsStore } from '@/stores/agents'
import { ElMessage } from 'element-plus'
import { Loading, Warning, Document } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import DigitalEmployeeAgentCard from '@/components/digital-employee/DigitalEmployeeAgentCard.vue'
import ProjectCard from '@/components/digital-employee/ProjectCard.vue'

const props = withDefaults(defineProps<{
  viewMode?: 'all' | 'projects' | 'outputs'
  embedded?: boolean
}>(), {
  viewMode: 'all',
  embedded: false,
})

type AgentId = 'xiaomu' | 'xiaokai' | 'xiaochan' | 'xiaoyan' | 'xiaoce'
type OutputType = 'code' | 'doc' | 'report' | 'markdown' | 'text' | 'html' | 'pdf' | 'unsupported' | 'json'

interface DashboardStats {
  totalProjects: number
  inProgress: number
  notStarted: number
  todayCommits: number
}

interface PreviewFileItem {
  name: string
  type?: string
  path?: string
  url?: string
  content?: string
  date?: string
  person?: string
}

interface OutputRecord extends PreviewFileItem {
  name: string
  date: string
  person: string
  type: string
}

interface WorkRecord {
  date: string
  time: string
  person: string
  task: string
  status?: string
}

interface ProjectRecord {
  id: string
  stage: string
  stageEmoji?: string
  stageName?: string
  name: string
  description?: string
  githubUrl?: string
  demoUrl?: string
  progress?: number
  leaderRole?: string
  leader?: string
  lastUpdate?: string
  createDate?: string
  completedTasks?: number
  totalTasks?: number
  progressList?: string[]
  nextSteps?: string[]
}

interface TeamMemberCard {
  id: string
  name: string
  title: string
  icon: string
  status: string
  completedTasks: number
  gradient: string
  stats: Record<string, number | string>
  task: string
  todayOutputs: OutputRecord[]
}

const agentsStore = useAgentsStore()
const md = new MarkdownIt()

const showShellHeader = computed(() => !props.embedded)
const showStatsCards = computed(() => props.viewMode === 'all')
const showTeamSection = computed(() => props.viewMode === 'all')
const showOutputsSection = computed(() => props.viewMode === 'all' || props.viewMode === 'outputs')
const showWorkflowSection = computed(() => props.viewMode === 'all' || props.viewMode === 'outputs')
const showProjectsSection = computed(() => props.viewMode === 'all' || props.viewMode === 'projects')

// 状态
const loading = ref(true)
const refreshing = ref(false)
const lastUpdate = ref('--:--:--')

// 文件预览对话框
const showPreviewDialog = ref(false)
const previewFileItem = ref<PreviewFileItem | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewContent = ref<{ type: OutputType | string; content: string }>({ type: '', content: '' })

// 数据
const stats = ref<DashboardStats>({ totalProjects: 0, inProgress: 0, notStarted: 0, todayCommits: 0 })
const projects = ref<ProjectRecord[]>([])
const allWorkRecords = ref<WorkRecord[]>([])
const allOutputs = ref<OutputRecord[]>([])

// 筛选
const filterDateStart = ref('')
const filterDateEnd = ref('')
const filterRole = ref('all')
const filterOutputDateStart = ref('')
const filterOutputDateEnd = ref('')
const filterOutputRole = ref('all')
const filterOutputType = ref('all')

// 计算属性
const filteredWork = computed(() => {
  let filtered = [...allWorkRecords.value]
  if (filterDateStart.value) filtered = filtered.filter(w => w.date >= filterDateStart.value)
  if (filterDateEnd.value) filtered = filtered.filter(w => w.date <= filterDateEnd.value)
  if (filterRole.value !== 'all') filtered = filtered.filter(w => w.person.includes(filterRole.value))
  // 只显示最新的5条
  return filtered.slice(0, 5)
})

const filteredOutputs = computed(() => {
  let filtered = [...allOutputs.value]
  if (filterOutputDateStart.value) filtered = filtered.filter(o => o.date >= filterOutputDateStart.value)
  if (filterOutputDateEnd.value) filtered = filtered.filter(o => o.date <= filterOutputDateEnd.value)
  if (filterOutputRole.value !== 'all') filtered = filtered.filter(o => o.person.includes(filterOutputRole.value))
  if (filterOutputType.value !== 'all') filtered = filtered.filter(o => o.type === filterOutputType.value)
  return filtered
})

const isTodayFilter = computed(() => {
  const today = getLocalDate()
  return filterOutputDateStart.value === today && filterOutputDateEnd.value === today
})

const isWeekFilter = computed(() => {
  const today = getLocalDate()
  const weekAgo = getLocalDateDaysAgo(7)
  return filterOutputDateStart.value === weekAgo && filterOutputDateEnd.value === today
})

const teamMembers = computed<TeamMemberCard[]>(() => {
  const today = new Date().toISOString().split('T')[0]
  const todayOutputs = allOutputs.value.filter(o => o.date === today)
  // 保持原有的人名匹配逻辑（小 U、小开等）
  const nameMap: Record<AgentId, string> = {
    xiaomu: '小 U',
    xiaokai: '小开',
    xiaochan: '小产',
    xiaoyan: '小研',
    xiaoce: '小测'
  }
  const getOutputsByPerson = (agentId: AgentId) => {
    const personName = nameMap[agentId] || ''
    return todayOutputs.filter(o => o.person && o.person.includes(personName))
  }

  const workByPerson: Record<string, number> = {}
  allWorkRecords.value.forEach(w => {
    const name = w.person.split('(')[0]
    workByPerson[name] = (workByPerson[name] || 0) + 1
  })

  // 从 agentsStore 获取团队成员信息，保持与团队成员页面一致
  return agentsStore.agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    title: agent.description,
    icon: agent.icon,
    status: agent.status,
    completedTasks: agent.completedTasks,
    gradient: getGradientForAgent(agent.id as AgentId),
    stats: getAgentStats(agent.id as AgentId, workByPerson),
    task: getAgentTask(agent.id as AgentId),
    todayOutputs: getOutputsByPerson(agent.id as AgentId)
  }))
})

// 获取 Agent 对应的渐变色
function getGradientForAgent(agentId: AgentId) {
  const gradients: Record<AgentId, string> = {
    xiaomu: 'from-indigo-400 to-purple-500',    // 项目管理
    xiaokai: 'from-green-400 to-cyan-500',      // 研发工程师
    xiaochan: 'from-pink-400 to-rose-500',      // 产品经理
    xiaoyan: 'from-yellow-400 to-orange-500',   // 研究员
    xiaoce: 'from-red-400 to-pink-500'          // 测试员
  }
  return gradients[agentId] || 'from-gray-400 to-gray-500'
}

// 获取 Agent 统计信息
function getAgentStats(agentId: AgentId, workByPerson: Record<string, number>) {
  const statsMap: Record<AgentId, Record<string, number | string>> = {
    xiaomu: { '任务': workByPerson['小 U'] || 0, '同步': '✅' },
    xiaokai: { '提交': stats.value.todayCommits || 0, '代码': '2.5k' },
    xiaochan: { 'PRD': 0, '评审': 0 },
    xiaoyan: { '报告': 0, '洞察': 15 },
    xiaoce: { '测试': 0, '通过': '100%' }
  }
  return statsMap[agentId] || {}
}

// 获取 Agent 当前任务
function getAgentTask(agentId: AgentId) {
  const tasks: Record<AgentId, string> = {
    xiaomu: '团队协调',
    xiaokai: '智能情报系统开发',
    xiaochan: '产品需求规划',
    xiaoyan: '行业情报收集',
    xiaoce: '功能测试验证'
  }
  return tasks[agentId] || '-'
}

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    code: 'fas fa-code',
    doc: 'fas fa-file-alt',
    report: 'fas fa-chart-bar'
  }
  return icons[type] || 'fas fa-file'
}

const getTypeIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    code: '#60a5fa',
    doc: '#fbbf24',
    report: '#a78bfa'
  }
  return colors[type] || '#94a3b8'
}

const getOutputFileTypeName = (type: string) => {
  const names: Record<string, string> = { code: '代码', doc: '文档', report: '报告' }
  return names[type] || '文件'
}

// 渲染预览内容
const renderPreviewContent = () => {
  if (previewContent.value.type === 'markdown' || previewContent.value.type === 'report' || previewContent.value.type === 'doc' || previewContent.value.type === 'code') {
    return md.render(previewContent.value.content)
  }
  return previewContent.value.content
}

// 转义 HTML
const escapeHtml = (content: string) => {
  const div = document.createElement('div')
  div.textContent = content
  return div.innerHTML
}

// 获取文件类型
const getFileType = (fileName: string) => {
  if (!fileName) return 'text'
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) return 'text'
  const typeMap: Record<string, OutputType | string> = {
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'text',
    'text': 'text',
    'log': 'text',
    'html': 'html',
    'htm': 'html',
    'pdf': 'pdf',
    'json': 'json',
    'js': 'code',
    'ts': 'code',
    'vue': 'code',
    'css': 'code',
    'py': 'code',
    'java': 'code',
    'go': 'code',
    'rs': 'code',
    'cpp': 'code',
    'c': 'code',
    'h': 'code',
    'hpp': 'code'
  }
  return typeMap[ext] || 'text'
}

// 预览文件 - 适配 /api/dashboard 返回的数据格式
const previewFile = (file: PreviewFileItem) => {
  console.log('[DigitalEmployee] 预览文件，file:', file)
  previewFileItem.value = file
  previewLoading.value = true
  previewError.value = null
  showPreviewDialog.value = true

  // 确定文件类型
  const fileType = file.type || getFileType(file.name)

  // 从 url 参数中提取路径（/api/dashboard 返回的格式）
  let filePath = file.path
  if (!filePath && file.url) {
    // 从 /api/file?path=xxx 中提取路径
    const urlMatch = file.url.match(/[?&]path=([^&]+)/)
    if (urlMatch) {
      filePath = decodeURIComponent(urlMatch[1])
      console.log('[DigitalEmployee] 从 url 提取 path:', filePath)
    }
  }

  // 优先从后端 API 获取文件内容
  if (filePath) {
    console.log('[DigitalEmployee] 预览文件，filePath:', filePath)
    fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`)
      .then(res => res.json())
      .then(data => {
        console.log('[DigitalEmployee] API 返回:', data)
        previewLoading.value = false
        if (data.success) {
          previewContent.value = {
            type: fileType,
            content: data.content
          }
        } else {
          previewError.value = data.error || '读取文件失败'
        }
      })
      .catch((err: Error) => {
        console.error('[DigitalEmployee] 预览错误:', err)
        previewLoading.value = false
        previewError.value = '读取文件失败：' + err.message
      })
  } else if (file.content) {
    // 直接使用本地内容
    previewLoading.value = false
    previewContent.value = {
      type: fileType,
      content: file.content
    }
  } else {
    console.warn('[DigitalEmployee] 文件没有 path、url 或 content 属性')
    // 没有路径和内容，显示不支持预览
    previewLoading.value = false
    previewContent.value = {
      type: 'unsupported',
      content: ''
    }
  }
}

// 下载文件
const downloadFile = () => {
  if (!previewFileItem.value) return
  const content = previewContent.value.content || previewFileItem.value.content || ''
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = previewFileItem.value.name
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('文件已开始下载')
}

const refreshData = async () => {
  refreshing.value = true
  try {
    // 并行获取 dashboard 数据和 activities 数据
    const [dashboardRes, activitiesRes] = await Promise.all([
      axios.get('/api/dashboard'),
      axios.get('/api/activities?hours=24&limit=100')
    ])

    const data = dashboardRes.data

    // 统计
    stats.value = {
      totalProjects: data.stats?.totalProjects || 0,
      inProgress: data.stats?.inProgress || 0,
      notStarted: data.stats?.notStarted || 0,
      todayCommits: data.stats?.todayCommits || 0
    }

    // 项目
    projects.value = (data.projects || []) as ProjectRecord[]

    // 工作记录 - 从 activities API 获取
    const activitiesData = activitiesRes.data
    if (activitiesData.success && activitiesData.activities) {
      allWorkRecords.value = activitiesData.activities as WorkRecord[]
    } else {
      allWorkRecords.value = (data.todayWork || []) as WorkRecord[]
    }

    // 工作成果
    console.log('[DigitalEmployee] API 返回的 outputs:', data.outputs)
    allOutputs.value = (data.outputs || []) as OutputRecord[]

    // 更新时间
    const now = new Date()
    lastUpdate.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  } catch (e) {
    console.error('Refresh error:', e)
  }
  refreshing.value = false
  loading.value = false
}

const applyFilters = () => {}
const applyOutputFilters = () => {}

const getLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getLocalDateDaysAgo = (days: number) => {
  const now = new Date()
  now.setDate(now.getDate() - days)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setQuickDate = (range: 'today' | 'week') => {
  const today = getLocalDate()
  filterDateStart.value = range === 'today' ? today : getLocalDateDaysAgo(7)
  filterDateEnd.value = today
}

const setOutputQuickDate = (range: 'today' | 'week') => {
  const today = getLocalDate()
  filterOutputDateStart.value = range === 'today' ? today : getLocalDateDaysAgo(7)
  filterOutputDateEnd.value = today
}

// 生命周期
let refreshTimer: number | null = null

onMounted(() => {
  const today = getLocalDate()
  filterDateStart.value = today
  filterDateEnd.value = today
  filterOutputDateStart.value = today
  filterOutputDateEnd.value = today

  // 初始化 agentsStore，确保团队成员数据已加载
  if (agentsStore.agents.length === 0) {
    agentsStore.initializeDefaultAgents()
  }

  refreshData()
  refreshTimer = window.setInterval(refreshData, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style>
/* 数字员工监控中心专属样式 - 非 scoped */
.digital-employee-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--digital-bg, linear-gradient(135deg, #0f172a 0%, #020617 100%));
  overflow-x: hidden;
  transition: background var(--transition-slow);
}

.digital-employee-page .content-wrapper {
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 100vh;
}

/* CSS 变量 - 暗色主题 */
:root.dark-theme .digital-employee-page,
.digital-employee-page {
  --digital-bg: linear-gradient(135deg, #0f172a 0%, #020617 100%);
  --digital-card-bg: rgba(17, 24, 39, 0.7);
  --digital-border: rgba(255, 255, 255, 0.08);
  --digital-shadow: rgba(0, 0, 0, 0.4);
  --digital-grid: rgba(99, 102, 241, 0.03);
  --digital-glow: rgba(99, 102, 241, 0.15);
  --digital-text-primary: #f8fafc;
  --digital-text-secondary: #94a3b8;
  --digital-accent: #6366F1;
  --digital-accent-secondary: #818CF8;
}

/* CSS 变量 - 亮色主题 (毛玻璃柔和风格) */
:root.light-theme .digital-employee-page {
  --digital-bg: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  --digital-card-bg: rgba(255, 255, 255, 0.95);
  --digital-border: #d1d5db;
  --digital-shadow: rgba(15, 23, 42, 0.08);
  --digital-grid: rgba(37, 99, 235, 0.06);
  --digital-glow: rgba(37, 99, 235, 0.08);
  --digital-text-primary: #1e293b;
  --digital-text-secondary: #475569;
  --digital-accent: #2563eb;
}

.digital-employee-page .bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(var(--digital-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--digital-grid) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
  transition: all var(--transition-slow);
}

/* 背景光晕效果 */
.digital-employee-page .bg-glow {
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-2%, -2%) scale(1.05); }
}

/* 字体 */
.digital-employee-page * {
  font-family: 'Inter', sans-serif;
}

.digital-employee-page .mono {
  font-family: 'JetBrains Mono', monospace;
}

/* 玻璃态卡片 */
.digital-employee-page .glass-card {
  background: var(--digital-card-bg);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--digital-border);
  border-radius: 20px;
  box-shadow:
    0 4px 24px -4px var(--digital-shadow),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 玻璃态卡片悬停效果 */
.digital-employee-page .glass-card-hover {
  transition: all 0.3s ease;
}

.digital-employee-page .glass-card-hover:hover {
  border-color: var(--digital-accent);
  box-shadow: 0 16px 48px var(--digital-shadow);
  transform: translateY(-2px);
}

/* 进度条光晕效果 */
.digital-employee-page .progress-glow {
  background: linear-gradient(90deg, var(--digital-accent) 0%, #06B6D4 100%);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.3);
  position: relative;
  overflow: hidden;
}

.digital-employee-page .progress-glow::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

/* 状态点脉冲动画 */
.digital-employee-page .status-dot {
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 10px currentColor;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

/* 刷新按钮旋转动画 */
.digital-employee-page .refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 数字员工卡片 */
.digital-employee-page .agent-card {
  position: relative;
  background: var(--digital-card-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--digital-border);
  box-shadow:
    0 4px 24px -4px var(--digital-shadow),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.digital-employee-page .agent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--digital-accent) 0%, var(--digital-accent-secondary) 50%, #06B6D4 100%);
  opacity: 0.8;
}

.digital-employee-page .agent-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 20px 48px -8px var(--digital-shadow),
    0 0 0 1px rgba(99, 102, 241, 0.2) inset;
  border-color: rgba(99, 102, 241, 0.3);
}

/* 数字员工 Grid 布局 - Bento Grid 风格 */
.digital-employee-page .team-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

@media (min-width: 1400px) {
  .digital-employee-page .team-members-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1200px) and (max-width: 1399px) {
  .digital-employee-page .team-members-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .digital-employee-page .team-members-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 480px) and (max-width: 767px) {
  .digital-employee-page .team-members-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 479px) {
  .digital-employee-page .team-members-grid {
    grid-template-columns: 1fr;
  }
}

/* 统计卡片 Grid 布局 - Bento Grid 风格 */
.digital-employee-page .stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

@media (min-width: 1200px) {
  .digital-employee-page .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .digital-employee-page .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .digital-employee-page .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 统计卡片样式 */
.digital-employee-page .stat-card {
  background: var(--digital-card-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--digital-border);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border-left-width: 4px;
  box-shadow:
    0 4px 24px -4px var(--digital-shadow),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
}

.digital-employee-page .stat-card--blue { border-left-color: #6366F1; }
.digital-employee-page .stat-card--green { border-left-color: #22c55e; }
.digital-employee-page .stat-card--yellow { border-left-color: #f59e0b; }
.digital-employee-page .stat-card--purple { border-left-color: #a855f7; }

.digital-employee-page .stat-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 20px 48px -8px var(--digital-shadow),
    0 0 0 1px rgba(99, 102, 241, 0.15) inset;
  border-color: rgba(99, 102, 241, 0.3);
}

.digital-employee-page .stat-card-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.digital-employee-page .stat-info {
  flex: 1;
}

.digital-employee-page .stat-label-upper {
  font-size: 12px;
  font-weight: 600;
  color: var(--digital-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.digital-employee-page .stat-value-large {
  font-size: 36px;
  font-weight: 800;
  color: var(--digital-text-primary);
  margin-top: 4px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--digital-text-primary) 0%, var(--digital-accent-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.digital-employee-page .stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.3);
}

.digital-employee-page .stat-icon--blue {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.digital-employee-page .stat-icon--green {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.digital-employee-page .stat-icon--yellow {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.digital-employee-page .stat-icon--purple {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.05) 100%);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

/* Agent 卡片内部布局 */
.digital-employee-page .agent-card .agent-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.digital-employee-page .agent-card .agent-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 20px -4px rgba(0, 0, 0, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.1) inset;
  overflow: hidden;
  position: relative;
}

.digital-employee-page .agent-card .agent-avatar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  pointer-events: none;
}

.digital-employee-page .agent-card .agent-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
}

.digital-employee-page .agent-card .agent-info {
  flex: 1;
  min-width: 0;
}

.digital-employee-page .agent-card .agent-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--digital-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.02em;
}

.digital-employee-page .agent-card .agent-title {
  font-size: 12px;
  color: var(--digital-text-secondary);
  font-weight: 500;
}

.digital-employee-page .agent-card .agent-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.digital-employee-page .agent-card .stat-item {
  text-align: center;
  padding: 12px 8px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.digital-employee-page .agent-card .stat-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(99, 102, 241, 0.2);
}

.digital-employee-page .agent-card .stat-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--digital-accent-secondary);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 4px;
}

.digital-employee-page .agent-card .stat-label {
  font-size: 11px;
  color: var(--digital-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.digital-employee-page .agent-card .agent-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(74, 222, 128, 0.25);
  margin-bottom: 12px;
  width: fit-content;
}

.digital-employee-page .agent-card .status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 8px #4ade80;
}

.digital-employee-page .agent-card .agent-task {
  font-size: 12px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 12px;
}

.digital-employee-page .agent-card .agent-task .task-label {
  color: var(--digital-text-secondary);
  font-weight: 500;
}

.digital-employee-page .agent-card .agent-task .task-value {
  color: var(--digital-text-primary);
  font-weight: 600;
}

.digital-employee-page .agent-card .agent-outputs {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.digital-employee-page .agent-card .outputs-title {
  font-size: 11px;
  color: var(--digital-text-secondary);
  margin-bottom: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.digital-employee-page .agent-card .outputs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.digital-employee-page .agent-card .output-tag {
  font-size: 11px;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--digital-accent-secondary);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  transition: all 0.2s ease;
  text-decoration: none;
  font-weight: 500;
}

.digital-employee-page .agent-card .output-tag:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

/* 发光文字 */
.digital-employee-page .glow-text {
  text-shadow: var(--text-shadow-glow, 0 0 20px rgba(99, 102, 241, 0.5));
}

:root.light-theme .digital-employee-page .glow-text {
  text-shadow: none;
  font-weight: 600;
}

/* 深色输入框 */
.digital-employee-page .dark-input {
  background: var(--digital-card-bg);
  border: 1px solid var(--digital-border);
  color: var(--digital-text-primary);
  border-radius: 8px;
  padding: 6px 12px;
  transition: all 0.2s;
}

.digital-employee-page .dark-input:focus {
  outline: none;
  border-color: var(--digital-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.digital-employee-page .dark-input option {
  background: var(--digital-card-bg);
  color: var(--digital-text-primary);
}

/* 滚动条样式 */
.digital-employee-page ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.digital-employee-page ::-webkit-scrollbar-track {
  background: var(--bg-panel, rgba(255, 255, 255, 0.05));
  border-radius: 3px;
}

.digital-employee-page ::-webkit-scrollbar-thumb {
  background: var(--border-strong, rgba(99, 102, 241, 0.5));
  border-radius: 3px;
}

.digital-employee-page ::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary, rgba(99, 102, 241, 0.7));
}

/* ========== 亮色主题特定样式 ========== */
:root.light-theme .digital-employee-page .bg-grid {
  opacity: 1;
}

:root.light-theme .digital-employee-page .glass-card {
  background: var(--digital-card-bg);
  backdrop-filter: none;
}

:root.light-theme .digital-employee-page .text-gray-100 {
  color: var(--digital-text-primary);
}

:root.light-theme .digital-employee-page .text-gray-200 {
  color: var(--digital-text-primary);
}

:root.light-theme .digital-employee-page .text-gray-300 {
  color: var(--digital-text-secondary);
}

:root.light-theme .digital-employee-page .text-gray-400 {
  color: var(--digital-text-tertiary, #64748b);
}

:root.light-theme .digital-employee-page .text-gray-500 {
  color: var(--digital-text-secondary);
}

:root.light-theme .digital-employee-page .border-white\/10 {
  border-color: var(--digital-border);
}

:root.light-theme .digital-employee-page .border-white\/5 {
  border-color: var(--digital-border);
}

:root.light-theme .digital-employee-page .border-gray-700\/50 {
  border-color: var(--border-default);
}

:root.light-theme .digital-employee-page .bg-gray-800\/50 {
  background: var(--bg-panel);
}

:root.light-theme .digital-employee-page .bg-gray-700\/50 {
  background: var(--bg-surface);
}

:root.light-theme .digital-employee-page .hover\:bg-gray-600\/50:hover {
  background: var(--bg-panel-hover);
}

:root.light-theme .digital-employee-page .from-indigo-400 {
  --tw-gradient-from: var(--color-primary);
}

:root.light-theme .digital-employee-page .to-purple-500 {
  --tw-gradient-to: var(--color-secondary);
}

:root.light-theme .digital-employee-page .glow-text {
  text-shadow: none;
  font-weight: 700;
}

:root.light-theme .digital-employee-page h2 {
  font-weight: 700;
  color: #1f2329;
}

:root.light-theme .digital-employee-page .font-semibold {
  font-weight: 700;
}

:root.light-theme .digital-employee-page .font-bold {
  font-weight: 700;
}

:root.light-theme .digital-employee-page .font-medium {
  font-weight: 600;
}

/* ========== 文件预览对话框样式 ========== */
.digital-employee-page .file-preview-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.digital-employee-page .preview-loading,
.digital-employee-page .preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: var(--digital-text-secondary);
}

.digital-employee-page .preview-loading .el-icon {
  font-size: 32px;
  color: var(--color-primary);
}

.digital-employee-page .preview-error {
  color: var(--color-error);
}

.digital-employee-page .preview-error .el-icon {
  font-size: 32px;
}

.digital-employee-page .preview-content {
  max-height: 70vh;
  overflow-y: auto;
}

.digital-employee-page .preview-content pre {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--digital-border);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered {
  line-height: 1.8;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(h1),
.digital-employee-page .preview-content .markdown-rendered :deep(h2),
.digital-employee-page .preview-content .markdown-rendered :deep(h3),
.digital-employee-page .preview-content .markdown-rendered :deep(h4),
.digital-employee-page .preview-content .markdown-rendered :deep(h5),
.digital-employee-page .preview-content .markdown-rendered :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(h1) {
  font-size: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--digital-border);
}

.digital-employee-page .preview-content .markdown-rendered :deep(h2) {
  font-size: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--digital-border);
}

.digital-employee-page .preview-content .markdown-rendered :deep(h3) {
  font-size: 16px;
}

.digital-employee-page .preview-content .markdown-rendered :deep(p) {
  margin-bottom: 16px;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.digital-employee-page .preview-content .markdown-rendered :deep(a):hover {
  text-decoration: underline;
}

.digital-employee-page .preview-content .markdown-rendered :deep(code) {
  background: rgba(128, 128, 128, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(pre) {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--digital-border);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}

.digital-employee-page .preview-content .markdown-rendered :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding: 8px 16px;
  margin: 16px 0;
  background: rgba(51, 112, 255, 0.1);
  border-radius: 4px;
  color: var(--digital-text-secondary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(ul),
.digital-employee-page .preview-content .markdown-rendered :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.digital-employee-page .preview-content .markdown-rendered :deep(li) {
  margin-bottom: 8px;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(hr) {
  border: none;
  border-top: 1px solid var(--digital-border);
  margin: 24px 0;
}

.digital-employee-page .preview-content .markdown-rendered :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
  border: 1px solid var(--digital-border);
  border-radius: 8px;
  overflow: hidden;
}

.digital-employee-page .preview-content .markdown-rendered :deep(table th),
.digital-employee-page .preview-content .markdown-rendered :deep(table td) {
  border: 1px solid var(--digital-border);
  padding: 10px 14px;
  text-align: left;
  color: var(--digital-text-primary);
}

.digital-employee-page .preview-content .markdown-rendered :deep(table th) {
  background: rgba(128, 128, 128, 0.2);
  font-weight: 600;
}

.digital-employee-page .preview-content .markdown-rendered :deep(table tr) {
  background-color: transparent;
}

.digital-employee-page .preview-content .markdown-rendered :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.digital-employee-page .preview-content .pdf-preview iframe {
  width: 100%;
  height: 600px;
  border: 1px solid var(--digital-border);
  border-radius: 8px;
}

.digital-employee-page .preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  color: var(--digital-text-secondary);
}

.digital-employee-page .preview-unsupported .el-icon {
  font-size: 48px;
  color: var(--digital-text-tertiary);
}

.digital-employee-page .preview-unsupported .hint {
  font-size: 12px;
  color: var(--digital-text-tertiary);
  font-family: var(--font-mono);
}

/* ========== 亮色主题预览样式 ========== */
:root.light-theme .digital-employee-page .preview-content {
  color: var(--digital-text-primary);
}

:root.light-theme .digital-employee-page .preview-content pre {
  background: #f5f6f7;
  border-color: #dee0e3;
  color: #1f2329;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered {
  color: #1f2329;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(code) {
  background: #f5f6f7;
  border-color: #e5e6e9;
  color: #646a73;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(pre) {
  background: #f5f6f7;
  border-color: #dee0e3;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(pre code) {
  background: transparent;
  color: #1f2329;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(blockquote) {
  border-left-color: #3370ff;
  background: rgba(51, 112, 255, 0.06);
  color: #646a73;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(table) {
  border-color: #dee0e3;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(table th),
:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(table td) {
  border-color: #dee0e3;
  color: #1f2329;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(table th) {
  background: #fafbfc;
}

:root.light-theme .digital-employee-page .preview-content .markdown-rendered :deep(table tr) {
  background-color: #ffffff;
}

:root.light-theme .digital-employee-page .preview-unsupported {
  color: #646a73;
}

:root.light-theme .digital-employee-page .preview-unsupported .el-icon {
  color: #c2c8d1;
}

:root.light-theme .digital-employee-page .preview-unsupported .hint {
  color: #c2c8d1;
}

/* ========== 工作成果 (OPC) 样式 ========== */
.digital-employee-page .outputs-panel {
  padding: 0;
  overflow: hidden;
}

/* 筛选工具栏 */
.digital-employee-page .outputs-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
}

.digital-employee-page .filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.digital-employee-page .filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.digital-employee-page .filter-icon {
  color: var(--digital-accent);
  font-size: 14px;
}

.digital-employee-page .filter-separator {
  color: var(--digital-text-secondary);
  font-size: 13px;
}

.digital-employee-page .filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.digital-employee-page .filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 10px;
  color: var(--digital-accent-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.digital-employee-page .filter-chip:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}

.digital-employee-page .filter-chip.active {
  background: rgba(99, 102, 241, 0.3);
  border-color: var(--digital-accent);
  color: #fff;
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.3);
}

.digital-employee-page .results-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--digital-text-secondary);
  font-size: 13px;
  font-family: var(--font-mono);
}

.digital-employee-page .results-count .count-value {
  color: var(--digital-accent);
  font-weight: 700;
  font-size: 15px;
}

.digital-employee-page .results-count .count-label {
  font-size: 12px;
}

/* 输出卡片网格 */
.digital-employee-page .outputs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 24px;
}

@media (min-width: 1400px) {
  .digital-employee-page .outputs-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1200px) and (max-width: 1399px) {
  .digital-employee-page .outputs-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767px) {
  .digital-employee-page .outputs-grid {
    grid-template-columns: 1fr;
  }
}

/* 输出卡片 */
.digital-employee-page .output-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.digital-employee-page .output-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--digital-accent) 0%, var(--digital-accent-secondary) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.digital-employee-page .output-card:hover {
  transform: translateY(-4px) scale(1.01);
  background: rgba(51, 65, 85, 0.5);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow:
    0 20px 40px -8px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.1) inset;
}

.digital-employee-page .output-card:hover::before {
  opacity: 1;
}

.digital-employee-page .output-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.digital-employee-page .output-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.digital-employee-page .output-card:hover .output-icon {
  transform: scale(1.1);
}

.digital-employee-page .output-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.digital-employee-page .output-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--digital-text-secondary);
  font-family: var(--font-mono);
}

.digital-employee-page .output-type {
  font-size: 11px;
  color: var(--digital-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.digital-employee-page .output-card__body {
  margin-bottom: 16px;
}

.digital-employee-page .output-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--digital-text-primary);
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

.digital-employee-page .output-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--digital-text-secondary);
}

.digital-employee-page .output-author i {
  color: var(--digital-accent);
}

.digital-employee-page .output-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.digital-employee-page .file-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.digital-employee-page .file-badge--report {
  background: rgba(167, 139, 250, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(167, 139, 250, 0.3);
}

.digital-employee-page .file-badge--doc {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.digital-employee-page .file-badge--code {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.digital-employee-page .preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, var(--digital-accent) 0%, var(--digital-accent-secondary) 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.3);
}

.digital-employee-page .preview-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -2px rgba(99, 102, 241, 0.4);
}

/* 空状态 */
.digital-employee-page .outputs-grid .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.digital-employee-page .outputs-grid .empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: var(--digital-accent);
  margin-bottom: 20px;
}

.digital-employee-page .outputs-grid .empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--digital-text-primary);
  margin-bottom: 8px;
}

.digital-employee-page .outputs-grid .empty-hint {
  font-size: 14px;
  color: var(--digital-text-secondary);
}

/* 加载状态 */
.digital-employee-page .outputs-grid .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

/* ========== 项目进度面板样式 - 参考 Agents.vue 风格 ========== */
/* 章节标题 */
.digital-employee-page .section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 800;
  color: var(--digital-text-primary);
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  letter-spacing: -0.02em;
}

.digital-employee-page .section-title i {
  color: var(--digital-accent);
  font-size: 22px;
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
}

.digital-employee-page .section-title__sub {
  margin-left: auto;
  font-size: 11px;
  color: var(--digital-text-secondary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 600;
}

/* 项目面板 */
.digital-employee-page .projects-panel {
  padding: 0;
  overflow: hidden;
}

/* 加载状态 */
.digital-employee-page .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
}

.digital-employee-page .loading-spinner {
  position: relative;
  width: 56px;
  height: 56px;
}

.digital-employee-page .spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.digital-employee-page .spinner-ring:nth-child(2) {
  width: 75%;
  height: 75%;
  top: 12.5%;
  left: 12.5%;
  border-top-color: var(--color-secondary);
  animation-delay: -0.5s;
}

.digital-employee-page .spinner-ring:nth-child(3) {
  width: 50%;
  height: 50%;
  top: 25%;
  left: 25%;
  border-top-color: var(--color-success);
  animation-delay: -1s;
}

.digital-employee-page .loading-text {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  animation: pulse 1.5s ease-in-out infinite;
}

/* 项目网格 */
.digital-employee-page .projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
  padding: 20px;
}

/* 项目卡片 */
.digital-employee-page .project-card {
  background: var(--bg-surface);
  border: 1px solid var(--grid-line);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;
}

.digital-employee-page .project-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.7;
  transition: opacity 0.3s;
}

.digital-employee-page .project-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.digital-employee-page .project-card:hover::before {
  opacity: 1;
}

/* 卡片顶部状态条 */
.digital-employee-page .project-card__stripe {
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.8;
}

/* 卡片头部 */
.digital-employee-page .project-card__header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: linear-gradient(180deg, rgba(0, 240, 255, 0.04) 0%, transparent 100%);
}

.digital-employee-page .project-card__icon {
  font-size: 38px;
  min-width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.06) 100%);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
  color: var(--color-primary);
}

.digital-employee-page .project-card__icon .stage-emoji {
  line-height: 1;
}

.digital-employee-page .project-card__info {
  flex: 1;
  min-width: 0;
}

.digital-employee-page .project-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.digital-employee-page .project-card__desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.digital-employee-page .project-card__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 阶段徽章 */
.digital-employee-page .stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.digital-employee-page .stage-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* 阶段徽章颜色 */
.digital-employee-page .stage-badge--idea {
  background: rgba(107, 114, 128, 0.15);
  border: 1px solid rgba(107, 114, 128, 0.4);
  color: #6b7280;
}

.digital-employee-page .stage-badge--analysis {
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #fbbf24;
}

.digital-employee-page .stage-badge--tech-assessment {
  background: rgba(192, 132, 252, 0.15);
  border: 1px solid rgba(192, 132, 252, 0.4);
  color: #c084fc;
}

.digital-employee-page .stage-badge--development {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #3b82f6;
}

.digital-employee-page .stage-badge--testing {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #6366f1;
}

.digital-employee-page .stage-badge--deployed {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.digital-employee-page .stage-badge--maintenance {
  background: rgba(20, 184, 166, 0.15);
  border: 1px solid rgba(20, 184, 166, 0.4);
  color: #14b8a6;
}

.digital-employee-page .stage-badge--paused {
  background: rgba(251, 146, 60, 0.15);
  border: 1px solid rgba(251, 146, 60, 0.4);
  color: #fb923c;
}

.digital-employee-page .stage-badge--cancelled {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #f87171;
}

/* GitHub 按钮 */
.digital-employee-page .github-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
  cursor: pointer;
}

.digital-employee-page .github-btn:hover {
  background: var(--bg-panel-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.digital-employee-page .github-btn i {
  font-size: 18px;
}

/* 卡片信息栏 */
.digital-employee-page .project-card__meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--grid-line-dim);
  background: var(--bg-panel);
}

.digital-employee-page .meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.digital-employee-page .meta-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: var(--font-mono);
}

.digital-employee-page .meta-value {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.digital-employee-page .meta-value--primary {
  color: var(--color-primary);
  font-size: 15px;
  font-family: var(--font-mono);
}

/* 进度条 */
.digital-employee-page .project-card__progress {
  padding: 12px 18px;
  border-bottom: 1px solid var(--grid-line-dim);
}

.digital-employee-page .progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-base);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
}

.digital-employee-page .progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.digital-employee-page .progress-bar__fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

/* 卡片主体 */
.digital-employee-page .project-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 18px;
  flex: 1;
}

/* 任务区域 */
.digital-employee-page .task-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.digital-employee-page .task-section__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: var(--font-mono);
}

.digital-employee-page .task-section__header--success {
  color: var(--color-success);
}

.digital-employee-page .task-section__header--success i {
  font-size: 12px;
}

.digital-employee-page .task-section__header--next {
  color: var(--color-warning);
}

.digital-employee-page .task-section__header--next i {
  font-size: 13px;
}

/* 任务列表 */
.digital-employee-page .task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.digital-employee-page .task-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  transition: background 0.2s;
}

.digital-employee-page .task-item:hover {
  background: var(--bg-panel-hover);
}

.digital-employee-page .task-item--done {
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.digital-employee-page .task-item__icon {
  color: var(--color-success);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.digital-employee-page .task-item__text {
  color: var(--text-secondary);
  flex: 1;
  word-break: break-word;
}

.digital-employee-page .task-item--next {
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.digital-employee-page .task-item__icon--next {
  color: var(--color-warning);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.digital-employee-page .task-item__text--next {
  color: var(--text-primary);
  font-weight: 500;
}

/* 卡片底部 */
.digital-employee-page .project-card__footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--grid-line-dim);
  background: var(--bg-base);
}

.digital-employee-page .footer-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  font-family: var(--font-mono);
}

.digital-employee-page .footer-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
}

.digital-employee-page .footer-link--github {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.digital-employee-page .footer-link--github:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--color-primary);
}

.digital-employee-page .footer-link--demo {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.digital-employee-page .footer-link--demo:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: var(--color-success);
}

/* ========== 亮色主题适配 ========== */
:root.light-theme .digital-employee-page .project-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.light-theme .digital-employee-page .project-card::before {
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  opacity: 1;
}

:root.light-theme .digital-employee-page .project-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
  transform: translateY(-3px);
}

:root.light-theme .digital-employee-page .project-card__header {
  border-bottom-color: #f3f4f6;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, transparent 100%);
}

:root.light-theme .digital-employee-page .project-card__icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.06) 100%);
  border-color: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

:root.light-theme .digital-employee-page .project-card__name {
  color: #1f2329;
}

:root.light-theme .digital-employee-page .project-card__desc {
  color: #646a73;
}

:root.light-theme .digital-employee-page .project-card__meta {
  background: #fafbfc;
  border-bottom-color: #e5e6e9;
}

:root.light-theme .digital-employee-page .meta-label {
  color: #8f959e;
}

:root.light-theme .digital-employee-page .meta-value {
  color: #475569;
}

:root.light-theme .digital-employee-page .meta-value--primary {
  color: #3370ff;
}

:root.light-theme .digital-employee-page .github-btn {
  background: #ffffff;
  border-color: #dee0e3;
  color: #646a73;
}

:root.light-theme .digital-employee-page .github-btn:hover {
  background: #fafbfc;
  border-color: #3370ff;
  color: #3370ff;
}

:root.light-theme .digital-employee-page .progress-bar {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

:root.light-theme .digital-employee-page .progress-bar__fill {
  background: linear-gradient(90deg, #3370ff 0%, #6366f1 100%);
}

:root.light-theme .digital-employee-page .task-item--done {
  background: rgba(0, 179, 101, 0.06);
  border-color: rgba(0, 179, 101, 0.2);
}

:root.light-theme .digital-employee-page .task-item__icon {
  color: #00b365;
}

:root.light-theme .digital-employee-page .task-item__text {
  color: #475569;
}

:root.light-theme .digital-employee-page .task-item--next {
  background: rgba(250, 140, 22, 0.06);
  border-color: rgba(250, 140, 22, 0.2);
}

:root.light-theme .digital-employee-page .task-item__icon--next {
  color: #fa8c16;
}

:root.light-theme .digital-employee-page .task-item__text--next {
  color: #1f2329;
}

:root.light-theme .digital-employee-page .task-section__header--success {
  color: #00b365;
}

:root.light-theme .digital-employee-page .task-section__header--next {
  color: #fa8c16;
}

:root.light-theme .digital-employee-page .footer-link--github {
  background: rgba(51, 112, 255, 0.1);
  color: #3370ff;
  border-color: rgba(51, 112, 255, 0.3);
}

:root.light-theme .digital-employee-page .footer-link--demo {
  background: rgba(0, 179, 101, 0.1);
  color: #00b365;
  border-color: rgba(0, 179, 101, 0.3);
}

:root.light-theme .digital-employee-page .section-title {
  color: #1f2329;
  border-bottom-color: #dee0e3;
}

:root.light-theme .digital-employee-page .section-title i {
  color: #3370ff;
}

/* 阶段徽章 - 亮色主题 */
:root.light-theme .digital-employee-page .stage-badge--idea {
  background: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.3);
  color: #4b5563;
}

:root.light-theme .digital-employee-page .stage-badge--analysis {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.35);
  color: #d97706;
}

:root.light-theme .digital-employee-page .stage-badge--tech-assessment {
  background: rgba(192, 132, 252, 0.12);
  border-color: rgba(192, 132, 252, 0.35);
  color: #a855f7;
}

:root.light-theme .digital-employee-page .stage-badge--development {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);
  color: #2563eb;
}

:root.light-theme .digital-employee-page .stage-badge--testing {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
  color: #4f46e5;
}

:root.light-theme .digital-employee-page .stage-badge--deployed {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.35);
  color: #16a34a;
}

:root.light-theme .digital-employee-page .stage-badge--maintenance {
  background: rgba(20, 184, 166, 0.12);
  border-color: rgba(20, 184, 166, 0.35);
  color: #0d9488;
}

:root.light-theme .digital-employee-page .stage-badge--paused {
  background: rgba(251, 146, 60, 0.12);
  border-color: rgba(251, 146, 60, 0.35);
  color: #ea580c;
}

:root.light-theme .digital-employee-page .stage-badge--cancelled {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #dc2626;
}

/* 响应式 */
@media (max-width: 768px) {
  .digital-employee-page .projects-grid {
    grid-template-columns: 1fr;
  }

  .digital-employee-page .project-card__meta {
    grid-template-columns: repeat(2, 1fr);
  }

  .digital-employee-page .section-title {
    font-size: 16px;
  }

  .digital-employee-page .section-title__sub {
    display: none;
  }
}
</style>
