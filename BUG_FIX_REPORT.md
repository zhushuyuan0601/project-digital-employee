# 修复说明 - 本地 API 与 Runtime 验证

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

## Mission Control 参考

参考 Mission Control 项目 (https://github.com/builderz-labs/mission-control) 的设计：

- **39 个数据库迁移**：SQLite + WAL 模式
- **101 个 REST API 端点**
- **实时 WebSocket + SSE**
- **多技能根目录**: `~/.agents/skills/`, `~/.claude/skills/` 等
- **安全扫描**: prompt injection, credential leaks 等检测

当前项目以本地 Node API、SQLite、Claude Agent SDK Runtime、成果目录和观测接口为主要验证对象。

## 文件清单

### 新增/修改的文件

| 文件 | 说明 |
|------|------|
| `server/index.js` | 添加混合模式代理逻辑 |
| `src/api/index.ts` | 使用相对路径 API |
| `vite.config.ts` | 添加所有 API 代理配置 |
| `start-dev.sh` | 开发环境启动脚本 |
| `BUG_FIX_REPORT.md` | 本文档 |

### 模拟数据来源

当前所有模拟数据都在 `server/index.js` 中：

- `SKILLS_DB` - 9 个技能
- `generateTokenData()` - Token 使用数据
- Memory, Security, Cron, Webhooks 的内联数据

## 下一步

1. **验证 Runtime 配置**: 检查 `/api/runtime/status` 和 `/api/runtime/config`
2. **验证任务编排**: 创建任务，确认计划、子任务、自动汇总和成果绑定正常
3. **验证观测接口**: 检查 runs、events、outputs、runtime diagnostics
4. **测试所有页面**: 访问每个页面确认数据正确显示

---

**修复时间**: 2026-03-25
**版本**: v1.1.0
