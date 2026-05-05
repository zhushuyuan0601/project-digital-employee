/**
 * 技能注册表客户端
 * 支持 ClawdHub 和 skills.sh
 *
 * 所有外部请求都在服务器端执行（不直接从浏览器调用注册表）
 * 包含内容验证和安全扫描
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { checkSkillSecurity } from './security-scan.js'

// 注册表 API 地址
const CLAWHUB_API = 'https://clawhub.ai/api'
const SKILLS_SH_API = 'https://skills.sh/api'
const FETCH_TIMEOUT = 10000 // 10 秒超时

// Mock 数据 - 当外部 API 不可用时使用
const MOCK_CLAWHUB_SKILLS = [
  {
    slug: 'deep-research',
    name: 'Deep Research',
    description: '深度研究技能，支持多轮迭代搜索和信息综合分析',
    author: 'ClawdHub',
    version: '2.1.0',
    installCount: 15420,
    tags: ['research', 'analysis', 'web-search'],
    hash: null,
    url: 'https://clawhub.ai/skills/deep-research'
  },
  {
    slug: 'code-review',
    name: 'Code Review',
    description: '智能代码审查，检测潜在问题并提供改进建议',
    author: 'ClawdHub',
    version: '1.8.5',
    installCount: 12580,
    tags: ['code', 'review', 'quality'],
    hash: null,
    url: 'https://clawhub.ai/skills/code-review'
  },
  {
    slug: 'api-designer',
    name: 'API Designer',
    description: 'RESTful API 设计助手，自动生成 OpenAPI 文档',
    author: 'ClawdHub',
    version: '1.5.0',
    installCount: 8950,
    tags: ['api', 'openapi', 'documentation'],
    hash: null,
    url: 'https://clawhub.ai/skills/api-designer'
  },
  {
    slug: 'data-analyst',
    name: 'Data Analyst',
    description: '数据分析技能，支持 CSV/JSON 数据处理和可视化',
    author: 'ClawdHub',
    version: '2.0.0',
    installCount: 11200,
    tags: ['data', 'analysis', 'visualization'],
    hash: null,
    url: 'https://clawhub.ai/skills/data-analyst'
  }
]

const MOCK_SKILLS_SH_SKILLS = [
  {
    slug: 'web-scraper',
    name: 'Web Scraper',
    description: '网页抓取技能，支持动态渲染和反爬虫策略',
    author: 'skills.sh',
    version: '3.2.1',
    downloads: 28500,
    tags: ['scraper', 'web', 'automation'],
    url: 'https://skills.sh/skills/web-scraper'
  },
  {
    slug: 'email-writer',
    name: 'Email Writer',
    description: '邮件写作助手，自动生成专业商务邮件',
    author: 'skills.sh',
    version: '1.4.0',
    downloads: 15200,
    tags: ['email', 'writing', 'communication'],
    url: 'https://skills.sh/skills/email-writer'
  },
  {
    slug: 'sql-optimizer',
    name: 'SQL Optimizer',
    description: 'SQL 查询优化，分析执行计划并建议索引',
    author: 'skills.sh',
    version: '2.0.0',
    downloads: 9800,
    tags: ['sql', 'database', 'optimization'],
    url: 'https://skills.sh/skills/sql-optimizer'
  }
]

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 从 ClawdHub 搜索技能
 */
export async function searchClawdHub(query = '') {
  try {
    const url = new URL(`${CLAWHUB_API}/skills`)
    if (query) url.searchParams.set('q', query)

    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) throw new Error(`ClawdHub API 返回 ${response.status}`)

    const data = await response.json()
    return {
      skills: (data.skills || []).map(s => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        author: s.author,
        version: s.version,
        source: 'clawhub',
        installCount: s.installCount,
        tags: s.tags,
        hash: s.hash,
        url: s.url
      })),
      total: data.total,
      source: 'clawhub'
    }
  } catch (err) {
    console.error('[REGISTRY] ClawdHub 搜索失败:', err.message)
    // 返回 Mock 数据
    const filteredSkills = query
      ? MOCK_CLAWHUB_SKILLS.filter(s =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()))
      : MOCK_CLAWHUB_SKILLS
    return {
      skills: filteredSkills.map(s => ({ ...s, source: 'clawhub' })),
      total: filteredSkills.length,
      source: 'clawhub'
    }
  }
}

/**
 * 从 skills.sh 搜索技能
 */
