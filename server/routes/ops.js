import express from 'express'

function generateTokenData() {
  const now = new Date()
  const trend = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    trend.push({
      date: date.toISOString().split('T')[0],
      input: Math.floor(Math.random() * 50000) + 10000,
      output: Math.floor(Math.random() * 30000) + 5000
    })
  }

  const modelUsage = [
    { model: 'claude-sonnet-4-6', tokens: 125000, cost: 0.625, percentage: 45 },
    { model: 'claude-opus-4-6', tokens: 85000, cost: 1.275, percentage: 30 },
    { model: 'gpt-4o', tokens: 45000, cost: 0.45, percentage: 15 },
    { model: 'gemini-pro', tokens: 28000, cost: 0.14, percentage: 10 }
  ]

  const agentCosts = [
    { agentId: 'xiaomu', agentName: '小呦', tokens: 95000, cost: 0.76, rank: 1 },
    { agentId: 'xiaokai', agentName: '小开', tokens: 78000, cost: 0.62, rank: 2 },
    { agentId: 'xiaochan', agentName: '小产', tokens: 52000, cost: 0.42, rank: 3 },
    { agentId: 'xiaoyan', agentName: '小研', tokens: 35000, cost: 0.28, rank: 4 },
    { agentId: 'xiaoce', agentName: '小测', tokens: 28000, cost: 0.22, rank: 5 }
  ]

  const recentUsage = []
  for (let i = 0; i < 20; i++) {
    recentUsage.push({
      id: `usage-${i}`,
      timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
      agentId: ['xiaomu', 'xiaokai', 'xiaochan', 'xiaoyan', 'xiaoce'][Math.floor(Math.random() * 5)],
      agentName: '小呦',
      model: ['claude-sonnet-4-6', 'claude-opus-4-6', 'gpt-4o'][Math.floor(Math.random() * 3)],
      inputTokens: Math.floor(Math.random() * 5000) + 1000,
      outputTokens: Math.floor(Math.random() * 3000) + 500,
      totalTokens: 0,
      cost: 0,
      endpoint: '/api/v1/chat/completions',
      duration: Math.floor(Math.random() * 2000) + 500
    })
  }
  recentUsage.forEach((usage) => {
    usage.totalTokens = usage.inputTokens + usage.outputTokens
    usage.cost = parseFloat((usage.totalTokens * 0.000005).toFixed(4))
  })

  const totalTokens = trend.reduce((sum, item) => sum + item.input + item.output, 0)
  const inputTokens = trend.reduce((sum, item) => sum + item.input, 0)
  const outputTokens = trend.reduce((sum, item) => sum + item.output, 0)

  return {
    stats: {
      totalTokens,
      totalCost: parseFloat((totalTokens * 0.000005).toFixed(2)),
      inputTokens,
      outputTokens,
      apiCalls: recentUsage.length,
      avgResponseTime: Math.floor(recentUsage.reduce((sum, usage) => sum + usage.duration, 0) / recentUsage.length)
    },
    trend,
    modelUsage,
    agentCosts,
    recentUsage
  }
}

function generateMemoryData() {
  const files = [
    { id: 'f1', name: 'project-knowledge.md', path: '/knowledge/project-knowledge.md', type: 'file', size: 15420, mtime: new Date().toISOString() },
    { id: 'f2', name: 'api-docs.md', path: '/knowledge/api-docs.md', type: 'file', size: 8920, mtime: new Date().toISOString() },
    { id: 'f3', name: 'user-guide.md', path: '/knowledge/user-guide.md', type: 'file', size: 12340, mtime: new Date().toISOString() },
    { id: 'f4', name: 'best-practices.md', path: '/guides/best-practices.md', type: 'file', size: 6780, mtime: new Date().toISOString() }
  ]

  return {
    stats: {
      fileCount: files.length,
      nodeCount: 4,
      storageUsed: files.reduce((sum, file) => sum + (file.size || 0), 0),
      storageUsedFormatted: '42.5 KB'
    },
    files,
    nodes: [
      { id: 'n1', name: 'OpenClaw', type: 'entity', description: 'AI Agent 编排平台', connections: [{ targetId: 'n2', type: 'related', weight: 0.9 }, { targetId: 'n3', type: 'related', weight: 0.8 }] },
      { id: 'n2', name: 'Mission Control', type: 'concept', description: '多 Agent 管理系统', connections: [{ targetId: 'n1', type: 'related', weight: 0.9 }] },
      { id: 'n3', name: '数字员工', type: 'entity', description: '自动化办公 Agent', connections: [{ targetId: 'n1', type: 'related', weight: 0.8 }] },
      { id: 'n4', name: 'API Gateway', type: 'concept', description: '统一 API 网关', connections: [{ targetId: 'n1', type: 'related', weight: 0.7 }] }
    ],
    activities: [
      { id: 'a1', type: 'create', nodeId: 'n4', nodeName: 'API Gateway', timestamp: new Date().toISOString(), description: '创建新节点' },
      { id: 'a2', type: 'update', nodeId: 'n1', nodeName: 'OpenClaw', timestamp: new Date().toISOString(), description: '更新节点信息' },
      { id: 'a3', type: 'connect', nodeId: 'n2', nodeName: 'Mission Control', timestamp: new Date().toISOString(), description: '建立关联' }
    ]
  }
}

