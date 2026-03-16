# 任务中心 - Gateway Agent 集成说明

## 架构设计

```
用户 → 任务中心 → 小 U(ceo) → 分派 → 小开/小产/小研 → 处理 → 实时推送
                          │
              ┌───────────┼───────────┐
              │           │           │
         tech-lead       pm     researcher
```

## Agent 映射关系

| 前端机器人 | Gateway Agent | sessionKey | 角色 |
|-----------|---------------|------------|------|
| 小 U | `ceo` | `agent:ceo:ceo` | 任务秘书 - 统筹调度 |
| 小开 | `tech-lead` | `agent:tech-lead:tech-lead` | 研发工程师 |
| 小产 | `pm` | `agent:pm:pm` | 产品经理 |
| 小研 | `researcher` | `agent:researcher:researcher` | 竞品分析师 |

## 核心文件

### Stores
- `src/stores/taskGateway.ts` - Gateway 通信层，管理 4 个 WebSocket 连接
- `src/stores/simulation.ts` - 任务执行逻辑，调用 Gateway 而非 AI 模型
- `src/stores/agents.ts` - Agent 状态管理，添加 `gatewayAgentId` 映射

### 类型定义
- `src/types/agent.ts` - 添加 `gatewayAgentId` 字段

### 视图
- `src/views/TaskCenter.vue` - 集成 Gateway 连接，实时显示消息

## 工作流程

1. **连接建立**
   - 页面加载时自动连接所有 Gateway Agent
   - 每个 Agent 独立的 WebSocket 连接
   - 状态实时显示在顶部

2. **任务下达**
   - 用户输入任务描述
   - 任务分析器拆解为子任务
   - 子任务分配给对应 Agent

3. **任务执行**
   - 通过 `chat.send` 方法发送任务到 Gateway
   - Gateway Agent 执行并返回结果
   - 实时消息推送到前端

4. **进度展示**
   - 执行日志实时更新
   - Agent 状态卡片显示进度
   - 产出物展示

## API 消息格式

### 连接请求
```json
{
  "type": "req",
  "method": "connect",
  "params": {
    "client": {
      "id": "unicom-task-center",
      "displayName": "联通小队 - 任务中心",
      "mode": "webchat"
    },
    "auth": { "token": "..." }
  }
}
```

### 发送消息
```json
{
  "type": "req",
  "method": "chat.send",
  "params": {
    "sessionKey": "agent:ceo:ceo",
    "message": "任务内容..."
  }
}
```

### 接收事件
```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "stream": "assistant",
    "data": { "text": "回复内容" }
  }
}
```

## Gateway 配置

确保 Gateway 已启动且配置正确：

```json
// ~/.openclaw/openclaw.json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "f81ce9096591ead310057206bd32b015b784886fe7ff4df1"
    }
  },
  "agents": {
    "list": [
      { "id": "ceo", ... },
      { "id": "tech-lead", ... },
      { "id": "pm", ... },
      { "id": "researcher", ... }
    ]
  }
}
```

## 绑定配置

确保 `bindings` 配置正确，使 WebChat 客户端能连接到对应 Agent：

```json
{
  "bindings": [
    {
      "agentId": "ceo",
      "match": { "channel": "webchat" }
    },
    {
      "agentId": "tech-lead",
      "match": { "channel": "webchat" }
    }
  ]
}
```

## 测试步骤

1. 启动 Gateway: `openclaw --mode local`
2. 打开任务中心页面
3. 检查顶部状态显示"所有 Agent 已连接"
4. 输入任务，例如："帮我分析一下竞品市场情况"
5. 观察执行日志和 Agent 状态变化

## 故障排查

### Agent 未连接
- 检查 Gateway 是否启动
- 验证 token 是否正确
- 查看浏览器控制台日志

### 任务无响应
- 检查 Agent 是否空闲
- 验证 Gateway bindings 配置
- 查看 sessionKey 格式是否正确

### 消息乱序
- 当前实现按顺序处理消息
- 检查 WebSocket 连接稳定性
