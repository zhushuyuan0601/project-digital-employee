import type { AgentRun } from '@/api/tasks'
import type { Task } from '@/types/task'

export function collectTaskScopedAgentIds(task: Task | null | undefined, taskAgentRuns: Pick<AgentRun, 'agent_id'>[]) {
  if (!task) return []
  const ids: string[] = []
  const add = (agentId?: string | null) => {
    const normalized = String(agentId || '').trim()
    if (normalized && !ids.includes(normalized)) ids.push(normalized)
  }

  for (const subtask of task.subtasks || []) add(subtask.assigned_agent_id)
  for (const node of task.plan_json?.workflow || []) add(node.assignedAgentId)
  for (const subtask of task.plan_json?.subtasks || []) add(subtask.assignedAgentId)
  for (const participant of task.plan_json?.participants || []) {
    if (participant.needed !== false) add(participant.agentId)
  }
  for (const run of taskAgentRuns) add(run.agent_id)

  return ids
}
