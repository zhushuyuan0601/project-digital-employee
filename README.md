# OpenClaw Unicom UI - 多 Agent 协作管理平台

基于 **Vue 3 + Vite + TypeScript + Pinia + Element Plus** 的多 Agent 协作管理平台。

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

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:3000

### 生产构建
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

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
