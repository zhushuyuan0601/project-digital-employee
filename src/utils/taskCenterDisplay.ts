import type { Subtask, Task } from '@/types/task'

export type TaskCenterStageTab = 'overview' | 'plan' | 'execution' | 'outputs' | 'review' | 'logs'

export type TaskCenterNextAction = {
  title: string
  detail: string
  buttonLabel: string
  targetTab: TaskCenterStageTab
  secondary?: Array<{
    label: string
    targetTab: TaskCenterStageTab
  }>
}

type TaskNextActionState = {
  importantEventCount?: number
  outputCount?: number
  canArchiveTask?: boolean
  reviewSummaryReady?: boolean
}

const DONE_STATUSES = new Set(['completed', 'skipped'])

export function clampPercent(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, Math.round(number)))
}

export function getDefaultStageTab(): TaskCenterStageTab {
  return 'overview'
}

export function getSafeSubtaskTotal(task: Pick<Task, 'subtasks' | 'subtask_count'> | null | undefined) {
  if (!task) return 0
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) return task.subtasks.length
  const total = Number(task.subtask_count || 0)
  return Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
}

export function getSafeCompletedCount(task: Pick<Task, 'subtasks' | 'subtask_count' | 'completed_subtask_count'> | null | undefined) {
  if (!task) return 0
  const total = getSafeSubtaskTotal(task)
  const completedFromList = Array.isArray(task.subtasks)
    ? task.subtasks.filter(subtask => DONE_STATUSES.has(subtask.status)).length
    : 0
  const completedFromBackend = Number(task.completed_subtask_count || 0)
  const completed = Math.max(completedFromList, Number.isFinite(completedFromBackend) ? completedFromBackend : 0)
  return total > 0 ? Math.min(total, Math.max(0, Math.floor(completed))) : Math.max(0, Math.floor(completed))
}

export function hasPendingPlanFeedback(task: Pick<Task, 'status' | 'subtasks' | 'plan_json'> | null | undefined) {
  const plan = task?.plan_json
  return !!(
    task &&
    task.status === 'planning' &&
    plan?.planFeedback &&
    !plan.planFeedbackResolvedAt &&
    (!task.subtasks || task.subtasks.length === 0)
  )
}

function hasSubtask(task: Task, predicate: (subtask: Subtask) => boolean) {
  return (task.subtasks || []).some(predicate)
}

export function getRecommendedStageTab(task: Task | null | undefined): TaskCenterStageTab {
  if (!task) return 'overview'
  if (hasPendingPlanFeedback(task)) return 'plan'
  if (['planning', 'clarifying', 'dispatching', 'failed'].includes(task.status) && !task.subtasks.length) return 'plan'
  if (hasSubtask(task, subtask => ['failed', 'blocked', 'ready', 'queued', 'assigned', 'running'].includes(subtask.status))) return 'execution'
  if (task.status === 'reviewing' || task.subtasks.length > 0 && task.subtasks.every(subtask => DONE_STATUSES.has(subtask.status))) return 'review'
  if (task.status === 'completed') return task.outputs.length ? 'outputs' : 'review'
  if (task.outputs.length) return 'outputs'
  return 'overview'
}

export function getTaskNextAction(task: Task | null | undefined, state: TaskNextActionState = {}): TaskCenterNextAction {
  if (!task) {
    return {
      title: '创建协作任务',
      detail: '先从左侧新增任务，小呦会拆解目标并编排后续执行节点。',
      buttonLabel: '新增任务',
      targetTab: 'overview',
    }
  }

  if (hasPendingPlanFeedback(task)) {
    return {
      title: '查看调整进展',
      detail: '方案反馈已提交，旧方案仅供对照，等待小呦返回新版协作流程。',
      buttonLabel: '查看计划',
      targetTab: 'plan',
      secondary: state.importantEventCount ? [{ label: `关键动向 ${state.importantEventCount}`, targetTab: 'logs' }] : undefined,
    }
  }

  if (task.plan_json?.decision === 'need_clarification' && !task.subtasks.length) {
    return {
      title: '补充关键信息',
      detail: '小呦判断当前信息不足，需要先回答问题后再生成正式协作流程。',
      buttonLabel: '前往计划',
      targetTab: 'plan',
    }
  }

  if (task.plan_json && !task.subtasks.length) {
    return {
      title: task.status === 'planning' ? '观察计划生成' : '确认并启动流程',
      detail: task.status === 'planning'
        ? '小呦正在生成或调整协作计划，完成后再确认启动。'
        : '先检查参与成员、依赖、交付物和验收标准，确认后派发执行。',
      buttonLabel: '前往计划',
      targetTab: 'plan',
    }
  }

  const failedCount = task.subtasks.filter(subtask => ['failed', 'blocked'].includes(subtask.status)).length
  if (failedCount > 0) {
    return {
      title: '处理执行异常',
      detail: `${failedCount} 个节点异常或阻塞，优先在执行板查看日志、重试或跳过。`,
      buttonLabel: '查看执行',
      targetTab: 'execution',
      secondary: state.importantEventCount ? [{ label: `关键动向 ${state.importantEventCount}`, targetTab: 'logs' }] : undefined,
    }
  }

  const readyCount = task.subtasks.filter(subtask => ['ready', 'queued', 'assigned', 'running'].includes(subtask.status)).length
  if (readyCount > 0) {
    return {
      title: '继续推进执行',
      detail: `${readyCount} 个节点可执行或正在执行，持续观察成员现场和输出。`,
      buttonLabel: '查看执行',
      targetTab: 'execution',
      secondary: state.outputCount ? [{ label: `成果 ${state.outputCount}`, targetTab: 'outputs' }] : undefined,
    }
  }

  if (state.canArchiveTask || state.reviewSummaryReady || task.status === 'reviewing') {
    return {
      title: state.canArchiveTask ? '验收归档任务' : '查看汇总验收',
      detail: state.canArchiveTask
        ? '小呦汇总已生成，确认成果无误后即可归档。'
        : '执行阶段已收口，等待或查看小呦的最终汇总。',
      buttonLabel: '前往验收',
      targetTab: 'review',
      secondary: state.outputCount ? [{ label: `成果 ${state.outputCount}`, targetTab: 'outputs' }] : undefined,
    }
  }

  if (task.status === 'completed') {
    return {
      title: '回看任务成果',
      detail: '任务已经归档，可以查看最终成果、验收结论和运行日志。',
      buttonLabel: '查看成果',
      targetTab: 'outputs',
      secondary: [{ label: '验收记录', targetTab: 'review' }],
    }
  }

  return {
    title: '查看任务概览',
    detail: '从流程节点和当前状态开始，必要时切换到计划、执行、成果或日志。',
    buttonLabel: '查看概览',
    targetTab: 'overview',
    secondary: state.importantEventCount ? [{ label: `关键动向 ${state.importantEventCount}`, targetTab: 'logs' }] : undefined,
  }
}
