# OpenClaw 后端对接指南

## 概述

本文档说明如何将此项目对接到你的 OpenClaw 后端服务 (`http://localhost:3100`)。

## 当前架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                      │
│  Vue 3 + Vite + TypeScript + Pinia                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    Vite Dev Server Proxy
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Local Backend Server (Port 18888)              │
│  Express.js 服务器 - 混合模式代理                            │
│  - 优先转发到 Gateway (18789)                                │
│  - Gateway 不可用时返回模拟数据                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    转发到 OpenClaw (3100)
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  OpenClaw Service (Port 3100)                │
│  你的真实后端服务                                            │
└─────────────────────────────────────────────────────────────┘
```

## 对接步骤

### 方案 A：修改 server/index.js 转发到 OpenClaw

编辑 `server/index.js`，在文件开头添加 OpenClaw 配置：

```javascript
// OpenClaw 服务地址
const OPENCLAW_HOST = process.env.OPENCLAW_HOST || 'localhost'
const OPENCLAW_PORT = process.env.OPENCLAW_PORT || 3100

// 代理请求到 OpenClaw
function proxyToOpenClaw(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: OPENCLAW_HOST,
      port: parseInt(OPENCLAW_PORT),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve({ raw: data })
        }
      })
    })

    req.on('error', (e) => {
      reject(e)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}
```

然后修改各个 API 端点，优先从 OpenClaw 获取数据：

```javascript
// Skills API 示例
app.get('/api/skills', async (req, res) => {
  try {
    console.log('[API] Skills request')

    // 尝试从 OpenClaw 获取数据
    try {
      const openClawData = await proxyToOpenClaw('/api/skills')
      if (openClawData) {
        console.log('[API] Skills data from OpenClaw')
        return res.json({ success: true, skills: openClawData })
      }
    } catch (e) {
      // OpenClaw 不可用，使用模拟数据
      console.log('[API] Skills using mock data')
    }

    res.json({
      success: true,
      skills: SKILLS_DB
    })
  } catch (err) {
    console.error('[API] Skills error:', err)
    res.status(500).json({
      success: false,
      error: err.message
    })
  }
})
```

### 方案 B：直接修改 Vite 代理配置

编辑 `vite.config.ts`，将所有 API 请求直接转发到 OpenClaw：

```typescript
server: {
  port: 3000,
  proxy: {
    '/api/skills': {
      target: 'http://localhost:3100',
      changeOrigin: true
    },
    '/api/tokens': {
      target: 'http://localhost:3100',
      changeOrigin: true
    },
    '/api/memory': {
      target: 'http://localhost:3100',
      changeOrigin: true
    },
    '/api/security': {
      target: 'http://localhost:3100',
      changeOrigin: true
    },
    '/api/cron': {
      target: 'http://localhost:3100',
      changeOrigin: true
    },
    '/api/webhooks': {
      target: 'http://localhost:3100',
      changeOrigin: true
    }
  }
}
```

**注意**：使用此方案需要确保 OpenClaw 后端有对应的 API 端点。

### 方案 C：保留混合模式，添加 OpenClaw 作为数据源

修改 `server/index.js` 中的 `proxyToGateway` 函数，同时支持 Gateway 和 OpenClaw：

```javascript
// 多后端支持
async function proxyToBackend(path, method = 'GET', body = null) {
  // 先尝试 OpenClaw
  try {
    const openClawData = await proxyToOpenClaw(path, method, body)
    if (openClawData) return openClawData
  } catch (e) {
    console.log(`[API] OpenClaw not available for ${path}`)
  }

  // 再尝试 Gateway
  try {
    const gatewayData = await proxyToGateway(path, method, body)
    if (gatewayData && gatewayData.success) return gatewayData
  } catch (e) {
    console.log(`[API] Gateway not available for ${path}`)
  }

  // 都不行则返回 null，使用模拟数据
  return null
}
```

## Mission Control 参考数据模型

根据 Mission Control 项目，以下是各模块的标准数据模型：

### Skills (技能中心)

```json
{
  "id": "web-search",
  "name": "Web Search",
  "author": "OpenClaw",
  "version": "2.1.0",
  "description": "高级网络搜索功能",
  "icon": "🔍",
  "category": "tool",
  "downloads": 12580,
  "rating": 4.8,
  "installed": true,
  "updateAvailable": false,
  "securityScan": "safe",
  "repository": "https://github.com/..."
}
```

**Mission Control 特性**:
- 支持 5 个技能根目录：`~/.agents/skills/`, `~/.claude/skills/` 等
- 安全扫描检测：prompt injection, credential leaks, data exfiltration, shell commands
- 双向同步：disk ↔ DB

### Tokens (成本追踪)

```json
{
  "stats": {
    "totalTokens": 349452,
    "totalCost": 1.75,
    "inputTokens": 196734,
    "outputTokens": 152718,
    "apiCalls": 20,
    "avgResponseTime": 1259
  },
  "trend": [
    {"date": "2026-03-24", "input": 28820, "output": 27016}
  ],
  "modelUsage": [
    {"model": "claude-sonnet-4-6", "tokens": 125000, "cost": 0.625, "percentage": 45}
  ],
  "agentCosts": [
    {"agentId": "xiaomu", "agentName": "小呦", "tokens": 95000, "cost": 0.76, "rank": 1}
  ],
  "recentUsage": [...]
}
```

**Mission Control 特性**:
- Token 日志存储在 `.data/` 目录
- 支持 per-model 和 per-session 粒度
- 使用 Recharts 可视化

### Memory (内存图谱)

```json
{
  "stats": {
    "fileCount": 4,
    "nodeCount": 4,
    "storageUsed": 43460,
    "storageUsedFormatted": "42.5 KB"
  },
  "files": [
    {"id": "f1", "name": "project-knowledge.md", "path": "/knowledge/...", "type": "file"}
  ],
  "nodes": [
    {"id": "n1", "name": "OpenClaw", "type": "entity", "description": "...", "connections": [...]}
  ],
  "activities": [...]
}
```

**Mission Control 特性**:
- 文件系统-backed memory tree
- 数据来源：`~/.claude/projects/`, `~/.claude/sessions/`
- 支持环境变量：`MC_CLAUDE_HOME`, `OPENCLAW_STATE_DIR`

### Security (安全审计)

```json
{
  "stats": {
    "score": 87,
    "secretsDetected": 2,
    "mcpConnections": 3,
    "injectionAttempts": 5,
    "passedChecks": 42,
    "totalChecks": 45
  },
  "secrets": [...],
  "mcpServers": [...],
  "injectionAttempts": [...],
  "events": [...],
  "trustFactors": [...]
}
```

**Mission Control 特性**:
- 实时信任评分 (0-100)
- Hook 配置文件：minimal/standard/strict
- MCP 工具调用审计

### Cron (定时任务)

```json
{
  "stats": {
    "totalTasks": 3,
    "enabledTasks": 2,
    "disabledTasks": 1,
    "todayExecutions": 5
  },
  "tasks": [
    {
      "id": "cron1",
      "name": "每日数据备份",
      "cron": "0 2 * * *",
      "agentId": "xiaokai",
      "enabled": true,
      "lastRun": "2026-03-24T08:24:09Z",
      "successCount": 128
    }
  ]
}
```

**Mission Control 特性**:
- 自然语言调度："every morning at 9am"
- Cron 表达式解析
- 模板派生子任务

### Webhooks

```json
{
  "stats": {
    "totalWebhooks": 2,
    "enabledWebhooks": 2,
    "todayDeliveries": 2118
  },
  "webhooks": [
    {
      "id": "wh1",
      "name": "生产环境告警",
      "url": "https://api.example.com/webhooks/alerts",
      "events": ["agent.error", "log.error"],
      "algorithm": "HMAC-SHA256",
      "retryPolicy": "exponential",
      "successCount": 1247
    }
  ]
}
```

**Mission Control 特性**:
- HMAC-SHA256 签名
- 重试策略和断路器
- 测试端点：`POST /api/webhooks/test`

## 环境变量配置

创建 `.env` 文件：

```bash
# OpenClaw 服务配置
OPENCLAW_HOST=localhost
OPENCLAW_PORT=3100

# Gateway 服务配置 (可选)
GATEWAY_HOST=127.0.0.1
GATEWAY_PORT=18789

# 前端 API 基础地址
VITE_API_BASE_URL=
```

## 启动顺序

1. **启动 OpenClaw 后端** (端口 3100)
   ```bash
   # 根据你的 OpenClaw 部署方式启动
   ```

2. **启动本地代理服务器** (端口 18888)
   ```bash
   ./start-dev.sh
   # 或
   node server/index.js
   ```

3. **启动前端开发服务器** (端口 3000)
   ```bash
   npm run dev
   ```

4. **访问应用**
   - 前端：http://localhost:3000
   - 后端 API：http://localhost:18888
   - OpenClaw: http://localhost:3100

## 故障排除

### API 返回 404

确保 OpenClaw 后端有对应的 API 端点。如果没有，需要：
1. 在 OpenClaw 中实现相应 API
2. 或在 `server/index.js` 中添加转换层

### 数据格式不匹配

检查 OpenClaw 返回的数据格式是否与前端期望的格式一致。如果不一致，需要在 `server/index.js` 中添加数据转换：

```javascript
const openClawData = await proxyToOpenClaw('/api/skills')
const transformedData = transformOpenClawSkills(openClawData)
res.json({ success: true, skills: transformedData })
```

### CORS 错误

确保 OpenClaw 后端配置了正确的 CORS 头：

```javascript
// OpenClaw 后端配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:18888'],
  credentials: true
}))
```

## 下一步

1. **确认 OpenClaw API 端点**: 检查 `http://localhost:3100` 有哪些 API 可用
2. **实现数据转换层**: 如果 OpenClaw 的数据格式与前端期望不一致
3. **测试所有页面**: 确保每个页面都能正确显示数据
4. **添加错误处理**: 处理 OpenClaw 不可用时的降级逻辑

---

**文档更新时间**: 2026-03-25
