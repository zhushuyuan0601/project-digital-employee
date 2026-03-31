# API 集成总结文档

## 概述

本文档记录了所有新增页面的后端 API 集成工作，包括 API 服务模块、Pinia stores 和页面组件的更新。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Vue Components                          │
│  (Skills.vue, Tokens.vue, Memory.vue, Security.vue,         │
│   Cron.vue, Webhooks.vue)                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Pinia Stores                           │
│  (useSkillsStore, useTokensStore, useMemoryStore,           │
│   useSecurityStore, useCronStore, useWebhooksStore)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Service Module                       │
│                    (src/api/index.ts)                        │
│  - skillsApi, tokensApi, memoryApi, securityApi,            │
│    cronApi, webhooksApi                                      │
│  - 统一的 request() 函数                                     │
│  - TypeScript 接口定义                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                            │
│                    (server/index.js)                         │
│  - Express.js 运行在端口 18888                               │
│  - 所有 API 端点返回模拟数据                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## API 服务模块 (src/api/index.ts)

### 基础配置

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:18888'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, { ...defaultOptions, ...options })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}
```

### API 模块列表

| 模块 | 前缀 | 功能 |
|------|------|------|
| skillsApi | /api/skills | 技能管理 |
| tokensApi | /api/tokens | 成本追踪 |
| memoryApi | /api/memory | 内存图谱 |
| securityApi | /api/security | 安全审计 |
| cronApi | /api/cron | 定时任务 |
| webhooksApi | /api/webhooks | Webhook 管理 |

---

## Pinia Stores

### 1. useSkillsStore (`src/stores/skills.ts`)

**State**:
- `skills`: Skill[] - 技能列表
- `loading`: boolean
- `error`: string | null

**Actions**:
- `fetchSkills()` - 获取技能列表
- `installSkill(id: string, config?: object)` - 安装技能
- `updateSkill(id: string)` - 更新技能
- `uninstallSkill(id: string)` - 卸载技能

**Computed**:
- `totalSkills` - 总技能数
- `installedSkills` - 已安装技能
- `availableSkills` - 可用技能
- `categories` - 分类列表

---

### 2. useTokensStore (`src/stores/tokens.ts`)

**State**:
- `stats`: TokenStats | null - 统计数据
- `trend`: TokenTrend[] - 趋势数据
- `modelUsage`: ModelUsage[] - 模型使用
- `agentCosts`: AgentCost[] - Agent 成本
- `recentUsage`: TokenUsage[] - 最近使用

**Actions**:
- `fetchTokenStats(timeRange: string)` - 获取统计
- `exportReport(timeRange: string)` - 导出报告

**Computed**:
- `chartData` - 图表数据转换
- `totalTokens` - 总 Token 数
- `totalCost` - 总成本

---

### 3. useMemoryStore (`src/stores/memory.ts`)

**State**:
- `stats`: MemoryStats | null
- `files`: MemoryFile[] - 文件列表
- `nodes`: MemoryNode[] - 节点列表
- `activities`: MemoryActivity[] - 活动日志

**Actions**:
- `fetchMemoryData()` - 获取内存数据
- `importMemoryFile(file: File)` - 导入文件
- `exportMemoryData()` - 导出数据

**Computed**:
- `fileTree` - 递归文件树结构
- `graphData` - 图谱节点和连线

---

### 4. useSecurityStore (`src/stores/security.ts`)

**State**:
- `stats`: SecurityStats | null
- `secrets`: SecretDetection[]
- `mcpServers`: MCPServer[]
- `injectionAttempts`: InjectionAttempt[]
- `events`: SecurityEvent[]

**Actions**:
- `fetchSecurityAudit()` - 获取审计数据
- `runSecurityScan()` - 运行安全扫描
- `ignoreSecret(id: string)` - 忽略密钥
- `resolveSecret(id: string)` - 解决密钥问题

**Computed**:
- `securityLevel` - 安全等级
- `securityColor` - 等级颜色

---

### 5. useCronStore (`src/stores/cron.ts`)

**State**:
- `tasks`: CronTask[]
- `stats`: CronStats | null

**Actions**:
- `fetchTasks()` - 获取任务列表
- `createTask(task: object)` - 创建任务
- `updateTask(id: string, task: object)` - 更新任务
- `deleteTask(id: string)` - 删除任务
- `toggleTask(id: string)` - 切换启用状态
- `executeTask(id: string)` - 立即执行

**Helpers**:
- `cronToHuman(cron: string)` - Cron 表达式转自然语言

---

### 6. useWebhooksStore (`src/stores/webhooks.ts`)

**State**:
- `webhooks`: Webhook[]
- `stats`: WebhookStats | null
- `deliveries`: WebhookDelivery[]

**Actions**:
- `fetchWebhooks()` - 获取 Webhook 列表
- `createWebhook(webhook: object)` - 创建 Webhook
- `updateWebhook(id: string, webhook: object)` - 更新 Webhook
- `deleteWebhook(id: string)` - 删除 Webhook
- `toggleWebhook(id: string)` - 切换启用状态
- `testWebhook(id: string)` - 发送测试通知
- `fetchDeliveries(webhookId: string)` - 获取投递日志

---

## 后端 API 端点 (server/index.js)

### Skills API
```
GET    /api/skills          - 获取技能列表
POST   /api/skills/install  - 安装技能
POST   /api/skills/update   - 更新技能
POST   /api/skills/uninstall- 卸载技能
```

### Tokens API
```
GET    /api/tokens/stats    - 获取统计数据
GET    /api/tokens/export   - 导出报告
```

### Memory API
```
GET    /api/memory          - 获取内存数据
POST   /api/memory/import   - 导入文件
POST   /api/memory/export   - 导出数据
```

### Security API
```
GET    /api/security/audit  - 获取审计数据
POST   /api/security/scan   - 运行安全扫描
POST   /api/security/ignore/:id - 忽略密钥
POST   /api/security/resolve/:id - 解决密钥
```

### Cron API
```
GET    /api/cron/tasks      - 获取任务列表
POST   /api/cron/tasks      - 创建任务
PUT    /api/cron/tasks/:id  - 更新任务
DELETE /api/cron/tasks/:id  - 删除任务
POST   /api/cron/tasks/:id/toggle - 切换状态
POST   /api/cron/tasks/:id/execute - 立即执行
```

### Webhooks API
```
GET    /api/webhooks                    - 获取 Webhook 列表
POST   /api/webhooks                    - 创建 Webhook
PUT    /api/webhooks/:id                - 更新 Webhook
DELETE /api/webhooks/:id                - 删除 Webhook
POST   /api/webhooks/:id/toggle         - 切换状态
POST   /api/webhooks/:id/test           - 发送测试
GET    /api/webhooks/:id/deliveries     - 获取投递日志
```

---

## 页面组件集成

### Skills.vue
```typescript
const skillsStore = useSkillsStore()
const skills = computed(() => skillsStore.skills)
const isLoading = computed(() => skillsStore.loading)

