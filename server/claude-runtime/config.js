import { resolve } from 'path'
import {
  DEFAULT_CLAUDE_RUNTIME_CONFIG,
  envBoolean,
  envInteger,
  envList,
  envString,
  resolveProjectPath,
} from '../config/defaults.js'

export function getClaudeRuntimeConfig() {
  const maxConcurrency = Math.max(1, envInteger('CLAUDE_AGENT_MAX_CONCURRENCY', DEFAULT_CLAUDE_RUNTIME_CONFIG.maxConcurrency))
  const maxTurns = Math.max(1, envInteger('CLAUDE_AGENT_MAX_TURNS', DEFAULT_CLAUDE_RUNTIME_CONFIG.maxTurns))
  const reportOnly = envBoolean('CLAUDE_REPORT_ONLY', DEFAULT_CLAUDE_RUNTIME_CONFIG.reportOnly)
  const cwd = resolve(envString('CLAUDE_RUNTIME_CWD', DEFAULT_CLAUDE_RUNTIME_CONFIG.cwd))
  const allowedTools = envList('CLAUDE_ALLOWED_TOOLS', DEFAULT_CLAUDE_RUNTIME_CONFIG.allowedTools)
  const outputRoot = resolveProjectPath(envString('CLAUDE_OUTPUT_ROOT', DEFAULT_CLAUDE_RUNTIME_CONFIG.outputRoot))
  const workspaceIsolation = envBoolean('CLAUDE_WORKSPACE_ISOLATION', DEFAULT_CLAUDE_RUNTIME_CONFIG.workspaceIsolation)
  const workspaceRoot = resolveProjectPath(envString('CLAUDE_WORKSPACE_ROOT', DEFAULT_CLAUDE_RUNTIME_CONFIG.workspaceRoot))

  return {
    runtime: envString('AGENT_RUNTIME', DEFAULT_CLAUDE_RUNTIME_CONFIG.runtime),
    maxConcurrency,
    maxTurns,
    reportOnly,
    cwd,
    workspaceIsolation,
    workspaceRoot,
    allowedTools,
    outputRoot,
    model: envString('CLAUDE_AGENT_MODEL', DEFAULT_CLAUDE_RUNTIME_CONFIG.model),
    mock: envBoolean('CLAUDE_RUNTIME_MOCK', DEFAULT_CLAUDE_RUNTIME_CONFIG.mock),
  }
}
