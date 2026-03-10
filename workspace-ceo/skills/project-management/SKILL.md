# CEO 项目管理 Skill

## 🎯 项目调度命令

### 1. 项目立项流程

**CEO 在飞书说**:
```
@Zoe 我们做个 XXX 项目，目标 XXX
```

**你的响应流程**:

```bash
# 步骤 1: 调度产品经理分析需求
openclaw agent --agent pm --message "CEO 想要做 XXX 项目，请分析需求并输出 PRD，存入 shared-workspace/projects/xxx-project/prd.md" --thinking medium

# 步骤 2: 调度技术总监评估（PRD 完成后）
openclaw agent --agent tech-lead --message "请对 XXX 项目进行技术评估，存入 shared-workspace/projects/xxx-project/tech-assessment.md" --thinking high

# 步骤 3: 立项决策
# 技术评估通过后，通知技术总监启动开发
openclaw agent --agent tech-lead --message "XXX 项目已立项，请创建项目组并开始开发，GitHub 仓库：project-xxx" --thinking high
```

### 2. 每日日报流程（17:00 自动）

**自动收集各项目组进度**:

```bash
# 读取各项目开发日志
# 生成日报并发送给 CEO
```

**日报模板**:
```markdown
# 公司日报 - YYYY-MM-DD

## 📊 项目进度

### 项目 A
- 进度：XX%
- 今日完成：XXX
- 明日计划：XXX
- Demo: [链接]

### 项目 B
...

## 👥 团队产出
- 代码提交：X 次
- 新增文件：X 个
- Demo 更新：X 个

## 📈 Dashboard
查看完整报告：file:///Users/lihzz/openclawCompany/dashboard/index.html
```

## 🏗️ 项目管理规范

### 长期项目组

**特点**:
- 固定人员维护（类似全栈工程师）
- 持续迭代开发
- 每日提交代码到 GitHub
- 每日更新 Demo

**配置示例**:
```
项目：AI 情报系统
GitHub: https://github.com/zhushuyuan0601/project-ai-intel
负责人：Claude Code (全栈)
每日 17:00: 提交代码 + 更新 Demo
```

### 项目包装原则

**产品化思维**:
1. **统一品牌** - 所有项目属于 AI 产品公司
2. **长期维护** - 不是做完就走，持续迭代
3. **Demo 展示** - 每个项目有可访问的 Demo
4. **文档完善** - README、使用说明

**避免**:
- ❌ 分散的小项目（无法形成合力）
- ❌ 没有 Demo 的代码
- ❌ 没有文档的项目

## 📁 项目目录规范

```
/Users/lihzz/openclawCompany/projects/{项目名}/
├── src/            # 源代码
├── demo/           # Demo 文件（HTML/部署文件）
├── docs/           # 文档
├── .git/           # Git 仓库
└── README.md       # 项目说明
```

## 🔧 GitHub 集成

**公司账号**:
- 用户名：zhushuyuan0601
- Token: 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

**创建仓库命令**:
```bash
# 技术总监执行
git init
git remote add origin https://zhushuyuan0601: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@github.com/zhushuyuan0601/project-{项目名}.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

## 📊 Dashboard 更新

**每日 17:00 前**:
1. 各项目更新 `demo/` 目录
2. 更新 `dashboard/projects/{项目名}/`
3. 更新 `dashboard/index.html` 项目进度
4. 生成日报发送 CEO

## 🎯 CEO 常用指令

### 布置任务
```
@Zoe 我们做个 AI 写作助手项目，帮助程序员写技术文档
```

### 查询进度
```
@Zoe XXX 项目进展如何？Demo 给我看看
```

### 日报查询
```
@Zoe 今天大家产出如何？发我日报
```

### 立项决策
```
@Zoe 这个 XXX 项目值得做，启动开发
```

## 📝 工作流示例

### 完整流程示例

**Day 1 - 上午**:
```
CEO: @Zoe 我们做个 AI 情报系统，自动收集 AI 热点
Zoe: 收到，@Sarah 请分析需求
Sarah: 好的，2 小时内输出 PRD
```

**Day 1 - 下午**:
```
Zoe: @Alex 请对 AI 情报系统进行技术评估
Alex: 收到，评估后回复
Alex: ✅ 技术可行，建议立项，工期 2 周
Zoe: @CEO 建议立项，请审批
CEO: ✅ 同意立项，启动开发
```

**Day 1 - 17:00**:
```
Zoe: @CEO [日报]
- AI 情报系统：PRD 完成，技术评估通过，已立项
- Dashboard: file:///Users/lihzz/openclawCompany/dashboard/index.html
```

**Day 2 开始**:
```
Alex: 创建 GitHub 仓库，开始开发
Alex: 每日 17:00 提交代码 + 更新 Demo
```
