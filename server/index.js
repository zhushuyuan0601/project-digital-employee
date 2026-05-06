/**
 * 文件扫描 API 服务
 * 用于扫描指定目录并返回文件列表
 * 提供本地文件、任务、成果和 Claude Runtime API。
 */

import express from 'express'
import cors from 'cors'
import { promises as fs, existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import skillsRouter from './routes/skills.js'
import taskRouter from './routes/tasks.js'
import analysisRouter from './routes/analysis.js'
import groupChatRouter from './routes/group-chat.js'
import mailRouter from './routes/mail.js'
import { createAutomationRouter } from './routes/automation.js'
import { initializeSchema } from './db/index.js'
import { initializeTaskSchema } from './db/tasks.js'
import { listTaskEvents, listTaskOutputs, listTasks } from './db/tasks.js'
import { initializeAnalysisSchema } from './db/analysis.js'
import { initializeMailSchema } from './db/mail.js'
import { cleanupOrphanAgentRunsOnStartup } from './claude-runtime/index.js'
import { getClaudeRuntimeConfig } from './claude-runtime/config.js'
import { startMailScanner } from './mail/mail-service.js'
import { DEFAULT_SERVER_CONFIG, ensureDir, envString } from './config/defaults.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = envString('PORT', String(DEFAULT_SERVER_CONFIG.port))

// 中间件
const CORS_ORIGIN = envString('CORS_ORIGIN', DEFAULT_SERVER_CONFIG.corsOrigin)
app.use(cors({ origin: CORS_ORIGIN.split(',').map(s => s.trim()) }))
app.use(express.json())

// 认证中间件：若设置 API_AUTH_TOKEN 则对 /api/* 路由启用 Bearer token 校验
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || ''
function requireAuth(req, res, next) {
  if (!API_AUTH_TOKEN) return next()
  const auth = req.headers.authorization || ''
  if (auth === `Bearer ${API_AUTH_TOKEN}`) return next()
  return res.status(401).json({ error: 'Unauthorized: invalid or missing token' })
}
app.use('/api', requireAuth)

// 用户主目录
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || ''

/**
 * 解析路径，支持 ~ 开头的路径
 */
function resolvePath(path) {
  if (path.startsWith('~/')) {
    return join(HOME_DIR, path.slice(2))
  }
  // 如果已经是绝对路径，直接返回
  if (path.startsWith('/')) {
    return path
  }
  return resolve(path)
}

// 文件访问路径白名单
const FILE_ROOTS = envString('FILE_ROOTS', DEFAULT_SERVER_CONFIG.fileRoots)
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .map(p => resolvePath(p))

const bootRuntimeConfig = getClaudeRuntimeConfig()
ensureDir(bootRuntimeConfig.workspaceRoot)
ensureDir(bootRuntimeConfig.outputRoot)

function isPathAllowed(resolvedPath) {
  if (FILE_ROOTS.length === 0) return true
  const normalized = resolve(resolvedPath)
  return FILE_ROOTS.some(root => normalized.startsWith(root + '/') || normalized === root)
}

/**
 * 获取文件类型
 */
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const typeMap = {
    md: 'markdown',
    markdown: 'markdown',
    txt: 'text',
    html: 'html',
    htm: 'html',
    doc: 'word',
    docx: 'word',
    ppt: 'ppt',
    pptx: 'ppt',
    xls: 'excel',
    xlsx: 'excel',
    js: 'code',
    ts: 'code',
    py: 'code',
    java: 'code',
    go: 'code',
    rs: 'code',
    json: 'code',
    yaml: 'code',
    yml: 'code',
    sh: 'code',
    bash: 'code'
  }
  return typeMap[ext] || 'text'
}

/**
 * 获取文件图标
 */
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  const iconMap = {
    md: '📘',
    markdown: '📘',
    txt: '📄',
    html: '🌐',
    htm: '🌐',
    doc: '📝',
    docx: '📝',
    ppt: '📊',
    pptx: '📊',
    xls: '📈',
    xlsx: '📈',
    js: '📜',
    ts: '📜',
    py: '🐍',
    json: '⚙',
    yaml: '⚙'
  }
  return iconMap[ext] || '📁'
}

/**
 * 扫描目录并返回文件列表
 * 支持按时间范围过滤
 */
