// OpenClaw Gateway WebSocket 客户端
export class GatewayClient {
  constructor(options = {}) {
    this.url = options.url || 'ws://127.0.0.1:18789'
    this.token = options.token || ''
    this.ws = null
    this.connected = false
    this.pendingRequests = new Map()
    this.eventHandlers = new Map()
    this.connectTimer = null
    this.backoffMs = 800
    this.lastSeq = null
    this.onConnect = options.onConnect || (() => {})
    this.onClose = options.onClose || (() => {})
    this.onError = options.onError || (() => {})
    this.onEvent = options.onEvent || (() => {})
    
    this.connect()
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.addEventListener('open', () => {
        console.log('[Gateway] Connected')
        this.connected = true
        this.backoffMs = 800
        this.sendConnect()
        this.onConnect()
      })
      
      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event.data)
      })
      
      this.ws.addEventListener('close', (event) => {
        console.log('[Gateway] Closed:', event.code, event.reason)
        this.connected = false
        this.ws = null
        this.rejectAllPending(new Error(`Connection closed: ${event.reason}`))
        this.onClose({ code: event.code, reason: event.reason })
        this.scheduleReconnect()
      })
      
      this.ws.addEventListener('error', (error) => {
        console.error('[Gateway] Error:', error)
      })
      
    } catch (error) {
      console.error('[Gateway] Connect failed:', error)
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
    }
    this.connectTimer = setTimeout(() => {
      this.connect()
    }, this.backoffMs)
    this.backoffMs = Math.min(this.backoffMs * 1.7, 30000)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
    this.connected = false
    this.rejectAllPending(new Error('Disconnected'))
  }

  sendConnect() {
    const connectMsg = {
      type: 'req',
      id: this.generateId(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-unicom-ui',
          version: '1.0.0',
          platform: navigator?.platform || 'web',
        },
        role: 'webchat',
        scopes: [],
        caps: [],
        auth: this.token ? { token: this.token } : undefined,
        userAgent: navigator.userAgent,
        locale: navigator.language
      }
    }
    
    this.ws.send(JSON.stringify(connectMsg))
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data)
      
      if (message.type === 'event') {
        this.handleEvent(message)
      } else if (message.type === 'res') {
        this.handleResponse(message)
      }
    } catch (error) {
      console.error('[Gateway] Failed to parse message:', error)
    }
  }

  handleEvent(message) {
    const seq = message.seq
    if (seq !== null && seq !== undefined) {
      if (this.lastSeq !== null && this.lastSeq !== undefined && seq > this.lastSeq + 1) {
        console.warn('[Gateway] Message gap detected')
      }
      this.lastSeq = seq
    }
    
    this.onEvent(message.event, message.payload)
  }

  handleResponse(message) {
    const id = message.id
    const pending = this.pendingRequests.get(id)
    
    if (pending) {
      this.pendingRequests.delete(id)
      
      if (message.ok) {
        pending.resolve(message.payload)
      } else {
        const error = new Error(message.error?.message || 'Request failed')
        error.code = message.error?.code
        error.details = message.error?.details
        pending.reject(error)
      }
    }
  }

  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        reject(new Error('Not connected'))
        return
      }
      
      const id = this.generateId()
      const message = {
        type: 'req',
        id: id,
        method: method,
        params: params
      }
      
      this.pendingRequests.set(id, { resolve, reject })
      
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        this.pendingRequests.delete(id)
        reject(error)
      }
      
      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 60000) // 60 秒超时
    })
  }

  generateId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  rejectAllPending(error) {
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }
}

// 导出默认实例
let defaultClient = null

export function createGatewayClient(options) {
  return new GatewayClient(options)
}

export function getDefaultGatewayClient() {
  if (!defaultClient) {
    defaultClient = new GatewayClient()
  }
  return defaultClient
}

export function setDefaultGatewayClient(client) {
  defaultClient = client
}