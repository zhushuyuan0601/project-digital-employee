# 修复说明 - 模拟数据问题

## 问题描述

对接后端 API 后，页面显示内容为空（如 Skills 页面什么都没有），原因是：
1. 本地后端服务器 (18888) 没有正确启动或加载路由
2. `generateTokenData` 函数中存在变量初始化顺序 bug

## 已修复的问题

### 1. Tokens API Bug

**问题**: `generateTokenData` 函数中在 `stats` 对象声明之前就使用了 `stats.totalTokens`

**修复前**:
```javascript
const stats = {
  totalTokens: trend.reduce(...),
  totalCost: parseFloat((stats.totalTokens * 0.000005).toFixed(2)),  // ❌ stats 未定义
  ...
}
```

**修复后**:
```javascript
const totalTokens = trend.reduce((sum, d) => sum + d.input + d.output, 0)
const inputTokens = trend.reduce((sum, d) => sum + d.input, 0)
const outputTokens = trend.reduce((sum, d) => sum + d.output, 0)

const stats = {
  totalTokens: totalTokens,
  totalCost: parseFloat((totalTokens * 0.000005).toFixed(2)),  // ✅ 使用已定义的变量
  ...
}
```

### 2. 服务器重启问题

修改代码后需要重启服务器才能加载新路由。

## 当前状态

所有 API 端点正常工作：

| API 端点 | 状态 | 数据 |
|----------|------|------|
| `/api/skills` | ✅ 正常 | 9 个技能 |
| `/api/tokens/stats` | ✅ 正常 | ~350K tokens |
| `/api/memory` | ✅ 正常 | 4 个文件，4 个节点 |
| `/api/security/audit` | ✅ 正常 | 安全评分 87 |
| `/api/cron/tasks` | ✅ 正常 | 3 个任务 |
| `/api/webhooks` | ✅ 正常 | 2 个 webhook |

## 启动步骤

### 快速启动

```bash
# 1. 使用启动脚本
./start-dev.sh

# 2. 手动启动
# 停止已有进程
pkill -f "node server/index.js"

# 启动后端
node server/index.js &

# 启动前端
npm run dev
```

### 访问地址

- 前端：http://localhost:3000
- 后端 API: http://localhost:18888

## 测试 API

```bash
# 测试 Skills API
curl http://localhost:18888/api/skills | python3 -m json.tool

# 测试 Tokens API
curl http://localhost:18888/api/tokens/stats | python3 -m json.tool

# 测试所有 API
./test-apis.sh  # 创建此脚本运行测试
```

## 对接 OpenClaw (端口 3100)

如果你的 OpenClaw 后端在 `http://localhost:3100`，有两种对接方式：

### 方式 1: 修改 Vite 代理（推荐用于开发）

编辑 `vite.config.ts`，将代理目标改为 OpenClaw：

```typescript
'/api/skills': {
  target: 'http://localhost:3100',
  changeOrigin: true
}
```

### 方式 2: 修改 server/index.js 转发（推荐用于生产）

在 `server/index.js` 中添加 OpenClaw 代理逻辑，保持混合模式：

```javascript
const OPENCLAW_HOST = 'localhost'
const OPENCLAW_PORT = 3100

// 在各 API 端点中优先从 OpenClaw 获取数据
```

详细参考：[OPENCLAW_INTEGRATION.md](./OPENCLAW_INTEGRATION.md)

## Mission Control 参考

参考 Mission Control 项目 (https://github.com/builderz-labs/mission-control) 的设计：

- **39 个数据库迁移**：SQLite + WAL 模式
- **101 个 REST API 端点**
- **实时 WebSocket + SSE**
- **多技能根目录**: `~/.agents/skills/`, `~/.claude/skills/` 等
- **安全扫描**: prompt injection, credential leaks 等检测

详细数据模型参考：[OPENCLAW_INTEGRATION.md](./OPENCLAW_INTEGRATION.md#mission-control-参考数据模型)

## 文件清单

### 新增/修改的文件

| 文件 | 说明 |
|------|------|
| `server/index.js` | 添加混合模式代理逻辑 |
| `src/api/index.ts` | 使用相对路径 API |
| `vite.config.ts` | 添加所有 API 代理配置 |
| `start-dev.sh` | 开发环境启动脚本 |
| `OPENCLAW_INTEGRATION.md` | OpenClaw 对接指南 |
| `API_CONFIGURATION.md` | API 配置说明 |
| `BUG_FIX_REPORT.md` | 本文档 |

### 模拟数据来源

当前所有模拟数据都在 `server/index.js` 中：

- `SKILLS_DB` - 9 个技能
- `generateTokenData()` - Token 使用数据
- Memory, Security, Cron, Webhooks 的内联数据

## 下一步

1. **确认 OpenClaw API**: 检查 `http://localhost:3100` 的 API 端点
2. **数据格式对齐**: 确保 OpenClaw 返回的数据格式与前端期望一致
3. **实现转发逻辑**: 在 `server/index.js` 中添加 OpenClaw 转发
4. **测试所有页面**: 访问每个页面确认数据正确显示

---

**修复时间**: 2026-03-25
**版本**: v1.1.0
