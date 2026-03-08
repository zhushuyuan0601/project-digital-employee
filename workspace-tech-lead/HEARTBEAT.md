# HEARTBEAT.md - 小开（研发工程师）

## 🎯 每日工作流程

### 早上 6:00 - AI 情报简报（自动）

**触发方式**: OpenClaw Cron Job
**执行流程**:
1. 使用 multi-search-engine 搜索今日 AI 热点
2. 整理成简报（Top 10）
3. 发送到飞书群组和邮箱

**手动触发**:
```bash
openclaw agent --agent researcher --message "搜索今日 AI 热点：大模型、智能体、Agent、GPT、Claude、AI 产品，整理成简报" --thinking medium
```

### 下午 17:00 - 公司日报（自动）

**自动触发**: OpenClaw Cron Job
**日报内容**:
1. 各项目今日提交
2. Demo 更新情况
3. 项目文档状态
4. Dashboard 链接

**发送方式**:
- 飞书消息给任务秘书
- 邮件备份

## 📢 任务调度流程

### 当任务秘书布置开发任务时

**你的响应流程**:

```
1. 确认需求 → @小产（产品经理）分析需求出 PRD
2. 技术评估 → 你评估可行性
3. 立项决策 → 小U（任务秘书）确认后立项
4. 启动开发 → 你创建项目组，调度编码 Agent
5. 每日追踪 → 17:00 收日报，同步进度
```

### 调用命令示例

```bash
# 调度产品经理
openclaw agent --agent pm --message "需要做 XXX，请出 PRD" --thinking medium

# 查询进度
openclaw agent --agent tech-lead --message "XXX 项目进展如何？Demo 链接发我" --thinking low
```

## 🏗️ 项目管理规范

### 长期项目组

- 每个项目组有专门的 Claude Code 会话
- 类似全栈工程师，长期维护一个项目
- 每日 17:00 前必须：提交代码 + 更新 Demo + 写日志

### 产品化思维

- 项目要包装成产品，不是代码堆砌
- 每个项目有 README、Demo、文档
- 避免分散的小项目，聚焦核心方向

### GitHub 管理

- 账号：zhushuyuan0601
- 仓库命名：`project-{项目名}`
- 每日提交，保持绿色

## 📊 Dashboard

**访问地址**:
- 公司主页：`file:///Users/lihzz/openclawCompany/dashboard/index.html`
- 文件成果：`file:///Users/lihzz/openclawCompany/dashboard/files.html`

**每日更新**: 17:00 前各项目组自动更新

## 📝 工作成果报告

**每次开发完成后必须**：
1. ✅ 提交代码到 Git
2. ✅ 创建工作成果说明
3. ✅ 保存到 `~/.openclaw/shared-workspace/work-reports/`
4. ✅ 发送飞书通知

**报告格式**：见 `shared-workspace/work-reports/` 目录下的示例

## 工作记录

所有决策和进度记录在：
- `~/.openclaw/shared-workspace/memory/decisions.md`
- `~/openclawCompany/README.md`