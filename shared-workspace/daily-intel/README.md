# 数字员工团队共享工作区

> 统一的工作成果管理规范

---

## 目录结构

```
daily-intel/
│
├── projects/           # 项目空间（每个任务一个项目）
│   └── {项目名}/
│       ├── research/   # 调研成果
│       ├── product/    # 产品成果
│       ├── tech/       # 技术成果
│       └── demo/       # 演示成果
│
├── roles/              # 各角色成果沉淀
│   ├── ceo/            # 小U（任务秘书）
│   ├── researcher/     # 小研（竞品分析师）
│   ├── pm/             # 小产（产品经理）
│   └── tech-lead/      # 小开（研发工程师）
│
├── reports/            # 每日汇总报告
│   └── YYYY-MM-DD-daily-report.md
│
├── logs/               # Agent执行日志
│
└── knowledge-base/     # 团队知识库
```

---

## 角色目录结构

每个角色目录按日期组织：

```
roles/researcher/
├── 2026-03-08/
│   ├── 天翼智铃竞品分析.md
│   ├── 行业AIGC彩铃报告.md
│   └── 数据源.json
```

---

## 项目目录结构

每个项目独立管理，按阶段分类：

```
projects/ai-rbt-product/
│
├── research/
│   └── 天翼智铃竞品分析.md
│
├── product/
│   └── AI彩铃PRD.md
│
├── tech/
│   └── 技术架构.md
│
└── demo/
    └── demo设计.md
```

---

## 每日日报格式

文件名：`reports/YYYY-MM-DD-daily-report.md`

```markdown
# 数字员工团队日报

日期：YYYY-MM-DD

## 今日任务

1. 任务一
2. 任务二

---

## 各角色成果

### 小研（竞品分析师）

完成：
- 成果一
- 成果二

输出路径：`roles/researcher/YYYY-MM-DD/`

---

### 小产（产品经理）

完成：
- 成果一
- 成果二

输出路径：`roles/pm/YYYY-MM-DD/`

---

### 小开（研发工程师）

完成：
- 成果一
- 成果二

输出路径：`roles/tech-lead/YYYY-MM-DD/`

---

## 团队总结

[今日总结]

---

*生成时间: YYYY-MM-DD HH:MM*
```

---

## 文件命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 调研报告 | `{主题}-YYYY-MM-DD-researcher.md` | `天翼智铃竞品分析-2026-03-08-researcher.md` |
| PRD文档 | `{产品名}-PRD-YYYY-MM-DD.md` | `AI彩铃-PRD-2026-03-08.md` |
| 技术文档 | `{主题}-tech-YYYY-MM-DD.md` | `系统架构-tech-2026-03-08.md` |
| 日报 | `YYYY-MM-DD-daily-report.md` | `2026-03-08-daily-report.md` |

---

*创建日期: 2026-03-08*