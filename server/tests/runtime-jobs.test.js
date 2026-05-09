import test from 'node:test'
import assert from 'node:assert/strict'
import { createTask, createAgentRun, getAgentRun } from '../db/tasks.js'
import {
  cancelRuntimeJob,
  claimNextRuntimeJob,
  completeRuntimeJob,
  deferRuntimeJob,
  enqueueRuntimeJob,
  getRuntimeJob,
  listQueuedRuntimeJobs,
} from '../db/runtime-jobs.js'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'

function createRun(task, id, { agentId = 'xiaoyan', kind = 'subtask', status = 'queued' } = {}) {
  return createAgentRun({
    id,
    taskId: task.id,
    agentId,
    roleName: agentId,
    status,
    kind,
    prompt: `prompt for ${id}`,
  })
}

test('runtime jobs claim by priority and prevent concurrent session claims', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'runtime jobs', description: 'claim order' })
    const low = createRun(task, 'run-low')
    const high = createRun(task, 'run-high')

    enqueueRuntimeJob({ run: low, sessionKey: 'session:same', priority: 1 })
    enqueueRuntimeJob({ run: high, sessionKey: 'session:same', priority: 10 })

    const first = claimNextRuntimeJob({
      ownerId: 'worker-a',
      agentCapacity: { xiaoyan: 2 },
      lockedSeconds: 60,
    })
    assert.equal(first.run_id, high.id)
    assert.equal(getAgentRun(high.id).status, 'running')

    const blocked = claimNextRuntimeJob({
      ownerId: 'worker-b',
      agentCapacity: { xiaoyan: 2 },
      lockedSeconds: 60,
    })
    assert.equal(blocked, null)

    completeRuntimeJob(high.id)
    const second = claimNextRuntimeJob({
      ownerId: 'worker-b',
      agentCapacity: { xiaoyan: 2 },
      lockedSeconds: 60,
    })
    assert.equal(second.run_id, low.id)
  } finally {
    env.cleanup()
  }
})

test('deferRuntimeJob does not consume attempts', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'runtime jobs', description: 'defer' })
    const run = createRun(task, 'run-defer')
    enqueueRuntimeJob({ run, sessionKey: 'session:defer' })

    deferRuntimeJob(run.id, 5, 'lock conflict')
    const job = getRuntimeJob(run.id)
    assert.equal(job.status, 'queued')
    assert.equal(job.attempt_count, 0)
    assert.equal(getAgentRun(run.id).status, 'queued')
  } finally {
    env.cleanup()
  }
})

test('cancelRuntimeJob updates queued job and visible run history', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'runtime jobs', description: 'cancel' })
    const run = createRun(task, 'run-cancel')
    enqueueRuntimeJob({ run, sessionKey: 'session:cancel' })

    cancelRuntimeJob(run.id)
    assert.equal(getRuntimeJob(run.id).status, 'cancelled')
    assert.equal(getAgentRun(run.id).status, 'cancelled')
    assert.equal(listQueuedRuntimeJobs().some((job) => job.run_id === run.id), false)
  } finally {
    env.cleanup()
  }
})
