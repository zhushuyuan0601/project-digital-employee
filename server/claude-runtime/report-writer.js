import { promises as fs } from 'fs'
import { basename, join } from 'path'
import { ROLE_DEFINITIONS } from './roles.js'

function safeName(value) {
  return String(value || 'report')
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function writeRunReport({ config, taskId, subtaskId, agentId, kind = 'subtask', content }) {
  const role = ROLE_DEFINITIONS[agentId] || ROLE_DEFINITIONS.xiaomu
  const dir = kind === 'summary'
    ? join(config.outputRoot, taskId, 'summary')
    : join(config.outputRoot, taskId, subtaskId || 'general')
  await fs.mkdir(dir, { recursive: true })

  const base = kind === 'summary'
    ? `${timestamp()}-final-summary`
    : `${role.reportName}-${timestamp()}`
  const filePath = join(dir, `${safeName(base)}.md`)
  await fs.writeFile(filePath, String(content || '').trim() + '\n', 'utf-8')

  return {
    path: filePath,
    name: basename(filePath),
    mtime: Date.now(),
  }
}
