import test from 'node:test'
import assert from 'node:assert/strict'
import { resetDatabaseForTests } from '../db/index.js'
import {
  getAgentDefinition,
  initializeAgentSchema,
  listRoutableAgentDefinitions,
  updateAgentDefinition,
} from '../db/agents.js'
import {
  previewAgentRoute,
  scoreAgentForTask,
  understandTaskIntent,
} from '../claude-runtime/agent-router.js'

function testDbPath(name) {
  return `/private/tmp/project-digital-employee-${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
}

test('agent schema migration adds capability routing profiles without disabling legacy executors', () => {
  resetDatabaseForTests(testDbPath('agent-market-test'))
  initializeAgentSchema()

  const routable = listRoutableAgentDefinitions()
  assert.deepEqual(routable.map((agent) => agent.id), ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce'])

  const engineer = getAgentDefinition('xiaokai')
  assert.equal(engineer.marketVisible, true)
  assert.ok(engineer.capabilityProfile.intents.includes('code_change'))
  assert.ok(engineer.routingProfile.routeKeywords.includes('代码'))
  assert.equal(engineer.governanceProfile.permissionScope, 'workspace_write')
})

test('router scores code tasks against capability cards and respects disabled agents', () => {
  resetDatabaseForTests(testDbPath('agent-router-test'))
  initializeAgentSchema()

  const intent = understandTaskIntent('修复项目里的 500 报错，并运行测试验证')
  assert.ok(intent.intents.includes('code_change'))

  const engineer = getAgentDefinition('xiaokai')
  const score = scoreAgentForTask(engineer, intent)
  assert.equal(score.agentId, 'xiaokai')
  assert.ok(score.score > 0)

  updateAgentDefinition('xiaokai', { enabled: false })
  const preview = previewAgentRoute({ taskDescription: '修复项目里的 500 报错，并运行测试验证' })
  assert.equal(preview.candidates.some((candidate) => candidate.agentId === 'xiaokai'), false)
})
