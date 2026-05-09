import { constants } from 'fs'
import { access, lstat, readdir } from 'fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'path'

const EXCLUDED_NAMES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.DS_Store',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.turbo',
  '.cache',
])

const CODE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.vue',
  '.svelte',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.html',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.toml',
  '.xml',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
  '.php',
  '.rb',
  '.cs',
  '.sql',
  '.sh',
])

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function isInside(child, parent) {
  const rel = relative(parent, child)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

function shouldScan(path, root) {
  const resolved = resolve(path)
  if (!isInside(resolved, root)) return false
  return !EXCLUDED_NAMES.has(basename(resolved))
}

function isCodeLike(path) {
  const name = basename(path)
  if (/^(package|tsconfig|vite|webpack|rollup|eslint|prettier|tailwind|postcss|babel|jest|vitest|playwright|dockerfile)/i.test(name)) return true
  return CODE_EXTENSIONS.has(extname(name).toLowerCase())
}

async function walk(root, current, files, limit) {
  if (files.size >= limit || !shouldScan(current, root)) return
  const stat = await lstat(current).catch(() => null)
  if (!stat) return
  if (stat.isSymbolicLink()) return
  if (stat.isDirectory()) {
    const entries = await readdir(current).catch(() => [])
    for (const entry of entries) {
      if (files.size >= limit) break
      await walk(root, join(current, entry), files, limit)
    }
    return
  }
  if (!stat.isFile() || !isCodeLike(current)) return
  const rel = relative(root, current)
  files.set(rel, {
    path: current,
    size: stat.size,
    mtimeMs: Math.floor(stat.mtimeMs),
  })
}

export async function snapshotCodeAssets(root, { limit = 5000 } = {}) {
  const resolvedRoot = resolve(root)
  if (!(await exists(resolvedRoot))) return { root: resolvedRoot, files: new Map() }
  const files = new Map()
  await walk(resolvedRoot, resolvedRoot, files, limit)
  return { root: resolvedRoot, files }
}

export function diffCodeAssets(before, after) {
  const beforeFiles = before?.files || new Map()
  const afterFiles = after?.files || new Map()
  const root = after?.root || before?.root || ''
  const added = []
  const modified = []
  const deleted = []

  for (const [rel, file] of afterFiles.entries()) {
    const previous = beforeFiles.get(rel)
    if (!previous) {
      added.push({ relativePath: rel, path: file.path, mtime: file.mtimeMs, size: file.size })
    } else if (previous.size !== file.size || previous.mtimeMs !== file.mtimeMs) {
      modified.push({ relativePath: rel, path: file.path, mtime: file.mtimeMs, size: file.size })
    }
  }

  for (const [rel, file] of beforeFiles.entries()) {
    if (!afterFiles.has(rel)) {
      deleted.push({ relativePath: rel, path: join(root, rel), mtime: Date.now(), size: file.size })
    }
  }

  const sortByPath = (a, b) => a.relativePath.localeCompare(b.relativePath)
  return {
    added: added.sort(sortByPath),
    modified: modified.sort(sortByPath),
    deleted: deleted.sort(sortByPath),
  }
}

export function codeAssetCount(changes) {
  return (changes?.added?.length || 0) + (changes?.modified?.length || 0) + (changes?.deleted?.length || 0)
}
