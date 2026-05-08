import { claudeRuntimeEvents } from './event-bus.js'
import { runWorkflowScheduler } from './workflow-orchestration.js'

const DISPATCHED_EVENT_IDS = new Set()
const DISPATCH_TYPES = new Set([
  'workflow.node.completed',
  'workflow.node.skipped',
  'agent.cancelled',
])

claudeRuntimeEvents.on('event', (event) => {
  if (!DISPATCH_TYPES.has(event.type) || !event.taskId) return
  if (event.eventId && DISPATCHED_EVENT_IDS.has(event.eventId)) return
  if (event.eventId) DISPATCHED_EVENT_IDS.add(event.eventId)
  runWorkflowScheduler(event.taskId)
})
