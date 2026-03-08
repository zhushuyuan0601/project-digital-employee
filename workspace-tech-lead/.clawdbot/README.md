# Agent Swarm 系统快速参考

## 📁 目录结构

```
.clawdbot/
├── active-tasks.json        # 活跃任务队列
├── scripts/
│   ├── spawn-agent.sh       # Agent生成器
│   ├── check-agents.sh      # 监控脚本
│   ├── check-dod.sh         # DoD检查
│   ├── select-agent.sh      # Agent选择器
│   ├── ralph-loop.sh        # 智能失败处理
│   └── discover-work.sh     # 主动工作发现
├── templates/
│   ├── feature-development.md
│   └── bugfix.md
├── memory/
│   ├── prompt-patterns.json    # Prompt模式库
│   └── agent-performance.json  # Agent性能统计
├── logs/                       # 日志目录
└── completed-tasks/            # 已完成任务归档
```

## 🚀 常用命令

### 生成编码Agent
```bash
# 后端功能
./.clawdbot/scripts/spawn-agent.sh backend "实现用户登录" ~/projects/myapp myapp

# 前端功能
./.clawdbot/scripts/spawn-agent.sh frontend "登录页面UI" ~/projects/myapp myapp "" "" "" true

# Bug修复
./.clawdbot/scripts/spawn-agent.sh bugfix "修复登录超时" ~/projects/myapp myapp
```

### 监控Agent状态
```bash
# 检查所有Agent
./.clawdbot/scripts/check-agents.sh

# 查看活跃任务
cat .clawdbot/active-tasks.json | jq '.tasks[] | {id, status, agent}'

# 附加到Agent会话
tmux attach -t <session-name>
```

### 检查DoD
```bash
# 完整检查
./.clawdbot/scripts/check-dod.sh feat/templates owner/repo true codex,gemini
```

### 主动发现工作
```bash
# 扫描所有
./.clawdbot/scripts/discover-work.sh all

# 只扫描错误
./.clawdbot/scripts/discover-work.sh errors
```

## 🤖 Agent选择指南

| 任务类型 | 推荐Agent | 原因 |
|---------|----------|------|
| 后端逻辑 | Codex | 推理能力强 |
| Bug修复 | Codex | 边界情况处理最好 |
| 重构 | Codex | 多文件推理 |
| 前端UI | Claude Code | 速度快 |
| Git操作 | Claude Code | 权限问题少 |
| 设计 | Gemini | 设计感强 |

## ✅ Definition of Done

- [ ] PR已创建
- [ ] 分支与main同步（无冲突）
- [ ] CI全部通过
- [ ] 所有代码审查通过（Codex + Gemini）
- [ ] UI变更附带截图

## 🔄 Ralph Loop V2

失败处理策略：
- **上下文溢出** → 缩小范围，只关注核心文件
- **方向错误** → 纠正方向，附上会议原话
- **需要澄清** → 提供客户邮箱和背景信息
- **CI失败** → 分析错误，生成修复指令
- **审查失败** → 提取关键反馈，生成修改指令

## 📊 定时任务建议

```bash
# 每10分钟监控Agent
*/10 * * * * ~/.openclaw/workspace-tech-lead/.clawdbot/scripts/check-agents.sh

# 每小时发现工作
0 * * * * ~/.openclaw/workspace-tech-lead/.clawdbot/scripts/discover-work.sh all

# 每天清理完成的worktree
0 18 * * * git worktree prune
```