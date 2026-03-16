# 📊 数字员工看板数据展示逻辑改造方案

## 改造日期
2026-03-16

## 问题分析

### 原始问题
前端 `DigitalEmployee.vue` 项目进度数据完全依赖后端 `/api/dashboard` 接口，但后端返回的都是空数据/默认值。

### 数据格式不匹配

| 字段 | 前端期望 | 后端实际返回（改造前） |
|------|---------|---------------------|
| 状态 | `status` (如"开发中") | `stageName` ❌ 不匹配 |
| commits | `commits` 数量 | ❌ 缺失 |
| emoji | `emoji` | ❌ 缺失 |
| id | `id` | ❌ 缺失 |
| devLog | `devLog` | `progressList` 数组 ❌ 格式不匹配 |

## 改造方案

### 1. 后端 API 改造

**文件**: `/Users/lihzz/Desktop/数字员工/unicom-ui-new.bak/server/index.js`

#### 修改 `parseProjectStatus` 函数返回值

**改造前：**
```javascript
return {
  name,
  stage,
  stageName: stageNames[stage] || '未知',
  stageEmoji,
  progress,
  leader,
  leaderRole: leader === '姜昊' ? '小开' : leader === '林桐' ? '小产' : '未知',
  demo: demoUrl ? '✅' : '⏳',
  description,
  githubUrl,
  demoUrl,
  progressList: progressList.slice(0, 5),
  nextSteps: nextSteps.slice(0, 3)
}
```

**改造后：**
```javascript
// 最新进展日志（用于前端显示）
const devLog = progressList.slice(0, 3).map(item => item.replace('✅ ', '')).join('；')

// 映射到前端期望的字段
return {
  id: name, // 使用项目名称作为 ID
  name,
  stage,
  stageName: stageNames[stage] || '未知',
  status: stageNames[stage] || '未知', // 前端使用 status 字段
  stageEmoji,
  emoji: stageEmoji, // 前端使用 emoji 字段
  progress,
  leader,
  leaderRole: leader === '姜昊' ? '小开' : leader === '林桐' ? '小产' : '未知',
  demo: demoUrl ? '✅' : '⏳',
  description,
  githubUrl,
  demoUrl,
  commits: 0, // 暂时设置为 0，后续可通过 GitHub API 获取
  devLog, // 前端使用的进展日志字段
  progressList: progressList.slice(0, 5),
  nextSteps: nextSteps.slice(0, 3)
}
```

### 2. 新增字段说明

| 字段 | 说明 | 示例值 |
|------|------|--------|
| `id` | 项目唯一标识 | "AI彩铃" |
| `status` | 项目状态（前段使用） | "开发中" |
| `emoji` | 状态图标 | "💻" |
| `commits` | Git 提交数 | 0（暂时） |
| `devLog` | 最新进展日志 | "输出 PRD；确定产品定位；技术方案设计" |

## 测试结果

### API 接口测试
```bash
curl http://localhost:18888/api/dashboard
```

**返回数据示例：**
```json
{
  "success": true,
  "stats": {
    "totalProjects": 9,
    "inProgress": 2,
    "notStarted": 5,
    "todayCommits": 0
  },
  "projects": [
    {
      "id": "AI彩铃",
      "name": "AI彩铃",
      "status": "开发中",
      "emoji": "💻",
      "progress": 70,
      "commits": 0,
      "description": "联通AI彩铃内测版本，对标天翼智铃，具备AI智能体对话引导创作能力",
      "githubUrl": "https://github.com/zhushuyuan0601/project-ai-ringtone",
      "devLog": "输出 PRD；确定产品定位；技术方案设计"
    }
  ]
}
```

### 前端展示效果

现在前端可以正确显示：
- ✅ 项目总数：9
- ✅ 开发中项目数：2
- ✅ 规划中项目数：5
- ✅ 每个项目的进度条、状态标签、commits 数
- ✅ 项目最新进展日志

## 数据来源

