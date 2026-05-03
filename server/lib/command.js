/**
 * OpenClaw CLI 命令执行模块
 * 用于调用 openclaw gateway 等命令与 Gateway 通信
 */

import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

/**
 * 执行系统命令
 */
export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    })

    let stdout = ''
    let stderr = ''
    let timeoutId

    if (options.timeoutMs) {
      timeoutId = setTimeout(() => {
        child.kill('SIGKILL')
      }, options.timeoutMs)
    }

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)
      reject(error)
    })

    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId)
      if (code === 0) {
        resolve({ stdout, stderr, code })
        return
      }
      const error = new Error(
        `Command failed (${command} ${args.join(' ')}): ${stderr || stdout}`
      )
      error.stdout = stdout
      error.stderr = stderr
      error.code = code
      reject(error)
    })

    if (options.input) {
      child.stdin.write(options.input)
      child.stdin.end()
    }
  })
}

/**
 * 获取 openclaw 可执行文件路径
 */
function getOpenClawBin() {
  // 优先使用环境变量
  if (process.env.OPENCLAW_BIN) {
    return process.env.OPENCLAW_BIN
  }
  // 默认使用系统 PATH 中的 openclaw
  return 'openclaw'
}

/**
 * 获取 OpenClaw 状态目录
 */
function getOpenClawStateDir() {
  if (process.env.OPENCLAW_STATE_DIR) {
    return process.env.OPENCLAW_STATE_DIR
  }
  // 默认 ~/.openclaw
  return join(homedir(), '.openclaw')
}

/**
 * 执行 OpenClaw 命令
 */
export function runOpenClaw(args, options = {}) {
  return runCommand(getOpenClawBin(), args, {
    ...options,
    cwd: options.cwd || getOpenClawStateDir() || process.cwd()
  })
}

/**
 * 通过 Gateway 发送消息到指定 Session
 */
export async function sendMessageViaGateway(sessionKey, message, from) {
  try {
    const fullMessage = from ? `[${from}] ${message}` : message
    const agentName = extractAgentNameFromSessionKey(sessionKey)

    await runOpenClaw(
      [
        'agent',
        '--agent', agentName,
        '--timeout', '600',
        '--message', fullMessage
      ],
      { timeoutMs: 650000 }
    )

    return { success: true }
  } catch (error) {
    // 检查是否是正常的完成（agent 命令返回非 0 码但消息已发送）
    if (error.stdout && error.stdout.includes('completed')) {
      return { success: true }
    }
    console.error('[Gateway] Failed to send message:', error.message)
    return { success: false, error: error.message }
  }
}

function extractAgentNameFromSessionKey(sessionKey) {
  if (!sessionKey) return sessionKey
  const match = String(sessionKey).match(/^agent:([^:]+):/)
  if (match) return match[1]
  return String(sessionKey)
    .replace(/^agent:/, '')
    .replace(/:main$/, '')
    .replace(/:primary$/, '')
}

/**
 * 通过 Gateway 发送消息到指定 Agent（使用简化名称，创建新 session）
 */
export async function sendMessageViaGatewayDirect(agentName, message, from) {
  try {
    const fullMessage = from ? `[${from}] ${message}` : message

    console.log('[Gateway] Sending message to agent:', agentName, 'message:', fullMessage)

    await runOpenClaw(
      [
        'agent',
        '--agent', agentName,
        '--timeout', '600',
        '--message', fullMessage
      ],
      { timeoutMs: 650000 }
    )

    return { success: true }
  } catch (error) {
    console.error('[Gateway] Failed to send message (direct):', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 检查 Gateway 是否可用
 */
export async function checkGatewayHealth() {
  try {
    await runOpenClaw(['gateway', 'health'], { timeoutMs: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * 获取 Gateway sessions 列表
 */
export async function getGatewaySessions() {
  try {
    const result = await runOpenClaw(['gateway', 'sessions'], { timeoutMs: 10000 })
    // 解析输出，每行一个 session
    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  } catch {
    return []
  }
}
