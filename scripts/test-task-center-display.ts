import assert from 'node:assert/strict'
import {
  clampPercent,
  getDefaultStageTab,
  getSafeCompletedCount,
  getSafeSubtaskTotal,
  getTaskNextAction,
} from '../src/utils/taskCenterDisplay.ts'
import type { Task } from '../src/types/task.ts'

const baseTask: Task = {
  id: 'task-1',
  title: 'Demo',
  description: 'Demo task',
  status: 'running',
  coordinator_agent_id: 'ceo',
  coordinator_session_key: 'task:1',
  progress: 6900,
  completed_subtask_count: 69,
  subtasks: [
    { id: 'a', task_id: 'task-1', title: 'A', description: '', assigned_agent_id: 'dev', gateway_agent_id: 'ceo', session_key: 'a', status: 'completed', progress: 100, created_at: 1, updated_at: 1 },
    { id: 'b', task_id: 'task-1', title: 'B', description: '', assigned_agent_id: 'qa', gateway_agent_id: 'ceo', session_key: 'b', status: 'ready', progress: 15, created_at: 1, updated_at: 1 },
  ],
  outputs: [],
  created_at: 1,
  updated_at: 1,
}

assert.equal(clampPercent(6900), 100)
assert.equal(clampPercent(-4), 0)
assert.equal(clampPercent('abc'), 0)
assert.equal(getDefaultStageTab(), 'overview')
assert.equal(getSafeSubtaskTotal(baseTask), 2)
assert.equal(getSafeCompletedCount(baseTask), 2)
assert.equal(getTaskNextAction(baseTask).targetTab, 'execution')

const pendingFeedbackTask: Task = {
  ...baseTask,
  status: 'planning',
  subtasks: [],
  plan_json: {
    decision: 'ready_to_plan',
    taskTitle: 'Demo',
    planFeedback: '请先增加市场调研，再进入研发。',
  },
}

const pendingAction = getTaskNextAction(pendingFeedbackTask)
assert.equal(pendingAction.targetTab, 'plan')
assert.match(pendingAction.title, /调整进展/)

console.log('task center display helpers ok')
