# 新电脑使用流程

本文档面向当前 `codex/feature0503` 分支。项目已经内置可用默认配置，新电脑不需要创建 `.env`。

## 1. 准备环境

需要提前安装：

- Node.js 20 或更高版本
- npm
- Claude Code 本机登录状态，用于真实 Claude Runtime 调用

确认版本：

```bash
node -v
npm -v
```

## 2. 拉取项目

```bash
git clone <repo-url>
cd project-digital-employee
git checkout codex/feature0503
npm install
```

## 3. 启动服务

打开两个终端。

终端 1 启动后端：

```bash
npm run dev:server
```

终端 2 启动前端：

```bash
npm run dev:client
```

浏览器访问：

```text
http://localhost:3000
```

后端健康检查：

```text
http://localhost:18888/health
```

## 4. 默认配置

没有 `.env` 时，项目自动使用以下默认值：

```text
前端端口: 3000
后端端口: 18888
数据库: server/data/mission-control-claude.db
Claude Runtime CWD: 当前项目根目录
任务隔离工作区: server/data/runtime-workspaces
报告目录: server/data/task-outputs
并发数: 3
允许工具: Read,Glob,Grep
Mock Runtime: false
```

这些目录会在启动时自动创建。

## 5. 可选覆盖配置

普通使用不需要 `.env`。

只有需要改端口、数据库路径、Mock 状态或外部服务时，才创建 `.env`。可以参考 `.env.example`。

常见覆盖：

```env
PORT=18888
DB_PATH=server/data/mission-control-claude.db
CLAUDE_RUNTIME_MOCK=false
CLAUDE_AGENT_MAX_CONCURRENCY=3
```

注意：`.env` 已被 `.gitignore` 忽略，不应提交。

## 6. Claude Runtime 检查

进入系统配置页，可以看到：

- 当前数据库路径
- 配置来源
- Claude SDK 是否可用
- DB 是否可写
- CWD 是否存在
- 工作区和报告目录是否可写

如果没有 `.env`，配置来源会显示内置默认配置。

如果仍看到 Mock 回复，请检查：

```text
CLAUDE_RUNTIME_MOCK
```

默认是 `false`。只有显式设置为 `true` 时才会返回 Mock 报告。

## 7. 数据库隔离

当前分支默认使用：

```text
server/data/mission-control-claude.db
```

旧 OpenClaw 分支可继续使用：

```text
server/data/mission-control.db
```

这样切换分支时不会互相污染任务数据。

## 8. 后台启动方式

如果希望关闭终端后服务仍运行，可以用 `screen`。

启动：

```bash
screen -dmS pde-server zsh -lc 'cd /path/to/project-digital-employee && npm run dev:server'
screen -dmS pde-client zsh -lc 'cd /path/to/project-digital-employee && npm run dev:client'
```

查看：

```bash
screen -ls
```

停止：

```bash
screen -S pde-server -X quit
screen -S pde-client -X quit
```

## 9. 常见问题

### 页面打不开

检查前端是否启动：

```bash
curl -I http://localhost:3000
```

### 后端不可用

检查后端：

```bash
curl http://localhost:18888/health
```

### Claude Runtime 未就绪

先确认 Claude Code 在新电脑上已登录，并在系统配置页查看 SDK、CWD、目录权限状态。

### 端口被占用

查看端口：

```bash
lsof -i tcp:3000
lsof -i tcp:18888
```

停止占用进程后重新启动。