function generateSecurityData() {
  return {
    stats: {
      score: 87,
      secretsDetected: 2,
      mcpConnections: 3,
      injectionAttempts: 5,
      passedChecks: 42,
      totalChecks: 45
    },
    secrets: [
      { id: 's1', type: 'api_key', location: '~/.openclaw/config.json', severity: 'medium', detectedAt: new Date().toISOString(), status: 'resolved' },
      { id: 's2', type: 'token', location: '~/logs/agent.log', severity: 'low', detectedAt: new Date().toISOString(), status: 'pending' }
    ],
    mcpServers: [
      { id: 'mcp1', name: 'Filesystem', url: 'file://~/', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read', 'write'] },
      { id: 'mcp2', name: 'Memory', url: 'memory://default', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read', 'write', 'delete'] },
      { id: 'mcp3', name: 'Time', url: 'time://utc', status: 'connected', lastConnected: new Date().toISOString(), permissions: ['read'] }
    ],
    injectionAttempts: [
      { id: 'i1', type: 'prompt_injection', source: 'user:192.168.1.100', payload: 'Ignore previous instructions...', blocked: true, timestamp: new Date().toISOString() },
      { id: 'i2', type: 'jailbreak', source: 'agent:xiaoyan', payload: 'You are now in developer mode...', blocked: true, timestamp: new Date().toISOString() }
    ],
    events: [
      { id: 'e1', type: 'secret_detected', severity: 'medium', description: '发现 API 密钥泄露', timestamp: new Date().toISOString(), status: 'resolved' },
      { id: 'e2', type: 'injection_blocked', severity: 'high', description: '阻止提示词注入攻击', timestamp: new Date().toISOString(), status: 'resolved' }
    ],
    trustFactors: [
      { name: '代码审计', score: 95, maxScore: 100 },
      { name: '密钥管理', score: 80, maxScore: 100 },
      { name: '访问控制', score: 90, maxScore: 100 },
      { name: '数据加密', score: 85, maxScore: 100 }
    ]
  }
}

export function createOpsRouter({ proxyToGateway }) {
  const router = express.Router()

  router.get('/tokens/stats', async (_req, res) => {
    try {
      const gatewayData = await proxyToGateway('/api/tokens/stats').catch(() => null)
      if (gatewayData?.success) return res.json(gatewayData)
      res.json({ success: true, dataSource: 'mock', ...generateTokenData() })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  router.get('/tokens/export', (_req, res) => {
    try {
      const data = generateTokenData()
      let csv = 'Date,Input Tokens,Output Tokens,Total Tokens,Cost\n'
      data.trend.forEach((item) => {
        csv += `${item.date},${item.input},${item.output},${item.input + item.output},${((item.input + item.output) * 0.000005).toFixed(4)}\n`
      })
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=token-report.csv')
      res.send(csv)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  router.get('/memory', async (_req, res) => {
    try {
      const gatewayData = await proxyToGateway('/api/memory').catch(() => null)
      if (gatewayData?.success) return res.json(gatewayData)
      res.json({ success: true, dataSource: 'mock', ...generateMemoryData() })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  router.get('/security/audit', async (_req, res) => {
    try {
      const gatewayData = await proxyToGateway('/api/security/audit').catch(() => null)
      if (gatewayData?.success) return res.json(gatewayData)
      res.json({ success: true, dataSource: 'mock', ...generateSecurityData() })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  return router
}
