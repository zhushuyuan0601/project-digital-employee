/**
 * 技能同步 - 双向 disk ↔ DB 同步
 */

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { getDatabase } from '../db/index.js'

/**
 * SHA-256 哈希计算
 */
function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * 从 SKILL.md 内容提取描述
 * 取第一个非标题段落，最多 220 字符
 */
function extractDescription(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const first = lines.find(l => !l.startsWith('#'))
  if (!first) return undefined
  return first.length > 220 ? `${first.slice(0, 217)}...` : first
}

/**
 * 获取技能根目录列表
 */
function getSkillRoots() {
  const home = homedir()
  const cwd = process.cwd()
  const openclawState = process.env.OPENCLAW_STATE_DIR || process.env.OPENCLAW_HOME || join(home, '.openclaw')

  const roots = [
    { source: 'user-agents', path: process.env.MC_SKILLS_USER_AGENTS_DIR || join(home, '.agents', 'skills') },
    { source: 'user-codex', path: process.env.MC_SKILLS_USER_CODEX_DIR || join(home, '.codex', 'skills') },
    { source: 'project-agents', path: process.env.MC_SKILLS_PROJECT_AGENTS_DIR || join(cwd, '.agents', 'skills') },
    { source: 'project-codex', path: process.env.MC_SKILLS_PROJECT_CODEX_DIR || join(cwd, '.codex', 'skills') },
    { source: 'openclaw', path: process.env.MC_SKILLS_OPENCLAW_DIR || join(openclawState, 'skills') },
    { source: 'workspace', path: process.env.MC_SKILLS_WORKSPACE_DIR || join(process.env.OPENCLAW_WORKSPACE_DIR || process.env.MISSION_CONTROL_WORKSPACE_DIR || join(openclawState, 'workspace'), 'skills') }
  ]

  // 动态扫描 workspace-<agent> 目录
  try {
    const entries = readdirSync(openclawState)
    for (const entry of entries) {
      if (!entry.startsWith('workspace-')) continue
      const skillsDir = join(openclawState, entry, 'skills')
      if (existsSync(skillsDir)) {
        const agentName = entry.replace('workspace-', '')
        roots.push({ source: `workspace-${agentName}`, path: skillsDir })
      }
    }
  } catch (e) {
    // openclawState 可能不存在
  }

  return roots
}

/**
 * 扫描磁盘上的技能
 */
function scanDiskSkills() {
  const skills = []

  for (const root of getSkillRoots()) {
    if (!existsSync(root.path)) continue

    let entries
    try {
      entries = readdirSync(root.path)
    } catch (e) {
      continue
    }

    for (const entry of entries) {
      const skillPath = join(root.path, entry)

      try {
        if (!statSync(skillPath).isDirectory()) continue
      } catch (e) {
        continue
      }

      const skillDoc = join(skillPath, 'SKILL.md')
      if (!existsSync(skillDoc)) continue

      try {
        const content = readFileSync(skillDoc, 'utf8')
        skills.push({
          name: entry,
          source: root.source,
          path: skillPath,
          description: extractDescription(content),
          contentHash: sha256(content)
        })
      } catch (e) {
        // 无法读取，跳过
      }
    }
  }

  return skills
}

/**
 * 从磁盘同步技能到数据库
 */
