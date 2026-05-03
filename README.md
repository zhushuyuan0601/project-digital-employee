# OpenClaw Unicom UI - 多 Agent 协作管理平台

基于 **Vue 3 + Vite + TypeScript + Pinia + Element Plus** 的多 Agent 协作管理平台。

## 🚀 快速开始

### 一键安装（推荐）

```bash
# 克隆项目
git clone <项目地址>
cd unicom-ui-new.bak

# 一键安装所有依赖
./scripts/install.sh

# 启动服务
./start-dev.sh
```

访问 http://localhost:3000

### 手动安装

详细安装步骤请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router 4.x
- **HTTP 客户端**: Axios
- **工具库**: @vueuse/core

## 功能特性

### 角色定义
| 角色 | 名称 | 职责 |
|------|------|------|
| 小 U | 任务秘书 | 统筹调度、任务分配、汇报 |
| 小开 | 研发工程师 | 技术总监&开发工程师 |
| 小产 | 产品经理 | 产品需求分析 |
| 小研 | 竞品分析师 | 市场调研 |

### 核心功能
- 📋 **任务中心**: 创建、分配、执行任务
- 🤖 **Agent 管理**: 查看和管理所有 Agent 状态
- 📊 **任务流转**: 实时查看任务执行进度
- 🔄 **状态同步**: Agent 状态实时更新

### 界面特点
- 毛玻璃效果 (Glassmorphism)
- 动态渐变背景
- 流畅的动画效果
- 粒子特效
- 中国联通风格配色

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── router.ts               # 路由配置
├── App.vue                 # 根组件
├── types/                  # TypeScript 类型定义
│   ├── agent.ts            # Agent 类型
│   ├── task.ts             # 任务类型
│   └── index.ts            # 类型导出
├── stores/                 # Pinia 状态管理
│   ├── agents.ts           # Agent 状态
│   └── tasks.ts            # 任务状态
├── api/                    # API 接口
│   └── task.ts             # 任务 API
├── components/             # 可复用组件
│   ├── AgentCard.vue       # Agent 卡片
│   └── TaskFlow.vue        # 任务流程可视化
├── views/                  # 页面视图
│   ├── Dashboard.vue       # 首页
│   ├── Agents.vue          # Agent 管理
│   ├── TaskCenter.vue      # 任务中心
│   └── ...
└── styles/                 # 全局样式
    └── index.css           # 全局样式
```

## 安装和运行

### 前置条件

- **Node.js** v18+
- **npm** v8+
- **OpenClaw Gateway** (`npm install -g openclaw`)

### 安装依赖

```bash
# 一键安装（推荐）
./scripts/install.sh

# 手动安装
npm install
cd server && npm install && cd ..
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 Gateway Token
```

### 开发模式

```bash
# 启动所有服务（推荐）
./start-dev.sh

# 启动数据分析工作台后端链路
npm run analysis:start

# 停止数据分析工作台后端链路
npm run analysis:stop

# 或者分别启动
# 1. 启动 Gateway: openclaw gateway start
# 2. 启动后端：cd server && node index.js
# 3. 启动前端：npm run dev
```

访问 http://localhost:3000

### 数据分析工作台启动说明

数据分析工作台依赖两个本地服务：

- `analysis_service`：Python 分析执行服务，默认端口 `18900`
- `server/index.js`：Node API 代理，默认端口 `18888`

推荐启动方式：

```bash
npm run analysis:start
npm run dev
```

访问地址：

- 工作台页面：`http://localhost:3000/analysis`
- 分析服务健康检查：`http://127.0.0.1:18900/health`
- Node 代理模型接口：`http://127.0.0.1:18888/api/analysis/models`

首次使用前请先准备 Python 虚拟环境：

```bash
cd analysis_service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

如果页面里未填写 `API Base`，还需要在运行环境中配置默认模型地址，例如：

```bash
export ANALYSIS_DEFAULT_API_BASE=http://your-openai-compatible-endpoint/v1
export ANALYSIS_DEFAULT_API_KEY=your-key
export ANALYSIS_DEFAULT_MODEL=gpt-4o-mini
```

### 生产构建

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 外部依赖说明

本项目依赖 **OpenClaw Gateway** 进行 Agent 消息转发和会话管理。

### 安装 OpenClaw Gateway

```bash
npm install -g openclaw
```

### 启动 Gateway

```bash
openclaw gateway start
```

### 获取 Gateway Token

```bash
openclaw gateway token
```

将获取的 Token 配置到 `.env` 文件的 `VITE_GATEWAY_TOKEN` 变量中。

详细部署指南请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 主要页面

### 任务中心 (`/task-center`)
- 快速下达任务
- 选择执行 Agent
- 查看任务流转
- Agent 状态概览

### Agent 管理 (`/agents`)
- 查看所有 Agent 状态
- 查看完成任务数
- 分配任务

### Dashboard (`/dashboard`)
- 系统概览
- 快速操作入口
- 最近会话

## 开发说明

### 创建新任务
```typescript
import { useTasksStore } from '@/stores/tasks'

const tasksStore = useTasksStore()
const task = tasksStore.createTask('任务标题', '任务描述')
```

### 分配任务给 Agent
```typescript
tasksStore.assignTask(taskId, agentId)
```

### 更新任务进度
```typescript
tasksStore.updateTaskProgress(taskId, 50) // 50%
```

### 完成任务
```typescript
tasksStore.updateTaskStatus(taskId, 'completed')
```

## API 代理配置

开发服务器配置了 API 代理到 `http://127.0.0.1:18789`

```javascript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:18789',
      changeOrigin: true,
      ws: true
    }
  }
}
```

## 主题风格

- 暗色毛玻璃主题
- 渐变背景效果
- 粒子动画
- 中国联通风格配色

## 浏览器支持

- Chrome (推荐)
- Firefox 90+
- Safari 14+
- Edge 90+

## License

MIT
