# 双 Agent 通讯终端 - Gateway 配置指南

## 问题原因

当前两个 Agent 都连接到小 U，是因为后端 OpenClaw Gateway 没有正确区分不同的 sessionKey 到不同的 Agent。

## 前端当前配置

前端已经正确配置了两个独立的 Agent 连接：

| Agent | client.id | client.channel | sessionKey | Gateway Agent ID |
|-------|-----------|----------------|------------|------------------|
| 小 U | `webchat:xiaomu` | `webchat:xiaomu` | `agent:xiaomu:main` | `xiaomu` |
| 研发工程师 | `webchat:tech` | `webchat:tech` | `agent:tech:main` | `tech` |

## 解决方案

### 步骤 1：确认 Gateway Agent 配置

确保 Gateway 中已配置这两个 Agent。检查 `~/.openclaw/agents/` 目录：

```bash
# 列出所有 Agent
ls ~/.openclaw/agents/

# 应该看到 xiaomu 和 tech 两个 Agent 目录
```

如果没有，需要创建 Agent 配置：

```bash
# 创建小 U Agent
mkdir -p ~/.openclaw/agents/xiaomu
cat > ~/.openclaw/agents/xiaomu/agent.json << 'EOF'
{
  "id": "xiaomu",
  "name": "小 U",
  "description": "项目管理助手",
  "prompt": "你是一个项目管理助手，负责统筹调度和任务分配。",
  "sessionKey": "agent:xiaomu:main"
}
EOF

# 创建研发工程师 Agent
mkdir -p ~/.openclaw/agents/tech
cat > ~/.openclaw/agents/tech/agent.json << 'EOF'
{
  "id": "tech",
  "name": "研发工程师",
  "description": "技术研发专家",
  "prompt": "你是一个技术研发专家，负责技术架构和代码实现。",
  "sessionKey": "agent:tech:main"
}
EOF
```

### 步骤 2：配置 Gateway bindings

编辑 Gateway 配置文件（通常在 `~/.openclaw/openclaw.json` 或 `~/.openclaw/gateway.json`）：

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "你的 token"
    }
  },
  "bindings": [
    {
      "agentId": "xiaomu",
      "match": {
        "sessionKey": "agent:xiaomu:main"
      }
    },
    {
      "agentId": "tech",
      "match": {
        "sessionKey": "agent:tech:main"
      }
    }
  ]
}
```

### 步骤 3：重启 Gateway

```bash
# 重启 OpenClaw Gateway
openclaw restart

# 或者重新启动
openclaw --mode local
```

### 步骤 4：验证配置

1. 打开浏览器开发者工具 - 控制台
2. 访问 `/chat` 页面
3. 点击 **全连** 按钮连接两个 Agent
4. 切换到 **小 U** 发送消息，查看控制台输出：
   ```
   [WebSocket] [xiaomu] Sending: {"method":"chat.send","params":{"sessionKey":"agent:xiaomu:main",...}}
   ```
5. 切换到 **研发工程师** 发送消息，查看控制台输出：
   ```
   [WebSocket] [tech] Sending: {"method":"chat.send","params":{"sessionKey":"agent:tech:main",...}}
   ```
6. 检查两个 Agent 的回复是否不同

## 故障排查

### 检查 Gateway 日志

```bash
# 查看 Gateway 运行日志
openclaw logs

# 或者查看实时日志
tail -f ~/.openclaw/logs/gateway.log
```

### 检查 Agent 列表

```bash
# 列出所有已配置的 Agent
openclaw agents list
```

### 检查 bindings 配置

```bash
# 查看当前 Gateway 配置
openclaw config show

# 确认 bindings 配置正确
```

### 测试 WebSocket 连接

使用 wscat 工具测试：

```bash
# 安装 wscat
npm install -g wscat

# 连接到小 U
wscat -c "ws://127.0.0.1:18789?token=你的 token"
# 发送 connect 请求
{"type":"req","method":"connect","params":{"client":{"id":"webchat:xiaomu","channel":"webchat:xiaomu"}}}
# 发送消息
{"type":"req","method":"chat.send","params":{"sessionKey":"agent:xiaomu:main","message":"你好"}}

# 新建连接测试研发工程师
wscat -c "ws://127.0.0.1:18789?token=你的 token"
# 发送 connect 请求
{"type":"req","method":"connect","params":{"client":{"id":"webchat:tech","channel":"webchat:tech"}}}
# 发送消息
{"type":"req","method":"chat.send","params":{"sessionKey":"agent:tech:main","message":"你好"}}
```

## 注意事项

1. **sessionKey 必须唯一**：每个 Agent 的 sessionKey 不能重复
2. **bindings 匹配规则**：确保 bindings 中的 match 条件能正确匹配前端发送的参数
3. **Gateway 模式**：确保 Gateway 运行在 `local` 模式，支持多 Agent

## 联系支持

如果问题仍未解决，请检查：
- OpenClaw Gateway 版本是否支持多 Agent bindings
- Gateway 日志中是否有错误信息
- 前端控制台的网络请求和响应
