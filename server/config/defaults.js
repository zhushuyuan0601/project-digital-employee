import { existsSync, mkdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const PROJECT_ROOT = resolve(__dirname, '../..')

export const DEFAULT_SERVER_CONFIG = {
  port: 18888,
  corsOrigin: 'http://localhost:3000,http://localhost:5173',
  dbPath: join(PROJECT_ROOT, 'server/data/mission-control-claude.db'),
  fileRoots: '',
  allowPrivateUrls: true,
}

export const DEFAULT_CLAUDE_RUNTIME_CONFIG = {
  runtime: 'claude-code',
  maxConcurrency: 3,
  maxTurns: 256,
  reportOnly: true,
  cwd: PROJECT_ROOT,
  workspaceIsolation: true,
  workspaceRoot: join(PROJECT_ROOT, 'server/data/runtime-workspaces'),
  allowedTools: ['Read', 'Glob', 'Grep'],
  outputRoot: join(PROJECT_ROOT, 'server/data/task-outputs'),
  model: '',
  mock: false,
}

export function envString(name, fallback = '') {
  const value = process.env[name]
  return value == null || value === '' ? fallback : value
}

export function envBoolean(name, fallback = false) {
  const value = process.env[name]
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

export function envInteger(name, fallback) {
  const parsed = Number(process.env[name])
  if (!Number.isFinite(parsed)) return fallback
  return Math.floor(parsed)
}

export function envList(name, fallback = []) {
  const value = process.env[name]
  if (!value) return [...fallback]
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function resolveProjectPath(value) {
  if (!value) return value
  return resolve(PROJECT_ROOT, value)
}

export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function ensureDefaultRuntimeDirs() {
  ensureDir(join(PROJECT_ROOT, 'server/data'))
  ensureDir(DEFAULT_CLAUDE_RUNTIME_CONFIG.workspaceRoot)
  ensureDir(DEFAULT_CLAUDE_RUNTIME_CONFIG.outputRoot)
}
