# 项目补充完成报告

## 项目分析

基于 Mission Control (https://github.com/builderz-labs/mission-control) 的核心特性，对当前项目进行了全面的分析和补充。

---

## Mission Control 核心特性对照

| 特性模块 | Mission Control | 原有项目 | 补充后状态 |
|---------|----------------|---------|-----------|
| 系统仪表盘 | ✅ | ✅ Dashboard.vue | ✅ 已有 |
| Agent 管理 | ✅ | ✅ Agents.vue | ✅ 已有 |
| 任务中心 | ✅ | ✅ TaskCenter.vue | ✅ 已有 |
| 日志系统 | ✅ | ✅ Logs.vue | ✅ 已有 |
| 工具管理 | ✅ | ✅ Tools.vue | ✅ 已有 |
| 配置管理 | ✅ | ✅ Configs.vue | ✅ 已有 |
| 系统状态 | ✅ | ✅ Status.vue | ✅ 已有 |
| 对话系统 | ✅ | ✅ Chat/GroupChat.vue | ✅ 已有 |
| **技能中心** | ✅ | ❌ | ✅ **Skills.vue (新增)** |
| **成本追踪** | ✅ | ❌ | ✅ **Tokens.vue (新增)** |
| **内存图谱** | ✅ | ❌ | ✅ **Memory.vue (新增)** |
| **安全审计** | ✅ | ❌ | ✅ **Security.vue (新增)** |
| **定时任务** | ✅ | ❌ | ✅ **Cron.vue (新增)** |
| **Webhook 管理** | ✅ | ❌ | ✅ **Webhooks.vue (新增)** |
| 工作流编排 | ✅ | ❌ | ⏸️ 待后续补充 |
| 告警中心 | ✅ | ❌ | ⏸️ 待后续补充 |
| Agent 评估 | ✅ | ❌ | ⏸️ 待后续补充 |

---

## 新增页面详情

### 1. 技能中心 (Skills.vue)
**路由**: `/skills`

**功能特性**:
- 📦 技能卡片展示（图标、名称、作者、版本、描述）
- 🔍 搜索和过滤（按分类、状态）
- ⬇️ 技能安装/更新/卸载
- 🛡️ 安全扫描状态指示
- 📊 下载量和评分显示
- 💬 安装弹窗（支持 URL 安装和快速选择）

**UI 风格**: 保持战术风格，渐变边框、发光效果、状态徽章

---

### 2. 成本追踪 (Tokens.vue)
**路由**: `/tokens`

**功能特性**:
- 📊 概览统计卡片（总 Token、成本、输入/输出、API 调用、响应时间）
- 📈 Token 使用趋势图（输入/输出对比）
- 🤖 模型使用分布（饼图式条形图）
- 🏆 Agent 成本排行（带排名标识）
- 📝 最近使用记录时间线
- 📅 时间范围选择（今日/本周/本月/全部）
- 📤 导出报告功能

**UI 风格**: 数据可视化卡片、渐变进度条、排名徽章

---

### 3. 内存图谱 (Memory.vue)
**路由**: `/memory`

**功能特性**:
- 📊 存储概览（文件数、节点数、存储使用量）
- 📁 知识文件系统树（可展开/折叠）
- 🕸️ 关系网络图谱可视化（力导向/层级/环形布局）
- 📄 节点详情面板（基本信息、内容预览、关联节点）
- 📡 最近活动时间线
- 📤 导入/导出功能

**UI 风格**: 三部面板布局、树形结构、图谱节点动画

---

### 4. 安全审计 (Security.vue)
**路由**: `/security`

**功能特性**:
- 🛡️ 安全评分环形图（0-100 分）
- 📊 快速统计（密钥检测、MCP 连接、注入尝试、通过检查）
- 🔑 密钥/凭证检测结果
- 🔌 MCP 服务器审计列表
- ⚠️ 提示词注入防护日志
- ⚙️ Hook 配置文件监控
- 📜 安全事件时间线
- 📈 信任评分构成分析

**UI 风格**: 安全评分环形图、状态徽章、时间线、风险等级标识

---

### 5. 定时任务 (Cron.vue)
**路由**: `/cron`

**功能特性**:
- 📊 概览统计（总任务数、已启用、已暂停、今日执行）
- 📋 任务列表（名称、调度计划、自然语言描述、Agent、执行统计）
- ⏰ Cron 表达式 + 自然语言双模式输入
- ▶️/⏸️ 任务启用/暂停控制
- ⚡ 立即执行功能
- 📝 任务创建/编辑弹窗
- 📜 执行历史时间线

**UI 风格**: 任务卡片、状态徽章、表单弹窗

---

### 6. Webhook 管理 (Webhooks.vue)
**路由**: `/webhooks`

**功能特性**:
- 📊 概览统计（总 Webhook 数、已启用、已暂停、今日投递）
- 🔗 Webhook 卡片列表（URL、事件订阅、安全配置、统计信息）
- 🔐 HMAC 签名配置（支持 SHA256/SHA1/SHA512 算法）
- 📡 事件订阅（任务创建/完成/失败、Agent 启动/停止/错误、安全告警等）
- ⚡ 发送测试通知
- 📋 投递日志时间线（成功/失败状态、HTTP 响应、耗时）
- 🔁 重试策略配置（固定间隔/指数退避/线性递增）
- ▶️/⏸️ 快速启用/暂停控制

**UI 风格**: 卡片列表、状态徽章、表单弹窗、日志时间线

---

## 路由配置更新

```typescript
// 新增路由
{ path: '/skills', name: 'skills', component: Skills.vue },
{ path: '/tokens', name: 'tokens', component: Tokens.vue },
{ path: '/memory', name: 'memory', component: Memory.vue },
{ path: '/security', name: 'security', component: Security.vue },
{ path: '/cron', name: 'cron', component: Cron.vue },
{ path: '/webhooks', name: 'webhooks', component: Webhooks.vue }
```

---

## 导航栏更新

在左侧导航栏新增「高级功能」分区，包含：
- 🧠 技能中心
- 💰 成本追踪
- 🧠 内存图谱
- 🛡️ 安全审计
- ⏰ 定时任务
- ⚡ Webhook 管理

---

## UI 设计一致性

所有新增页面严格保持现有设计语言：

### 暗色主题（默认）
- 背景：`var(--bg-base)`、`var(--bg-panel)`
- 网格线：`var(--grid-line)`
- 主色：`var(--color-primary)` (青色渐变)
- 次色：`var(--color-secondary)` (紫色)

### 亮色主题
- 支持一键切换
- 白色背景 + 蓝色强调色
- 所有组件都有对应的亮色主题样式

### 共同设计元素
- 卡片顶部渐变线条
- hover 发光效果
- 战术风格边框
- 等宽字体用于数字/状态
- 状态徽章和指示器

---

## 待补充功能（后续迭代）

1. **工作流编排 (Pipelines)** - 多 Agent 工作流可视化编排
2. **告警中心 (Alerts)** - 告警规则和通知配置
3. **Agent 评估 (Eval)** - 输出质量评估和漂移检测

---

## 已完成功能

### 后端 API 集成 ✅

所有新增页面已完成后端 API 对接，通过统一的 API 服务模块和 Pinia stores 实现数据管理：

**API 服务模块** (`src/api/index.ts`):
- 统一的 `request()` 函数处理 HTTP 请求
- 6 个 API 模块：skillsApi, tokensApi, memoryApi, securityApi, cronApi, webhooksApi
- 完整的 TypeScript 接口定义

**Pinia Stores**:
| Store | 文件 | 功能 |
|-------|------|------|
| useSkillsStore | `src/stores/skills.ts` | 技能管理、安装/更新/卸载 |
| useTokensStore | `src/stores/tokens.ts` | 成本统计、趋势分析 |
| useMemoryStore | `src/stores/memory.ts` | 文件树、关系图谱 |
| useSecurityStore | `src/stores/security.ts` | 安全审计、扫描 |
| useCronStore | `src/stores/cron.ts` | 定时任务管理 |
| useWebhooksStore | `src/stores/webhooks.ts` | Webhook 配置和投递 |

**后端服务** (`server/index.js`):
- Express 服务器运行在端口 18888
- 所有 API 端点已配置，采用混合模式：
  - 优先从 Gateway (18789) 获取真实数据
  - Gateway 不可用时自动降级使用模拟数据
- 支持环境变量配置：`GATEWAY_HOST`, `GATEWAY_PORT`

**Vite 代理配置** (`vite.config.ts`):
- 所有 `/api/*` 请求转发到 `http://127.0.0.1:18888`
- `/ws` 请求转发到 `ws://127.0.0.1:18789`

---

## 使用说明

1. **访问新页面**: 点击左侧导航栏「高级功能」分区下的菜单项
2. **主题切换**: 点击右上角主题切换按钮切换明/暗主题
3. **启动后端服务**: 运行 `node server/index.js` 启动本地 API 服务器（端口 18888）
4. **启动前端**: 运行 `npm run dev` 启动开发服务器（端口 3000）
5. **数据源**:
   - 优先从 Gateway (18789) 获取真实数据
   - Gateway 不可用时自动使用模拟数据
6. **环境变量** (可选):
   ```bash
   export GATEWAY_HOST=127.0.0.1
   export GATEWAY_PORT=18789
   ```

---

## 下一步建议

1. **对接真实后端**:
   - Token 成本数据从 Gateway 获取
   - 技能列表从 ClawHub/skills.sh 同步
   - 安全扫描结果对接实际扫描器
   - 内存数据对接向量数据库

2. **增强交互**:
   - 内存图谱使用 D3.js 或 G6 实现真实力导向图
   - 成本追踪增加图表库支持（ECharts/Chart.js）

3. **补充剩余页面**:
   - Webhooks、Pipelines、Alerts、Eval

---

**报告生成时间**: 2026-03-24
**版本**: v1.0.0
