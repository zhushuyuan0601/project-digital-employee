# API 配置说明

## 概述

本项目所有新增页面（Skills, Tokens, Memory, Security, Cron, Webhooks）的 API 已配置为**混合模式**：
- 优先从 Gateway 服务 (18789) 获取真实数据
- 如果 Gateway 不可用或未实现对应 API，自动降级使用模拟数据

## 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                      │
│  Vue 3 + Vite + TypeScript + Pinia                           │
│  - Skills.vue, Tokens.vue, Memory.vue, Security.vue         │
│  - Cron.vue, Webhooks.vue                                    │
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
│  - /api/skills       - 技能管理                              │
│  - /api/tokens       - 成本追踪                              │
│  - /api/memory       - 内存图谱                              │
│  - /api/security     - 安全审计                              │
│  - /api/cron         - 定时任务                              │
│  - /api/webhooks     - Webhook 管理                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    转发到 Gateway (如果可用)
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Gateway Service (Port 18789)                │
│  WebSocket 服务，用于 Agent 通信                               │
│  - ws://127.0.0.1:18789                                      │
│  - HTTP API (可选): /api/skills, /api/tokens, etc.          │
└─────────────────────────────────────────────────────────────┘
```

## 配置详情

### Vite 代理配置 (vite.config.ts)

```typescript
server: {
  port: 3000,
  proxy: {
    '/api/skills': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/api/tokens': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/api/memory': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/api/security': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/api/cron': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/api/webhooks': {
      target: 'http://127.0.0.1:18888',
      changeOrigin: true
    },
    '/ws': {
      target: 'ws://127.0.0.1:18789',
      ws: true
    }
  }
}
```

### API 服务模块 (src/api/index.ts)

```typescript
// 使用相对路径，通过 Vite 代理转发到后端服务器
const API_BASE_URL = ''
```

### 后端服务器配置 (server/index.js)

```javascript
// Gateway 服务地址
const GATEWAY_HOST = process.env.GATEWAY_HOST || '127.0.0.1'
const GATEWAY_PORT = process.env.GATEWAY_PORT || 18789

// 代理请求到 Gateway 服务
function proxyToGateway(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    // ... HTTP 请求逻辑
  })
}

// 每个 API 端点都优先尝试从 Gateway 获取数据
app.get('/api/skills', async (req, res) => {
  try {
    // 尝试从 Gateway 获取
    const gatewayData = await proxyToGateway('/api/skills')
    if (gatewayData && gatewayData.success) {
      return res.json(gatewayData)
    }
  } catch (e) {
    // Gateway 不可用，使用模拟数据
  }
  // 返回模拟数据
  res.json({ success: true, skills: SKILLS_DB })
})
```

## 启动服务

### 1. 启动后端服务器

```bash
node server/index.js
```

服务将在 `http://localhost:18888` 启动。

### 2. 启动前端开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:3000` 启动。

### 3. 访问应用

打开浏览器访问 `http://localhost:3000`

## 当前数据源

目前所有 API 端点返回的都是**模拟数据**，用于开发和测试。

### 模拟数据模块

| 模块 | 端点 | 数据来源 |
|------|------|----------|
| Skills | /api/skills | server/index.js SKILLS_DB |
| Tokens | /api/tokens/stats | generateTokenData() |
| Memory | /api/memory | generateMemoryData() |
| Security | /api/security/audit | generateSecurityData() |
| Cron | /api/cron/tasks | CRON_TASKS_DB |
| Webhooks | /api/webhooks | WEBHOOKS_DB |

## 对接真实后端

如需对接真实后端 API，需要：

### 方案 A：修改后端服务器转发

编辑 `server/index.js`，将模拟数据替换为真实 API 调用：

```javascript
// 示例：Skills API 对接真实后端
app.get('/api/skills', async (req, res) => {
  try {
    // 转发到 Gateway 或其他后端服务
    const response = await fetch('http://127.0.0.1:18789/api/skills')
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})
```

### 方案 B：直接调用 Gateway API

修改 `src/api/index.ts` 中的 `API_BASE_URL`：

```typescript
// 直接调用 Gateway API（需要 Gateway 支持）
const API_BASE_URL = 'http://127.0.0.1:18789'
```

并更新 `vite.config.ts` 移除相关代理配置。

## 环境变量

可以通过环境变量配置 API 地址：

```bash
# .env 文件
VITE_API_BASE_URL=http://127.0.0.1:18888
```

## 注意事项

1. **开发模式**：使用 Vite 代理，所有 `/api/*` 请求转发到 `http://127.0.0.1:18888`
2. **生产模式**：需要配置正确的 API 服务器地址
3. **WebSocket**：`/ws` 请求转发到 `ws://127.0.0.1:18789` 用于 Agent 通信
4. **跨域问题**：开发模式下由 Vite 代理处理，生产模式需要后端配置 CORS

## 故障排除

### API 请求失败

1. 确认后端服务器已启动：`curl http://127.0.0.1:18888/health`
2. 检查 Vite 代理配置是否正确
3. 查看浏览器控制台网络请求

### Gateway 连接失败

1. 确认 Gateway 服务已启动：`curl http://127.0.0.1:18789/health`
2. 检查 WebSocket 连接配置

## 下一步

1. **数据采集**：确定各模块的真实数据来源
2. **API 开发**：在 Gateway 或后端服务中实现真实 API
3. **数据对接**：更新 server/index.js 转发请求到真实 API
4. **测试验证**：确保所有功能正常工作

---

**文档更新时间**: 2026-03-24
**版本**: v1.0.0
