#!/usr/bin/env node
import { initializeSchema } from '../db/index.js'
import { initializeAgentSchema } from '../db/agents.js'
import {
  addAgentRunLog,
  addTaskEvent,
  getAgentRun,
  getSubtask,
  initializeTaskSchema,
  listAgentRunLogs,
  updateAgentRun,
  updateSubtask,
  upsertTaskOutput,
} from '../db/tasks.js'
import { getClaudeRuntimeConfig } from '../claude-runtime/config.js'
import { writeRunReport } from '../claude-runtime/report-writer.js'

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function parsePayload(log) {
  return log?.payload_json && typeof log.payload_json === 'object' ? log.payload_json : {}
}

function findTerminalResult(logs) {
  return [...logs].reverse().find((log) => (
    log.type === 'result' ||
    (log.type === 'done' && /result|success|成功/i.test(log.message || '')) ||
    (parsePayload(log).subtype === 'success')
  ))
}

function findBestAssistantSnapshot(logs, resultLog) {
  const beforeResult = resultLog ? logs.filter((log) => Number(log.id) <= Number(resultLog.id)) : logs
  const snapshots = beforeResult.filter((log) => log.type === 'assistant.snapshot' && String(log.message || '').trim())
  if (snapshots.length) {
    return snapshots.reduce((best, log) => (
      String(log.message || '').length > String(best.message || '').length ? log : best
    ), snapshots[0])
  }
  return [...beforeResult].reverse().find((log) => log.type?.startsWith('assistant') && String(log.message || '').trim())
}

async function main() {
  const runId = process.argv[2]
  if (!runId) {
    console.error('Usage: node server/scripts/recover-terminal-result-run.js <runId>')
    process.exit(1)
  }

  initializeSchema()
  initializeAgentSchema()
  initializeTaskSchema()

  const run = getAgentRun(runId)
  if (!run) throw new Error(`Run not found: ${runId}`)
  if (!run.subtask_id) throw new Error('This recovery helper only supports subtask runs')

  const subtask = getSubtask(run.subtask_id)
  if (!subtask) throw new Error(`Subtask not found: ${run.subtask_id}`)

  const logs = listAgentRunLogs({ runId, limit: 5000 })
  const resultLog = findTerminalResult(logs)
  if (!resultLog) throw new Error('No terminal success result log found')

  const snapshot = findBestAssistantSnapshot(logs, resultLog)
  if (!snapshot) throw new Error('No assistant snapshot/content found before terminal result')

  const config = getClaudeRuntimeConfig()
  const report = await writeRunReport({
    config,
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    kind: 'subtask',
    content: snapshot.message,
  })

  upsertTaskOutput({
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    name: report.name,
    type: 'markdown',
    path: report.path,
    status: 'pending_review',
    mtime: report.mtime,
  })

  updateSubtask(run.subtask_id, {
    status: 'completed',
    progress: 100,
    result_summary: String(snapshot.message || '').replace(/\s+/g, ' ').trim().slice(0, 2000),
    error: null,
    completed_at: nowSeconds(),
  })

  updateAgentRun(runId, {
    status: 'completed',
    output_path: report.path,
    result_summary: String(snapshot.message || '').replace(/\s+/g, ' ').trim().slice(0, 2000),
    error: null,
    completed_at: nowSeconds(),
  })

  addTaskEvent({
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    type: 'outputs.bound',
    message: `已从历史 terminal result 恢复成果：${report.name}`,
    payload: { runId, path: report.path, recovered: true },
  })
  addTaskEvent({
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    type: 'workflow.node.completed',
    message: '已根据历史 terminal result 补偿完成流程节点',
    payload: { runId, recovered: true },
  })
  addAgentRunLog({
    runId,
    taskId: run.task_id,
    subtaskId: run.subtask_id,
    agentId: run.agent_id,
    type: 'recovered',
    message: `Recovered terminal result into ${report.path}`,
    payload: { path: report.path },
  })

  console.log(JSON.stringify({ ok: true, runId, outputPath: report.path }, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
