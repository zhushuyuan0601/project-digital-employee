import express from 'express'

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
      { id: 's1', type: 'api_key', location: '~/.claude/config.json', severity: 'medium', detectedAt: new Date().toISOString(), status: 'resolved' },
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

export function createOpsRouter() {
  const router = express.Router()

  router.get('/security/audit', async (_req, res) => {
    try {
      res.json({ success: true, dataSource: 'mock', ...generateSecurityData() })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })

  return router
}
