import { constants } from 'fs'
import { access, copyFile, lstat, mkdir, readlink, readdir, rm, symlink, writeFile } from 'fs/promises'
import { basename, isAbsolute, join, relative, resolve, sep } from 'path'

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

const EXCLUDED_RELATIVE_PREFIXES = [
  `server${sep}data`,
  `server${sep}logs`,
  `logs`,
  `tmp`,
  `temp`,
]

function isInside(child, parent) {
  const rel = relative(parent, child)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

function shouldCopy(sourcePath, sourceRoot, workspaceRoot) {
  const resolved = resolve(sourcePath)
  if (isInside(resolved, workspaceRoot)) return false

  const name = basename(resolved)
  if (EXCLUDED_NAMES.has(name)) return false

  const rel = relative(sourceRoot, resolved)
  if (!rel || rel.startsWith('..')) return true

  return !EXCLUDED_RELATIVE_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}${sep}`))
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function copyTree(source, target, sourceRoot, workspaceRoot) {
  if (!shouldCopy(source, sourceRoot, workspaceRoot)) return

  const stat = await lstat(source)
  if (stat.isSymbolicLink()) {
    const linkTarget = await readlink(source)
    await mkdir(resolve(target, '..'), { recursive: true })
    await symlink(linkTarget, target).catch(() => {})
    return
  }

  if (stat.isDirectory()) {
    await mkdir(target, { recursive: true })
    const entries = await readdir(source)
    for (const entry of entries) {
      await copyTree(join(source, entry), join(target, entry), sourceRoot, workspaceRoot)
    }
    return
  }

  if (stat.isFile()) {
    await mkdir(resolve(target, '..'), { recursive: true })
    await copyFile(source, target)
  }
}

export async function ensureTaskWorkspace({ config, task }) {
  if (!config.workspaceIsolation) {
    return {
      cwd: config.cwd,
      workspacePath: config.cwd,
      isolated: false,
    }
  }

  const sourceRoot = resolve(config.cwd)
  const workspaceRoot = resolve(config.workspaceRoot)
  const taskRoot = join(workspaceRoot, task.id)
  const projectPath = join(taskRoot, 'project')
  const readyFile = join(taskRoot, '.workspace-ready.json')

  if (!(await exists(readyFile))) {
    await rm(taskRoot, { recursive: true, force: true })
    await mkdir(taskRoot, { recursive: true })
    await copyTree(sourceRoot, projectPath, sourceRoot, workspaceRoot)
    await writeFile(readyFile, JSON.stringify({
      taskId: task.id,
      sourceRoot,
      projectPath,
      createdAt: new Date().toISOString(),
      excludes: {
        names: [...EXCLUDED_NAMES],
        relativePrefixes: EXCLUDED_RELATIVE_PREFIXES,
      },
    }, null, 2), 'utf-8')
  }

  return {
    cwd: projectPath,
    workspacePath: projectPath,
    isolated: true,
  }
}
