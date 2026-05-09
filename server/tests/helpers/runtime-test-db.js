import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  closeDatabase,
  getDatabasePath,
  initializeSchema,
  resetDatabaseForTests,
} from '../../db/index.js'
import { initializeTaskSchema } from '../../db/tasks.js'

export function withRuntimeTestDb() {
  const dir = mkdtempSync(join(tmpdir(), 'digital-employee-runtime-'))
  const dbPath = join(dir, 'runtime.db')
  const previousEnvPath = process.env.DB_PATH
  const previousDbPath = getDatabasePath()

  resetDatabaseForTests(dbPath)
  initializeSchema()
  initializeTaskSchema()

  return {
    dbPath,
    cleanup() {
      closeDatabase()
      resetDatabaseForTests(previousDbPath)
      if (previousEnvPath == null) delete process.env.DB_PATH
      else process.env.DB_PATH = previousEnvPath
      closeDatabase()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