### 项目状态文件
后端自动扫描：`~/.openclaw/shared-workspace/projects/{项目名}/PROJECT_STATUS.md`

#### 文件格式规范
```markdown
# 项目名称

## 📋 基本信息

| 字段 | 值 |
|------|------|
| **项目描述** | 项目描述 |
| **阶段** | `development` 💻 |
| **进度** | 70% |

## ✅ 任务清单

### 需求分析阶段
- [x] 输出 PRD
- [x] 确定产品定位

### 开发阶段
- [x] MVP原型开发
- [ ] 对接真实API
```

### 阶段代码映射

| 阶段代码 | 阶段名称 | Emoji | 说明 |
|---------|---------|-------|------|
| `idea` | 立项前 | 💡 | 已有想法，等待立项决策 |
| `analysis` | 需求分析 | 🔍 | 产品经理分析需求 |
| `tech-assessment` | 技术评估 | 🔧 | 研发工程师评估可行性 |
| `development` | 开发中 | 💻 | 开发正在进行 |
| `testing` | 测试验收 | 🧪 | 产品经理测试验收 |
| `deployed` | 已上线 | 🚀 | 产品已上线 |
| `maintenance` | 维护期 | 🔒 | 功能稳定，定期维护 |
| `paused` | 已暂停 | ⏸️ | 项目暂停 |
| `cancelled` | 已取消 | ❌ | 项目已取消 |

## 后续优化建议

### 1. Commits 数据获取
**当前状态**: 暂时硬编码为 0
**优化方案**: 通过 GitHub API 获取实际提交数

```javascript
async function getRepoCommits(githubUrl) {
  // 从 GitHub URL 提取 owner/repo
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) return 0

  const [, owner, repo] = match
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`)
  const data = await response.json()
  return data.length > 0 ? data[0].sha : 0
}
```

### 2. 实时数据更新
**当前状态**: 需要手动刷新
**优化方案**: 使用 WebSocket 实现实时推送

### 3. 项目看板看板独立 API
**建议**: 创建 `/api/projects` 专门用于项目看板数据
```javascript
app.get('/api/projects', async (req, res) => {
  const projects = await scanProjects()
  const stats = getProjectStats(projects)
  res.json({ success: true, projects, stats })
})
```

## 部署说明

### 1. 重启后端服务
```bash
cd /Users/lihzz/Desktop/数字员工/unicom-ui-new.bak/server
pkill -f "node.*index.js"
node index.js
```

### 2. 验证 API
```bash
curl http://localhost:18888/api/dashboard
```

### 3. 刷新前端页面
打开浏览器访问 `http://localhost:5173/DigitalEmployee` 并刷新页面

## 项目列表

当前共有 **9 个项目**，可以自动从以下状态文件读取数据：

| 序号 | 项目名称 | 状态 | 进度 |
|------|---------|------|------|
| 1 | AI彩铃 | 开发中 | 70% |
| 2 | 统一智能体平台 | 开发中 | 35% |
| 3 | 联通来电彩铃 | 需求分析 | 40% |
| 4 | 天翼智铃对标 | 需求分析 | 60% |
| 5 | AI智能情报系统 | 技术评估 | 45% |
| 6 | 联通AI智能客服 | 需求分析 | 25% |
| 7 | AI彩铃内测版 | 已暂停 | 0% |
| 8 | 安全管家 | 立项前 | 0% |
| 9 | 联通AI彩铃内测原型 | 已取消 | 0% |

## 总结

✅ **改造完成**：
- 后端 API 返回数据格式已完全匹配前端需求
- 项目状态自动从 `PROJECT_STATUS.md` 文件读取
- 前端看板可以正确显示项目进度、状态、commits 等信息

🎯 **下一步优化**：
- 集成 GitHub API 获取真实 commits 数量
- 实现实时数据更新
- 添加项目筛选和搜索功能

---

**改造完成时间**: 2026-03-16 17:30
**改造人**: 小U（任务秘书）🐾