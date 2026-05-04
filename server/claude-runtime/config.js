import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '../..')

function boolValue(value, fallback = false) {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function listValue(value, fallback = []) {
  if (!value) return fallback
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function intValue(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.floor(parsed)
}

export function getClaudeRuntimeConfig() {
  const maxConcurrency = Math.max(1, Number(process.env.CLAUDE_AGENT_MAX_CONCURRENCY || 3))
  const maxTurns = Math.max(1, intValue(process.env.CLAUDE_AGENT_MAX_TURNS, 256))
  const reportOnly = boolValue(process.env.CLAUDE_REPORT_ONLY, true)
  const cwd = resolve(process.env.CLAUDE_RUNTIME_CWD || PROJECT_ROOT)
  const allowedTools = listValue(process.env.CLAUDE_ALLOWED_TOOLS, ['Read', 'Glob', 'Grep'])
  const outputRoot = resolve(process.env.CLAUDE_OUTPUT_ROOT || join(PROJECT_ROOT, 'server/data/task-outputs'))
  const workspaceIsolation = boolValue(process.env.CLAUDE_WORKSPACE_ISOLATION, true)
  const workspaceRoot = resolve(process.env.CLAUDE_WORKSPACE_ROOT || join(PROJECT_ROOT, 'server/data/runtime-workspaces'))

  return {
    runtime: process.env.AGENT_RUNTIME || 'claude-code',
    maxConcurrency,
    maxTurns,
    reportOnly,
    cwd,
    workspaceIsolation,
    workspaceRoot,
    allowedTools,
    outputRoot,
    model: process.env.CLAUDE_AGENT_MODEL || '',
    mock: boolValue(process.env.CLAUDE_RUNTIME_MOCK, false),
  }
}
