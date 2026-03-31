/**
 * Skills API Routes
 * 基于 Mission Control 架构的技能管理 API
 */

import { Router } from 'express'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getDatabase, initializeSchema } from '../db/index.js'
import { syncSkillsFromDisk, getSkillsFromDB, upsertSkill, deleteSkill } from '../skills/skill-sync.js'
import { checkSkillSecurity, formatSecurityReport } from '../skills/security-scan.js'
import { searchRegistries, installFromRegistry } from '../skills/skill-registry.js'

const router = Router()

// 初始化数据库 schema
initializeSchema()

// 启动时执行首次同步
syncSkillsFromDisk().then(result => {
  console.log('[Skills] Initial sync:', result.message)
}).catch(err => {
  console.error('[Skills] Initial sync failed:', err.message)
})

/**
 * 获取技能根目录
 */
function getSkillRoots() {
  const home = homedir()
  const cwd = process.cwd()
  const openclawState = process.env.OPENCLAW_STATE_DIR || process.env.OPENCLAW_HOME || join(home, '.openclaw')

  return [
    { source: 'user-agents', path: process.env.MC_SKILLS_USER_AGENTS_DIR || join(home, '.agents', 'skills') },
    { source: 'user-codex', path: process.env.MC_SKILLS_USER_CODEX_DIR || join(home, '.codex', 'skills') },
    { source: 'project-agents', path: process.env.MC_SKILLS_PROJECT_AGENTS_DIR || join(cwd, '.agents', 'skills') },
    { source: 'project-codex', path: process.env.MC_SKILLS_PROJECT_CODEX_DIR || join(cwd, '.codex', 'skills') },
    { source: 'openclaw', path: process.env.MC_SKILLS_OPENCLAW_DIR || join(openclawState, 'skills') },
    { source: 'workspace', path: process.env.MC_SKILLS_WORKSPACE_DIR || join(process.env.OPENCLAW_WORKSPACE_DIR || process.env.MISSION_CONTROL_WORKSPACE_DIR || join(openclawState, 'workspace'), 'skills') }
  ]
}

/**
 * 将 Mission Control 格式转换为前端格式
 */
function convertSkillFormat(skill) {
  // 从 source 推断 category
  const categoryMap = {
    'user-agents': 'tool',
    'user-codex': 'tool',
    'project-agents': 'automation',
    'project-codex': 'automation',
    'openclaw': 'tool',
    'workspace': 'analysis'
  }

  // 从 source 推断 icon
  const iconMap = {
    'user-agents': '🔧',
    'user-codex': '📚',
    'project-agents': '⚙️',
    'project-codex': '📖',
    'openclaw': '🔌',
    'workspace': '💼'
  }

  // 从 security_status 推断 securityScan
  const securityMap = {
    'clean': 'safe',
    'warning': 'warning',
    'rejected': 'danger',
    'unchecked': 'pending'
  }

  const securityStatus = securityMap[skill.security_status] || 'pending'

  return {
    id: skill.id || `${skill.source}:${skill.name}`,
    name: skill.name,
    author: 'Local',
    version: '1.0.0',
    description: skill.description || '暂无描述',
    icon: iconMap[skill.source] || '📦',
    category: categoryMap[skill.source] || 'tool',
    downloads: 0,
    rating: 0,
    installed: true,
    updateAvailable: false,
    securityScan: { status: securityStatus },
    // 扩展字段
    source: skill.source,
    path: skill.path,
    content_hash: skill.content_hash,
    registry_slug: skill.registry_slug,
    security_status: skill.security_status
  }
}

/**
 * GET /api/skills
 * 获取技能列表
 */
