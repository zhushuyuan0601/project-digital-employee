import type {
  Subtask,
  SubtaskStatus,
  TaskOutput,
  TaskPlan,
  WorkflowNodePlan,
  WorkflowPhase,
} from '@/types/task'

export const WORKFLOW_PHASE_ORDER: WorkflowPhase[] = [
  'research',
  'product',
  'design',
  'engineering',
  'testing',
  'review',
  'summary',
]

export type WorkPackageStatus = SubtaskStatus | 'mixed'

export type WorkflowWorkPackage = {
  key: string
  phase: WorkflowPhase
  agentId: string
  title: string
  summary: string
  nodes: Subtask[]
  progress: number
  outputCount: number
  readyCount: number
  runningCount: number
  blockedCount: number
  completedCount: number
  internalDependencyCount: number
  externalDependencyCount: number
  status: WorkPackageStatus
}

type WorkPackageDisplayOptions = {
  agentName: (agentId: string) => string
  phaseLabel: (phase?: string) => string
}

export function workflowContext(subtask: Subtask) {
  return subtask.context_json || {}
}

export function workflowNodeKey(subtask: Subtask) {
  const context = workflowContext(subtask)
  return typeof context.workflowNodeId === 'string' ? context.workflowNodeId : subtask.id
}

export function normalizedWorkflowPhase(value: unknown): WorkflowPhase {
  const phase = String(value || 'review') as WorkflowPhase
  return WORKFLOW_PHASE_ORDER.includes(phase) ? phase : 'review'
}

export function sortPlanNodesByExecutionOrder(nodes: WorkflowNodePlan[]) {
  return stableTopologicalSort(
    nodes,
    (node, index) => String(node.id || `node-${String(index + 1).padStart(2, '0')}`),
    node => Array.isArray(node.dependsOn) ? node.dependsOn.map(String) : [],
    (node, index) => {
      const explicitOrder = Number((node as WorkflowNodePlan & { executionOrder?: number }).executionOrder)
      if (Number.isFinite(explicitOrder) && explicitOrder > 0) return explicitOrder
      const idRank = nodeSequenceFromId(String(node.id || ''))
      return idRank !== Number.MAX_SAFE_INTEGER ? idRank : index + 1
    },
  )
}

export function sortSubtasksByExecutionOrder(subtasks: Subtask[], plan: TaskPlan | null | undefined) {
  const planOrder = planExecutionOrderMap(plan)
  return stableTopologicalSort(
    subtasks,
    subtask => workflowNodeKey(subtask),
    subtask => {
      const dependsOn = workflowContext(subtask).dependsOn
      return Array.isArray(dependsOn) ? dependsOn.map(String) : []
    },
    (subtask, index) => {
      const context = workflowContext(subtask)
      const explicitOrder = Number(context.executionOrder)
      if (Number.isFinite(explicitOrder) && explicitOrder > 0) return explicitOrder
      const nodeKey = workflowNodeKey(subtask)
      if (planOrder.has(nodeKey)) return planOrder.get(nodeKey) || index + 1
      const idRank = nodeSequenceFromId(nodeKey)
      if (idRank !== Number.MAX_SAFE_INTEGER) return idRank
      return Number(subtask.created_at || 0) || index + 1
    },
  )
}

export function buildWorkflowWorkPackages(
  subtasks: Subtask[],
  outputs: TaskOutput[],
  options: WorkPackageDisplayOptions,
) {
  const groups = new Map<string, Subtask[]>()
  const executionIndex = new Map(subtasks.map((subtask, index) => [subtask.id, index]))

  for (const subtask of subtasks) {
    const phase = normalizedWorkflowPhase(workflowContext(subtask).phase)
    const key = `${WORKFLOW_PHASE_ORDER.indexOf(phase)}:${phase}:${subtask.assigned_agent_id}`
    groups.set(key, [...(groups.get(key) || []), subtask])
  }

  return [...groups.entries()]
    .sort(([, leftNodes], [, rightNodes]) => {
      const leftIndex = Math.min(...leftNodes.map(node => executionIndex.get(node.id) ?? Number.MAX_SAFE_INTEGER))
      const rightIndex = Math.min(...rightNodes.map(node => executionIndex.get(node.id) ?? Number.MAX_SAFE_INTEGER))
      return leftIndex - rightIndex
    })
    .map(([key, nodes]) => toWorkPackage(key, nodes, outputs, executionIndex, options))
}

export function workPackageStatusClass(pack: WorkflowWorkPackage) {
  return pack.status === 'mixed' ? 'running' : pack.status
}

export function workPackageStatusText(
  pack: WorkflowWorkPackage,
  subtaskStatusText: (status: SubtaskStatus) => string,
) {
  if (pack.status === 'mixed') return '推进中'
  if (pack.status === 'completed') return `完成 ${pack.completedCount}/${pack.nodes.length}`
  return subtaskStatusText(pack.status)
}

export function workPackageParallelHint(pack: WorkflowWorkPackage) {
  if (pack.nodes.length <= 1) {
    return pack.externalDependencyCount
      ? `等待 ${pack.externalDependencyCount} 个外部输入满足后执行。`
      : '单节点工作包，可直接按节点状态执行。'
  }
  if (pack.internalDependencyCount === 0) {
    return `内部 ${pack.nodes.length} 个节点互不依赖，可由同一 Agent 并行推进。`
  }
  const activeOrReady = pack.readyCount + pack.runningCount
  return `内部含 ${pack.internalDependencyCount} 条依赖，当前 ${activeOrReady} 个节点可执行或正在执行。`
}

