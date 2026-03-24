# 数字员工项目（Digital Employee） 🐾

AI 多 Agent 协作管理平台，集成 Mission Control 看板系统和 Star Office UI 像素办公室，实现智能体协作可视化。

[![Vue](https://img.shields.io/badge/Vue-3.4-green.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![Vant](https://img.shields.io/badge/Vant-4.8-blue.svg)](https://vant-contrib.gitee.io/vant/)

---

## 📖 项目简介

数字员工项目是一个智能体协作可视化平台，通过 3 个核心模块实现 AI 智能体的实时状态监控和协作管理：

- **数字员工主界面**: 3 个 Tab（对话、开发监控、像素办公室）
- **Mission Control 看板**: 智能体自动化协作系统 + 终端日志
- **Star Office UI**: 像素风格办公室状态可视化

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- npm >= 9.0
- Python >= 3.8（Star Office UI 需要）

### 一键启动所有服务

```bash
cd ~/.openclaw/shared-workspace/project-digital-employee
./start-all-services.sh
```

### 访问应用

- **数字员工主界面**: http://localhost:5173/
- **Mission Control 看板**: http://localhost:3000/
- **Star Office UI**: http://127.0.0.1:19000/

### 测试智能体状态同步

```bash
./agent-status-sync-v2.sh tech-lead executing
```

---

## 📂 项目结构

```
project-digital-employee/
├── src/                           ✅ 数字员工主界面
│   ├── App.vue                    3个Tab（对话/开发监控/像素办公室）
│   ├── api/                       API 接口
│   ├── main.js                    入口文件
│   └── style.css                  全局样式
├── Star-Office-UI/                ✅ 像素办公室完整代码
│   ├── frontend/                  像素风格前端
│   ├── backend/                   Flask 后端
│   └── state.json                 状态文件
├── kanban-full-managed/           ✅ 看板系统完整代码
│   ├── packages/frontend/         前端（Vite + React）
│   ├── packages/backend/          后端（Express + Socket.io）
│   └── prisma/                    数据库配置
├── logs/                          项目日志
├── package.json                   项目配置
├── vite.config.js                 Vite 配置
├── start-all-services.sh          一键启动脚本 ⭐
├── stop-all-services.sh           一键停止脚本
└── agent-status-sync-v2.sh        智能体状态同步脚本 ⭐
```

---

## 🤖 智能体角色

| 角色 | Agent ID | Emoji | 负责人 | 功能 |
|------|----------|-------|--------|------|
| 小研 | researcher | 🔍 | 小研（竞品分析师） | 调研、分析、热点发现 |
| 小产 | pm | 📊 | 小产（产品经理） | 需求、PRD、产品验收 |
| 小开 | tech-lead | 💻 | 小开（研发工程师） | 技术评估、架构设计、开发 |
| 小测 | team-qa | 🛡️ | 小测（质量检查员） | 代码审查、测试验证 |

---

## 🎯 核心功能

### 1. 数字员工主界面（3 个 Tab）

#### Tab 1: 对话 💬
- AI 智能体多轮对话
- 支持文本输入和语音输入
- 历史对话记录

#### Tab 2: 开发监控 📊
- Mission Control 看板（iframe 集成）
- 左侧：智能体状态看板（小研🔍、小产📊、小开💻、小测🛡️）
- 右侧：实时终端日志

#### Tab 3: 像素办公室 ⭐
- Star Office UI（iframe 集成）
- 像素风格办公室
- 实时状态可视化（idle/writing/researching/executing/syncing/error）

---

### 2. 智能体状态同步

```bash
# 更新智能体状态
./agent-status-sync-v2.sh <agent-id> <state>

# 示例
./agent-status-sync-v2.sh tech-lead executing      # 小开正在开发
./agent-status-sync-v2.sh researcher researching   # 小研正在调研
```

**状态说明**:
- `idle` - 待命中
- `writing` - 正在编写代码/文档
- `researching` - 正在调研分析
- `executing` - 正在执行任务
- `syncing` - 正在同步数据
- `error` - 发现问题，排查中

---

## 🛠️ 开发指南

### 启动开发服务器

```bash
# 启动数字员工主界面
npm run dev

# 访问 http://localhost:5173/
```

### 构建生产版本

```bash
npm run build

# 输出到 dist/
```

### 预览生产版本

```bash
npm run preview
```

---

## 🔄 技术栈

### 数字员工主界面
- **前端**: Vue 3 + Vant UI + Vite
- **状态管理**: Vue 3 Composition API
- **API**: Axios

### Mission Control 看板
- **前端**: Vite + React + TypeScript
- **后端**: Node.js + Express + Socket.io
- **数据库**: PostgreSQL + Prisma

### Star Office UI
- **前端**: Phaser.js (2D 游戏引擎)
- **后端**: Flask (Python)
- **状态存储**: JSON

---

## 📊 项目进度

| 阶段 | 进度 | 状态 |
|------|------|------|
| Phase 1: 数据库 + API | ✅ 100% | 完成 |
| Phase 2: 智能体编排 | ✅ 100% | 完成 |
| Phase 3: 前端开发 | ✅ 100% | 完成 |
| Phase 4: 前后端联调 | 🔄 80% | 进行中 |
| Phase 5: 部署上线 | ⏳ 60% | 待完成 |

**总进度**: 85%

---

## 📚 文档

- [项目整合文档](./PROJECT_INTEGRATION.md)
- [项目状态文档](./PROJECT_STATUS.md)
- [Star Office UI 文档](./Star-Office-UI/README.md)
- [Kanban 系统文档](./kanban-full-managed/README.md)

---

## 🔗 相关链接

- **GitHub**: https://github.com/zhushuyuan0601/project-digital-employee
- **项目看板**: ~/.openclaw/shared-workspace/projects/PROJECT_BOARD.md
- **团队文档**: ~/.openclaw/workspace-ceo/AGENTS.md

---

## 👥 团队

- **任务协调**: 小U（任务秘书）🐾
- **产品经理**: 小产（产品经理）📊
- **研发工程师**: 小开（研发工程师）💻
- **质量检查员**: 小测（质量检查员）🛡️

---

## 📄 License

MIT License

---

**最后更新**: 2026-03-24
**维护人**: 小开（研发工程师）💻