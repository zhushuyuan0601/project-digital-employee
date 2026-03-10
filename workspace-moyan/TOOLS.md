# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## 周报系统

**目录结构**:
```
workspace-moyan/
├── 工作日志/          # 工作日志存储
│   ├── README.md      # 使用说明
│   ├── 周报模板.md     # 周报结构模板
│   └── 2026-W10.md    # 第 10 周日志
├── 周报/              # 已生成的周报
│   └── 2026-03-07-青峰 - 周报-v3.md
└── .learnings/        # 学习记录
    ├── LEARNINGS.md
    ├── ERRORS.md
    └── FEATURE_REQUESTS.md
```

**日志记录**:
```
add：[方向] 工作内容
```

**周报生成**: 每周五自动从本周日志生成周报

## self-improving-agent 技能

**用途**: 记录学习和改进，实现持续进化

**文件**:
- `.learnings/LEARNINGS.md` - 用户反馈、工作流程优化
- `.learnings/ERRORS.md` - 错误和失败
- `.learnings/FEATURE_REQUESTS.md` - 功能需求

**记录时机**:
- 用户纠正时 → LEARNINGS.md (category: correction)
- 命令失败时 → ERRORS.md
- 用户请求新功能时 → FEATURE_REQUESTS.md
- 发现更好的方法时 → LEARNINGS.md (category: best_practice)

**推广规则**:
- 通用规则 → USER.md、SOUL.md、TOOLS.md
- 工作流程 → AGENTS.md
- 工具问题 → TOOLS.md

---

Add whatever helps you do your job. This is your cheat sheet.
