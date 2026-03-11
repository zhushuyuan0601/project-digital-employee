# 数字员工团队成果同步规范

> 所有 Agent 必须遵守的文件输出规则

---

## 核心规则

**原则：所有工作成果必须同步到共享目录**

共享目录根路径：`/Users/lihzz/.openclaw/shared-workspace/daily-intel`

---

## 一、双重同步机制

每个工作成果必须同时写入两个位置：

### 1. 角色目录（按日期）

```
roles/{角色}/{YYYY-MM-DD}/{文件名}.md
```

### 2. 项目目录（按阶段）

```
projects/{项目名}/{阶段}/{文件名}.md
```

---

## 二、角色与路径映射

| 角色 | 角色ID | 角色目录 | 允许写入的阶段目录 |
|------|--------|---------|-------------------|
| 小U（任务秘书） | ceo | `roles/ceo/` | `projects/{项目}/decision/` |
| 小研（竞品分析师） | researcher | `roles/researcher/` | `projects/{项目}/research/` |
| 小产（产品经理） | pm | `roles/pm/` | `projects/{项目}/product/` |
| 小开（研发工程师） | tech-lead | `roles/tech-lead/` | `projects/{项目}/tech/`, `projects/{项目}/demo/` |

---

## 三、文件命名规范

### 3.1 角色目录文件名

格式：`{主题}-{YYYY-MM-DD}-{角色}.md`

示例：
```
roles/researcher/2026-03-08/天翼智铃竞品分析-2026-03-08-researcher.md
roles/pm/2026-03-08/AI彩铃PRD-2026-03-08-pm.md
roles/tech-lead/2026-03-08/系统架构设计-2026-03-08-tech.md
```

### 3.2 项目目录文件名

格式：`{主题}.md`（不带日期和角色后缀）

示例：
```
projects/ai-rbt-product/research/天翼智铃竞品分析.md
projects/ai-rbt-product/product/AI彩铃PRD.md
projects/ai-rbt-product/tech/系统架构设计.md
```

---

## 四、执行流程

### 步骤1：创建日期目录

```bash
mkdir -p /Users/lihzz/.openclaw/shared-workspace/daily-intel/roles/{角色}/$(date +%Y-%m-%d)
```

### 步骤2：写入角色目录

```
write /Users/lihzz/.openclaw/shared-workspace/daily-intel/roles/{角色}/YYYY-MM-DD/{文件名}.md
```

### 步骤3：同步到项目目录

```
write /Users/lihzz/.openclaw/shared-workspace/daily-intel/projects/{项目名}/{阶段}/{文件名}.md
```

### 步骤4：任务汇报中注明路径

```
✅ 任务完成

📁 成果同步：
- 角色目录：roles/researcher/2026-03-08/天翼智铃竞品分析.md
- 项目目录：projects/ai-rbt-product/research/天翼智铃竞品分析.md
```

---

## 五、完整示例

### 场景：竞品分析师完成"天翼智铃竞品分析"

**任务接收**：
```
任务：调研天翼智铃产品
项目：ai-rbt-product
```

**执行步骤**：

```bash
# 1. 创建目录
mkdir -p ~/.openclaw/shared-workspace/daily-intel/roles/researcher/2026-03-08
mkdir -p ~/.openclaw/shared-workspace/daily-intel/projects/ai-rbt-product/research

# 2. 写入角色目录
write ~/.openclaw/shared-workspace/daily-intel/roles/researcher/2026-03-08/天翼智铃竞品分析-2026-03-08-researcher.md

# 3. 同步到项目目录
write ~/.openclaw/shared-workspace/daily-intel/projects/ai-rbt-product/research/天翼智铃竞品分析.md
```

**汇报格式**：
```
✅ 任务完成

📝 任务名称：天翼智铃竞品分析
📁 成果同步：
  - roles/researcher/2026-03-08/天翼智铃竞品分析-2026-03-08-researcher.md
  - projects/ai-rbt-product/research/天翼智铃竞品分析.md
```

---

## 六、项目阶段目录说明

| 阶段目录 | 写入角色 | 内容类型 |
|---------|---------|---------|
| `research/` | researcher | 竞品分析、市场调研、数据采集 |
| `product/` | pm | PRD、功能设计、需求文档 |
| `tech/` | tech-lead | 架构设计、技术方案、接口文档 |
| `demo/` | tech-lead | 原型代码、演示脚本 |
| `decision/` | ceo | 立项决策、会议纪要 |

---

## 七、日报自动生成

任务秘书（ceo）每日 17:00 自动生成日报：

```
/Users/lihzz/.openclaw/shared-workspace/daily-intel/reports/YYYY-MM-DD-daily-report.md
```

日报内容汇总：
- 今日所有角色的成果
- 各项目进度
- 明日计划

---

## 八、错误处理

### 如果文件已存在

- 角色目录：追加版本号 `{文件名}-v2.md`
- 项目目录：直接覆盖（保持最新版本）

### 如果项目目录不存在

自动创建：
```bash
mkdir -p ~/.openclaw/shared-workspace/daily-intel/projects/{项目名}/{research,product,tech,demo,decision}
```

---

## 九、验证清单

完成任务前检查：

- [ ] 角色目录文件已创建
- [ ] 项目目录文件已同步
- [ ] 文件名符合规范
- [ ] 任务汇报中已注明路径
- [ ] 文件内容包含元数据（完成时间、执行人）

---

**规范版本**: v1.0  
**生效日期**: 2026-03-08  
**适用对象**: 所有数字员工（ceo, researcher, pm, tech-lead）