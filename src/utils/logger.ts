type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

let minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
}

function formatPrefix(module: string, level: LogLevel): string {
  return `[${module}] ${level.toUpperCase()}`
}

function createLogger(module: string) {
  return {
    debug: (...args: unknown[]) => shouldLog('debug') && console.debug(formatPrefix(module, 'debug'), ...args),
    info: (...args: unknown[]) => shouldLog('info') && console.log(formatPrefix(module, 'info'), ...args),
    warn: (...args: unknown[]) => shouldLog('warn') && console.warn(formatPrefix(module, 'warn'), ...args),
    error: (...args: unknown[]) => shouldLog('error') && console.error(formatPrefix(module, 'error'), ...args),
  }
}

export function setLogLevel(level: LogLevel) {
  minLevel = level
}

export { createLogger }
export type { LogLevel }
