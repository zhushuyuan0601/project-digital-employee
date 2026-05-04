# Claude Runtime 报告型多 Agent 编排

本项目默认使用 Claude Code SDK 作为 Agent 执行运行时，OpenClaw Gateway 保留为 legacy fallback。

## 环境变量

```bash
AGENT_RUNTIME=claude-code
CLAUDE_AGENT_MAX_CONCURRENCY=3
CLAUDE_AGENT_MAX_TURNS=256
CLAUDE_REPORT_ONLY=true
CLAUDE_RUNTIME_CWD=/Users/lh/git/project-digital-employee
CLAUDE_WORKSPACE_ISOLATION=true
CLAUDE_WORKSPACE_ROOT=server/data/runtime-workspaces
CLAUDE_ALLOWED_TOOLS=Read,Glob,Grep
CLAUDE_OUTPUT_ROOT=server/data/task-outputs
```

开发联调时可开启模拟模式：

```bash
CLAUDE_RUNTIME_MOCK=true
```

## 执行流程

1. 任务中心创建任务后，小呦自动进入 Claude Runtime 队列生成结构化拆解。
2. 后端为当前 taskId 创建隔离工作空间：`CLAUDE_WORKSPACE_ROOT/{taskId}/project`。
3. Claude Code SDK 的 `cwd` 指向该任务工作空间，不再直接指向项目根目录。
4. 拆解通过校验后，平台创建子任务并按并发数入队。
5. 执行 Agent 只生成 Markdown 报告，不直接修改源码。
6. 后端将报告写入 `CLAUDE_OUTPUT_ROOT` 并绑定到成果库。
7. 任务中心通过 SSE 和轮询展示事件、状态和成果。

## 任务隔离

默认开启任务级工作空间隔离：

- 每个任务拥有独立项目快照：`server/data/runtime-workspaces/{taskId}/project`。
- 快照排除 `.git`、`node_modules`、`dist`、`server/data`、`.env` 等目录或敏感文件。
- 历史报告目录 `server/data/task-outputs` 不会复制进任务工作空间。
- 不同 taskId 之间不能通过 `Glob/Grep` 扫到彼此的报告产物。
- 子任务重试只 resume 当前子任务自己的 `lastClaudeSessionId`，不会 resume 其他任务 session。

如果确实需要恢复旧行为，可设置：

```bash
CLAUDE_WORKSPACE_ISOLATION=false
```

## 安全边界

- 默认只允许 `Read`、`Glob`、`Grep`。
- 禁用 `Edit`、`Write`、`MultiEdit`、`NotebookEdit`。
- 报告由 Node 后端写入受控目录。
- 如需代码建议，Agent 必须写入 Markdown 代码块。
- Agent prompt 明确禁止读取、引用或推断其他 taskId 的历史报告、历史成果或历史会话。

## 主要接口

- `GET /api/runtime/status`
- `POST /api/tasks`
- `POST /api/tasks/:id/plan/run`
- `POST /api/tasks/:id/subtasks/run`
- `POST /api/subtasks/:id/run`
- `POST /api/subtasks/:id/retry`
- `GET /api/tasks/:id/events/stream`
- `GET /api/runs/:id`
- `POST /api/runs/:id/cancel`
