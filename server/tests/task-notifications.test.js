import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'events'
import { addTaskEvent, createTask, listTaskEvents } from '../db/tasks.js'
import { claudeRuntimeEvents } from '../claude-runtime/event-bus.js'
import { withRuntimeTestDb } from './helpers/runtime-test-db.js'
import tasksRouter from '../routes/tasks.js'

function waitForNotificationEvent(taskId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      claudeRuntimeEvents.off('event', handler)
      reject(new Error('Timed out waiting for task.notification'))
    }, 500)

    const handler = (event) => {
      if (event.taskId !== taskId || event.type !== 'task.notification') return
      clearTimeout(timeout)
      claudeRuntimeEvents.off('event', handler)
      resolve(event)
    }

    claudeRuntimeEvents.on('event', handler)
  })
}

function getEventStreamRouteHandler() {
  const layer = tasksRouter.stack.find((entry) => entry.route?.path === '/tasks/:id/events/stream')
  const handler = layer?.route?.stack?.[0]?.handle
  assert.equal(typeof handler, 'function')
  return handler
}

function invokeEventStreamRoute({ taskId, afterEventId }) {
  const req = new EventEmitter()
  req.params = { id: taskId }
  req.query = afterEventId == null ? {} : { afterEventId: String(afterEventId) }

  const messages = []
  const headers = {}
  const res = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    flushHeaders() {},
    write(chunk) {
      const line = String(chunk).split('\n').find((entry) => entry.startsWith('data: '))
      if (line) messages.push(JSON.parse(line.slice(6)))
    },
  }

  getEventStreamRouteHandler()(req, res)
  req.emit('close')
  assert.equal(headers['content-type'], 'text/event-stream')
  return messages
}

test('important task events create a persisted and broadcast notification event', async () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'notify me', description: 'status notifications' })
    const broadcast = waitForNotificationEvent(task.id)

    const sourceEvent = addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'task.completed',
      message: '任务已完成，可查看成果',
      payload: { summary: 'done' },
    })

    const liveEvent = await broadcast
    const events = listTaskEvents(task.id)
    const notification = events.find((event) => event.type === 'task.notification')

    assert.equal(sourceEvent.type, 'task.completed')
    assert.ok(notification)
    assert.equal(notification.payload_json.notification.version, 1)
    assert.equal(notification.payload_json.notification.sourceType, 'task.completed')
    assert.equal(notification.payload_json.notification.level, 'success')
    assert.equal(notification.payload_json.notification.priority, 'high')
    assert.equal(notification.payload_json.notification.action, 'review_outputs')
    assert.equal(notification.payload_json.notification.desktop, true)
    assert.equal(notification.payload_json.source.eventId, sourceEvent.id)
    assert.equal(notification.payload_json.source.payload, undefined)
    assert.equal(liveEvent.dbEventId, notification.id)
    assert.equal(liveEvent.payload.notification.dedupeKey, notification.payload_json.notification.dedupeKey)
  } finally {
    env.cleanup()
  }
})

test('cancelled task events create warning in-app notifications without desktop delivery', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'cancel me', description: 'status notifications' })

    addTaskEvent({
      taskId: task.id,
      agentId: 'tester',
      type: 'agent.cancelled',
      message: 'User cancelled the current run',
      payload: { reason: 'manual' },
    })

    const notification = listTaskEvents(task.id).find((event) => event.type === 'task.notification')
    assert.ok(notification)
    assert.equal(notification.payload_json.notification.sourceType, 'agent.cancelled')
    assert.equal(notification.payload_json.notification.level, 'warning')
    assert.equal(notification.payload_json.notification.priority, 'high')
    assert.equal(notification.payload_json.notification.toast, true)
    assert.equal(notification.payload_json.notification.desktop, false)
    assert.equal(notification.payload_json.source.payload, undefined)
  } finally {
    env.cleanup()
  }
})

test('notification events are deduped for repeated status events in a short window', () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'dedupe', description: 'status notifications' })

    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'agent.error',
      message: 'Runtime failed',
      payload: { runId: 'run-1' },
    })
    addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'agent.error',
      message: 'Runtime failed again',
      payload: { runId: 'run-2' },
    })

    const notifications = listTaskEvents(task.id).filter((event) => event.type === 'task.notification')
    assert.equal(notifications.length, 1)
    assert.equal(notifications[0].payload_json.notification.sourceType, 'agent.error')
  } finally {
    env.cleanup()
  }
})

test('same status events for different tasks do not dedupe or cross-bind notifications', () => {
  const env = withRuntimeTestDb()
  try {
    const firstTask = createTask({ title: 'first failure', description: 'status notifications' })
    const secondTask = createTask({ title: 'second failure', description: 'status notifications' })

    addTaskEvent({
      taskId: firstTask.id,
      agentId: 'xiaomu',
      type: 'agent.error',
      message: 'First runtime failed',
      payload: { runId: 'run-1' },
    })
    addTaskEvent({
      taskId: secondTask.id,
      agentId: 'xiaomu',
      type: 'agent.error',
      message: 'Second runtime failed',
      payload: { runId: 'run-2' },
    })

    const firstNotification = listTaskEvents(firstTask.id).find((event) => event.type === 'task.notification')
    const secondNotification = listTaskEvents(secondTask.id).find((event) => event.type === 'task.notification')

    assert.ok(firstNotification)
    assert.ok(secondNotification)
    assert.equal(firstNotification.payload_json.notification.taskId, firstTask.id)
    assert.equal(secondNotification.payload_json.notification.taskId, secondTask.id)
    assert.notEqual(
      firstNotification.payload_json.notification.dedupeKey,
      secondNotification.payload_json.notification.dedupeKey
    )
  } finally {
    env.cleanup()
  }
})

test('event stream replays missed notifications using database event ids', async () => {
  const env = withRuntimeTestDb()
  try {
    const task = createTask({ title: 'replay notifications', description: 'status notifications' })

    const sourceEvent = addTaskEvent({
      taskId: task.id,
      agentId: 'xiaomu',
      type: 'agent.error',
      message: 'Runtime failed while disconnected',
      payload: { runId: 'run-replay' },
    })
    const notification = listTaskEvents(task.id).find((event) => event.type === 'task.notification')
    assert.ok(notification)
    assert.ok(Number(notification.id) > Number(sourceEvent.id))

    const messages = invokeEventStreamRoute({ taskId: task.id, afterEventId: sourceEvent.id })
    const replayedNotification = messages.find((message) => message.type === 'task.notification')

    assert.ok(replayedNotification)
    assert.equal(replayedNotification.replay, true)
    assert.equal(replayedNotification.dbEventId, notification.id)
    assert.equal(replayedNotification.payload.notification.sourceType, 'agent.error')
    assert.equal(replayedNotification.payload.notification.taskId, task.id)
  } finally {
    env.cleanup()
  }
})
