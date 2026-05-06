export type TaskStatus = 'draft' | 'planning' | 'clarifying' | 'dispatching' | 'running' | 'reviewing' | 'completed' | 'failed' | 'cancelled'
export type SubtaskStatus = 'pending' | 'ready' | 'queued' | 'assigned' | 'running' | 'waiting_user' | 'blocked' | 'completed' | 'failed' | 'skipped'
export type TaskOutputStatus = 'pending_review' | 'accepted' | 'rejected'

export type WorkflowPhase = 'research' | 'product' | 'design' | 'engineering' | 'testing' | 'review' | 'summary'
export type WorkflowExecutionMode = 'report' | 'code' | 'test'
export type WorkflowTopology = 'hierarchical' | 'parallel' | 'review-gate'

export interface TaskClarificationQuestion {
  id: string
  question: string
  reason: string
  required: boolean
}

export interface TaskPlanParticipant {
  agentId: string
  needed: boolean
  reason: string
}

export interface WorkflowNodePlan {
  id: string
  title: string
  phase: WorkflowPhase
  assignedAgentId: string
  objective: string
  description?: string
  dependsOn: string[]
  requiredInputs: string[]
  expectedOutputs: string[]
  executionMode: WorkflowExecutionMode
  successCriteria: string[]
  skipCondition?: string
  requiredTools?: string[]
  riskLevel?: string
  agentCapabilityHints?: string[]
}

export interface TaskPlanSubtask {
  id?: string
  title: string
  description: string
  assignedAgentId: string
  expectedOutput?: string
  phase?: WorkflowPhase
  dependsOn?: string[]
  requiredInputs?: string[]
  expectedOutputs?: string[]
  executionMode?: WorkflowExecutionMode
  successCriteria?: string[]
  skipCondition?: string
  requiredTools?: string[]
  riskLevel?: string
  agentCapabilityHints?: string[]
}

export interface TaskPlan {
  decision?: 'need_clarification' | 'ready_to_plan'
  taskTitle: string
  goal?: string
  topology?: WorkflowTopology
  planningNotes?: string[]
  changeSummary?: string[]
  knownFacts?: string[]
  missingInformation?: string[]
  questions?: TaskClarificationQuestion[]
  clarificationAnswers?: Record<string, string>
  planFeedback?: string
  planFeedbackAt?: string
  lastPlanFeedback?: string
  lastPlanFeedbackAt?: string
  planFeedbackResolvedAt?: string
  planFeedbackHistory?: Array<{ feedback: string; createdAt: string }>
  runtimeSessions?: Record<string, {
    sessionKey?: string
    claudeSessionId?: string | null
    lastRunId?: string | null
    lastPhase?: string
    resumeCount?: number
    fallbackCount?: number
    updatedAt?: string
  }>
  participants?: TaskPlanParticipant[]
  workflow?: WorkflowNodePlan[]
  subtasks?: TaskPlanSubtask[]
  acceptanceCriteria?: string[]
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
  project_cwd?: string | null
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
  projectCwd?: string
}

export interface TaskDispatch {
  taskId: string
  subtaskId?: string
  phase?: 'plan' | 'summary'
  agentId: string
  sessionKey: string
  message: string
}
