/**
 * 数据库连接和配置
 * 使用 better-sqlite3 提供 SQLite 数据库访问
 */

import Database from 'better-sqlite3'
import { dirname } from 'path'
import { DEFAULT_SERVER_CONFIG, ensureDir, resolveProjectPath } from '../config/defaults.js'

// 数据库文件路径
// 当前 Claude Runtime 分支使用独立库，避免切回 OpenClaw 分支时污染旧库。
const DB_PATH = resolveProjectPath(process.env.DB_PATH) || DEFAULT_SERVER_CONFIG.dbPath

// 数据库实例
let db = null

export function getDatabasePath() {
  return DB_PATH
}

/**
 * 获取数据库连接
 */
export function getDatabase() {
  if (!db) {
    // 确保目录存在
    ensureDir(dirname(DB_PATH))

    // 创建数据库连接
    db = new Database(DB_PATH)

    // 启用 WAL 模式以支持并发访问
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = 1000')
    db.pragma('foreign_keys = ON')
    // 设置 busy_timeout 为 5 秒，避免并发冲突
    db.pragma('busy_timeout = 5000')

    console.log('[DB] Database connected:', DB_PATH)
  }

  return db
}

/**
 * 初始化数据库 schema
 */
export function initializeSchema() {
  const db = getDatabase()

  // 创建 skills 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      content_hash TEXT,
      registry_slug TEXT,
      registry_version TEXT,
      security_status TEXT DEFAULT 'unchecked',
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source, name)
    )
  `)

  // 创建索引
  db.exec('CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_skills_registry_slug ON skills(registry_slug)')

  console.log('[DB] Skills table initialized')
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database connection closed')
  }
}