async function scanDirectory(basePath, startTime, endTime) {
  const files = []

  try {
    const resolvedPath = resolvePath(basePath)
    console.log(`[Scan] Resolved path: ${resolvedPath}`)

    // 检查目录是否存在
    try {
      await fs.access(resolvedPath)
    } catch (err) {
      console.log(`[Scan] Directory not found: ${resolvedPath}`)
      return files
    }

    // 读取目录内容
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
    console.log(`[Scan] Found ${entries.length} entries`)

    for (const entry of entries) {
      // 跳过隐藏文件和目录
      if (entry.name.startsWith('.')) continue

      const fullPath = join(resolvedPath, entry.name)

      if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath)
          const mtime = stats.mtimeMs

          console.log(`[Scan] File: ${entry.name}, mtime: ${new Date(mtime)}, startTime: ${new Date(startTime)}, endTime: ${new Date(endTime)}`)

          // 如果指定了时间范围，过滤文件
          if (startTime && endTime) {
            if (mtime < startTime || mtime > endTime) {
              console.log(`[Scan] Skipping ${entry.name} - outside time range`)
              continue
            }
          }

          files.push({
            name: entry.name,
            path: fullPath,
            type: getFileType(entry.name),
            icon: getFileIcon(entry.name),
            size: stats.size,
            mtime: mtime,
            mtimeStr: new Date(mtime).toLocaleString('zh-CN')
          })
        } catch (err) {
          console.error(`[Scan] Error reading file ${entry.name}:`, err)
        }
      } else if (entry.isDirectory()) {
        // 递归扫描子目录
        const subFiles = await scanDirectory(fullPath, startTime, endTime)
        files.push(...subFiles)
      }
    }
  } catch (err) {
    console.error('[Scan] Error scanning directory:', err)
  }

  // 按修改时间排序
  files.sort((a, b) => b.mtime - a.mtime)

  return files
}

/**
 * 读取文件内容
 */