function toWorkPackage(
  key: string,
  nodes: Subtask[],
  outputs: TaskOutput[],
  executionIndex: Map<string, number>,
  { agentName, phaseLabel }: WorkPackageDisplayOptions,
): WorkflowWorkPackage {
  const orderedNodes = [...nodes].sort((left, right) => (executionIndex.get(left.id) ?? 0) - (executionIndex.get(right.id) ?? 0))
  const first = orderedNodes[0]
  const phase = normalizedWorkflowPhase(workflowContext(first).phase)
  const nodeKeys = new Set(orderedNodes.map(workflowNodeKey))
  const dependsOn = orderedNodes.flatMap((node) => {
    const deps = workflowContext(node).dependsOn
    return Array.isArray(deps) ? deps.map(String) : []
  })
  const internalDependencyCount = dependsOn.filter(dep => nodeKeys.has(dep)).length
  const externalDependencyCount = new Set(dependsOn.filter(dep => !nodeKeys.has(dep))).size
  const outputCount = outputs.filter(output => output.subtask_id && orderedNodes.some(node => node.id === output.subtask_id)).length
  const progress = Math.round(orderedNodes.reduce((sum, node) => sum + Number(node.progress || 0), 0) / Math.max(orderedNodes.length, 1))
  const readyCount = orderedNodes.filter(node => node.status === 'ready').length
  const runningCount = orderedNodes.filter(node => ['queued', 'assigned', 'running'].includes(node.status)).length
  const blockedCount = orderedNodes.filter(node => node.status === 'blocked').length
  const completedCount = orderedNodes.filter(node => ['completed', 'skipped'].includes(node.status)).length
  const status = workPackageStatus(orderedNodes)
  const owner = agentName(first.assigned_agent_id)
  const phaseName = phaseLabel(phase)

  return {
    key,
    phase,
    agentId: first.assigned_agent_id,
    title: `${owner} · ${phaseName}工作包`,
    summary: orderedNodes.length > 1
      ? `同类${phaseName}工作汇总到 ${owner}，内部 ${orderedNodes.length} 个节点按依赖并行推进。`
      : `由 ${owner} 负责该${phaseName}节点。`,
    nodes: orderedNodes,
    progress,
    outputCount,
    readyCount,
    runningCount,
    blockedCount,
    completedCount,
    internalDependencyCount,
    externalDependencyCount,
    status,
  }
}

function workPackageStatus(nodes: Subtask[]): WorkPackageStatus {
  if (nodes.every(node => node.status === 'skipped')) return 'skipped'
  if (nodes.every(node => ['completed', 'skipped'].includes(node.status))) return 'completed'
  if (nodes.some(node => node.status === 'failed')) return 'failed'
  if (nodes.some(node => ['assigned', 'running'].includes(node.status))) return 'running'
  if (nodes.some(node => node.status === 'queued')) return 'queued'
  if (nodes.some(node => node.status === 'ready')) return 'ready'
  if (nodes.every(node => node.status === 'blocked')) return 'blocked'
  return 'mixed'
}

function nodeSequenceFromId(id: string) {
  const match = String(id || '').match(/(?:^|[-_])(\d+)$/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function planExecutionOrderMap(plan: TaskPlan | null | undefined) {
  const map = new Map<string, number>()
  const nodes = Array.isArray(plan?.workflow) && plan.workflow.length
    ? plan.workflow
    : Array.isArray(plan?.subtasks)
      ? plan.subtasks
      : []
  nodes.forEach((node, index) => {
    if (node.id) map.set(String(node.id), index + 1)
  })
  return map
}

function stableTopologicalSort<T>(
  items: T[],
  keyOf: (item: T, index: number) => string,
  dependsOnOf: (item: T) => string[],
  rankOf: (item: T, index: number) => number,
) {
  const entries = items.map((item, index) => ({
    item,
    key: keyOf(item, index),
    rank: rankOf(item, index),
    originalIndex: index,
  }))
  const knownKeys = new Set(entries.map(entry => entry.key))
  const indegree = new Map(entries.map(entry => [entry.key, 0]))
  const dependents = new Map<string, string[]>()

  for (const entry of entries) {
    const deps = dependsOnOf(entry.item).filter(dep => knownKeys.has(dep))
    indegree.set(entry.key, deps.length)
    for (const dep of deps) {
      dependents.set(dep, [...(dependents.get(dep) || []), entry.key])
    }
  }

  const byKey = new Map(entries.map(entry => [entry.key, entry]))
  const compare = (left: typeof entries[number], right: typeof entries[number]) =>
    left.rank - right.rank || left.originalIndex - right.originalIndex || left.key.localeCompare(right.key, 'zh-CN')
  const queue = entries.filter(entry => indegree.get(entry.key) === 0).sort(compare)
  const ordered: typeof entries = []

  while (queue.length) {
    const current = queue.shift()
    if (!current) break
    ordered.push(current)
    for (const dependentKey of dependents.get(current.key) || []) {
      indegree.set(dependentKey, Math.max(0, (indegree.get(dependentKey) || 0) - 1))
      if (indegree.get(dependentKey) === 0) {
        const dependent = byKey.get(dependentKey)
        if (dependent) {
          queue.push(dependent)
          queue.sort(compare)
        }
      }
    }
  }

  if (ordered.length < entries.length) {
    const emitted = new Set(ordered.map(entry => entry.key))
    ordered.push(...entries.filter(entry => !emitted.has(entry.key)).sort(compare))
  }

  return ordered.map(entry => entry.item)
}
