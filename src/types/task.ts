export type TaskStatus = 'draft' | 'planning' | 'dispatching' | 'running' | 'reviewing' | 'completed' | 'failed' | 'cancelled'
export type SubtaskStatus = 'pending' | 'assigned' | 'running' | 'blocked' | 'completed' | 'failed'
export type TaskOutputStatus = 'pending_review' | 'accepted' | 'rejected'

export interface TaskPlanSubtask {
  title: string
  description: string
  assignedAgentId: string
  expectedOutput?: string
}

export interface TaskPlan {
  taskTitle: string
  goal: string
  subtasks: TaskPlanSubtask[]
  acceptanceCriteria: string[]
}

export interface TaskOutput {
  id: number
  task_id: string
  subtask_id?: string | null
  agent_id?: string | null
  name: string
  type: string
  path?: string | null
  git_url?: string | null
  status: TaskOutputStatus
  mtime?: number | null
  created_at: number
  task_title?: string
  subtask_title?: string
}

export interface TaskEvent {
  id: number | string
  task_id: string
  subtask_id?: string | null
  agent_id?: string | null
  type: string
  message: string
  payload_json?: Record<string, unknown> | null
  created_at: number
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  description: string
  expected_output?: string | null
  assigned_agent_id: string
  gateway_agent_id: string
  session_key: string
  status: SubtaskStatus
  progress: number
  result_summary?: string | null
  error?: string | null
  context_json?: Record<string, unknown> | null
  created_at: number
  updated_at: number
  started_at?: number | null
  completed_at?: number | null
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  coordinator_agent_id: string
  coordinator_session_key: string
  created_by?: string
  priority?: string
  plan_json?: TaskPlan | null
  summary?: string | null
  progress: number
  subtask_count?: number
  completed_subtask_count?: number
  output_count?: number
  subtasks: Subtask[]
  outputs: TaskOutput[]
  events?: TaskEvent[]
  created_at: number
  updated_at: number
  started_at?: number | null
  completed_at?: number | null
}

export interface CreateTaskRequest {
  title: string
  description: string
  priority?: string
}

export interface TaskDispatch {
  taskId: string
  subtaskId?: string
  phase?: 'plan' | 'summary'
  agentId: string
  sessionKey: string
  message: string
}
