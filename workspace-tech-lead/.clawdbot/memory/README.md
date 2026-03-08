# 编排层 Agent 经验积累系统

这个目录存储 Alex（编排层）的学习经验。

## 目录结构

```
memory/
├── successes-YYYYMM.json     # 成功经验（按月归档）
├── failures-YYYYMM.json      # 失败经验（按月归档）
├── prompt-patterns.json      # 有效的Prompt模式库
└── agent-performance.json    # Agent性能统计
```

## 经验类型

### 1. 成功经验 (successes)
记录什么做法效果好，用于优化未来的prompt。

```json
{
  "date": "2026-03-05T10:30:00+08:00",
  "taskId": "feat-templates-001",
  "taskType": "feature",
  "agent": "codex",
  "promptStructure": {
    "hasBackground": true,
    "hasCustomerContext": true,
    "hasConstraints": true,
    "hasAcceptanceCriteria": true
  },
  "duration": "45min",
  "attempts": 1,
  "ciPassed": true,
  "reviewPassed": true
}
```

### 2. 失败经验 (failures)
记录什么做法不好，用于避免重复错误。

```json
{
  "date": "2026-03-05T11:00:00+08:00",
  "taskId": "bugfix-001",
  "failureType": "context_overflow",
  "errorMessage": "...",
  "rootCause": "prompt太长，包含了太多文件",
  "solution": "缩小范围，只关注核心3个文件",
  "attempts": 2
}
```

### 3. Prompt模式库 (prompt-patterns)
有效的prompt结构和模板。

```json
{
  "patterns": [
    {
      "name": "feature-with-context",
      "taskType": "feature",
      "structure": [
        "背景说明",
        "客户需求",
        "技术要求",
        "验收标准",
        "历史经验"
      ],
      "successRate": 0.92,
      "avgAttempts": 1.1
    }
  ]
}
```

### 4. Agent性能统计 (agent-performance)
不同Agent在不同任务类型上的表现。

```json
{
  "agents": {
    "codex": {
      "backend": {"successRate": 0.95, "avgDuration": "35min"},
      "bugfix": {"successRate": 0.88, "avgDuration": "25min"},
      "refactor": {"successRate": 0.92, "avgDuration": "45min"}
    },
    "claude-code": {
      "frontend": {"successRate": 0.90, "avgDuration": "30min"},
      "ui": {"successRate": 0.85, "avgDuration": "40min"}
    }
  }
}
```

## 使用方式

### 查询成功经验
```bash
# 查询某类任务的最佳实践
jq '.[] | select(.taskType == "feature")' memory/successes-*.json
```

### 查询失败经验
```bash
# 查询某类失败的处理方式
jq '.[] | select(.failureType == "context_overflow")' memory/failures-*.json
```

### 更新性能统计
成功完成后自动更新 agent-performance.json。