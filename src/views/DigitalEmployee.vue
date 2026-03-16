<template>
  <div class="digital-employee-page">
    <!-- 背景效果 -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <!-- 内容区域 -->
    <div class="content-wrapper relative z-10">
      <!-- 顶部导航栏 -->
    <nav class="glass-card border-b border-white/10 sticky top-0 z-50">
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
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="glass-card glass-card-hover p-5 border-l-4 border-l-blue-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wider">项目总数</p>
              <p class="text-3xl font-bold mt-1 mono">{{ stats.totalProjects }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <i class="fas fa-folder text-blue-400 text-xl"></i>
            </div>
          </div>
        </div>
        <div class="glass-card glass-card-hover p-5 border-l-4 border-l-green-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wider">开发中</p>
              <p class="text-3xl font-bold mt-1 mono">{{ stats.inProgress }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <i class="fas fa-code text-green-400 text-xl"></i>
            </div>
          </div>
        </div>
        <div class="glass-card glass-card-hover p-5 border-l-4 border-l-yellow-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wider">规划中</p>
              <p class="text-3xl font-bold mt-1 mono">{{ stats.notStarted }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <i class="fas fa-clipboard text-yellow-400 text-xl"></i>
            </div>
          </div>
        </div>
        <div class="glass-card glass-card-hover p-5 border-l-4 border-l-purple-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 uppercase tracking-wider">今日提交</p>
              <p class="text-3xl font-bold mt-1 mono">{{ stats.todayCommits }}</p>
            </div>
            <div class="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <i class="fas fa-git-alt text-purple-400 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 数字员工 -->
      <h2 class="text-lg font-bold mb-4 flex items-center space-x-2">
        <i class="fas fa-users text-purple-400"></i>
        <span>数字员工</span>
      </h2>
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div v-for="member in teamMembers" :key="member.id" class="agent-card glass-card-hover p-4 border border-white/10">
          <div class="flex items-center space-x-3 mb-3">
            <div :class="['w-12 h-12 bg-gradient-to-r rounded-xl flex items-center justify-center shadow-lg', member.gradient]">
              <img :src="member.icon" :alt="member.name" class="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h4 class="font-semibold text-gray-100">{{ member.name }}</h4>
              <p class="text-xs text-gray-500">{{ member.title }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <div v-for="(value, key) in member.stats" :key="key" class="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p class="font-bold text-indigo-400 mono">{{ value }}</p>
              <p class="text-xs text-gray-500">{{ key }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 text-xs bg-green-500/10 text-green-400 px-2 py-1.5 rounded-lg mb-2 border border-green-500/20">
            <div class="w-2 h-2 bg-green-400 rounded-full status-dot"></div>
            <span>Active</span>
          </div>
          <div class="text-xs bg-gray-800/50 p-2 rounded-lg mb-2 border border-gray-700/50">
            <span class="text-gray-500">当前:</span> <span class="text-gray-300">{{ member.task }}</span>
          </div>
          <div v-if="member.todayOutputs && member.todayOutputs.length" class="pt-2 border-t border-gray-700/50">
            <p class="text-xs text-gray-500 mb-2">今日产出 ({{ member.todayOutputs.length }})</p>
            <div class="flex flex-wrap gap-1.5">
              <a v-for="output in member.todayOutputs" :key="output.name" :href="output.url" target="_blank" class="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
                {{ getTypeEmoji(output.type) }} {{ output.name.slice(0, 6) }}...
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作成果 -->
      <h2 class="text-lg font-bold mb-4 flex items-center space-x-2">
        <i class="fas fa-trophy text-yellow-400"></i>
        <span>工作成果</span>
      </h2>
      <div class="glass-card p-5 mb-8">
        <div class="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-white/10">
          <input v-model="filterOutputDateStart" @change="applyOutputFilters" type="date" class="dark-input text-sm">
          <span class="text-gray-500">至</span>
          <input v-model="filterOutputDateEnd" @change="applyOutputFilters" type="date" class="dark-input text-sm">
          <select v-model="filterOutputRole" @change="applyOutputFilters" class="dark-input text-sm">
            <option value="all">全部角色</option>
            <option value="小 U">小 U</option>
            <option value="小开">小开</option>
            <option value="小研">小研</option>
            <option value="小产">小产</option>
          </select>
          <select v-model="filterOutputType" @change="applyOutputFilters" class="dark-input text-sm">
            <option value="all">全部类型</option>
            <option value="report">📊 报告</option>
            <option value="doc">📝 文档</option>
            <option value="code">🔧 代码</option>
          </select>
          <button @click="setOutputQuickDate('today')" class="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">今天</button>
          <button @click="setOutputQuickDate('week')" class="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">本周</button>
          <span class="ml-auto text-xs text-gray-500 mono">显示 <span class="text-indigo-400">{{ filteredOutputs.length }}</span> 项</span>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-if="loading" class="text-center py-8 text-gray-400 col-span-full">
            <i class="fas fa-spinner fa-spin text-2xl"></i>
          </div>
          <div v-else-if="!filteredOutputs.length" class="text-center py-8 text-gray-500 col-span-full">
            <i class="fas fa-inbox text-3xl mb-2"></i>
            <p>暂无成果</p>
          </div>
          <div v-for="output in filteredOutputs" :key="output.name + output.date" class="block p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-indigo-500/30 hover:bg-gray-700/50 transition-all group">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-xl">{{ getTypeEmoji(output.type) }}</span>
                <span class="text-xs text-gray-500 mono">{{ output.date }}</span>
              </div>
            </div>
            <h4 class="text-sm font-medium text-gray-200 group-hover:text-indigo-400 transition-colors mb-2">{{ output.name }}</h4>
            <p class="text-xs text-gray-500 mb-2">{{ output.person }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600">{{ getOutputFileTypeName(output.type) }}</span>
              <el-button size="small" type="primary" plain @click.stop="previewFile(output)">预览</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时工作流 -->
      <h2 class="text-lg font-bold mb-4 flex items-center space-x-2">
        <i class="fas fa-calendar-day text-green-400"></i>
        <span>实时工作流</span>
      </h2>
      <div class="glass-card p-5 mb-8">
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
      <h2 class="section-title">
        <i class="fas fa-chart-line"></i>
        <span>项目进度</span>
        <span class="section-title__sub">PROJECT MONITORING</span>
      </h2>
      <div class="glass-card projects-panel" id="projectsList">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <p class="loading-text">正在加载项目数据...</p>
        </div>
        <div v-else class="projects-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            :class="getStageCardClass(project.stage)"
          >
            <!-- 项目卡片顶部状态条 -->
            <div class="project-card__stripe"></div>

            <!-- 项目头部 -->
            <div class="project-card__header">
              <div class="project-card__icon">
                <span class="stage-emoji">{{ project.stageEmoji }}</span>
              </div>
              <div class="project-card__info">
                <h3 class="project-card__name" :title="project.name">{{ project.name }}</h3>
                <p class="project-card__desc line-clamp-2">{{ project.description }}</p>
              </div>
              <div class="project-card__stage">
                <span :class="['stage-badge', getStageBadgeClass(project.stage)]">
                  <span class="stage-badge__dot"></span>
                  {{ project.stageName }}
                </span>
                <a
                  v-if="project.githubUrl"
                  :href="project.githubUrl"
                  target="_blank"
                  class="github-btn"
                  title="GitHub 仓库"
                >
                  <i class="fab fa-github"></i>
                </a>
              </div>
            </div>

            <!-- 项目信息栏 -->
            <div class="project-card__meta">
              <div class="meta-item">
                <span class="meta-label">进度</span>
                <span class="meta-value meta-value--primary">{{ project.progress }}%</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">负责人</span>
                <span class="meta-value">{{ project.leaderRole || project.leader || '未知' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">更新</span>
                <span class="meta-value">{{ project.lastUpdate || project.createDate || '-' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">任务</span>
                <span class="meta-value">{{ project.completedTasks || 0 }}/{{ project.totalTasks || 0 }}</span>
              </div>
            </div>

            <!-- 进度条 -->
            <div class="project-card__progress">
              <div class="progress-bar">
                <div class="progress-bar__fill" :style="{ width: (project.progress || 0) + '%' }"></div>
              </div>
            </div>

            <!-- 任务列表 -->
            <div class="project-card__body">
              <!-- 已完成任务 -->
              <div v-if="project.progressList && project.progressList.length > 0" class="task-section">
                <div class="task-section__header task-section__header--success">
                  <i class="fas fa-check-circle"></i>
                  <span>已完成</span>
                </div>
                <div class="task-list">
                  <div
                    v-for="(item, idx) in project.progressList"
                    :key="idx"
                    class="task-item task-item--done"
                    :title="item"
                  >
                    <span class="task-item__icon">✓</span>
                    <span class="task-item__text">{{ item }}</span>
                  </div>
                </div>
              </div>

              <!-- 下一步计划 -->
              <div v-if="project.nextSteps && project.nextSteps.length > 0" class="task-section">
                <div class="task-section__header task-section__header--next">
                  <i class="fas fa-bullseye"></i>
                  <span>下一步</span>
                </div>
                <div class="task-list">
                  <div
                    v-for="(item, idx) in project.nextSteps"
                    :key="idx"
                    class="task-item task-item--next"
                    :title="item"
                  >
                    <span class="task-item__icon task-item__icon--next">→</span>
                    <span class="task-item__text task-item__text--next">{{ item }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部链接 -->
            <div v-if="project.demoUrl || project.githubUrl" class="project-card__footer">
              <span class="footer-label">快速链接:</span>
              <a
                v-if="project.githubUrl"
                :href="project.githubUrl"
                target="_blank"
                class="footer-link footer-link--github"
              >
                <i class="fab fa-github"></i>
                <span>GitHub</span>
              </a>
              <a
                v-if="project.demoUrl"
                :href="project.demoUrl"
                target="_blank"
                class="footer-link footer-link--demo"
              >
                <i class="fas fa-play"></i>
                <span>Demo</span>
              </a>
            </div>
          </div>
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

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAgentsStore } from '@/stores/agents'
import { ElMessage } from 'element-plus'
import { Loading, Warning, Document } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'

const agentsStore = useAgentsStore()
const md = new MarkdownIt()

// 状态
const loading = ref(true)
const refreshing = ref(false)
const lastUpdate = ref('--:--:--')

// 文件预览对话框
const showPreviewDialog = ref(false)
const previewFileItem = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)
const previewContent = ref({ type: '', content: '' })

// 数据
const stats = ref({ totalProjects: 0, inProgress: 0, notStarted: 0, todayCommits: 0 })
const projects = ref([])
const allWorkRecords = ref([])
const allOutputs = ref([])

// 筛选
const filterDateStart = ref('')
const filterDateEnd = ref('')
const filterRole = ref('all')
const filterOutputDateStart = ref('')
const filterOutputDateEnd = ref('')
const filterOutputRole = ref('all')
const filterOutputType = ref('all')

// GitHub 链接映射
const githubRepos = {
  '智能情报系统': 'https://github.com/zhushuyuan0601/project-ai-intel',
  '统一智能体平台': 'https://github.com/zhushuyuan0601/unified-agent-platform',
  'ai_customer_service': 'https://github.com/zhushuyuan0601/telecom-assistant'
}

// 计算属性
const filteredWork = computed(() => {
  let filtered = [...allWorkRecords.value]
  if (filterDateStart.value) filtered = filtered.filter(w => w.date >= filterDateStart.value)
  if (filterDateEnd.value) filtered = filtered.filter(w => w.date <= filterDateEnd.value)
  if (filterRole.value !== 'all') filtered = filtered.filter(w => w.person.includes(filterRole.value))
  return filtered
})

const filteredOutputs = computed(() => {
  let filtered = [...allOutputs.value]
  if (filterOutputDateStart.value) filtered = filtered.filter(o => o.date >= filterOutputDateStart.value)
  if (filterOutputDateEnd.value) filtered = filtered.filter(o => o.date <= filterOutputDateEnd.value)
  if (filterOutputRole.value !== 'all') filtered = filtered.filter(o => o.person.includes(filterOutputRole.value))
  if (filterOutputType.value !== 'all') filtered = filtered.filter(o => o.type === filterOutputType.value)
  return filtered
})

const teamMembers = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const todayOutputs = allOutputs.value.filter(o => o.date === today)
  // 保持原有的人名匹配逻辑（小 U、小开等）
  const nameMap = {
    xiaomu: '小 U',
    xiaokai: '小开',
    xiaochan: '小产',
    xiaoyan: '小研'
  }
  const getOutputsByPerson = (agentId) => {
    const personName = nameMap[agentId] || ''
    return todayOutputs.filter(o => o.person && o.person.includes(personName))
  }

  const workByPerson = {}
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
    gradient: getGradientForAgent(agent.id),
    stats: getAgentStats(agent.id, workByPerson),
    task: getAgentTask(agent.id),
    todayOutputs: getOutputsByPerson(agent.id)
  }))
})

// 获取 Agent 对应的渐变色
function getGradientForAgent(agentId) {
  const gradients = {
    xiaomu: 'from-indigo-400 to-purple-500',    // 项目管理
    xiaokai: 'from-green-400 to-cyan-500',      // 研发工程师
    xiaochan: 'from-pink-400 to-rose-500',      // 产品经理
    xiaoyan: 'from-yellow-400 to-orange-500'    // 研究员
  }
  return gradients[agentId] || 'from-gray-400 to-gray-500'
}

// 获取 Agent 统计信息
function getAgentStats(agentId, workByPerson) {
  const statsMap = {
    xiaomu: { '任务': workByPerson['小 U'] || 0, '同步': '✅' },
    xiaokai: { '提交': stats.value.todayCommits || 0, '代码': '2.5k' },
    xiaochan: { 'PRD': 0, '评审': 0 },
    xiaoyan: { '报告': 0, '洞察': 15 }
  }
  return statsMap[agentId] || {}
}

// 获取 Agent 当前任务
function getAgentTask(agentId) {
  const tasks = {
    xiaomu: '团队协调',
    xiaokai: '智能情报系统开发',
    xiaochan: '产品需求规划',
    xiaoyan: '行业情报收集'
  }
  return tasks[agentId] || '-'
}

// 方法
const getStageColor = (stage) => {
  const colors = {
    'idea': 'from-gray-500 to-gray-600',
    'analysis': 'from-yellow-500 to-orange-500',
    'tech-assessment': 'from-purple-500 to-pink-500',
    'development': 'from-blue-500 to-cyan-500',
    'testing': 'from-indigo-500 to-purple-500',
    'deployed': 'from-green-500 to-emerald-500',
    'maintenance': 'from-teal-500 to-cyan-500',
    'paused': 'from-orange-500 to-red-500',
    'cancelled': 'from-red-500 to-rose-500'
  }
  return colors[stage] || 'from-gray-500 to-gray-600'
}

// 获取阶段徽章类名
const getStageBadgeClass = (stage) => {
  const classMap = {
    'idea': 'stage-badge--idea',
    'analysis': 'stage-badge--analysis',
    'tech-assessment': 'stage-badge--tech-assessment',
    'development': 'stage-badge--development',
    'testing': 'stage-badge--testing',
    'deployed': 'stage-badge--deployed',
    'maintenance': 'stage-badge--maintenance',
    'paused': 'stage-badge--paused',
    'cancelled': 'stage-badge--cancelled'
  }
  return classMap[stage] || 'stage-badge--idea'
}

// 获取阶段卡片装饰类（可选，用于特殊阶段的高亮）
const getStageCardClass = (stage) => {
  // 目前返回空类名，保留扩展性
  return ''
}

const getStatusColor = (status) => {
  const colors = {
    '开发中': 'from-blue-500 to-cyan-500',
    '规划中': 'from-yellow-500 to-orange-500',
    '未启动': 'from-gray-500 to-gray-600',
    '已上线': 'from-green-500 to-emerald-500'
  }
  return colors[status] || 'from-gray-500 to-gray-600'
}

const getStatusEmoji = (status) => {
  const emojis = { '开发中': '🚧', '规划中': '📋', '未启动': '⏳', '已上线': '✅' }
  return emojis[status] || '📦'
}

const getTypeEmoji = (type) => {
  const emojis = { code: '🔧', doc: '📝', report: '📊' }
  return emojis[type] || '📄'
}

const getOutputFileTypeName = (type) => {
  const names = { code: '代码', doc: '文档', report: '报告' }
  return names[type] || '文件'
}

const getGithubLink = (projectName) => {
  return githubRepos[projectName] || ''
}

// 渲染 Markdown
const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

// 渲染预览内容
const renderPreviewContent = () => {
  if (previewContent.value.type === 'markdown' || previewContent.value.type === 'report' || previewContent.value.type === 'doc' || previewContent.value.type === 'code') {
    return md.render(previewContent.value.content)
  }
  return previewContent.value.content
}

// 转义 HTML
const escapeHtml = (content) => {
  const div = document.createElement('div')
  div.textContent = content
  return div.innerHTML
}

// 获取文件类型
const getFileType = (fileName) => {
  if (!fileName) return 'text'
  const ext = fileName.split('.').pop().toLowerCase()
  const typeMap = {
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
const previewFile = (file) => {
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
      .catch(err => {
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
    const res = await axios.get('/api/dashboard')
    const data = res.data

    // 统计
    stats.value = {
      totalProjects: data.stats?.totalProjects || 0,
      inProgress: data.stats?.inProgress || 0,
      notStarted: data.stats?.notStarted || 0,
      todayCommits: data.stats?.todayCommits || 0
    }

    // 项目
    projects.value = data.projects || []

    // 工作记录
    allWorkRecords.value = data.todayWork || []

    // 工作成果
    console.log('[DigitalEmployee] API 返回的 outputs:', data.outputs)
    allOutputs.value = data.outputs || []

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

const getLocalDateDaysAgo = (days) => {
  const now = new Date()
  now.setDate(now.getDate() - days)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setQuickDate = (range) => {
  const today = getLocalDate()
  filterDateStart.value = range === 'today' ? today : getLocalDateDaysAgo(7)
  filterDateEnd.value = today
}

const setOutputQuickDate = (range) => {
  const today = getLocalDate()
  filterOutputDateStart.value = range === 'today' ? today : getLocalDateDaysAgo(7)
  filterOutputDateEnd.value = today
}

// 生命周期
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
  setInterval(refreshData, 30000)
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
  --digital-card-bg: rgba(17, 24, 39, 0.8);
  --digital-border: rgba(255, 255, 255, 0.1);
  --digital-shadow: rgba(0, 0, 0, 0.3);
  --digital-grid: rgba(99, 102, 241, 0.03);
  --digital-glow: rgba(99, 102, 241, 0.08);
  --digital-text-primary: #f1f5f9;
  --digital-text-secondary: #94a3b8;
  --digital-accent: #6366F1;
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
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--digital-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px var(--digital-shadow);
  transition: all var(--transition-base);
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
  border-radius: 16px;
  overflow: hidden;
  transition: all var(--transition-base);
  border: 1px solid var(--digital-border);
}

.digital-employee-page .agent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--digital-accent) 0%, #06B6D4 50%, #22C55E 100%);
}

.digital-employee-page .agent-card:hover {
  box-shadow: 0 12px 40px var(--digital-shadow);
  transform: translateY(-2px);
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

/* ========== 项目进度面板样式 - 参考 Agents.vue 风格 ========== */
/* 章节标题 */
.digital-employee-page .section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--grid-line);
}

.digital-employee-page .section-title i {
  color: var(--color-primary);
  font-size: 20px;
}

.digital-employee-page .section-title__sub {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.15em;
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