router.get('/', async (req, res) => {
  try {
    console.log('[API] Skills request')

    const { mode, source, name } = req.query

    // 获取具体内容模式
    if (mode === 'content' && source && name) {
      const { readFile } = await import('node:fs/promises')
      const roots = getSkillRoots()
      const root = roots.find(r => r.source === source)

      if (!root) {
        return res.status(400).json({ success: false, error: '无效的技能来源' })
      }

      const skillDocPath = join(root.path, name, 'SKILL.md')
      try {
        const content = await readFile(skillDocPath, 'utf8')
        const security = checkSkillSecurity(content)

        // 更新 DB 中的安全状态
        try {
          const db = getDatabase()
          db.prepare('UPDATE skills SET security_status = ?, updated_at = ? WHERE source = ? AND name = ?')
            .run(security.status, new Date().toISOString(), source, name)
        } catch (e) {
          // DB 可能未就绪
        }

        return res.json({
          success: true,
          source,
          name,
          skillPath: join(root.path, name),
          skillDocPath,
          content,
          security: formatSecurityReport(security)
        })
      } catch (e) {
        return res.status(404).json({ success: false, error: 'SKILL.md 不存在' })
      }
    }

    // 安全检查模式
    if (mode === 'check' && source && name) {
      const { readFile } = await import('node:fs/promises')
      const roots = getSkillRoots()
      const root = roots.find(r => r.source === source)

      if (!root) {
        return res.status(400).json({ success: false, error: '无效的技能来源' })
      }

      const skillDocPath = join(root.path, name, 'SKILL.md')
      try {
        const content = await readFile(skillDocPath, 'utf8')
        const security = checkSkillSecurity(content)

        return res.json({
          success: true,
          source,
          name,
          security: formatSecurityReport(security)
        })
      } catch (e) {
        return res.status(404).json({ success: false, error: 'SKILL.md 不存在' })
      }
    }

    // 先尝试同步磁盘技能
    await syncSkillsFromDisk()

    // 从 DB 获取技能
    let dbSkills = getSkillsFromDB()

    // 如果 DB 为空，回退到模拟数据
    if (!dbSkills || dbSkills.length === 0) {
      console.log('[API] Skills DB empty, using mock data')
      return res.json({
        success: true,
        skills: [],
        groups: [],
        total: 0
      })
    }

    // 转换为前端格式
    const skills = dbSkills.map(convertSkillFormat)

    // 按 source 分组
    const groups = new Map()
    const roots = getSkillRoots()
    for (const root of roots) {
      groups.set(root.source, { source: root.source, path: root.path, skills: [] })
    }
    for (const skill of dbSkills) {
      if (!groups.has(skill.source) && skill.source.startsWith('workspace-')) {
        groups.set(skill.source, { source: skill.source, path: '', skills: [] })
      }
      const group = groups.get(skill.source)
      if (group) group.skills.push(skill)
    }

    // 去重（同名技能只保留一个）
    const deduped = new Map()
    for (const skill of dbSkills) {
      if (!deduped.has(skill.name)) {
        deduped.set(skill.name, skill)
      }
    }

    const finalSkills = Array.from(deduped.values())
      .map(convertSkillFormat)
      .sort((a, b) => a.name.localeCompare(b.name))

    res.json({
      success: true,
      skills: finalSkills,
      groups: Array.from(groups.values()),
      total: finalSkills.length
    })
  } catch (err) {
    console.error('[API] Skills error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * POST /api/skills
 * 创建新技能
 */
router.post('/', async (req, res) => {
  try {
    const { source, name, content } = req.body

    if (!source || !name) {
      return res.status(400).json({
        success: false,
        error: '需要提供 source 和 name'
      })
    }

    const skillName = name.trim()
    if (!skillName || !/^[a-zA-Z0-9._-]+$/.test(skillName)) {
      return res.status(400).json({
        success: false,
        error: '技能名称只能包含字母、数字、点、下划线和连字符'
      })
    }

    const skillContent = content?.trim() || `# ${skillName}\n\n描述这个技能。\n`

    const { skillPath, skillDocPath } = await upsertSkill(source, skillName, skillContent)

    res.json({
      success: true,
      source,
      name: skillName,
      skillPath,
      skillDocPath
    })
  } catch (err) {
    console.error('[API] Create skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * PUT /api/skills
 * 更新技能内容
 */
router.put('/', async (req, res) => {
  try {
    const { source, name, content } = req.body

    if (!source || !name || content == null) {
      return res.status(400).json({
        success: false,
        error: '需要提供 source, name 和 content'
      })
    }

    const skillName = name.trim()
    if (!skillName || !/^[a-zA-Z0-9._-]+$/.test(skillName)) {
      return res.status(400).json({
        success: false,
        error: '技能名称只能包含字母、数字、点、下划线和连字符'
      })
    }

    const { skillPath, skillDocPath } = await upsertSkill(source, skillName, content)

    res.json({
      success: true,
      source,
      name: skillName,
      skillPath,
      skillDocPath
    })
  } catch (err) {
    console.error('[API] Update skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * DELETE /api/skills
 * 删除技能
 */
router.delete('/', async (req, res) => {
  try {
    const { source, name } = req.query

    if (!source || !name) {
      return res.status(400).json({
        success: false,
        error: '需要提供 source 和 name'
      })
    }

    const { skillPath } = await deleteSkill(source, name)

    res.json({
      success: true,
      source,
      name,
      skillPath
    })
  } catch (err) {
    console.error('[API] Delete skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * POST /api/skills/install
 * 安装技能（支持 URL 和 registry）
 */
router.post('/install', async (req, res) => {
  try {
    const { id, url, registry } = req.body

    console.log('[API] Install skill:', id || url || registry?.slug)

    // Registry 安装
    if (registry?.source && registry?.slug) {
      const roots = getSkillRoots()
      const targetRoot = roots.find(r => r.source === 'openclaw')?.path || join(homedir(), '.openclaw', 'skills')

      const result = await installFromRegistry({
        source: registry.source,
        slug: registry.slug,
        targetRoot
      })

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          error: result.message
        })
      }

      // 同步到 DB
      await syncSkillsFromDisk()

      return res.json({
        success: true,
        message: result.message,
        securityReport: result.securityReport
      })
    }

    // URL 安装
    if (url) {
      const { fetch } = await import('node-fetch')
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`下载失败：${response.status}`)
      }
      const content = await response.text()

      // 安全扫描
      const security = checkSkillSecurity(content)
      if (security.status === 'rejected') {
        return res.status(400).json({
          success: false,
          error: `安全扫描拒绝：${security.issues.length} 个严重问题`
        })
      }

      const skillName = url.split('/').pop() || `custom-${Date.now()}`
      const roots = getSkillRoots()
      const targetRoot = roots.find(r => r.source === 'openclaw')?.path || join(homedir(), '.openclaw', 'skills')

      const { skillPath, skillDocPath } = await upsertSkill('openclaw', skillName, content)

      return res.json({
        success: true,
        skillPath,
        skillDocPath,
        security: formatSecurityReport(security)
      })
    }

    // 本地安装（标记为已安装）
    if (id) {
      const db = getDatabase()
      const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id)

      if (!skill) {
        return res.status(404).json({
          success: false,
          error: '技能不存在'
        })
      }

      // 技能已经在磁盘上，只需标记
      return res.json({
        success: true,
        message: '技能已安装'
      })
    }

    res.status(400).json({
      success: false,
      error: '需要提供 id, url 或 registry 参数'
    })
  } catch (err) {
    console.error('[API] Install skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * POST /api/skills/:id/update
 * 更新技能
 */
router.post('/:id/update', async (req, res) => {
  try {
    const { id } = req.params
    console.log('[API] Update skill:', id)

    const db = getDatabase()
    const skill = db.prepare('SELECT * FROM skills WHERE id = ? OR (source = ? AND name = ?)').get(id, id.split(':')[0], id.split(':')[1])

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: '技能不存在'
      })
    }

    // 从 registry 更新
    if (skill.registry_slug) {
      const result = await installFromRegistry({
        source: 'clawhub', // 默认从 clawhub 更新
        slug: skill.registry_slug,
        targetRoot: skill.path
      })

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          error: result.message
        })
      }

      await syncSkillsFromDisk()

      return res.json({
        success: true,
        message: '技能已更新'
      })
    }

    res.json({
      success: true,
      message: '技能已是最新版本'
    })
  } catch (err) {
    console.error('[API] Update skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * DELETE /api/skills/:id
 * 卸载技能
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log('[API] Uninstall skill:', id)

    const db = getDatabase()
    const skill = db.prepare('SELECT * FROM skills WHERE id = ? OR (source = ? AND name = ?)').get(id, id.split(':')[0], id.split(':')[1])

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: '技能不存在'
      })
    }

    await deleteSkill(skill.source, skill.name)

    res.json({
      success: true,
      message: '技能已卸载'
    })
  } catch (err) {
    console.error('[API] Uninstall skill error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * GET /api/skills/registry/search
 * 搜索注册表
 */
router.get('/registry/search', async (req, res) => {
  try {
    const { q } = req.query
    const results = await searchRegistries(q || '')

    res.json({
      success: true,
      registries: results
    })
  } catch (err) {
    console.error('[API] Registry search error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

/**
 * POST /api/skills/registry/install
 * 从注册表安装
 */
router.post('/registry/install', async (req, res) => {
  try {
    const { source, slug, targetRoot } = req.body

    if (!source || !slug) {
      return res.status(400).json({
        success: false,
        error: '需要提供 source 和 slug'
      })
    }

    const roots = getSkillRoots()
    const root = targetRoot
      ? { source: 'custom', path: targetRoot }
      : roots.find(r => r.source === 'openclaw')

    if (!root) {
      return res.status(400).json({
        success: false,
        error: '无效的目标目录'
      })
    }

    const result = await installFromRegistry({
      source,
      slug,
      targetRoot: root.path
    })

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: result.message
      })
    }

    // 同步到 DB
    await syncSkillsFromDisk()

    res.json({
      success: true,
      ...result
    })
  } catch (err) {
    console.error('[API] Registry install error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})

export default router
