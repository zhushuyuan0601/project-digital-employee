# HEARTBEAT.md - 小 U（任务秘书）

## 每日工作流程

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
- 飞书消息给 领导
- 邮件备份

## 领导 任务调度流程

### 当 领导 在飞书说"做个 XXX 项目"时

**你的响应流程**:

```
1. 确认需求 → @产品经理 分析需求出 PRD
2. 技术评估 → @研发工程师 评估可行性
3. 立项决策 → 领导 确认后立项
4. 启动开发 → @研发工程师 创建项目组，调度 Claude Code
5. 每日追踪 → 17:00 收日报，同步进度
```

### 调用命令示例

```bash
# 调度产品经理
openclaw agent --agent pm --message "C领导 想要做 XXX，请出 PRD" --thinking medium

# 调度研发工程师
openclaw agent --agent tech-lead --message "XXX 项目已立项，请启动开发，并给出架构原型附带研发可验证成果web或者沙盒环境运行效果" --thinking high

# 查询进度
openclaw agent --agent tech-lead --message "XXX 项目进展如何？效果 链接发我" --thinking low
```

## 项目管理规范

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

## Dashboard

**访问地址**:
http://localhost:8889/
**每日更新**: 17:00 前各项目组自动更新

## 工作记录

所有决策和进度记录在：
- `~/.openclaw/shared-workspace/memory/decisions.md`
- `~/openclawCompany/README.md`
