# Learnings - 墨言 (青峰的材料撰写专家)

## [LRN-20260305-001] 周报系统配置与工作流程

**Logged**: 2026-03-05T16:35:00+08:00
**Priority**: high
**Status**: promoted
**Area**: config

### Summary
建立了青峰的周报自动生成系统，包含工作日志存储、周报模板、智能体协作等

### Details
用户需要每周固定的周报材料，已配置：

**周报结构（固定一级标题）**:
1. 核心技术攻关&&揭榜项目 - GUI 数据标注工具、GUI 能力开放框架、SOP 生成平台、GUI Agent 能力验证
2. 智能号码库模型研发
3. 智能代接能力升级
4. 评测能力建设
5. 业务能力支撑
6. 前沿技术研究 - OpenClaw 多智能体通信、AI Agent 协同学习、AI 产品公司架构设计

**日志记录格式**:
```
add：[方向] 工作内容
```

**方向映射**:
- [核心技术] → 核心技术攻关&&揭榜项目
- [号码库] → 智能号码库模型研发
- [代接] → 智能代接能力升级
- [评测] → 评测能力建设
- [业务] → 业务能力支撑
- [其他/前沿] → 前沿技术研究

**任务要素格式**:
- 目标
- 进展（具体工作内容）
- 完成度【XX%】
- 协同人员
- 预计完成时间
- 下一步

### Suggested Action
- 每周五根据本周日志自动生成周报
- 不确定归类时主动询问用户

### Metadata
- Source: user_feedback
- Related Files: USER.md, SOUL.md, 周报/2026-03-07-青峰 - 周报-v3.md
- Tags: 周报，workflow, 自动化
- Promoted: USER.md, SOUL.md

---

## [LRN-20260305-002] 周报内容分类确认

**Logged**: 2026-03-05T16:32:00+08:00
**Priority**: medium
**Status**: promoted
**Area**: config

### Summary
用户确认了周报内容分类规则，OpenClaw 多智能体通信和 AI 产品公司架构设计归入"前沿技术研究"

### Details
用户明确要求：
- OpenClaw 多智能体通信 → 前沿技术研究（不是公司业务）
- AI 产品公司架构设计 → 前沿技术研究
- GUI Agent 能力验证 → 核心技术攻关&&揭榜项目

### Suggested Action
- 区分"公司业务工作"和"个人技术研究"
- 公司业务相关归入前五类
- 个人技术探索归入"前沿技术研究"

### Metadata
- Source: user_feedback
- Related Files: 周报/2026-03-07-青峰 - 周报-v3.md
- Tags: 分类，周报
- Promoted: USER.md

---

## [LRN-20260305-003] 不确定时主动询问用户

**Logged**: 2026-03-05T16:32:00+08:00
**Priority**: medium
**Status**: promoted
**Area**: workflow

### Summary
用户要求在不确定的情况下主动询问归类方向，而不是自行猜测

### Details
当收到 `add：[方向] 工作内容` 时：
- 方向明确 → 直接记录
- 方向模糊 → 主动询问归类到哪里
- 新方向 → 询问是否需要新增一级标题

### Suggested Action
在不确定时主动询问，例如：
```
收到！请问这个工作归类到哪里？
- [核心技术] xxx
- [前沿技术研究] xxx
- 或者需要新增其他分类？
```

### Metadata
- Source: user_feedback
- Tags: 工作流程，沟通
- Promoted: SOUL.md

---

## [LRN-20260305-004] 使用 self-improving-agent 技能

**Logged**: 2026-03-05T16:34:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
用户提醒要使用 self-improving-agent 技能来记录学习和改进

### Details
已创建 `.learnings/` 目录，包含：
- LEARNINGS.md - 记录用户反馈、工作流程优化
- ERRORS.md - 记录错误和失败
- FEATURE_REQUESTS.md - 记录功能需求

### Suggested Action
- 每次重要学习都记录到 .learnings/
- 定期 review learnings
- 将通用规则推广到 SOUL.md、USER.md、TOOLS.md

### Resolution
- **Resolved**: 2026-03-05T16:35:00+08:00
- **Notes**: 已创建 learnings 文件并记录本次配置

---

## [LRN-20260306-005] OpenClaw 多数字员工协同工作

**Logged**: 2026-03-06T13:31:00+08:00
**Priority**: high
**Status**: pending
**Area**: workflow

### Summary
通过 OpenClaw 实现多个数字员工之间的协调工作，包括角色配置、飞书对接、通信机制解决

### Details
**本周重点工作**：
1. **数字员工角色配置**（4 个）
   - 总助理
   - 产品经理
   - 技术总监
   - 情报调研员

2. **飞书群聊对接**
   - 配置 4 个飞书机器人
   - 建立数字员工之间的通信机制
   - 支持群聊模式下的协同工作

3. **情报调研员自动化**
   - 定期发送邮件
   - 定期推送简报
   - 自动化工作流配置

### Suggested Action
- 记录到周报的"前沿技术研究"部分
- 作为本周重点工作突出显示

### Metadata
- Source: user_feedback
- Related Files: 周报/2026-03-07-青峰 - 周报-v4.md
- Tags: 数字员工，OpenClaw，飞书，协同工作
- Promoted: -

---
