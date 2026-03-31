/**
 * OpenClaw CLI 命令执行模块
 * 用于调用 openclaw gateway 等命令与 Gateway 通信
 */

import { spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

interface CommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  input?: string
}

interface CommandResult {
  stdout: string
  stderr: string
  code: number | null
}

/**
 * 执行系统命令
 */
export function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    })

    let stdout = ''
    let stderr = ''
    let timeoutId: NodeJS.Timeout | undefined

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
      ;(error as any).stdout = stdout
      ;(error as any).stderr = stderr
      ;(error as any).code = code
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
function getOpenClawBin(): string {
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
function getOpenClawStateDir(): string | undefined {
  if (process.env.OPENCLAW_STATE_DIR) {
    return process.env.OPENCLAW_STATE_DIR
  }
  // 默认 ~/.openclaw
  return join(homedir(), '.openclaw')
}

/**
 * 执行 OpenClaw 命令
 */
export function runOpenClaw(args: string[], options: CommandOptions = {}) {
  return runCommand(getOpenClawBin(), args, {
    ...options,
    cwd: options.cwd || getOpenClawStateDir() || process.cwd()
  })
}

/**
 * 通过 Gateway 发送消息到指定 Session
 */
export async function sendMessageViaGateway(
  sessionKey: string,
  message: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fullMessage = from ? `Message from ${from}: ${message}` : message

    await runOpenClaw(
      [
        'gateway',
        'sessions_send',
        '--session',
        sessionKey,
        '--message',
        fullMessage
      ],
      { timeoutMs: 10000 }
    )

    return { success: true }
  } catch (error: any) {
    console.error('[Gateway] Failed to send message:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 检查 Gateway 是否可用
 */
export async function checkGatewayHealth(): Promise<boolean> {
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
export async function getGatewaySessions(): Promise<string[]> {
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
