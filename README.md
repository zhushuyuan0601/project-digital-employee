# 数字员工 - 多 Agent 协作管理平台

> 联通人工智能产品部 | AI 数字员工团队协作平台

---

## 📋 项目立项信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 数字员工 |
| **项目类型** | AI 多 Agent 协作管理平台 |
| **立项日期** | 2026-03-23 |
| **负责人** | 领导 |
| **项目状态** | 🚀 长期规划项目 |
| **技术栈** | Vue 3 + TypeScript + Vite + Element Plus |

---

## 🎯 项目愿景

打造企业级 AI 数字员工协作平台，实现：
- 🤖 多 Agent 智能调度与协作
- 📋 任务自动化分配与跟踪
- 🔄 工作流可视化与优化
- 📊 效率分析与持续改进

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | Vue 3 (Composition API) |
| **语言** | TypeScript 5.x |
| **构建工具** | Vite 5.x |
| **UI 组件库** | Element Plus |
| **状态管理** | Pinia |
| **路由** | Vue Router 4.x |
| **HTTP 客户端** | Axios |
| **工具库** | @vueuse/core |

---

## 👥 数字员工团队

| 角色 | 名称 | Agent ID | 职责 |
|------|------|----------|------|
| 🐾 任务秘书 | 小U | ceo | 统筹调度、任务分配、汇报 |
| 💻 研发工程师 | 小开 | tech-lead | 技术总监&开发工程师 |
| 📊 产品经理 | 小产 | pm | 产品需求分析 |
| 🔍 竞品分析师 | 小研 | researcher | 市场调研 |

---

## 🚀 核心功能

### 任务中心
- 📋 创建、分配、执行任务
- 🔄 任务流转可视化
- 📊 任务进度实时跟踪

### Agent 管理
- 🤖 查看和管理所有 Agent 状态
- 📈 Agent 工作统计
- 🔔 任务通知与提醒

### 工作流引擎
- 🔀 自定义工作流配置
- ⚡ 自动化任务调度
- 🔗 跨 Agent 协作编排

### 数据看板
- 📊 效率分析报表
- 📈 趋势预测
- 🎯 KPI 追踪

---

## 📁 项目结构

```
digital-employee/
├── src/
│   ├── main.ts                 # 应用入口
│   ├── router.ts               # 路由配置
│   ├── App.vue                 # 根组件
│   ├── types/                  # TypeScript 类型定义
│   │   ├── agent.ts            # Agent 类型
│   │   ├── task.ts             # 任务类型
│   │   └── index.ts            # 类型导出
│   ├── stores/                 # Pinia 状态管理
│   │   ├── agents.ts           # Agent 状态
│   │   └── tasks.ts            # 任务状态
│   ├── api/                    # API 接口
│   │   └── task.ts             # 任务 API
│   ├── components/             # 可复用组件
│   │   ├── AgentCard.vue       # Agent 卡片
│   │   └── TaskFlow.vue        # 任务流程可视化
│   ├── views/                  # 页面视图
│   │   ├── Dashboard.vue       # 首页
│   │   ├── Agents.vue          # Agent 管理
│   │   └── TaskCenter.vue      # 任务中心
│   └── styles/                 # 全局样式
│       └── index.css           # 全局样式
├── public/                     # 静态资源
├── server/                     # 后端服务
├── package.json                # 项目配置
├── vite.config.ts              # Vite 配置
└── README.md                   # 项目文档
```

---

## 🏃 快速开始

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

---

## 🔌 API 代理配置

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

---

## 🎨 设计规范

- **主题风格**: 暗色毛玻璃主题 (Glassmorphism)
- **配色方案**: 中国联通风格
- **动画效果**: 流畅渐变 + 粒子特效
- **设计语言**: 现代简约科技风

---

## 📅 开发路线图

### Phase 1: 基础功能 (已完成 ✅)
- [x] Agent 管理界面
- [x] 任务中心基础功能
- [x] 任务流转可视化
- [x] 状态同步机制

### Phase 2: 增强功能 (进行中 🚧)
- [ ] 工作流引擎
- [ ] 数据看板
- [ ] 效率分析
- [ ] 通知系统

### Phase 3: 智能化 (规划中 📋)
- [ ] AI 任务推荐
- [ ] 智能调度算法
- [ ] 预测分析
- [ ] 自动化工作流

### Phase 4: 企业级 (规划中 📋)
- [ ] 多租户支持
- [ ] 权限管理
- [ ] 审计日志
- [ ] API 开放平台

---

## 👨‍💻 维护团队

| 成员 | 角色 | GitHub |
|------|------|--------|
| 领导 | 项目负责人 | @zhushuyuan0601 |
| 小U | 任务秘书 | AI Agent |
| 小开 | 研发工程师 | AI Agent |
| 小产 | 产品经理 | AI Agent |
| 小研 | 竞品分析师 | AI Agent |

---

## 📄 License

MIT License

---

## 🔗 相关链接

- **GitHub**: https://github.com/zhushuyuan0601/digital-employee
- **文档**: [项目文档](./docs/)
- **更新日志**: [CHANGELOG.md](./CHANGELOG.md)

---

> 🚀 **数字员工** - 让 AI 成为你的工作伙伴