import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  closeDatabase,
  getDatabase,
  getDatabasePath,
  resetDatabaseForTests,
} from '../db/index.js'
import { createTask } from '../db/tasks.js'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'

test('resetDatabaseForTests switches the active database path after import', () => {
  const dir = mkdtempSync(join(tmpdir(), 'digital-employee-db-reset-'))
  const firstPath = join(dir, 'first.db')
  const secondPath = join(dir, 'second.db')
  const previous = process.env.DB_PATH
  const previousDbPath = getDatabasePath()

  try {
    resetDatabaseForTests(firstPath)
    assert.equal(getDatabasePath(), firstPath)
    assert.equal(process.env.DB_PATH, previous)
    getDatabase().exec('CREATE TABLE marker (id INTEGER PRIMARY KEY)')

    resetDatabaseForTests(secondPath)
    assert.equal(getDatabasePath(), secondPath)
    assert.equal(process.env.DB_PATH, previous)
    const marker = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'marker'")
      .get()
    assert.equal(marker, undefined)
  } finally {
    closeDatabase()
    if (previous == null) delete process.env.DB_PATH
    else process.env.DB_PATH = previous
    resetDatabaseForTests(previousDbPath)
    closeDatabase()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('withRuntimeTestDb initializes an isolated task schema', () => {
  const previousEnv = process.env.DB_PATH
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'Isolated DB', description: 'Uses a temp database' })
    assert.equal(getDatabasePath(), env.dbPath)
    assert.equal(task.title, 'Isolated DB')
    assert.equal(process.env.DB_PATH, previousEnv)
  } finally {
    env.cleanup()
  }
  assert.equal(process.env.DB_PATH, previousEnv)
})
