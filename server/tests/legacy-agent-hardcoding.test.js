import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const LEGACY_EXECUTOR_PATTERN = /\b(?:xiaoyan|xiaochan|xiaokai|xiaoce)\b/
const SCAN_ROOTS = ['src', 'server']
const ALLOWED_PATHS = new Set([
  'server/db/agents.js',
])

function shouldScan(path) {
  const rel = relative(ROOT, path)
  if (ALLOWED_PATHS.has(rel)) return false
  if (rel.startsWith('server/tests/')) return false
  if (rel.startsWith('server/data/')) return false
  if (rel.startsWith('dist/')) return false
  return /\.(js|ts|vue)$/.test(rel)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, files)
    } else if (stat.isFile() && shouldScan(path)) {
      files.push(path)
    }
  }
  return files
}

test('business source does not hardcode hidden legacy executor ids', () => {
  const offenders = []
  for (const root of SCAN_ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      const content = readFileSync(file, 'utf8')
      if (LEGACY_EXECUTOR_PATTERN.test(content)) {
        offenders.push(relative(ROOT, file))
      }
    }
  }
  assert.deepEqual(offenders, [])
})
