import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeAgentSchema, listAgentDefinitions } from '../db/agents.js'
import { getExecutableAgents, listRoutableAgents } from '../claude-runtime/agent-registry.js'
import { previewAgentRoute } from '../claude-runtime/agent-router.js'
import { buildCoordinatorPlanPrompt } from '../claude-runtime/roles.js'
import { validatePlan } from '../claude-runtime/plan-utils.js'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'

function withAgentDb(fn) {
  const env = withRuntimeTestDb()
  try {
    initializeAgentSchema()
    return fn()
  } finally {
    env.cleanup()
  }
}

test('seeded agent market hides legacy executors and exposes capability agents', () => withAgentDb(() => {
  const agents = listAgentDefinitions({ includeHidden: true, includeCoordinator: true })
  const byId = new Map(agents.map((agent) => [agent.id, agent]))

  assert.equal(byId.get('xiaomu')?.coordinator, true)
  assert.equal(byId.get('xiaomu')?.marketProfile.marketVisible, true)

  for (const legacyId of ['xiaoyan', 'xiaochan', 'xiaokai', 'xiaoce']) {
    const legacy = byId.get(legacyId)
    assert.ok(legacy, `${legacyId} should remain available for history display`)
    assert.equal(legacy.marketProfile.marketVisible, false)
    assert.equal(legacy.enabled, false)
  }

  for (const marketId of ['document_drafter', 'code_reader', 'implementation_engineer', 'verification_runner', 'decision_helper']) {
    const agent = byId.get(marketId)
    assert.ok(agent, `${marketId} should be seeded as a market capability agent`)
    assert.equal(agent.marketProfile.source, 'builtin')
    assert.equal(agent.marketProfile.marketVisible, true)
    assert.ok(agent.capabilityProfile.intents.length > 0)
    assert.ok(agent.routingProfile.routeKeywords.length > 0)
  }
}))

test('routable agents exclude coordinator and hidden compatibility agents', () => withAgentDb(() => {
  const ids = listRoutableAgents().map((agent) => agent.id)
  const executableIds = getExecutableAgents().map((agent) => agent.id)

  assert.ok(ids.includes('general_task_agent'))
  assert.ok(ids.includes('implementation_engineer'))
  assert.equal(ids.includes('xiaomu'), false)
  assert.equal(ids.includes('xiaoyan'), false)
  assert.deepEqual(executableIds, ids)
}))

test('route preview selects daily document agents for email drafting', () => withAgentDb(() => {
  const preview = previewAgentRoute({
    taskDescription: '帮我写一封项目延期说明邮件，语气专业但不要太生硬。',
  })
  const candidateIds = preview.candidates.map((candidate) => candidate.agentId)
  const nodeAgentIds = preview.workflow.map((node) => node.assignedAgentId)

  assert.ok(preview.intent.intents.includes('draft'))
  assert.equal(candidateIds.includes('document_drafter'), true)
  assert.equal(nodeAgentIds.includes('document_drafter'), true)
  assert.equal(candidateIds.includes('xiaoyan'), false)
  assert.equal(nodeAgentIds.includes('implementation_engineer'), false)
  assert.match(preview.workflow[0].routingReason, /draft|文档|邮件|能力/)
}))

test('route preview composes code understanding, implementation, and verification for code fixes', () => withAgentDb(() => {
  const preview = previewAgentRoute({
    taskDescription: '检查本地代码，分析一个 500 错误并实现修复，最后运行验证。',
  })
  const nodeAgentIds = preview.workflow.map((node) => node.assignedAgentId)

  assert.ok(preview.intent.intents.includes('code_change'))
  assert.ok(nodeAgentIds.includes('code_reader'))
  assert.ok(nodeAgentIds.includes('implementation_engineer'))
  assert.ok(nodeAgentIds.includes('verification_runner'))
  assert.ok(preview.workflow.some((node) => node.dependsOn.length > 0))
  assert.ok(preview.workflow.every((node) => Array.isArray(node.acceptanceCriteria) && node.acceptanceCriteria.length > 0))
}))

test('coordinator prompt uses router language and omits legacy role ids', () => withAgentDb(() => {
  const prompt = buildCoordinatorPlanPrompt({
    id: 'task-router-prompt',
    title: '路由测试',
    description: '分析任务并选择合适能力 Agent',
    plan_json: null,
  })

  assert.match(prompt, /任务路由器|Router|路由/)
  assert.match(prompt, /能力卡|Agent Market/)
  assert.doesNotMatch(prompt, /assignedAgentId":"xiaokai/)
  assert.doesNotMatch(prompt, /xiaoyan:|xiaochan:|xiaokai:|xiaoce:/)
  assert.doesNotMatch(prompt, /研究、产品、研发、测试全部参与/)
}))

test('routed workflow schema accepts capability fields and rejects hidden legacy agents', () => withAgentDb(() => {
  const valid = validatePlan({
    decision: 'ready_to_plan',
    taskTitle: '修复 500',
    topology: 'review-gate',
    goal: '定位并修复错误',
    participants: [
      { agentId: 'code_reader', needed: true, reason: '读取代码上下文' },
      { agentId: 'implementation_engineer', needed: true, reason: '实现修复' },
    ],
    workflow: [
      {
        id: 'node-01',
        title: '定位错误',
        phase: 'diagnosis',
        intent: 'code_diagnosis',
        requiredCapabilities: ['code_reading'],
        assignedAgentId: 'code_reader',
        routingReason: '该节点需要代码阅读能力。',
        objective: '找出 500 错误来源',
        dependsOn: [],
        inputArtifacts: ['repo_files'],
        expectedOutputArtifacts: ['technical_findings'],
        requiredInputs: ['错误日志'],
        expectedOutputs: ['定位报告'],
        executionMode: 'report',
        successCriteria: ['指出可复现原因'],
        parallelGroup: '',
        riskLevel: 'medium',
        costEstimate: 'low',
        requiresApproval: false,
        acceptanceCriteria: ['定位报告包含文件路径和原因'],
      },
    ],
    acceptanceCriteria: ['修复路径清晰'],
  })

  assert.equal(valid.workflow[0].phase, 'diagnosis')
  assert.equal(valid.workflow[0].intent, 'code_diagnosis')
  assert.deepEqual(valid.workflow[0].requiredCapabilities, ['code_reading'])
  assert.equal(valid.workflow[0].routingReason.includes('代码阅读'), true)
  assert.deepEqual(valid.workflow[0].inputArtifacts, ['repo_files'])
  assert.deepEqual(valid.workflow[0].expectedOutputArtifacts, ['technical_findings'])
  assert.equal(valid.workflow[0].requiresApproval, false)

  assert.throws(() => validatePlan({
    decision: 'ready_to_plan',
    taskTitle: '旧 Agent 不可路由',
    workflow: [
      {
        id: 'node-01',
        title: '旧节点',
        assignedAgentId: 'xiaoyan',
        objective: '不应通过',
        dependsOn: [],
        requiredInputs: [],
        expectedOutputs: ['报告'],
        executionMode: 'report',
        successCriteria: ['完成'],
      },
    ],
  }), /assignedAgentId/)
}))
