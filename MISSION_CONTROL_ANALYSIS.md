# Mission Control 架构分析

## 核心架构特点

### 1. 技术栈
- **框架**: Next.js 16 (App Router)
- **数据库**: SQLite (better-sqlite3) + WAL 模式
- **状态管理**: Zustand 5
- **语言**: TypeScript 5.7
- **实时通信**: WebSocket + Server-Sent Events

### 2. 数据库设计 (src/lib/db.ts)

```typescript
// 核心特点
- 单 SQLite 数据库文件，无外部依赖
- WAL (Write-Ahead Logging) 模式支持并发访问
- 39 个 schema migrations 管理数据库演化
- 运行时数据存储在 `.data/` 目录

// 主要数据表
- users - 用户账户 (RBAC)
- user_sessions - 会话管理
- skills - 技能注册 (双向同步 disk ↔ DB)
- webhooks - Webhook 配置
- webhook_deliveries - 投递日志
- token_usage - Token 使用记录
- tasks - 任务管理
- agents - Agent 注册
- activities - 活动日志
- security_events - 安全事件
```

### 3. 技能管理 (src/lib/skill-sync.ts)

```typescript
// 5 个技能根目录，双向同步
const skillRoots = [
  { source: 'user-agents', path: '~/.agents/skills' },
  { source: 'user-codex', path: '~/.codex/skills' },
  { source: 'project-agents', path: './.agents/skills' },
  { source: 'project-codex', path: './.codex/skills' },
  { source: 'openclaw', path: '~/.openclaw/skills' },
  { source: 'workspace', path: '$WORKSPACE/skills' },
  // 动态扫描 workspace-<agent> 目录
]

// 同步逻辑
1. 扫描磁盘上的 SKILL.md 文件
2. 计算内容 hash (SHA256)
3. Upsert 到数据库
4. 冲突策略：磁盘优先 (disk wins)

// 数据模型
interface Skill {
  id: number
  name: string
  source: string  // 来源目录
  path: string    // 完整路径
  description: string | null
  content_hash: string | null  // 内容哈希，用于变更检测
  registry_slug: string | null //  registry 安装的技能
  registry_version: string | null
  security_status: string | null // 安全扫描状态
  installed_at: string
  updated_at: string
}
```

### 4. Webhook 实现 (src/lib/webhooks.ts)

```typescript
// 核心功能
- HMAC-SHA256 签名验证
- 指数退避重试 (30s, 5m, 30m, 2h, 8h)
- 断路器模式 (连续失败 5 次禁用)
- 事件总线集成
- 工作空间隔离

// 数据模型
interface Webhook {
  id: number
  name: string
  url: string
  secret: string | null
  events: string  // JSON array
  enabled: number
  workspace_id: number
  consecutive_failures: number
}

interface WebhookDelivery {
  id: number
  webhook_id: number
  event_type: string
  payload: string  // JSON
  status_code: number | null
  response_body: string | null
  error: string | null
  duration_ms: number
  attempt: number
  next_retry_at: number | null
  parent_delivery_id: number | null
  workspace_id: number
}

// 事件映射
const EVENT_MAP = {
  'activity.created': 'activity',
  'notification.created': 'notification',
  'agent.status_changed': 'agent.status_change',
  'task.created': 'activity.task_created',
  'security.audit': 'security',
}
```

### 5. Token 追踪 (src/lib/task-costs.ts)

```typescript
// 数据来源
1. 数据库表：token_usage
2. 文件存储：.data/tokens.json
3. Gateway Sessions: ~/.openclaw/sessions/*

// 数据模型
interface TokenUsageRecord {
  id: string
  model: string
  sessionId: string
  agentName: string
  timestamp: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  operation: string
  taskId?: number
  workspaceId?: number
  duration?: number
}

// 聚合维度
- 总体统计
- 按模型分组
- 按 Agent 分组
- 按会话分组
- 按任务分组
- 时间趋势
```

### 6. API 路由结构 (src/app/api/)

```
/api/
├── skills/           # 技能管理 (GET/POST/PUT/DELETE)
├── tokens/           # Token 追踪 (GET/POST)
├── webhooks/         # Webhook CRUD
├── cron/             # 定时任务
├── security-audit/   # 安全审计
├── security-scan/    # 安全扫描
├── memory/           # 内存图谱
├── tasks/            # 任务管理
├── agents/           # Agent 管理
├── activities/       # 活动日志
├── auth/             # 认证
└── ...
```

### 7. 安全扫描 (src/lib/security-scan.ts)

```typescript
// 扫描内容
- Prompt injection 检测
- Credential leaks (API keys, tokens)
- Data exfiltration patterns
- Dangerous shell commands
- Obfuscated content

// 扫描结果
interface SecurityScanResult {
  status: 'safe' | 'warning' | 'danger'
  issues: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    line?: number
  }>
}
```

### 8. 认证授权 (src/lib/auth.ts)

```typescript
// 角色系统
- viewer: 只读
- operator: 读写任务/Agent/聊天
- admin: 完全访问

// 认证方式
- Session Cookie
- API Key Header
- Google Sign-In (需管理员批准)

// 要求角色装饰器
export function requireRole(request: NextRequest, role: 'viewer' | 'operator' | 'admin')
```

## 关键实现模式