async function readFileContent(filePath) {
  try {
    const resolvedPath = resolvePath(filePath)
    console.log(`[ReadFile] filePath=${filePath}, resolvedPath=${resolvedPath}`)
    const content = await fs.readFile(resolvedPath, 'utf-8')
    return {
      success: true,
      content,
      path: filePath
    }
  } catch (err) {
    console.error('[ReadFile] Error:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

// API 路由

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * 扫描目录 API
 * GET /api/files/scan?path=xxx&startTime=xxx&endTime=xxx
 */
app.get('/api/files/scan', async (req, res) => {
  try {
    const { path, startTime, endTime, roleId, date } = req.query

    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: path'
      })
    }

    const resolved = resolvePath(path)
    if (!isPathAllowed(resolved)) {
      return res.status(403).json({ success: false, error: 'Access denied: path not in allowed roots' })
    }

    console.log(`[API] Scan request: path=${path}, startTime=${startTime}, endTime=${endTime}`)

    const files = await scanDirectory(path,
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null
    )

    res.json({
      success: true,
      path,
      roleId,
      date,
      count: files.length,
      files
    })
  } catch (err) {
    console.error('[API] Scan error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 读取文件内容 API
 * GET /api/files/content?path=xxx
 */
app.get('/api/files/content', async (req, res) => {
  try {
    const { path } = req.query

    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: path'
      })
    }

    const resolved = resolvePath(path)
    if (!isPathAllowed(resolved)) {
      return res.status(403).json({ success: false, error: 'Access denied: path not in allowed roots' })
    }

    console.log(`[API] Read file request: path=${path}`)

    const result = await readFileContent(path)

    if (result.success) {
      res.json(result)
    } else {
      res.status(404).json(result)
    }
  } catch (err) {
    console.error('[API] Read file error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// 兼容旧格式的 API 路由
app.get('/api/file', async (req, res) => {
  try {
    const { path } = req.query

    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: path'
      })
    }

    const resolved = resolvePath(path)
    if (!isPathAllowed(resolved)) {
      return res.status(403).json({ success: false, error: 'Access denied: path not in allowed roots' })
    }

    console.log(`[API] Read file request (legacy): path=${path}`)

    const result = await readFileContent(path)

    if (result.success) {
      res.json(result)
    } else {
      res.status(404).json(result)
    }
  } catch (err) {
    console.error('[API] Read file error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 获取角色产出文件 API
 * GET /api/files/role?roleId=xxx&date=xxxx-xx-xx&startTime=xxx&endTime=xxx
 */
app.get('/api/files/role', async (req, res) => {
  try {
    const { roleId, date, startTime, endTime } = req.query

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: roleId'
      })
    }

    // Claude Runtime 报告由后端统一写入成果目录，这里从成果根目录读取。
    const basePath = getClaudeRuntimeConfig().outputRoot

    console.log(`[API] Role files request: roleId=${roleId}, date=${date}, basePath=${basePath}`)

    const files = await scanDirectory(basePath,
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null
    )

    const gitUrl = null

    res.json({
      success: true,
      roleId,
      date,
      basePath,
      gitUrl,
      count: files.length,
      files
    })
  } catch (err) {
    console.error('[API] Role files error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 解析项目状态文件 (PROJECT_STATUS.md)
 * 格式：
 * # 项目名称
 * ## 📋 基本信息
 * | 字段 | 值 |
 * |------|------|
 * | **项目描述** | xxx |
 * | **阶段** | `development` 💻 |
 * | **进度** | 35% |
 * ## 👥 团队成员
 * ## 🌐 仓库信息
 * ## 📁 关键文档
 * ## ✅ 任务清单
 * ## 📈 进度里程碑
 * ## 🚀 最近更新
 * ## 📅 下一步计划
 */
async function parseProjectStatus(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    // 提取项目名称（第一行）
    const nameMatch = lines[0].match(/^#\s*(.+)/)
    const name = nameMatch ? nameMatch[1].trim() : '未知项目'

    // 提取基本信息表格中的字段
    let stage = 'idea'
    let stageEmoji = '💡'
    let progress = 0
    let description = ''
    let leader = '未知'
    let leaderRole = '未知'
    let githubUrl = ''
    let demoUrl = ''
    let createDate = ''
    let lastUpdate = ''

    // 团队成员
    const teamMembers = []

    // 解析表格行
    let currentSection = ''
    for (const line of lines) {
      // 检测章节
      if (line.startsWith('## ')) {
        if (line.includes('基本信息')) currentSection = 'basic'
        else if (line.includes('团队成员')) currentSection = 'team'
        else if (line.includes('仓库信息')) currentSection = 'repo'
        else if (line.includes('任务清单')) currentSection = 'tasks'
        else if (line.includes('最近更新')) currentSection = 'updates'
        else if (line.includes('下一步计划')) currentSection = 'nextSteps'
        else if (line.includes('统计信息')) currentSection = 'stats'
        continue
      }

      // 基本信息章节
      if (currentSection === 'basic') {
        // 阶段
        const stageMatch = line.match(/\|\s*\*\*阶段\*\*\s*\|\s*`(\w+)`\s*(💡|🔍|🔧|💻|🧪|🚀|🔒|⏸️|❌)/)
        if (stageMatch) {
          stage = stageMatch[1]
          stageEmoji = stageMatch[2]
        }

        // 进度
        const progressMatch = line.match(/\|\s*\*\*进度\*\*\s*\|\s*(\d+)%/)
        if (progressMatch) {
          progress = parseInt(progressMatch[1])
        }

        // 项目描述
        const descMatch = line.match(/\|\s*\*\*项目描述\*\*\s*\|\s*(.+)/)
        if (descMatch) {
          description = descMatch[1].trim()
        }

        // 创建日期
        const createDateMatch = line.match(/\|\s*\*\*创建日期\*\*\s*\|\s*(.+)/)
        if (createDateMatch) {
          createDate = createDateMatch[1].trim()
        }

        // 最后更新
        const lastUpdateMatch = line.match(/\|\s*\*\*最后更新\*\*\s*\|\s*(.+)/)
        if (lastUpdateMatch) {
          lastUpdate = lastUpdateMatch[1].trim()
        }
      }

      // 团队成员章节
      if (currentSection === 'team') {
        const leaderMatch = line.match(/\|\s*攻关团队负责人\s*\|\s*([^|]+)\s*\|/)
        if (leaderMatch) {
          leader = leaderMatch[1].trim()
          // 支持真实姓名和角色名映射
          const leaderName = leader.split('（')[0].trim()
          const roleMap = {
            '姜昊': '小开',
            '林桐': '小产',
            '小开': '小开',
            '小产': '小产',
            '小研': '小研',
            '小U': '小U',
            '小测': '小测'
          }
          leaderRole = roleMap[leaderName] || leaderName
        }
        const pmMatch = line.match(/\|\s*产品经理\s*\|\s*([^|]+)\s*\|/)
        if (pmMatch && !teamMembers.find(m => m.role === '产品经理')) {
          teamMembers.push({ role: '产品经理', name: pmMatch[1].trim() })
        }
        const devMatch = line.match(/\|\s*研发工程师\s*\|\s*([^|]+)\s*\|/)
        if (devMatch && !teamMembers.find(m => m.role === '研发工程师')) {
          teamMembers.push({ role: '研发工程师', name: devMatch[1].trim() })
        }
        // 竞品分析师
        const researchMatch = line.match(/\|\s*竞品分析师\s*\|\s*([^|]+)\s*\|/)
        if (researchMatch && !teamMembers.find(m => m.role === '竞品分析师')) {
          teamMembers.push({ role: '竞品分析师', name: researchMatch[1].trim() })
        }
        // 质量检查员
        const qaMatch = line.match(/\|\s*质量检查员\s*\|\s*([^|]+)\s*\|/)
        if (qaMatch && !teamMembers.find(m => m.role === '质量检查员')) {
          teamMembers.push({ role: '质量检查员', name: qaMatch[1].trim() })
        }
        // 任务秘书
        const secMatch = line.match(/\|\s*任务秘书\s*\|\s*([^|]+)\s*\|/)
        if (secMatch && !teamMembers.find(m => m.role === '任务秘书')) {
          teamMembers.push({ role: '任务秘书', name: secMatch[1].trim() })
        }
      }

      // 仓库信息章节
      if (currentSection === 'repo') {
        // GitHub 仓库 - 支持反引号格式和直接URL格式
        const githubMatch = line.match(/\*\*GitHub 仓库\*\*\s*\|\s*(?:`([^`]+)`|([^|]+))\s*\|?/)
        if (githubMatch) {
          githubUrl = (githubMatch[1] || githubMatch[2] || '').trim()
        }

        // Demo 链接 - 支持反引号格式和直接URL格式
        const demoMatch = line.match(/\*\*Demo 链接\*\*\s*\|\s*(?:`([^`]+)`|([^|]+))\s*\|?/)
        if (demoMatch) {
          demoUrl = (demoMatch[1] || demoMatch[2] || '').trim()
        }
        // 前端访问 - 作为备用 demo URL
        const frontendMatch = line.match(/\*\*前端访问\*\*\s*\|\s*(?:`([^`]+)`|([^|]+))\s*\|?/)
        if (frontendMatch && !demoUrl) {
          demoUrl = (frontendMatch[1] || frontendMatch[2] || '').trim()
        }
      }
    }

    // 阶段名称映射
    const stageNames = {
      'idea': '立项前',
      'analysis': '需求分析',
      'tech-assessment': '技术评估',
      'development': '开发中',
      'testing': '测试验收',
      'deployed': '已上线',
      'maintenance': '维护期',
      'paused': '已暂停',
      'cancelled': '已取消'
    }

    // 提取已完成任务、下一步计划、最近更新
    const progressList = []
    const nextSteps = []
    const updates = []
    let inTasksSection = false
    let inUpdatesSection = false
    let inCompletedSection = false
    let inProgressSection = false
    let inPendingSection = false

    currentSection = ''
    for (const line of lines) {
      if (line.startsWith('## ')) {
        inTasksSection = line.includes('任务清单')
        inUpdatesSection = line.includes('最近更新') || line.includes('更新日志')
        // 新格式：支持 "已完成"、"进行中"、"待开始" 章节
        inCompletedSection = line.includes('已完成') && !line.includes('未完成')
        inProgressSection = line.includes('进行中')
        inPendingSection = line.includes('待开始')
        continue
      }

      // 任务清单（旧格式：- [x] / - [ ]）
      if (inTasksSection) {
        if (line.startsWith('## ')) {
          inTasksSection = false
        } else {
          // 已完成的任务
          if (line.match(/-\s*\[x\]/)) {
            const task = line.replace(/-\s*\[x\]\s*/, '').trim()
            if (task && !task.startsWith('#')) {
              progressList.push(task)
            }
          }
          // 未完成的任务（取前几个作为下一步）
          if (line.match(/-\s*\[\s*\]/) && nextSteps.length < 5) {
            const task = line.replace(/-\s*\[\s*\]\s*/, '').trim()
            if (task && !task.startsWith('#')) {
              nextSteps.push(task)
            }
          }
        }
      }

      // 新格式：已完成章节（- ✅ 任务）
      if (inCompletedSection) {
        if (line.startsWith('## ')) {
          inCompletedSection = false
        } else if (line.match(/^-\s*✅\s*/)) {
          const task = line.replace(/^-\s*✅\s*/, '').trim()
          if (task && progressList.length < 10) {
            progressList.push(task)
          }
        }
      }

      // 新格式：进行中章节（- ⏳ 或 - 🔧 任务）
      if (inProgressSection) {
        if (line.startsWith('## ')) {
          inProgressSection = false
        } else if (line.match(/^-\s*(?:⏳|🔧|🧪)\s*/) && nextSteps.length < 5) {
          const task = line.replace(/^-\s*(?:⏳|🔧|🧪)\s*/, '').trim()
          if (task) {
            nextSteps.push(task)
          }
        }
      }

      // 新格式：待开始章节（- 📝 任务）
      if (inPendingSection) {
        if (line.startsWith('## ')) {
          inPendingSection = false
        } else if (line.match(/^-\s*📝\s*/) && nextSteps.length < 5) {
          const task = line.replace(/^-\s*📝\s*/, '').trim()
          if (task) {
            nextSteps.push(task)
          }
        }
      }

      // 最近更新 / 更新日志
      if (inUpdatesSection) {
        if (line.startsWith('## ') && !line.includes('更新')) {
          inUpdatesSection = false
        } else if (line.match(/^###\s+\d{4}-\d{2}-\d{2}/)) {
          // 日期标题
          updates.push({ type: 'date', content: line.replace('### ', '').trim() })
        } else if (line.trim().match(/^-\s*(?:✅|⏳|🔧)\s*/)) {
          // 更新内容
          updates.push({ type: 'item', content: line.trim() })
        }
      }
    }

    // 统计信息
    let totalTasks = 0
    let completedTasks = 0
    const statsMatch = content.match(/\|\s*总任务数\s*\|\s*(\d+)/)
    if (statsMatch) totalTasks = parseInt(statsMatch[1])
    const completedMatch = content.match(/\|\s*已完成任务\s*\|\s*(\d+)/)
    if (completedMatch) completedTasks = parseInt(completedMatch[1])

    // 最新进展日志（用于前端显示）
    const devLog = progressList.slice(0, 3).join('；')

    return {
      id: name, // 使用项目名称作为 ID
      name,
      stage,
      stageName: stageNames[stage] || '未知',
      status: stageNames[stage] || '未知', // 前端使用 status 字段
      stageEmoji,
      emoji: stageEmoji, // 前端使用 emoji 字段
      progress,
      leader,
      leaderRole,
      teamMembers,
      demo: demoUrl ? '✅' : '⏳',
      description,
      githubUrl,
      demoUrl,
      createDate,
      lastUpdate,
      commits: 0, // 暂时设置为 0，后续可通过 GitHub API 获取
      devLog, // 前端使用的进展日志字段
      progressList: progressList.slice(0, 5), // 只显示前 5 个进展
      nextSteps: nextSteps.slice(0, 3), // 只显示前 3 个下一步
      updates, // 最近更新列表
      totalTasks,
      completedTasks
    }
  } catch (err) {
    console.error(`[ParseProject] Error parsing ${filePath}:`, err.message)
    return null
  }
}

/**
 * 扫描所有项目状态
 */
async function scanProjects() {
  const projectsBasePath = resolvePath(process.env.PROJECT_STATUS_ROOT || getClaudeRuntimeConfig().outputRoot)
  const projects = []

  try {
    const entries = await fs.readdir(projectsBasePath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const statusFilePath = join(projectsBasePath, entry.name, 'PROJECT_STATUS.md')
        try {
          await fs.access(statusFilePath)
          const project = await parseProjectStatus(statusFilePath)
          if (project) {
            projects.push(project)
          }
        } catch (err) {
          // 项目状态文件不存在，跳过
        }
      }
    }

    // 按进度降序排序
    projects.sort((a, b) => b.progress - a.progress)

  } catch (err) {
    console.error('[ScanProjects] Error:', err.message)
  }

  return projects
}

/**
 * 获取项目统计信息
 */
function getProjectStats(projects) {
  const stats = {
    totalProjects: projects.length,
    inProgress: 0,
    notStarted: 0,
    todayCommits: 0
  }

  for (const project of projects) {
    if (project.stage === 'development' || project.stage === 'testing') {
      stats.inProgress++
    } else if (project.stage === 'idea' || project.stage === 'analysis' || project.stage === 'tech-assessment') {
      stats.notStarted++
    }
  }

  return stats
}

// ============ Skills API (Mission Control Architecture) ============
// 使用新的基于 SQLite 和双向同步的技能管理模块
app.use('/api/skills', skillsRouter)

// ============ ClaudeCode Sessions API ============

const LOCAL_SESSION_ACTIVE_WINDOW_MS = 90 * 60 * 1000 // 90 分钟

/**
 * 格式化 Token 数量
 */
function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

/**
 * 格式化时间差
 */
function formatAge(timestamp) {
  if (!timestamp) return '-'
  const diff = Date.now() - timestamp
  if (diff <= 0) return 'now'
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

/**
 * 读取 ClaudeCode transcript
 */
function readClaudeTranscript(sessionId, limit = 50) {
  const claudeProjectsDir = join(HOME_DIR, '.claude', 'projects')

  if (!existsSync(claudeProjectsDir)) {
    console.log('[Transcript] Claude projects directory not found:', claudeProjectsDir)
    return []
  }

  const messages = []
  const files = listRecentFiles(claudeProjectsDir, '.jsonl', 300)

  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf-8')
      const lines = raw.split('\n').filter(Boolean)

      for (const line of lines) {
        let parsed
        try {
          parsed = JSON.parse(line)
        } catch {
          continue
        }

        if (parsed?.sessionId !== sessionId || parsed?.isSidechain) continue

        const ts = typeof parsed?.timestamp === 'string' ? parsed.timestamp : undefined

        if (parsed?.type === 'user') {
          const rawContent = parsed?.message?.content
          // 检查是否是 tool_result 数组
          if (Array.isArray(rawContent) && rawContent.some((b) => b?.type === 'tool_result')) {
            const parts = []
            for (const block of rawContent) {
              if (block?.type === 'tool_result') {
                const resultContent = typeof block.content === 'string'
                  ? block.content
                  : Array.isArray(block.content)
                    ? block.content.map((c) => c?.text || '').join('\n')
                    : ''
                if (resultContent.trim()) {
                  parts.push({
                    type: 'tool_result',
                    toolUseId: block.tool_use_id || '',
                    content: resultContent.trim().slice(0, 8000),
                    isError: block.is_error === true
                  })
                }
              }
            }
            if (parts.length > 0) {
              messages.push({ role: 'system', parts, timestamp: ts })
            }
          } else {
            const content = typeof rawContent === 'string'
              ? rawContent
              : Array.isArray(rawContent)
                ? rawContent.map((b) => b?.text || '').join('\n').trim()
                : ''
            if (content.trim()) {
              messages.push({
                role: 'user',
                parts: [{ type: 'text', text: content.trim().slice(0, 8000) }],
                timestamp: ts
              })
            }
          }
        } else if (parsed?.type === 'assistant') {
          const parts = []
          if (Array.isArray(parsed?.message?.content)) {
            for (const block of parsed.message.content) {
              if (block?.type === 'thinking' && typeof block?.thinking === 'string') {
                const thinking = block.thinking.trim()
                if (thinking) {
                  parts.push({ type: 'thinking', thinking: thinking.slice(0, 4000) })
                }
              } else if (block?.type === 'text' && typeof block?.text === 'string') {
                if (block.text.trim()) {
                  parts.push({ type: 'text', text: block.text.trim().slice(0, 8000) })
                }
              } else if (block?.type === 'tool_use') {
                parts.push({
                  type: 'tool_use',
                  id: block.id || '',
                  name: block.name || 'unknown',
                  input: JSON.stringify(block.input || {}).slice(0, 500)
                })
              }
            }
          }
          if (parts.length > 0) {
            messages.push({ role: 'assistant', parts, timestamp: ts })
          }
        }
      }
    } catch (err) {
      console.error('[Transcript] Error reading file:', file, err.message)
    }
  }

  // 按时间排序
  messages.sort((a, b) => {
    const tsA = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const tsB = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return tsA - tsB
  })

  return messages.slice(-limit)
}

/**
 * 列出最近的文件
 */
function listRecentFiles(root, ext, limit) {
  if (!root || !existsSync(root)) return []

  const files = []
  const stack = [root]

  while (stack.length > 0) {
    const dir = stack.pop()
    if (!dir) continue

    let entries = []
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = join(dir, entry)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        stack.push(full)
        continue
      }

      if (!stat.isFile() || !full.endsWith(ext)) continue
      files.push({ path: full, mtimeMs: stat.mtimeMs })
    }
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return files.slice(0, Math.max(1, limit)).map((f) => f.path)
}

/**
 * Dashboard API - 获取数字员工监控中心数据
 * GET /api/dashboard
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('[API] Dashboard request')

    const tasks = listTasks({ limit: 200 })
    const allOutputs = listTaskOutputs()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todaySeconds = Math.floor(todayStart.getTime() / 1000)
    const agentNames = {
      xiaomu: '小呦',
      xiaokai: '研发工程师',
      xiaochan: '产品经理',
      xiaoyan: '研究员',
      xiaoce: '测试员'
    }

    const projects = tasks.map((task) => ({
      id: task.id,
      name: task.title,
      description: task.description,
      status: task.status,
      progress: task.progress,
      updatedAt: task.updated_at,
      createdAt: task.created_at,
      subtaskCount: task.subtasks?.length || 0,
      outputCount: task.outputs?.length || 0
    }))

    const stats = {
      totalProjects: tasks.length,
      inProgress: tasks.filter(task => ['planning', 'dispatching', 'running', 'reviewing'].includes(task.status)).length,
      notStarted: tasks.filter(task => ['draft', 'planning'].includes(task.status)).length,
      todayCommits: allOutputs.filter(output => Number(output.created_at || output.mtime || 0) >= todaySeconds).length
    }

    const outputs = allOutputs.map((output) => ({
      name: output.name,
      path: output.path,
      type: output.type,
      person: agentNames[output.agent_id] || output.agent_id || '未知成员',
      agentId: output.agent_id,
      taskId: output.task_id,
      date: output.created_at ? new Date(output.created_at * 1000).toISOString().split('T')[0] : ''
    }))

    res.json({
      success: true,
      dataSource: 'database',
      stats,
      projects,
      todayWork: [],
      outputs
    })
  } catch (err) {
    console.error('[API] Dashboard error:', err)
    res.json({
      success: true,
      dataSource: 'database',
      stats: { totalProjects: 0, inProgress: 0, notStarted: 0, todayCommits: 0 },
      projects: [],
      todayWork: [],
      outputs: []
    })
  }
})

// ============ Activities API ============

/**
 * Activities API - 获取活动记录（实时工作流）
 * GET /api/activities
 */
app.get('/api/activities', async (req, res) => {
  try {
    const { type, actor, limit, since, hours } = req.query
    const requestedLimit = Math.min(parseInt(limit) || 50, 500)

    // 计算时间范围
    const sinceTimestamp = since ? parseInt(since) : Math.floor(Date.now() / 1000) - ((parseInt(hours) || 24) * 3600)

    const tasks = listTasks({ limit: 100 })
    let activities = tasks.flatMap((task) =>
      listTaskEvents(task.id, { limit: 50 })
        .filter(event => Number(event.created_at || 0) > sinceTimestamp)
        .map(event => ({
          id: String(event.id),
          type: event.type,
          entityType: 'task',
          entityId: event.task_id,
          actor: event.agent_id || 'system',
          description: event.message,
          data: event.payload_json || null,
          createdAt: event.created_at,
          date: new Date(event.created_at * 1000).toISOString().split('T')[0],
          time: new Date(event.created_at * 1000).toLocaleTimeString('zh-CN', { hour12: false }),
          person: formatActorName(event.agent_id || 'system'),
          task: event.message,
          status: getActivityStatus(event.type)
        }))
    )

    if (type) activities = activities.filter(item => item.type === type)
    if (actor) activities = activities.filter(item => item.actor === actor)

    // 按时间排序
    activities.sort((a, b) => (b.createdAt || b.created_at) - (a.createdAt || a.created_at))

    res.json({
      success: true,
      dataSource: 'database',
      activities: activities.slice(0, requestedLimit),
      total: activities.length
    })
  } catch (err) {
    console.error('[API] Activities error:', err)
    // 即使出错也返回模拟数据
    const mockActivities = generateMockActivities(parseInt(req.query.limit) || 50)
    res.json({
      success: true,
      dataSource: 'mock',
      activities: mockActivities,
      total: mockActivities.length
    })
  }
})

/**
 * 生成模拟活动记录
 */
function generateMockActivities(count = 20, sinceTimestamp = null) {
  const actors = ['xiaomu', 'xiaokai', 'xiaochan', 'xiaoyan', 'xiaoce']
  const actorNames = {
    'xiaomu': '小 U',
    'xiaokai': '小开',
    'xiaochan': '小产',
    'xiaoyan': '小研',
    'xiaoce': '小测'
  }
  const taskTypes = [
    { type: 'task_created', status: '已创建', tasks: ['创建新功能需求', '新增用户故事', '建立任务卡片', '规划迭代任务'] },
    { type: 'task_completed', status: '已完成', tasks: ['完成代码审查', '修复Bug问题', '优化性能瓶颈', '编写单元测试'] },
    { type: 'chat_message', status: '沟通中', tasks: ['讨论技术方案', '同步项目进度', '协调资源分配', '评审设计文档'] },
    { type: 'agent_status_change', status: '状态变更', tasks: ['启动服务实例', '切换工作模式', '更新配置参数', '重连网络服务'] },
    { type: 'comment_added', status: '评论中', tasks: ['添加代码注释', '回复问题反馈', '补充文档说明', '记录会议纪要'] }
  ]

  const activities = []
  const now = Math.floor(Date.now() / 1000)
  const startTime = sinceTimestamp || (now - 24 * 3600)

  for (let i = 0; i < count; i++) {
    const actor = actors[Math.floor(Math.random() * actors.length)]
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)]
    const task = taskType.tasks[Math.floor(Math.random() * taskType.tasks.length)]
    const createdAt = startTime + Math.floor(Math.random() * (now - startTime))

    activities.push({
      id: `mock-${i}-${Date.now()}`,
      type: taskType.type,
      actor: actor,
      description: `${task} - ${actorNames[actor]}`,
      createdAt: createdAt,
      date: new Date(createdAt * 1000).toISOString().split('T')[0],
      time: new Date(createdAt * 1000).toLocaleTimeString('zh-CN', { hour12: false }),
      person: actorNames[actor],
      task: `${task} - ${actorNames[actor]}`,
      status: taskType.status
    })
  }

  return activities
}

/**
 * 格式化角色名称
 */
function formatActorName(actor) {
  const nameMap = {
    'heartbeat': '系统',
    'Admin': '小 U',
    'coordinator': '小 U',
    'xiaomu': '小 U',
    'xiaokai': '小开',
    'xiaochan': '小产',
    'xiaoyan': '小研',
    'xiaoce': '小测'
  }
  return nameMap[actor] || actor
}

/**
 * 获取活动状态
 */
function getActivityStatus(type) {
  const statusMap = {
    'task_created': '已创建',
    'task_updated': '更新中',
    'task_completed': '已完成',
    'comment_added': '评论中',
    'agent_status_change': '状态变更',
    'chat_message': '沟通中'
  }
  return statusMap[type] || '进行中'
}

initializeTaskSchema()
initializeAnalysisSchema()
initializeMailSchema()
const runtimeRecovery = cleanupOrphanAgentRunsOnStartup()
if (runtimeRecovery.cleaned > 0) {
  console.log(`[Claude Runtime] Startup recovery cleaned ${runtimeRecovery.cleaned} orphan queued/running runs`)
}
startMailScanner()
app.use('/api', createAutomationRouter())
app.use('/api', taskRouter)
app.use('/api', groupChatRouter)
app.use('/api', mailRouter)
app.use('/api/analysis', analysisRouter)

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          Unicom File Scanner API Server                 ║
║                                                         ║
║  Server running at: http://localhost:${PORT}             ║
║                                                         ║
║  API Endpoints:                                         ║
║  Core:                                                  ║
║  - GET /health                     - 健康检查            ║
║  - GET /api/files/scan?path=xxx    - 扫描目录            ║
║  - GET /api/files/content?path=xxx - 读取文件内容        ║
║  - GET /api/files/role?roleId=xxx  - 获取角色产出文件    ║
║  - GET /api/dashboard              - 数字员工监控中心    ║
║                                                         ║
║  Advanced Features:                                     ║
║  - GET /api/skills                 - 技能列表            ║
║  - POST /api/skills/install        - 安装技能            ║
║  - POST /api/skills/:id/update     - 更新技能            ║
║  - DELETE /api/skills/:id          - 卸载技能            ║
║  - GET /api/mail/channels          - 邮件渠道配置        ║
║  - POST /api/mail/channels/:id/scan- 扫描邮件触发任务    ║
║  - GET /api/cron/tasks             - 定时任务列表        ║
║  - POST /api/cron/tasks            - 创建定时任务        ║
║  - POST /api/cron/tasks/:id/toggle - 切换任务状态        ║
║  - POST /api/cron/tasks/:id/execute- 立即执行任务        ║
║  - GET /api/webhooks               - Webhook 列表         ║
║  - POST /api/webhooks              - 创建 Webhook         ║
║  - POST /api/webhooks/:id/test     - 发送测试通知        ║
║  - GET /api/activities             - 活动记录（工作流）   ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
  `)
})

function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`)
  server.close(() => {
    console.log('[Server] Closed.')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