export async function syncSkillsFromDisk() {
  try {
    const db = getDatabase()
    const diskSkills = scanDiskSkills()
    const now = new Date().toISOString()

    // 构建磁盘技能查找表
    const diskMap = new Map()
    for (const s of diskSkills) {
      diskMap.set(`${s.source}:${s.name}`, s)
    }

    // 从 DB 加载现有技能（仅本地来源，不包括 registry 安装的）
    const localSources = ['user-agents', 'user-codex', 'project-agents', 'project-codex', 'openclaw', 'workspace']
    // 添加动态 workspace-* 来源
    for (const s of diskSkills) {
      if (s.source.startsWith('workspace-') && !localSources.includes(s.source)) {
        localSources.push(s.source)
      }
    }

    const placeholders = localSources.map(() => '?').join(',')
    const dbRows = db.prepare(
      `SELECT * FROM skills WHERE source IN (${placeholders})`
    ).all(...localSources)

    const dbMap = new Map()
    for (const r of dbRows) {
      dbMap.set(`${r.source}:${r.name}`, r)
    }

    let created = 0
    let updated = 0
    let deleted = 0

    const insertStmt = db.prepare(`
      INSERT INTO skills (name, source, path, description, content_hash, installed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const updateStmt = db.prepare(`
      UPDATE skills SET path = ?, description = ?, content_hash = ?, updated_at = ?
      WHERE source = ? AND name = ?
    `)

    const deleteStmt = db.prepare(`DELETE FROM skills WHERE source = ? AND name = ?`)

    db.transaction(() => {
      // Disk → DB: 新增和变更
      for (const [key, disk] of diskMap) {
        const existing = dbMap.get(key)
        if (!existing) {
          insertStmt.run(
            disk.name,
            disk.source,
            disk.path,
            disk.description || null,
            disk.contentHash,
            now,
            now
          )
          created++
        } else if (existing.content_hash !== disk.contentHash) {
          // Disk wins: 磁盘内容自上次同步后发生变化
          updateStmt.run(
            disk.path,
            disk.description || null,
            disk.contentHash,
            now,
            disk.source,
            disk.name
          )
          updated++
        }
      }

      // DB → Disk: 检测删除（仅非 registry 技能）
      for (const [key, row] of dbMap) {
        if (!diskMap.has(key) && !row.registry_slug) {
          // 仅自动删除从磁盘消失的非 registry 技能
          deleteStmt.run(row.source, row.name)
          deleted++
        }
      }
    })()

    const msg = `技能同步：${created} 新增，${updated} 更新，${deleted} 删除（磁盘共 ${diskSkills.length} 个）`
    console.log('[SYNC]', msg)

    return { ok: true, message: msg, created, updated, deleted }
  } catch (err) {
    console.error('[SYNC] 同步失败:', err.message)
    return { ok: false, message: `技能同步失败：${err.message}` }
  }
}

/**
 * 从数据库获取所有技能
 */
export function getSkillsFromDB() {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT name, source, path, description, content_hash, registry_slug, registry_version, security_status, installed_at, updated_at
      FROM skills
      ORDER BY name
    `).all()

    if (rows.length === 0) return null

    return rows.map(r => ({
      id: `${r.source}:${r.name}`,
      name: r.name,
      source: r.source,
      path: r.path,
      description: r.description || undefined,
      content_hash: r.content_hash,
      registry_slug: r.registry_slug,
      registry_version: r.registry_version,
      security_status: r.security_status,
      installed_at: r.installed_at,
      updated_at: r.updated_at
    }))
  } catch (err) {
    console.error('[DB] 获取技能失败:', err.message)
    return null
  }
}

/**
 * 从数据库获取单个技能内容
 */
export async function getSkillContent(source, name) {
  try {
    const db = getDatabase()
    const row = db.prepare(
      'SELECT * FROM skills WHERE source = ? AND name = ?'
    ).get(source, name)

    if (!row) return null

    const skillDocPath = join(row.path, 'SKILL.md')
    const content = await readFile(skillDocPath, 'utf8')

    return {
      ...row,
      content
    }
  } catch (err) {
    console.error('[DB] 获取技能内容失败:', err.message)
    return null
  }
}

/**
 * 创建/更新技能
 */
export async function upsertSkill(source, name, content) {
  const db = getDatabase()
  const { mkdir, writeFile } = await import('node:fs/promises')

  // 解析根目录
  const roots = getSkillRoots()
  const root = roots.find(r => r.source === source)
  if (!root) {
    throw new Error(`未知的技能来源：${source}`)
  }

  // 创建目录
  const skillPath = join(root.path, name)
  const skillDocPath = join(skillPath, 'SKILL.md')
  await mkdir(skillPath, { recursive: true })
  await writeFile(skillDocPath, content, 'utf8')

  // 计算 hash 和描述
  const hash = sha256(content)
  const descLines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const desc = descLines.find(l => !l.startsWith('#'))
  const description = desc ? (desc.length > 220 ? `${desc.slice(0, 217)}...` : desc) : null
  const now = new Date().toISOString()

  // 写入 DB
  db.prepare(`
    INSERT INTO skills (name, source, path, description, content_hash, installed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, name) DO UPDATE SET
      path = excluded.path,
      description = excluded.description,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `).run(name, source, skillPath, description, hash, now, now)

  return { skillPath, skillDocPath }
}

/**
 * 删除技能
 */
export async function deleteSkill(source, name) {
  const db = getDatabase()
  const { rm } = await import('node:fs/promises')

  // 解析根目录
  const roots = getSkillRoots()
  const root = roots.find(r => r.source === source)
  if (!root) {
    throw new Error(`未知的技能来源：${source}`)
  }

  // 删除目录
  const skillPath = join(root.path, name)
  await rm(skillPath, { recursive: true, force: true })

  // 从 DB 删除
  db.prepare('DELETE FROM skills WHERE source = ? AND name = ?').run(source, name)

  return { skillPath }
}
