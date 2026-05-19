const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

const PRODUCT_NAME = 'Digital Employee'
const HEALTH_TIMEOUT_MS = 45_000

app.setName(PRODUCT_NAME)

let mainWindow = null
let nodeProcess = null
let analysisProcess = null
let appStatus = null

function isPackaged() {
  return app.isPackaged
}

function getResourcePath(...segments) {
  if (isPackaged()) {
    return path.join(process.resourcesPath, ...segments)
  }
  return path.join(app.getAppPath(), ...segments)
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeLogLine(logFile, line) {
  fs.appendFileSync(logFile, line)
}

function pipeProcessLogs(child, logFile, name) {
  const write = (chunk) => writeLogLine(logFile, `[${name}] ${chunk.toString()}`)
  child.stdout?.on('data', write)
  child.stderr?.on('data', write)
}

function findOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        findOpenPort(startPort + 1).then(resolve, reject)
      } else {
        reject(error)
      }
    })
    server.listen(startPort, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

async function waitForHealth(url, name, timeoutMs = HEALTH_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`${name} returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`${name} did not become ready: ${lastError?.message || 'timeout'}`)
}

function getPythonExecutable(analysisDir) {
  const bundledPython = path.join(analysisDir, '.venv', 'bin', 'python')
  if (fs.existsSync(bundledPython)) return bundledPython
  return process.env.PYTHON || process.env.PYTHON3 || 'python3'
}

function findLocalExecutable(name) {
  const home = app.getPath('home')
  const candidates = [
    path.join(home, '.openclaw', 'node_modules', name, 'bin', name),
    path.join(home, '.bun', 'bin', name),
    path.join(home, '.cargo', 'bin', name),
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
  ]

  const nvmNodeRoot = path.join(home, '.nvm', 'versions', 'node')
  if (fs.existsSync(nvmNodeRoot)) {
    for (const version of fs.readdirSync(nvmNodeRoot).sort().reverse()) {
      candidates.unshift(path.join(nvmNodeRoot, version, 'bin', name))
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || ''
}

function prependExecutableDir(env, executable) {
  if (!executable) return env
  return {
    ...env,
    PATH: `${path.dirname(executable)}:${env.PATH || ''}`,
  }
}

function createRuntimePaths() {
  const userData = ensureDir(app.getPath('userData'))
  const logsDir = ensureDir(path.join(userData, 'logs'))
  const dataDir = ensureDir(path.join(userData, 'data'))
  const runtimeDir = ensureDir(path.join(userData, 'runtime'))

  return {
    userData,
    logsDir,
    dataDir,
    runtimeDir,
    dbPath: path.join(dataDir, 'mission-control-claude.db'),
    claudeWorkspaceRoot: ensureDir(path.join(dataDir, 'runtime-workspaces')),
    claudeOutputRoot: ensureDir(path.join(dataDir, 'task-outputs')),
    analysisWorkspaceRoot: ensureDir(path.join(dataDir, 'analysis-workspace')),
    serverLog: path.join(logsDir, 'server.log'),
    analysisLog: path.join(logsDir, 'analysis-service.log'),
  }
}

async function startAnalysisService(paths, analysisPort) {
  const analysisDir = getResourcePath('analysis_service')
  const python = getPythonExecutable(analysisDir)
  const env = {
    ...process.env,
    ANALYSIS_SERVICE_HOST: '127.0.0.1',
    ANALYSIS_SERVICE_PORT: String(analysisPort),
    ANALYSIS_WORKSPACE_ROOT: paths.analysisWorkspaceRoot,
    PYTHONUNBUFFERED: '1',
  }

  analysisProcess = spawn(python, ['run.py'], {
    cwd: analysisDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  pipeProcessLogs(analysisProcess, paths.analysisLog, 'analysis')

  analysisProcess.on('exit', (code, signal) => {
    writeLogLine(paths.analysisLog, `[analysis] exited code=${code} signal=${signal}\n`)
    analysisProcess = null
  })

  await waitForHealth(`http://127.0.0.1:${analysisPort}/health`, 'Analysis service')
}

async function startNodeServer(paths, serverPort, analysisPort) {
  const serverEntry = getResourcePath('server', 'index.js')
  const codexBin = process.env.TERMINAL_CODEX_BIN || findLocalExecutable('codex')
  const claudeBin = process.env.TERMINAL_CLAUDE_BIN || findLocalExecutable('claude')
  let env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(serverPort),
    CORS_ORIGIN: `http://127.0.0.1:${serverPort},http://localhost:${serverPort}`,
    APP_STATIC_DIR: getResourcePath('dist'),
    DB_PATH: paths.dbPath,
    CLAUDE_RUNTIME_CWD: paths.runtimeDir,
    CLAUDE_WORKSPACE_ROOT: paths.claudeWorkspaceRoot,
    CLAUDE_OUTPUT_ROOT: paths.claudeOutputRoot,
    ANALYSIS_SERVICE_BASE_URL: `http://127.0.0.1:${analysisPort}`,
    ...(codexBin ? { TERMINAL_CODEX_BIN: codexBin } : {}),
    ...(claudeBin ? { TERMINAL_CLAUDE_BIN: claudeBin } : {}),
  }
  env = prependExecutableDir(prependExecutableDir(env, codexBin), claudeBin)

  nodeProcess = spawn(process.execPath, [serverEntry], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  pipeProcessLogs(nodeProcess, paths.serverLog, 'server')

  nodeProcess.on('exit', (code, signal) => {
    writeLogLine(paths.serverLog, `[server] exited code=${code} signal=${signal}\n`)
    nodeProcess = null
  })

  await waitForHealth(`http://127.0.0.1:${serverPort}/health`, 'Node API')
}

async function startLocalServices() {
  const paths = createRuntimePaths()
  const serverPort = await findOpenPort(Number(process.env.DESKTOP_SERVER_PORT || 18888))
  const analysisPort = await findOpenPort(Number(process.env.DESKTOP_ANALYSIS_PORT || 18900))

  writeLogLine(paths.serverLog, `\n[desktop] Starting ${PRODUCT_NAME} at ${new Date().toISOString()}\n`)
  writeLogLine(paths.analysisLog, `\n[desktop] Starting ${PRODUCT_NAME} at ${new Date().toISOString()}\n`)

  await startAnalysisService(paths, analysisPort)
  await startNodeServer(paths, serverPort, analysisPort)

  appStatus = {
    serverPort,
    analysisPort,
    url: `http://127.0.0.1:${serverPort}`,
    paths,
  }

  return appStatus
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: PRODUCT_NAME,
    backgroundColor: '#f6f8fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(url)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function stopProcess(child, name) {
  if (!child || child.killed) return Promise.resolve()

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL')
      resolve()
    }, 3000)

    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })

    child.kill('SIGTERM')
  })
}

async function stopLocalServices() {
  await Promise.all([
    stopProcess(nodeProcess, 'server'),
    stopProcess(analysisProcess, 'analysis'),
  ])
}

ipcMain.handle('desktop:get-status', () => appStatus)
ipcMain.handle('desktop:open-logs', async () => {
  if (!appStatus?.paths?.logsDir) return false
  await shell.openPath(appStatus.paths.logsDir)
  return true
})

app.whenReady().then(async () => {
  try {
    const status = await startLocalServices()
    createWindow(status.url)
  } catch (error) {
    dialog.showErrorBox('Digital Employee failed to start', error?.stack || error?.message || String(error))
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', (event) => {
  if (nodeProcess || analysisProcess) {
    event.preventDefault()
    stopLocalServices().finally(() => app.exit(0))
  }
})