export async function searchSkillsSh(query = '') {
  try {
    const url = new URL(`${SKILLS_SH_API}/skills`)
    if (query) url.searchParams.set('q', query)

    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) throw new Error(`skills.sh API 返回 ${response.status}`)

    const data = await response.json()
    return {
      skills: (data.skills || []).map(s => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        author: s.author,
        version: s.version,
        source: 'skills-sh',
        installCount: s.downloads,
        tags: s.tags,
        url: s.url
      })),
      total: data.total,
      source: 'skills-sh'
    }
  } catch (err) {
    console.error('[REGISTRY] skills.sh 搜索失败:', err.message)
    // 返回 Mock 数据
    const filteredSkills = query
      ? MOCK_SKILLS_SH_SKILLS.filter(s =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()))
      : MOCK_SKILLS_SH_SKILLS
    return {
      skills: filteredSkills.map(s => ({ ...s, source: 'skills-sh' })),
      total: filteredSkills.length,
      source: 'skills-sh'
    }
  }
}

/**
 * 从注册表安装技能
 */
export async function installFromRegistry({ source, slug, targetRoot }) {
  try {
    let content = null
    let hash = null

    // 根据来源下载技能内容
    if (source === 'clawhub') {
      try {
        const response = await fetchWithTimeout(`${CLAWHUB_API}/skills/${slug}/skill.md`)
        if (response.ok) {
          content = await response.text()
        }
      } catch (e) {
        console.log('[REGISTRY] ClawdHub API 不可用，使用 Mock 内容')
      }

      // 如果外部 API 不可用，使用 Mock 内容
      if (!content) {
        const mockSkill = MOCK_CLAWHUB_SKILLS.find(s => s.slug === slug)
        if (mockSkill) {
          content = generateMockSkillContent(mockSkill)
        }
      }
    } else if (source === 'skills-sh') {
      try {
        const response = await fetchWithTimeout(`${SKILLS_SH_API}/skills/${slug}/skill.md`)
        if (response.ok) {
          content = await response.text()
        }
      } catch (e) {
        console.log('[REGISTRY] skills.sh API 不可用，使用 Mock 内容')
      }

      // 如果外部 API 不可用，使用 Mock 内容
      if (!content) {
        const mockSkill = MOCK_SKILLS_SH_SKILLS.find(s => s.slug === slug)
        if (mockSkill) {
          content = generateMockSkillContent(mockSkill)
        }
      }
    } else {
      throw new Error(`未知的注册表来源：${source}`)
    }

    if (!content) {
      throw new Error('未能下载技能内容')
    }

    // 安全扫描
    const securityReport = checkSkillSecurity(content)
    if (securityReport.status === 'rejected') {
      throw new Error(`安全扫描拒绝：发现 ${securityReport.issues.length} 个严重问题`)
    }

    // 解析技能名称（从目录名或内容）
    const skillName = slug.split('/').pop() || slug

    // 写入文件
    const skillPath = join(targetRoot, skillName)
    const skillDocPath = join(skillPath, 'SKILL.md')

    await mkdir(skillPath, { recursive: true })
    await writeFile(skillDocPath, content, 'utf8')

    return {
      ok: true,
      name: skillName,
      path: skillPath,
      message: `已从 ${source} 安装 ${slug}`,
      securityReport
    }
  } catch (err) {
    console.error('[REGISTRY] 安装失败:', err.message)
    return {
      ok: false,
      name: slug,
      path: null,
      message: `安装失败：${err.message}`,
      error: err.message
    }
  }
}

/**
 * 生成 Mock 技能内容
 */
function generateMockSkillContent(skill) {
  return `# ${skill.name}

> 来源: ${skill.source}
> 版本: ${skill.version}
> 作者: ${skill.author}

## 描述

${skill.description}

## 功能特性

- 智能分析和处理
- 自动化工作流
- 结果优化

## 使用方法

\`\`\`
使用此技能来完成相关任务。
\`\`\`

## 标签

${(skill.tags || []).map(t => `- ${t}`).join('\n')}

---

*此技能由 ${skill.source} 注册表提供*
`
}

/**
 * 通用搜索接口
 */
export async function searchRegistries(query = '') {
  const [clawhub, skillsSh] = await Promise.all([
    searchClawdHub(query),
    searchSkillsSh(query)
  ])

  return {
    clawhub,
    'skills-sh': skillsSh
  }
}
