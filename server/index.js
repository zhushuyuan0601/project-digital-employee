/**
 * 文件扫描 API 服务
 * 用于扫描指定目录并返回文件列表
 */

import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 18888

// 中间件
app.use(cors())
app.use(express.json())

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
          leaderRole = leader === '姜昊' ? '小开' : leader === '林桐' ? '小产' : '未知'
        }
        const pmMatch = line.match(/\|\s*产品经理\s*\|\s*([^|]+)\s*\|/)
        if (pmMatch && !teamMembers.find(m => m.role === '产品经理')) {
          teamMembers.push({ role: '产品经理', name: pmMatch[1].trim() })
        }
        const devMatch = line.match(/\|\s*研发工程师\s*\|\s*([^|]+)\s*\|/)
        if (devMatch && !teamMembers.find(m => m.role === '研发工程师')) {
          teamMembers.push({ role: '研发工程师', name: devMatch[1].trim() })
        }
      }

      // 仓库信息章节
      if (currentSection === 'repo') {
        // GitHub 仓库
        const githubMatch = line.match(/\*\*GitHub 仓库\*\*\s*\|\s*`([^`]+)`/)
        if (githubMatch) {
          githubUrl = githubMatch[1]
        }

        // Demo 链接
        const demoMatch = line.match(/\*\*Demo 链接\*\*\s*\|\s*`([^`]+)`/)
        if (demoMatch) {
          demoUrl = demoMatch[1]
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

    currentSection = ''
    for (const line of lines) {
      if (line.startsWith('## ')) {
        inTasksSection = line.includes('任务清单')
        inUpdatesSection = line.includes('最近更新')
        continue
      }

      // 任务清单
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

      // 最近更新
      if (inUpdatesSection) {
        if (line.startsWith('## ')) {
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
      xiaoyan: 'researcher'
    }

    // 扫描所有角色的产出文件（最近 7 天）
    const roles = ['xiaomu', 'xiaokai', 'xiaochan', 'xiaoyan']
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
            person: roleId === 'xiaomu' ? '小 U' : roleId === 'xiaokai' ? '小开' : roleId === 'xiaochan' ? '小产' : '小研',
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          Unicom File Scanner API Server                 ║
║                                                         ║
║  Server running at: http://localhost:${PORT}             ║
║                                                         ║
║  API Endpoints:                                         ║
║  - GET /health                     - 健康检查            ║
║  - GET /api/files/scan?path=xxx    - 扫描目录            ║
║  - GET /api/files/content?path=xxx - 读取文件内容        ║
║  - GET /api/files/role?roleId=xxx  - 获取角色产出文件    ║
║  - GET /api/dashboard              - 数字员工监控中心    ║
║  - GET /api/projects               - 项目看板数据        ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
  `)
})
