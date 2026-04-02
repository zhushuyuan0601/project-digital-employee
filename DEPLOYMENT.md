# 部署指南 - 多 Agent 协作管理平台

## 项目依赖总览

### 必需的外部依赖

| 依赖 | 用途 | 是否必需 | 获取方式 |
|------|------|---------|---------|
| **OpenClaw Gateway** | Agent 消息转发和会话管理 | **必需** | `npm install -g openclaw` |
| **Node.js** | 运行环境 | **必需** | https://nodejs.org/ (推荐 v18+) |
| **npm** | 包管理 | **必需** | 随 Node.js 一起安装 |

### 项目内部依赖

| 目录 | 依赖文件 | 安装方式 |
|------|---------|---------|
| 根目录 | `node_modules/` | `npm install` |
| server/ | `server/node_modules/` | `cd server && npm install` |

---

## 快速部署（一键启动）

### 前置条件检查

确保已安装以下软件：

```bash
# 检查 Node.js (需要 v18+)
node --version

# 检查 npm
npm --version

# 检查 OpenClaw (必需)
openclaw --version
```

如果 `openclaw` 未安装，请先安装：

```bash
npm install -g openclaw
```

### 一键部署脚本

项目提供了完整的自动化部署脚本：

```bash
# 1. 克隆项目
git clone <项目地址>
cd unicom-ui-new.bak

# 2. 安装所有依赖
./scripts/install.sh

# 3. 启动服务
./start-dev.sh
```

如果还没有自动化脚本，手动执行以下步骤：

---

## 详细部署步骤

### 步骤 1：克隆项目

```bash
git clone <项目地址>
cd unicom-ui-new.bak
```

### 步骤 2：安装前端依赖

```bash
npm install
```

### 步骤 3：安装后端依赖

```bash
cd server
npm install
cd ..
```

### 步骤 4：配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 Gateway 连接信息：

```bash
# Gateway WebSocket 代理路径（使用 Vite 代理）
VITE_GATEWAY_WS_PATH=/ws

# 直接连接 Gateway（可选，如果不用代理）
# VITE_GATEWAY_HOST=127.0.0.1
# VITE_GATEWAY_PORT=18789

# Gateway 认证令牌（必需，从你的 OpenClaw Gateway 获取）
VITE_GATEWAY_TOKEN=your-gateway-token-here

# Gateway 客户端 ID
VITE_GATEWAY_CLIENT_ID=unicom-mission-control
```

### 步骤 5：启动 OpenClaw Gateway

```bash
# 启动 Gateway（端口 18789）
openclaw gateway start

# 检查 Gateway 状态
openclaw gateway status
```

确保 Gateway 正在运行并记录 Token（用于 .env 配置）。

### 步骤 6：启动后端服务器

```bash
# 方式 1：使用启动脚本
./start-dev.sh

# 方式 2：手动启动
cd server
node index.js
# 或使用 nodemon 开发模式
npm run dev
```

后端服务将在 `http://localhost:18888` 启动。

### 步骤 7：启动前端开发服务器

```bash
npm run dev
```

前端服务将在 `http://localhost:3000` 启动。

### 步骤 8：访问应用

打开浏览器访问：http://localhost:3000

---

## 生产环境部署

### 构建生产版本

```bash
# 1. 构建前端
npm run build

# 构建产物在 dist/ 目录
```

### 使用 PM2 部署生产环境

安装 PM2：

```bash
npm install -g pm2
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'unicom-frontend',
      script: 'npx',
      args: 'vite preview --port 3000 --host 0.0.0.0',
      cwd: '/path/to/unicom-ui-new.bak',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'unicom-backend',
      script: 'node',
      args: 'index.js',
      cwd: '/path/to/unicom-ui-new.bak/server',
      env: {
        NODE_ENV: 'production',
        PORT: '18888'
      }
    },
    {
      name: 'openclaw-gateway',
      script: 'openclaw',
      args: 'gateway start',
      env: {
        OPENCLAW_STATE_DIR: '/path/to/.openclaw'
      }
    }
  ]
};
```

启动服务：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 常见问题排查

### 1. OpenClaw Gateway 未安装

**错误信息**: `command not found: openclaw`

**解决方案**:
```bash
npm install -g openclaw
```

### 2. 前端依赖安装失败

**错误信息**: `npm ERR! code ENOENT` 或 `npm ERR! Cannot find module`

**解决方案**:
```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 3. 后端数据库初始化失败

**错误信息**: `Error: no such table: xxx`

**解决方案**:
后端会在首次启动时自动初始化数据库。如果失败，请删除数据库文件后重启：

```bash
rm -f server/data/*.db server/data/*.db-shm server/data/*.db-wal
# 重启后端
node server/index.js
```

### 4. Gateway 连接失败

**错误信息**: `WebSocket connection failed` 或 `missing scope: operator.admin`

**解决方案**:
1. 检查 Gateway 是否运行：`openclaw gateway status`
2. 检查 Token 配置是否正确
3. 检查端口 18789 是否被占用：`lsof -ti:18789`

### 5. 端口被占用

**错误信息**: `Port 3000 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -ti:3000

# 杀死进程
kill -9 $(lsof -ti:3000)

# 或修改配置使用其他端口
```

---

## 服务管理命令

### 启动服务

```bash
# Gateway
openclaw gateway start

# 后端
cd server && node index.js

# 前端
npm run dev
```

### 停止服务

```bash
# Gateway
openclaw gateway stop

# 后端
pkill -f "node server/index.js"

# 前端
# Ctrl + C 停止
```

### 查看日志

```bash
# Gateway 日志
openclaw gateway logs

# 后端日志
tail -f /tmp/unicom-server.log

# 前端日志
# 在开发服务器控制台查看
```

### 健康检查

```bash
# 检查后端
curl http://localhost:18888/health

# 检查 Gateway
openclaw gateway health
```

---

## 架构说明

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   浏览器        │────▶│   Vite 开发服务器│────▶│   后端服务器     │
│  (localhost:3000)│     │  (localhost:3000)│     │ (localhost:18888)│
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                          ┌─────────────────┐           │
                          │  OpenClaw       │◀──────────┘
                          │  Gateway        │  HTTP API
                          │ (localhost:18789)│
                          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │  Claude Code    │
                          │  Agent Sessions │
                          └─────────────────┘
```

### 组件说明

| 组件 | 端口 | 职责 |
|------|------|------|
| Vite 前端 | 3000 | 用户界面、WebSocket 连接 |
| 后端服务器 | 18888 | API 代理、数据库、消息转发 |
| OpenClaw Gateway | 18789 | Agent 会话管理、消息路由 |

---

## 安全建议

1. **不要提交 `.env` 文件到 Git** - 包含敏感 Token 信息
2. **生产环境使用 HTTPS** - 配置反向代理（如 Nginx）
3. **定期更新依赖** - `npm audit fix`
4. **限制 Gateway 访问** - 配置防火墙规则

---

## 开发环境快速重置

```bash
# 1. 停止所有服务
pkill -f "node server/index.js"
pkill -f "vite"
openclaw gateway stop

# 2. 清理数据库
rm -f server/data/*.db server/data/*.db-shm server/data/*.db-wal

# 3. 清理构建产物
rm -rf dist

# 4. 重新安装依赖
rm -rf node_modules server/node_modules
npm install
cd server && npm install && cd ..

# 5. 重新启动
./start-dev.sh
```

---

## 联系与支持

如有问题，请提交 Issue 或联系开发团队。