const refreshSkills = async () => {
  await skillsStore.fetchSkills()
}
```

### Tokens.vue
```typescript
const tokensStore = useTokensStore()
const stats = computed(() => tokensStore.stats)
const chartData = computed(() => tokensStore.chartData)

const fetchStats = async (timeRange: string) => {
  await tokensStore.fetchTokenStats(timeRange)
}
```

### Memory.vue
```typescript
const memoryStore = useMemoryStore()
const fileTree = computed(() => memoryStore.fileTree)
const graphData = computed(() => memoryStore.graphData)

const refreshMemory = async () => {
  await memoryStore.fetchMemoryData()
}
```

### Security.vue
```typescript
const securityStore = useSecurityStore()
const stats = computed(() => securityStore.stats)
const secrets = computed(() => securityStore.secrets)

const refreshData = async () => {
  await securityStore.fetchSecurityAudit()
}
```

### Cron.vue
```typescript
const cronStore = useCronStore()
const tasks = computed(() => cronStore.tasks)
const stats = computed(() => cronStore.stats)

const saveTask = async () => {
  if (editingTaskId.value) {
    await cronStore.updateTask(editingTaskId.value, taskForm.value)
  } else {
    await cronStore.createTask(taskForm.value)
  }
}
```

### Webhooks.vue
```typescript
const webhooksStore = useWebhooksStore()
const webhooks = computed(() => webhooksStore.webhooks)
const stats = computed(() => webhooksStore.stats)

const createWebhook = async () => {
  await webhooksStore.createWebhook(webhookForm.value)
}
```

---

## 数据类型定义

### Skill
```typescript
interface Skill {
  id: string
  name: string
  author: string
  version: string
  description: string
  icon: string
  category: string
  installed: boolean
  downloads: number
  rating: number
  securityScan?: 'passed' | 'warning' | 'failed'
}
```

### TokenStats
```typescript
interface TokenStats {
  totalTokens: number
  totalCost: number
  inputTokens: number
  outputTokens: number
  apiCalls: number
  avgResponseTime: number
}
```

### MemoryFile
```typescript
interface MemoryFile {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  size: string
  createdAt: string
  updatedAt: string
  children?: MemoryFile[]
  expanded?: boolean
  icon?: string
  meta?: string
}
```

### SecurityStats
```typescript
interface SecurityStats {
  score: number
  secretsDetected: number
  mcpConnections: number
  injectionAttempts: number
  passedChecks: number
  totalChecks: number
}
```

### CronTask
```typescript
interface CronTask {
  id: string
  name: string
  cron: string
  agentId: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  totalRuns: number
  successRate: number
}
```

### Webhook
```typescript
interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  hmacAlgorithm?: 'sha256' | 'sha1' | 'sha512'
  hmacSecret?: string
  retryStrategy?: 'fixed' | 'exponential' | 'linear'
  enabled: boolean
  createdAt: string
  lastTriggered?: string
  totalDeliveries: number
  successRate: number
}
```

---

## 使用示例

### 启动后端服务
```bash
node server/index.js
# 服务运行在 http://localhost:18888
```

### 启动前端开发服务器
```bash
npm run dev
```

### 调用 API
```typescript
// 通过 store 调用
await skillsStore.fetchSkills()

// 或直接调用 API
const { skillsApi } = await import('@/api')
const skills = await skillsApi.getSkills()
```

---

## 文件清单

### 新增文件
```
src/api/index.ts              - API 服务模块
src/stores/skills.ts          - Skills store
src/stores/tokens.ts          - Tokens store
src/stores/memory.ts          - Memory store
src/stores/security.ts        - Security store
src/stores/cron.ts            - Cron store
src/stores/webhooks.ts        - Webhooks store
```

### 更新文件
```
src/views/Skills.vue          - 集成 store
src/views/Tokens.vue          - 集成 store
src/views/Memory.vue          - 集成 store
src/views/Security.vue        - 集成 store
src/views/Cron.vue            - 集成 store
src/views/Webhooks.vue        - 集成 store
server/index.js               - 添加 API 端点
```

---

## 注意事项

1. **环境变量**: 可通过 `VITE_API_BASE_URL` 环境变量配置 API 地址
2. **错误处理**: 所有 API 调用都有 try/catch 错误处理
3. **加载状态**: stores 中都有 loading 状态用于 UI 反馈
4. **TypeScript**: 所有接口都有完整的类型定义
5. **模拟数据**: 后端服务当前返回模拟数据，便于测试

---

**文档更新时间**: 2026-03-24
**版本**: v1.0.0
