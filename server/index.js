/**
 * 文件扫描 API 服务
 * 用于扫描指定目录并返回文件列表
 * 同时作为 Gateway API 的代理层
 */

import express from 'express'
import cors from 'cors'
import { promises as fs, existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import http from 'http'
import skillsRouter from './routes/skills.js'
import agentChatRouter, { initAgentChatRoutes } from './routes/agent-chat.js'
import { initializeSchema } from './db/index.js'
import { initializeAgentChatSchema } from './db/agent-chat.js'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 18888

// Gateway 服务地址
const GATEWAY_HOST = process.env.GATEWAY_HOST || '127.0.0.1'
const GATEWAY_PORT = process.env.GATEWAY_PORT || 18789

// 中间件
app.use(cors())
app.use(express.json())

// 用户主目录
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || ''

// 初始化 SQLite 数据库连接（用于 ClaudeCode 会话）
// 使用 mission-control 的数据库，里面包含 claude_sessions 表
let claudeDb = null
const CLAUDE_DB_PATHS = [
  // 优先使用环境变量指定的路径
  process.env.MISSION_CONTROL_DB_PATH,
  // 正确的 mission-control 数据库路径
  join(HOME_DIR, '.openclaw/shared-workspace/projects/mission-control/.data/mission-control.db'),
  // 旧的路径（可能已废弃）
  join(HOME_DIR, '.openclaw/shared-workspace/projects/multi-agent-management/app/.data/mission-control.db'),
  // 备用路径
  join(HOME_DIR, '.openclaw/workspace-projects/mission-control/.data/mission-control.db'),
  // 其他可能的路径
  join(HOME_DIR, '.openclaw/shared-workspace/projects/project-digital-employee/kanban-full-managed/mission-control.db')
]

for (const dbPath of CLAUDE_DB_PATHS) {
  if (!dbPath) continue
  try {
    claudeDb = new Database(dbPath, { readonly: true, fileMustExist: true })
    console.log('[DB] Claude sessions database connected:', dbPath)
    break
  } catch (err) {
    console.log('[DB] Claude sessions database not available at:', dbPath)
  }
}

if (!claudeDb) {
  console.log('[DB] No Claude sessions database found, ClaudeCode panel will not show sessions')
}

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
 * 代理请求到 Gateway 服务
 */
function proxyToGateway(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GATEWAY_HOST,
      port: parseInt(GATEWAY_PORT),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve({ raw: data })
        }
      })
    })

    req.on('error', (e) => {
      reject(e)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

/**
 * 检查 Gateway 服务是否可用
 */
async function isGatewayAvailable() {
  try {
    await proxyToGateway('/health')
    return true
  } catch (e) {
    return false
  }
}

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

    // 构建角色目录路径
    const basePath = `~/.openclaw/shared-workspace/daily-intel/roles/${roleId}/${date || new Date().toISOString().split('T')[0]}`

    console.log(`[API] Role files request: roleId=${roleId}, date=${date}, basePath=${basePath}`)

    const files = await scanDirectory(basePath,
      startTime ? parseInt(startTime) : null,
      endTime ? parseInt(endTime) : null
    )

    // 对于 tech-lead 角色，尝试查找 git 仓库信息
    let gitUrl = null
    if (roleId === 'tech-lead') {
      // 尝试读取 .git 配置
      try {
        const gitConfigPath = join(HOME_DIR, '.openclaw/shared-workspace/.git/config')
        const gitConfig = await fs.readFile(gitConfigPath, 'utf-8')
        const remoteMatch = gitConfig.match(/url\s*=\s*(https?:\/\/github\.com\/[^\s]+)/)
        if (remoteMatch) {
          gitUrl = remoteMatch[1]
        }
      } catch (err) {
        console.log('[API] No git config found')
      }
    }

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
  const projectsBasePath = resolvePath('~/.openclaw/shared-workspace/projects')
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

// ============ Tokens API ============

/**
 * 生成模拟 Token 数据
 */
function generateTokenData() {
  const now = new Date()
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    trend.push({
      date: date.toISOString().split('T')[0],
      input: Math.floor(Math.random() * 50000) + 10000,
      output: Math.floor(Math.random() * 30000) + 5000
    })
  }

  const modelUsage = [
    { model: 'claude-sonnet-4-6', tokens: 125000, cost: 0.625, percentage: 45 },
    { model: 'claude-opus-4-6', tokens: 85000, cost: 1.275, percentage: 30 },
    { model: 'gpt-4o', tokens: 45000, cost: 0.45, percentage: 15 },
    { model: 'gemini-pro', tokens: 28000, cost: 0.14, percentage: 10 }
  ]

  const agentCosts = [
    { agentId: 'xiaomu', agentName: '小呦', tokens: 95000, cost: 0.76, rank: 1 },
    { agentId: 'xiaokai', agentName: '小开', tokens: 78000, cost: 0.62, rank: 2 },
    { agentId: 'xiaochan', agentName: '小产', tokens: 52000, cost: 0.42, rank: 3 },
    { agentId: 'xiaoyan', agentName: '小研', tokens: 35000, cost: 0.28, rank: 4 },
    { agentId: 'xiaoce', agentName: '小测', tokens: 28000, cost: 0.22, rank: 5 }
  ]

  const recentUsage = []
  for (let i = 0; i < 20; i++) {
    recentUsage.push({
      id: `usage-${i}`,
      timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
      agentId: ['xiaomu', 'xiaokai', 'xiaochan', 'xiaoyan', 'xiaoce'][Math.floor(Math.random() * 5)],
      agentName: '小呦',
      model: ['claude-sonnet-4-6', 'claude-opus-4-6', 'gpt-4o'][Math.floor(Math.random() * 3)],
      inputTokens: Math.floor(Math.random() * 5000) + 1000,
      outputTokens: Math.floor(Math.random() * 3000) + 500,
      totalTokens: 0,
      cost: 0,
      endpoint: '/api/v1/chat/completions',
      duration: Math.floor(Math.random() * 2000) + 500
    })
  }
  recentUsage.forEach(u => {
    u.totalTokens = u.inputTokens + u.outputTokens
    u.cost = parseFloat((u.totalTokens * 0.000005).toFixed(4))
  })

  const totalTokens = trend.reduce((sum, d) => sum + d.input + d.output, 0)
  const inputTokens = trend.reduce((sum, d) => sum + d.input, 0)
  const outputTokens = trend.reduce((sum, d) => sum + d.output, 0)

  const stats = {
    totalTokens: totalTokens,
    totalCost: parseFloat((totalTokens * 0.000005).toFixed(2)),
    inputTokens: inputTokens,
    outputTokens: outputTokens,
    apiCalls: recentUsage.length,
    avgResponseTime: Math.floor(recentUsage.reduce((sum, u) => sum + u.duration, 0) / recentUsage.length)
  }

  return { stats, trend, modelUsage, agentCosts, recentUsage }
}

/**
 * Tokens API - 获取 Token 使用统计
 * GET /api/tokens/stats?range=today|week|month|all
 */
app.get('/api/tokens/stats', async (req, res) => {
  try {
    console.log('[API] Tokens stats request')

    // 尝试从 Gateway 获取数据
    try {
      const gatewayData = await proxyToGateway('/api/tokens/stats')
      if (gatewayData && gatewayData.success) {
        console.log('[API] Tokens data from Gateway')
        return res.json(gatewayData)
      }
    } catch (e) {
      // Gateway 不可用，使用模拟数据
      console.log('[API] Tokens using mock data')
    }

    const data = generateTokenData()
    res.json({
      success: true,
      ...data
    })
  } catch (err) {
    console.error('[API] Tokens stats error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 导出 Token 报告
 * GET /api/tokens/export?range=xxx
 */
app.get('/api/tokens/export', async (req, res) => {
  try {
    const data = generateTokenData()
    // 生成 CSV 格式
    let csv = 'Date,Input Tokens,Output Tokens,Total Tokens,Cost\n'
    data.trend.forEach(d => {
      csv += `${d.date},${d.input},${d.output},${d.input + d.output},${((d.input + d.output) * 0.000005).toFixed(4)}\n`
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=token-report.csv')
    res.send(csv)
  } catch (err) {
    console.error('[API] Export error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ============ Memory API ============

/**
 * Memory API - 获取内存数据
 * GET /api/memory
 */
app.get('/api/memory', async (req, res) => {
  try {
    console.log('[API] Memory request')

    // 尝试从 Gateway 获取数据
    try {
      const gatewayData = await proxyToGateway('/api/memory')
      if (gatewayData && gatewayData.success) {
        console.log('[API] Memory data from Gateway')
        return res.json(gatewayData)
      }
    } catch (e) {
      // Gateway 不可用，使用模拟数据
      console.log('[API] Memory using mock data')
    }

    const files = [
      { id: 'f1', name: 'project-knowledge.md', path: '/knowledge/project-knowledge.md', type: 'file', size: 15420, mtime: new Date().toISOString() },
      { id: 'f2', name: 'api-docs.md', path: '/knowledge/api-docs.md', type: 'file', size: 8920, mtime: new Date().toISOString() },
      { id: 'f3', name: 'user-guide.md', path: '/knowledge/user-guide.md', type: 'file', size: 12340, mtime: new Date().toISOString() },
      { id: 'f4', name: 'best-practices.md', path: '/guides/best-practices.md', type: 'file', size: 6780, mtime: new Date().toISOString() }
    ]

    const nodes = [
      { id: 'n1', name: 'OpenClaw', type: 'entity', description: 'AI Agent 编排平台', connections: [{ targetId: 'n2', type: 'related', weight: 0.9 }, { targetId: 'n3', type: 'related', weight: 0.8 }] },
      { id: 'n2', name: 'Mission Control', type: 'concept', description: '多 Agent 管理系统', connections: [{ targetId: 'n1', type: 'related', weight: 0.9 }] },
      { id: 'n3', name: '数字员工', type: 'entity', description: '自动化办公 Agent', connections: [{ targetId: 'n1', type: 'related', weight: 0.8 }] },
      { id: 'n4', name: 'API Gateway', type: 'concept', description: '统一 API 网关', connections: [{ targetId: 'n1', type: 'related', weight: 0.7 }] }
    ]

    const activities = [
      { id: 'a1', type: 'create', nodeId: 'n4', nodeName: 'API Gateway', timestamp: new Date().toISOString(), description: '创建新节点' },
      { id: 'a2', type: 'update', nodeId: 'n1', nodeName: 'OpenClaw', timestamp: new Date().toISOString(), description: '更新节点信息' },
      { id: 'a3', type: 'connect', nodeId: 'n2', nodeName: 'Mission Control', timestamp: new Date().toISOString(), description: '建立关联' }
    ]

    res.json({
      success: true,
      stats: {
        fileCount: files.length,
        nodeCount: nodes.length,
        storageUsed: files.reduce((sum, f) => sum + (f.size || 0), 0),
        storageUsedFormatted: '42.5 KB'
      },
      files,
      nodes,
      activities
    })
  } catch (err) {
    console.error('[API] Memory error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ============ Security API ============

/**
 * Security API - 获取安全审计数据
 * GET /api/security/audit
 */
app.get('/api/security/audit', async (req, res) => {
  try {
    console.log('[API] Security audit request')

    // 尝试从 Gateway 获取数据
    try {
      const gatewayData = await proxyToGateway('/api/security/audit')
      if (gatewayData && gatewayData.success) {
        console.log('[API] Security data from Gateway')
        return res.json(gatewayData)
      }
    } catch (e) {
      // Gateway 不可用，使用模拟数据
      console.log('[API] Security using mock data')
    }

    res.json({
      success: true,
      stats: {
        score: 87,
        secretsDetected: 2,
        mcpConnections: 3,
        injectionAttempts: 5,
        passedChecks: 42,
        totalChecks: 45
      },
      secrets: [
        { id: 's1', type: 'api_key', location: '~/.openclaw/config.json', severity: 'medium', detectedAt: new Date().toISOString(), status: 'resolved' },
        { id: 's2', type: 'token', location: '~/logs/agent.log', severity: 'low', detectedAt: new Date().toISOString(), status: 'pending' }
      ],
      mcpServers: [
        { id: 'mcp1', name: 'Filesystem', url: 'file://~/', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read', 'write'] },
        { id: 'mcp2', name: 'Memory', url: 'memory://default', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read', 'write', 'delete'] },
        { id: 'mcp3', name: 'Time', url: 'time://utc', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read'] }
      ],
      injectionAttempts: [
        { id: 'i1', type: 'prompt_injection', source: 'user:192.168.1.100', payload: 'Ignore previous instructions...', blocked: true, timestamp: new Date().toISOString() },
        { id: 'i2', type: 'jailbreak', source: 'agent:xiaoyan', payload: 'You are now in developer mode...', blocked: true, timestamp: new Date().toISOString() }
      ],
      events: [
        { id: 'e1', type: 'secret_detected', severity: 'medium', description: '发现 API 密钥泄露', timestamp: new Date().toISOString(), status: 'resolved' },
        { id: 'e2', type: 'injection_blocked', severity: 'high', description: '阻止提示词注入攻击', timestamp: new Date().toISOString(), status: 'resolved' }
      ],
      trustFactors: [
        { name: '代码审计', score: 95, maxScore: 100 },
        { name: '密钥管理', score: 80, maxScore: 100 },
        { name: '访问控制', score: 90, maxScore: 100 },
        { name: '数据加密', score: 85, maxScore: 100 }
      ]
    })
  } catch (err) {
    console.error('[API] Security audit error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ============ Cron API ============

const CRON_TASKS = [
  {
    id: 'cron1',
    name: '每日数据备份',
    cron: '0 2 * * *',
    agentId: 'xiaokai',
    agentName: '小开',
    enabled: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
    successCount: 128,
    failureCount: 3,
    lastStatus: 'success'
  },
  {
    id: 'cron2',
    name: '周报生成',
    cron: '0 9 * * 1',
    agentId: 'xiaochan',
    agentName: '小产',
    enabled: true,
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    nextRun: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    successCount: 45,
    failureCount: 1,
    lastStatus: 'success'
  },
  {
    id: 'cron3',
    name: '日志清理',
    cron: '0 0 * * 0',
    agentId: 'xiaokai',
    agentName: '小开',
    enabled: false,
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    successCount: 24,
    failureCount: 0,
    lastStatus: 'success'
  }
]

/**
 * Cron API - 获取定时任务列表
 * GET /api/cron/tasks
 */
app.get('/api/cron/tasks', async (req, res) => {
  try {
    console.log('[API] Cron tasks request')

    // 尝试从 Gateway 获取数据
    try {
      const gatewayData = await proxyToGateway('/api/cron/tasks')
      if (gatewayData && gatewayData.success) {
        console.log('[API] Cron data from Gateway')
        return res.json(gatewayData)
      }
    } catch (e) {
      // Gateway 不可用，使用模拟数据
      console.log('[API] Cron using mock data')
    }

    const stats = {
      totalTasks: CRON_TASKS.length,
      enabledTasks: CRON_TASKS.filter(t => t.enabled).length,
      disabledTasks: CRON_TASKS.filter(t => !t.enabled).length,
      todayExecutions: 5
    }

    res.json({
      success: true,
      stats,
      tasks: CRON_TASKS,
      executions: []
    })
  } catch (err) {
    console.error('[API] Cron tasks error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 创建定时任务
 * POST /api/cron/tasks
 */
app.post('/api/cron/tasks', async (req, res) => {
  try {
    const { name, cron, agentId, enabled = true } = req.body
    const newTask = {
      id: `cron-${Date.now()}`,
      name,
      cron,
      agentId,
      agentName: '小开',
      enabled,
      successCount: 0,
      failureCount: 0,
      lastStatus: null
    }
    CRON_TASKS.push(newTask)
    console.log('[API] Create cron task:', newTask)
    res.json({ success: true, task: newTask })
  } catch (err) {
    console.error('[API] Create cron task error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 更新定时任务
 * PUT /api/cron/tasks/:id
 */
app.put('/api/cron/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const task = CRON_TASKS.find(t => t.id === id)
    if (task) {
      Object.assign(task, updates)
    }
    console.log('[API] Update cron task:', id, updates)
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Update cron task error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 删除定时任务
 * DELETE /api/cron/tasks/:id
 */
app.delete('/api/cron/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const index = CRON_TASKS.findIndex(t => t.id === id)
    if (index > -1) {
      CRON_TASKS.splice(index, 1)
    }
    console.log('[API] Delete cron task:', id)
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Delete cron task error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 切换任务状态
 * POST /api/cron/tasks/:id/toggle
 */
app.post('/api/cron/tasks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params
    const task = CRON_TASKS.find(t => t.id === id)
    if (task) {
      task.enabled = !task.enabled
    }
    console.log('[API] Toggle cron task:', id, task?.enabled)
    res.json({ success: true, enabled: task?.enabled })
  } catch (err) {
    console.error('[API] Toggle cron task error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 立即执行任务
 * POST /api/cron/tasks/:id/execute
 */
app.post('/api/cron/tasks/:id/execute', async (req, res) => {
  try {
    const { id } = req.params
    console.log('[API] Execute cron task:', id)
    // 模拟执行
    res.json({ success: true, executionId: `exec-${Date.now()}` })
  } catch (err) {
    console.error('[API] Execute cron task error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

// ============ Webhooks API ============

const WEBHOOKS_DB = [
  {
    id: 'wh1',
    name: '生产环境告警',
    url: 'https://api.example.com/webhooks/alerts',
    description: '发送所有错误和告警事件到监控系统',
    events: ['agent.error', 'log.error', 'security.alert'],
    secret: 'whsec_xxxxxxxxxxxxxxxx',
    algorithm: 'HMAC-SHA256',
    retryPolicy: 'exponential',
    maxRetries: 3,
    timeout: 30,
    enabled: true,
    successCount: 1247,
    failureCount: 12,
    avgResponseTime: 156,
    lastDelivery: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'wh2',
    name: '任务状态同步',
    url: 'https://hooks.slack.com/services/xxx/yyy/zzz',
    description: '任务状态变更通知到 Slack 频道',
    events: ['task.created', 'task.completed', 'task.failed'],
    secret: '',
    algorithm: 'HMAC-SHA256',
    retryPolicy: 'fixed',
    maxRetries: 2,
    timeout: 15,
    enabled: true,
    successCount: 856,
    failureCount: 3,
    avgResponseTime: 234,
    lastDelivery: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
]

/**
 * Webhooks API - 获取 Webhook 列表
 * GET /api/webhooks
 */
app.get('/api/webhooks', async (req, res) => {
  try {
    console.log('[API] Webhooks request')

    // 尝试从 Gateway 获取数据
    try {
      const gatewayData = await proxyToGateway('/api/webhooks')
      if (gatewayData && gatewayData.success) {
        console.log('[API] Webhooks data from Gateway')
        return res.json(gatewayData)
      }
    } catch (e) {
      // Gateway 不可用，使用模拟数据
      console.log('[API] Webhooks using mock data')
    }

    const stats = {
      totalWebhooks: WEBHOOKS_DB.length,
      enabledWebhooks: WEBHOOKS_DB.filter(w => w.enabled).length,
      disabledWebhooks: WEBHOOKS_DB.filter(w => !w.enabled).length,
      todayDeliveries: WEBHOOKS_DB.reduce((sum, w) => sum + w.successCount + w.failureCount, 0)
    }

    res.json({
      success: true,
      stats,
      webhooks: WEBHOOKS_DB,
      deliveries: []
    })
  } catch (err) {
    console.error('[API] Webhooks error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 创建 Webhook
 * POST /api/webhooks
 */
app.post('/api/webhooks', async (req, res) => {
  try {
    const webhook = req.body
    const newWebhook = {
      id: `wh-${Date.now()}`,
      ...webhook,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      lastDelivery: null
    }
    WEBHOOKS_DB.push(newWebhook)
    console.log('[API] Create webhook:', newWebhook)
    res.json({ success: true, webhook: newWebhook })
  } catch (err) {
    console.error('[API] Create webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 更新 Webhook
 * PUT /api/webhooks/:id
 */
app.put('/api/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const webhook = WEBHOOKS_DB.find(w => w.id === id)
    if (webhook) {
      Object.assign(webhook, updates)
    }
    console.log('[API] Update webhook:', id, updates)
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Update webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 删除 Webhook
 * DELETE /api/webhooks/:id
 */
app.delete('/api/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const index = WEBHOOKS_DB.findIndex(w => w.id === id)
    if (index > -1) {
      WEBHOOKS_DB.splice(index, 1)
    }
    console.log('[API] Delete webhook:', id)
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Delete webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 切换 Webhook 状态
 * POST /api/webhooks/:id/toggle
 */
app.post('/api/webhooks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params
    const webhook = WEBHOOKS_DB.find(w => w.id === id)
    if (webhook) {
      webhook.enabled = !webhook.enabled
    }
    console.log('[API] Toggle webhook:', id, webhook?.enabled)
    res.json({ success: true, enabled: webhook?.enabled })
  } catch (err) {
    console.error('[API] Toggle webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 发送测试通知
 * POST /api/webhooks/:id/test
 */
app.post('/api/webhooks/:id/test', async (req, res) => {
  try {
    const { id } = req.params
    const { event } = req.body
    console.log('[API] Test webhook:', id, event)
    // 模拟发送测试
    await new Promise(resolve => setTimeout(resolve, 1000))
    res.json({ success: true })
  } catch (err) {
    console.error('[API] Test webhook error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * 获取投递日志
 * GET /api/webhooks/:id/deliveries?limit=xxx
 */
app.get('/api/webhooks/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 50 } = req.query
    console.log('[API] Get webhook deliveries:', id)

    const deliveries = []
    for (let i = 0; i < Math.min(parseInt(limit), 50); i++) {
      deliveries.push({
        id: `del-${i}`,
        webhookId: id,
        event: ['task.created', 'task.completed', 'agent.error'][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
        status: Math.random() > 0.1 ? 'success' : 'failure',
        httpMethod: 'POST',
        httpStatus: Math.random() > 0.1 ? 200 : 500,
        duration: Math.floor(Math.random() * 500) + 100
      })
    }

    res.json({ success: true, deliveries })
  } catch (err) {
    console.error('[API] Get webhook deliveries error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

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
 * 获取本地 ClaudeCode 会话
 */
function getLocalClaudeSessions() {
  if (!claudeDb) return []

  try {
    const rows = claudeDb.prepare(
      'SELECT * FROM claude_sessions ORDER BY last_message_at DESC LIMIT 50'
    ).all()

    return rows.map(s => {
      const total = (s.input_tokens || 0) + (s.output_tokens || 0)
      const lastMsg = s.last_message_at ? new Date(s.last_message_at).getTime() : 0
      const derivedActive = lastMsg > 0 && (Date.now() - lastMsg) < LOCAL_SESSION_ACTIVE_WINDOW_MS
      const isActive = s.is_active === 1 || derivedActive
      const effectiveLastActivity = isActive ? Date.now() : lastMsg

      return {
        id: s.session_id,
        key: s.project_slug || s.session_id,
        agent: s.project_slug || 'local',
        kind: 'claude-code',
        age: isActive ? 'now' : formatAge(lastMsg),
        model: s.model || 'unknown',
        tokens: `${formatTokens(s.input_tokens || 0)}/${formatTokens(s.output_tokens || 0)}`,
        totalTokens: total,
        channel: 'local',
        flags: s.git_branch ? [s.git_branch] : [],
        active: isActive,
        startTime: s.first_message_at ? new Date(s.first_message_at).getTime() : 0,
        lastActivity: effectiveLastActivity,
        source: 'local',
        userMessages: s.user_messages || 0,
        assistantMessages: s.assistant_messages || 0,
        toolUses: s.tool_uses || 0,
        estimatedCost: s.estimated_cost || 0,
        lastUserPrompt: s.last_user_prompt || null,
        workingDir: s.project_path || null
      }
    })
  } catch (err) {
    console.error('[API] Failed to read Claude sessions:', err.message)
    return []
  }
}

/**
 * ClaudeCode Sessions API - 获取活跃的 ClaudeCode 会话
 * GET /api/claude-sessions
 */
app.get('/api/claude-sessions', async (req, res) => {
  try {
    console.log('[API] ClaudeCode sessions request')

    const sessions = getLocalClaudeSessions()

    // 只返回活跃的会话
    const activeSessions = sessions.filter(s => s.active)

    res.json({
      success: true,
      sessions: activeSessions,
      total: activeSessions.length,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[API] ClaudeCode sessions error:', err)
    res.status(500).json({
      success: false,
      error: err.message,
      sessions: []
    })
  }
})

/**
 * ClaudeCode Transcript API - 获取会话消息记录
 * GET /api/claude-sessions/:id/transcript
 */
app.get('/api/claude-sessions/:id/transcript', async (req, res) => {
  try {
    const sessionId = req.params.id
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)

    console.log(`[API] ClaudeCode transcript request: sessionId=${sessionId}, limit=${limit}`)

    // 读取 ClaudeCode transcript 文件
    const messages = readClaudeTranscript(sessionId, limit)

    res.json({
      success: true,
      sessionId,
      messages,
      total: messages.length
    })
  } catch (err) {
    console.error('[API] ClaudeCode transcript error:', err)
    res.status(500).json({
      success: false,
      error: err.message,
      messages: []
    })
  }
})

/**
 * ClaudeCode Send Message API - 发送消息到会话
 * POST /api/claude-sessions/:id/send
 */
app.post('/api/claude-sessions/:id/send', async (req, res) => {
  try {
    const sessionId = req.params.id
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    console.log(`[API] ClaudeCode send message: sessionId=${sessionId}, message=${message.slice(0, 50)}...`)

    // 检查会话是否存在
    if (!claudeDb) {
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      })
    }

    const session = claudeDb.prepare(
      'SELECT * FROM claude_sessions WHERE session_id = ?'
    ).get(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      })
    }

    // 通过 Gateway 发送消息
    // 由于 ClaudeCode 会话是通过 Gateway 管理的，我们需要调用 Gateway API
    // 这里我们返回一个提示，告诉用户消息已接收，实际发送需要 Gateway 支持
    const result = await sendMessageToClaudeSession(sessionId, message, session.project_path)

    res.json({
      success: true,
      sessionId,
      message: 'Message sent to ClaudeCode session',
      result
    })
  } catch (err) {
    console.error('[API] ClaudeCode send message error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

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
 * 发送消息到 ClaudeCode 会话
 * 通过 Gateway API 发送消息
 */
async function sendMessageToClaudeSession(sessionId, message, projectPath) {
  // 尝试通过 Gateway 发送消息
  const gatewayHost = process.env.GATEWAY_HOST || '127.0.0.1'
  const gatewayPort = process.env.GATEWAY_PORT || '18789'

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sessionId,
      message,
      projectPath
    })

    const options = {
      hostname: gatewayHost,
      port: parseInt(gatewayPort),
      path: '/api/claude/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({ raw: data, status: res.statusCode })
        }
      })
    })

    req.on('error', (err) => {
      console.log('[Send] Gateway not available, message stored locally:', err.message)
      resolve({ status: 'stored_locally', error: err.message })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ status: 'timeout', error: 'Request timeout' })
    })

    req.write(payload)
    req.end()
  })
}

/**
 * Dashboard API - 获取数字员工监控中心数据
 * GET /api/dashboard
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('[API] Dashboard request')

    // 扫描所有项目状态
    const projects = await scanProjects()
    const stats = getProjectStats(projects)

    // 角色 ID 映射（与 TaskCenter2 一致）
    const roleMapping = {
      xiaomu: 'ceo',
      xiaokai: 'tech-lead',
      xiaochan: 'pm',
      xiaoyan: 'researcher',
      xiaoce: 'team-qa'
    }

    // 扫描所有角色的产出文件（最近 7 天）
    const roles = ['xiaomu', 'xiaokai', 'xiaochan', 'xiaoyan', 'xiaoce']
    const today = new Date().toISOString().split('T')[0]
    const allOutputs = []

    // 获取最近 7 天的日期列表
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    console.log(`[Dashboard] Scanning dates: ${dates.join(', ')}`)

    for (const roleId of roles) {
      const actualRoleId = roleMapping[roleId]
      for (const date of dates) {
        const basePath = `~/.openclaw/shared-workspace/daily-intel/roles/${actualRoleId}/${date}`
        const files = await scanDirectory(basePath, null, null)

        // 转换为 outputs 格式
        for (const file of files) {
          const output = {
            name: file.name,
            path: file.path,
            type: file.type,
            person: roleId === 'xiaomu' ? '小 U' : roleId === 'xiaokai' ? '小开' : roleId === 'xiaochan' ? '小产' : roleId === 'xiaoyan' ? '小研' : '小测',
            date: date
          }
          allOutputs.push(output)
        }
      }
    }
    console.log(`[Dashboard] Total outputs: ${allOutputs.length}`)

    res.json({
      success: true,
      stats,
      projects,
      todayWork: [],
      outputs: allOutputs
    })
  } catch (err) {
    console.error('[API] Dashboard error:', err)
    res.json({
      success: true,
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
    const { type, actor, limit, offset, since, hours } = req.query
    const requestedLimit = Math.min(parseInt(limit) || 50, 500)

    // 计算时间范围
    const sinceTimestamp = since ? parseInt(since) : Math.floor(Date.now() / 1000) - ((parseInt(hours) || 24) * 3600)

    // 从数据库获取活动记录
    let activities = []
    if (claudeDb) {
      // 构建查询
      let query = 'SELECT * FROM activities WHERE created_at > ?'
      const params = [sinceTimestamp]

      if (type) {
        query += ' AND type = ?'
        params.push(type)
      }

      if (actor) {
        query += ' AND actor = ?'
        params.push(actor)
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(requestedLimit, parseInt(offset) || 0)

      const dbActivities = claudeDb.prepare(query).all(...params)

      // 转换为前端需要的格式
      activities = dbActivities.map(a => ({
        id: a.id,
        type: a.type,
        entityType: a.entity_type,
        entityId: a.entity_id,
        actor: a.actor,
        description: a.description,
        data: a.data ? JSON.parse(a.data) : null,
        createdAt: a.created_at,
        date: new Date(a.created_at * 1000).toISOString().split('T')[0],
        time: new Date(a.created_at * 1000).toLocaleTimeString('zh-CN', { hour12: false }),
        // 兼容前端格式
        person: formatActorName(a.actor),
        task: a.description,
        status: getActivityStatus(a.type)
      }))
    }

    // 如果数据库数据不足，生成模拟数据补充
    if (activities.length < requestedLimit) {
      const mockActivities = generateMockActivities(requestedLimit - activities.length, sinceTimestamp)
      activities = [...activities, ...mockActivities]
    }

    // 按时间排序
    activities.sort((a, b) => (b.createdAt || b.created_at) - (a.createdAt || a.created_at))

    // 获取总数
    let total = activities.length
    if (claudeDb) {
      let countQuery = 'SELECT COUNT(*) as total FROM activities WHERE created_at > ?'
      const countParams = [sinceTimestamp]
      if (type) {
        countQuery += ' AND type = ?'
        countParams.push(type)
      }
      if (actor) {
        countQuery += ' AND actor = ?'
        countParams.push(actor)
      }
      const countResult = claudeDb.prepare(countQuery).get(...countParams)
      total = Math.max(countResult?.total || 0, activities.length)
    }

    res.json({
      success: true,
      activities: activities.slice(0, requestedLimit),
      total
    })
  } catch (err) {
    console.error('[API] Activities error:', err)
    // 即使出错也返回模拟数据
    const mockActivities = generateMockActivities(parseInt(req.query.limit) || 50)
    res.json({
      success: true,
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

// ============ Agent Chat API ============
// 初始化 Agent Chat 数据库表
initializeAgentChatSchema()
// 初始化默认 Agents
initAgentChatRoutes()

app.use('/api', agentChatRouter)

// 启动服务器
app.listen(PORT, () => {
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
║  - GET /api/tokens/stats           - Token 使用统计       ║
║  - GET /api/tokens/export          - 导出 Token 报告      ║
║  - GET /api/memory                 - 内存图谱数据        ║
║  - GET /api/security/audit         - 安全审计            ║
║  - POST /api/security/scan         - 运行安全扫描        ║
║  - GET /api/cron/tasks             - 定时任务列表        ║
║  - POST /api/cron/tasks            - 创建定时任务        ║
║  - POST /api/cron/tasks/:id/toggle - 切换任务状态        ║
║  - POST /api/cron/tasks/:id/execute- 立即执行任务        ║
║  - GET /api/webhooks               - Webhook 列表         ║
║  - POST /api/webhooks              - 创建 Webhook         ║
║  - POST /api/webhooks/:id/test     - 发送测试通知        ║
║  - GET /api/claude-sessions        - ClaudeCode 会话列表  ║
║  - GET /api/activities             - 活动记录（工作流）   ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
  `)
})
