import assert from 'node:assert/strict'
import { collectTaskScopedAgentIds } from '../src/utils/agentConsoleDisplay.ts'
import type { AgentRun } from '../src/api/tasks.ts'
import type { Task } from '../src/types/task.ts'

const task: Task = {
  id: 'task-1',
  title: 'Demo',
  description: 'Demo',
  status: 'planning',
  coordinator_agent_id: 'ceo',
  coordinator_session_key: 'task:1',
  progress: 0,
  subtasks: [],
  outputs: [],
  plan_json: {
    taskTitle: 'Demo',
    participants: [{ agentId: 'dev', needed: true, reason: '研发' }],
  },
  created_at: 1,
  updated_at: 1,
}

const runs: AgentRun[] = [
  { id: 'run-plan', task_id: 'task-1', agent_id: 'xiaomu', kind: 'plan', status: 'running' },
  { id: 'run-summary', task_id: 'task-1', agent_id: 'xiaomu', kind: 'summary', status: 'completed' },
  { id: 'run-console', task_id: 'task-1', agent_id: 'qa', kind: 'console', status: 'queued' },
]

assert.deepEqual(collectTaskScopedAgentIds(task, runs), ['dev', 'xiaomu', 'qa'])

console.log('agent console display helpers ok')
