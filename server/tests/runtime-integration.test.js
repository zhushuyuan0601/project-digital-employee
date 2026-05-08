import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentRun, createTask } from '../db/tasks.js'
import { enqueueRuntimeJob } from '../db/runtime-jobs.js'
import { claudeRuntimeQueue, getRuntimeStatus } from '../claude-runtime/index.js'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'

test('runtime status and tracked state read queued jobs from the database', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'runtime status', description: 'db queue source' })
    const run = createAgentRun({
      id: 'run-db-backed-status',
      taskId: task.id,
      agentId: 'general_researcher',
      roleName: 'general_researcher',
      status: 'queued',
      kind: 'subtask',
      prompt: 'queued in db only',
    })
    enqueueRuntimeJob({ run, sessionKey: 'session:db-backed-status' })

    const status = getRuntimeStatus()
    const agent = status.agentConcurrency.find((item) => item.agentId === 'general_researcher')
    assert.equal(status.queued, 1)
    assert.equal(agent.queued, 1)
    assert.equal(claudeRuntimeQueue.trackedState(run.id), 'queued')
  } finally {
    env.cleanup()
  }
})
