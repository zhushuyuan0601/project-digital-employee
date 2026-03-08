import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = 3100

// Gateway 配置
const GATEWAY_URL = 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = 'bd0f157b60e41a3d9895ddec846d2d10c8d795bc0a061f70'

// 数字员工配置
const DIGITAL_TEAM = {
  'xiaoU': {
    agentId: 'ceo',
    name: '小 U',
    role: '任务秘书'
  },
  'xiaoYan': {
    agentId: 'researcher',
    name: '小研',
    role: '竞品分析师'
  },
  'xiaoChan': {
    agentId: 'pm',
    name: '小产',
    role: '产品经理'
  },
  'xiaoKai': {
    agentId: 'tech-lead',
    name: '小开',
    role: '研发工程师'
  }
}

app.use(cors())
app.use(express.json())

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', team: Object.keys(DIGITAL_TEAM) })
})

// 调用 OpenClaw Agent
app.post('/api/agent/:memberName', async (req, res) => {
  const { memberName } = req.params
  const { message, context } = req.body

  const member = DIGITAL_TEAM[memberName]
  if (!member) {
    return res.status(400).json({ error: `未找到数字员工：${memberName}` })
  }

  console.log(`[${new Date().toISOString()}] ${member.name}(${member.agentId}) 收到消息:`, message)

  try {
    // 调用 OpenClaw Gateway 的 Chat Completions API
    const response = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': member.agentId
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [
          ...(context || []),
          { role: 'user', content: message }
        ],
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[${member.name}] 调用 Gateway 失败:`, response.status, errorText)
      return res.status(500).json({ error: 'Gateway 调用失败', details: errorText })
    }

    const data = await response.json()

    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message.content
      console.log(`[${member.name}] 回复:`, reply.substring(0, 100) + '...')

      res.json({
        success: true,
        member: {
          name: member.name,
          role: member.role,
          agentId: member.agentId
        },
        reply: reply
      })
    } else {
      res.status(500).json({ error: '未收到有效回复' })
    }

  } catch (error) {
    console.error(`[${member.name}] 错误:`, error)
    res.status(500).json({ error: error.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 数字员工团队 API 服务器已启动`)
  console.log(`📍 本地访问：http://localhost:${PORT}`)
  console.log(`🔗 Gateway: ${GATEWAY_URL}`)
  console.log(`👥 团队成员:`, Object.keys(DIGITAL_TEAM).join(', '))
  console.log(`\n准备就绪，等待连接...\n`)
})
