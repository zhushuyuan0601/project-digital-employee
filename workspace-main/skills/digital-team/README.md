# 联通 AI 数字员工团队演示系统

## 📋 关于

这是一个模拟"数字员工团队办公"的演示系统，展示 OpenClaw 多 Agent 协作能力。

### 工作流程

```
领导（用户指令）
    ↓
小 U（任务秘书/Zoe）- 接收任务、拆解分配
    ↓
小研（竞品分析师）- 调研竞品、输出报告
    ↓
小产（产品经理）- 设计方案、输出需求
    ↓
小开（研发工程师）- 设计架构、调度开发
    ↓
ClaudeCode 工程团队 - 实际开发
    ↓
Demo 生成 - 可演示的产品原型
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/lihzz/.openclaw/workspace-main/skills/digital-team
npm install
```

### 2. 启动演示页面

```bash
npm run dev
```

然后打开浏览器访问：**http://localhost:5176**

### 3. 服务检查

```bash
# 检查后端 API（端口 3100）
curl http://localhost:3100/api/health

# 检查 OpenClaw Gateway（端口 18789）
curl http://localhost:18789/v1/chat/completions \
  -H 'Authorization: Bearer bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: ceo' \
  -d '{"model":"openclaw","messages":[{"role":"user","content":"hi"}]}'
```

---

## 🎬 演示脚本（10 分钟）

### 第一幕：开场介绍（1 分钟）

**演示者台词：**
> 今天给各位领导演示的是我们人工智能产品部自主研发的"数字员工团队"。
> 这个团队由 4 位数字员工组成，他们可以像真实员工一样自动协作，完成从需求分析到产品 Demo 开发的全流程。

### 第二幕：领导下任务（1 分钟）

**领导台词：**
> 最近我看到中国电信上线了"天翼智铃"。用户可以用 AI 自动生成视频彩铃。
> 我们联通能不能也做一个类似的能力？

**操作：**
1. 打开 **💬 群聊协作** 标签页
2. 在输入框中输入上述内容
3. 点击"发送"按钮

### 第三幕：自动协作（5 分钟）

数字员工自动完成：
- **小 U**：接收任务并拆解
- **小研**：调研竞品并输出分析报告
- **小产**：设计产品方案
- **小开**：设计技术方案并调度 ClaudeCode

### 第四幕：Demo 演示（3 分钟）

**操作：**
1. 点击顶部 **🎬 AI 彩铃 Demo** 标签页
2. 选择"新年祝福"模板
3. 点击"✨ 开始生成"按钮

### 第五幕：成果汇总（1 分钟）

小 U 汇总所有成果并向领导汇报。

---

## 📊 页面标签说明

| 标签 | 功能 |
|------|------|
| 💬 群聊协作 | 显示数字员工的实时对话，支持领导输入任务 |
| 🎬 AI 彩铃 Demo | 可交互的 AI 彩铃生成演示 |
| 📦 工作成果 | 展示每个数字员工的产出物 |
| 📊 监控大盘 | 实时显示工作状态和进度 |

---

## 👥 数字员工角色

| 员工 | 角色 | 职责 | 对应智能体 |
|------|------|------|-----------|
| 小 U | 任务秘书 | 接收任务、拆解分配、汇总汇报 | ceo/Zoe |
| 小研 | 竞品分析师 | 调研产品、分析能力、输出报告 | researcher |
| 小产 | 产品经理 | 设计方案、明确定位、输出需求 | pm |
| 小开 | 研发工程师 | 设计架构、调度 ClaudeCode、生成 Demo | tech-lead |

---

## 🎨 技术架构

### 前端
- React + Vite
- 现代化 UI 设计
- 实时状态更新

### 后端
- Express 服务器（端口 3100）
- OpenClaw Gateway 集成
- OpenAI Chat Completions 兼容 API

### Agent 配置
```
小 U  → ceo 智能体
小研 → researcher 智能体
小产 → pm 智能体
小开 → tech-lead 智能体
```

### Gateway 配置
- 端口：18789
- Token：`bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70`
- Chat Completions 端点：已启用

---

## 🔧 故障排查

### 问题 1：API 调用失败
```bash
# 检查后端服务
lsof -i :3100

# 重启后端
cd /Users/lihzz/.openclaw/workspace-main/skills/digital-team
node server.js &
```

### 问题 2：Gateway 连接失败
```bash
# 检查 Gateway 状态
lsof -i :18789

# 重启 Gateway
openclaw gateway start
```

### 问题 3：页面无法访问
```bash
# 检查前端服务
lsof -i :5176

# 重启前端
npm run dev
```

---

## 📝 演示准备清单

- [ ] 提前 10 分钟启动所有服务
- [ ] 测试 API 连接是否正常
- [ ] 准备好领导的台词
- [ ] 测试大屏幕投影
- [ ] 准备备用方案（录屏或离线 Demo）

---

## 📈 核心亮点

1. **真实协作** - 数字员工并行工作，信息自然流转
2. **工程落地** - 不止方案，还能调度 ClaudeCode 开发
3. **进度可视** - 监控大盘实时显示工作状态
4. **成果展示** - 清晰的产出物汇总和演示

## 💡 演示效果

```
一句话任务
    ↓
数字员工自动协作
    ↓
生成完整研发方案
    ↓
ClaudeCode 自动开发
    ↓
可演示的 Demo
```

**这就是：AI 团队自动办公** 🚀

---

## 📚 文档

- [详细演示指南](./DEMO_GUIDE.md)
- [技能文档](./SKILL.md)

---

**OpenClaw v2.0 | 多 Agent 协作系统**