### 1. 双向数据同步 (Disk ↔ DB)

```typescript
// 技能同步流程
export async function syncSkillsFromDisk(): Promise<{ ok: boolean; message: string }> {
  // 1. 扫描所有技能根目录
  const diskSkills = scanDiskSkills()

  // 2. 从 DB 加载现有技能
  const dbRows = db.prepare('SELECT * FROM skills WHERE source IN (...)').all()

  // 3. 比较并同步
  db.transaction(() => {
    // 磁盘 → DB: 新增和变更
    for (const disk of diskSkills) {
      const existing = dbMap.get(key)
      if (!existing) {
        insertStmt.run(...) // 新增
      } else if (existing.content_hash !== disk.contentHash) {
        updateStmt.run(...) // 更新
      }
    }

    // DB → 磁盘：检测删除
    for (const row of dbMap) {
      if (!diskMap.has(key) && !row.registry_slug) {
        deleteStmt.run(...) // 删除
      }
    }
  })()
}
```

### 2. Webhook 事件驱动架构

```typescript
// 事件总线监听
export function initWebhookListener() {
  eventBus.on('server-event', (event: ServerEvent) => {
    const mapping = EVENT_MAP[event.type]
    if (!mapping) return

    // 构建 webhook 事件类型
    let webhookEventType: string
    if (mapping === 'activity' && event.data?.type) {
      webhookEventType = `activity.${event.data.type}`
    } else {
      webhookEventType = mapping
    }

    // 触发 webhooks
    fireWebhooksAsync(webhookEventType, event.data, workspaceId)
  })
}
```

### 3. 断路器模式

```typescript
// 失败处理逻辑
if (success) {
  // 重置连续失败计数
  db.prepare(`UPDATE webhooks SET consecutive_failures = 0 WHERE id = ?`).run(webhook.id)
} else {
  // 增加失败计数
  db.prepare(`UPDATE webhooks SET consecutive_failures = consecutive_failures + 1 WHERE id = ?`).run(webhook.id)

  if (attempt < MAX_RETRIES - 1) {
    // 调度重试
    const delaySec = nextRetryDelay(attempt)
    db.prepare(`UPDATE webhook_deliveries SET next_retry_at = ? WHERE id = ?`).run(nextRetryAt, deliveryId)
  } else {
    // 断路器跳闸
    if (consecutive_failures >= MAX_RETRIES) {
      db.prepare(`UPDATE webhooks SET enabled = 0 WHERE id = ?`).run(webhook.id)
    }
  }
}
```

### 4. 数据聚合查询

```typescript
// Webhook 列表带统计
const webhooks = db.prepare(`
  SELECT w.*,
    (SELECT COUNT(*) FROM webhook_deliveries wd
     WHERE wd.webhook_id = w.id AND wd.workspace_id = w.workspace_id) as total_deliveries,
    (SELECT COUNT(*) FROM webhook_deliveries wd
     WHERE wd.webhook_id = w.id AND wd.workspace_id = w.workspace_id
     AND wd.status_code BETWEEN 200 AND 299) as successful_deliveries,
    (SELECT COUNT(*) FROM webhook_deliveries wd
     WHERE wd.webhook_id = w.id AND wd.workspace_id = w.workspace_id
     AND (wd.error IS NOT NULL OR wd.status_code NOT BETWEEN 200 AND 299)) as failed_deliveries
  FROM webhooks w
  WHERE w.workspace_id = ?
  ORDER BY w.created_at DESC
`).all(workspaceId)
```

## 对比当前项目 (unicom-ui-new.bak)

| 特性 | Mission Control | unicom-ui-new.bak |
|------|-----------------|-------------------|
| 框架 | Next.js 16 | Vue 3 + Vite |
| 数据库 | SQLite | 无 (内存/文件) |
| 状态管理 | Zustand | Pinia |
| API 风格 | REST (Next.js Routes) | REST (Express) |
| 技能存储 | 6 个根目录 + DB | 内存数组 |
| Webhook | 完整实现 (断路器/重试) | 模拟数据 |
| Token 追踪 | 多源聚合 (DB/File/Session) | 模拟生成 |
| 安全扫描 | 实际扫描逻辑 | 模拟数据 |
| 认证 | RBAC + Session | 无 |
| 工作空间 | 多租户支持 | 单工作空间 |

## 迁移建议

### 阶段 1：数据库集成
1. 集成 better-sqlite3
2. 创建 schema.sql 定义表结构
3. 实现 migrations 系统
4. 将模拟数据迁移到数据库

### 阶段 2：技能管理
1. 实现技能根目录扫描
2. 实现 disk ↔ DB 双向同步
3. 添加安全扫描功能
4. 支持 SKILL.md 格式

### 阶段 3：Webhook
1. 创建 webhooks 和 webhook_deliveries 表
2. 实现 HMAC 签名
3. 实现重试逻辑和断路器
4. 集成事件总线

### 阶段 4：Token 追踪
1. 创建 token_usage 表
2. 实现多源数据聚合
3. 添加成本计算
4. 支持导出功能

### 阶段 5：安全增强
1. 实现 RBAC 认证
2. 添加工作空间隔离
3. 实现安全扫描
4. 添加审计日志

---

**分析时间**: 2026-03-25
**参考版本**: Mission Control v2.0.1
