/**
 * Device Identity 设备身份模块
 * 用于 OpenClaw Gateway 协议 v3 挑战-响应认证
 */

const STORAGE_DEVICE_ID = 'mc-device-id'
const STORAGE_PUBKEY = 'mc-device-pubkey'
const STORAGE_PRIVKEY = 'mc-device-privkey'
const STORAGE_DEVICE_TOKEN = 'mc-device-token'

export interface DeviceIdentity {
  deviceId: string
  publicKeyBase64: string
  privateKey: CryptoKey
}

// 检查是否在安全上下文（HTTPS 或 localhost）
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
}

// 检查 Ed25519 是否支持
export function isEd25519Supported(): boolean {
  try {
    return typeof crypto !== 'undefined' &&
           crypto.subtle &&
           typeof (crypto.subtle as any).generateKey === 'function'
  } catch {
    return false
  }
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(buffer))
  const bytes = new Uint8Array(digest)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function importPrivateKey(pkcs8Bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', pkcs8Bytes as unknown as BufferSource, 'Ed25519', false, ['sign'])
}

async function createNewIdentity(): Promise<DeviceIdentity> {
  const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])

  const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  const deviceId = await sha256Hex(pubRaw)
  const publicKeyBase64 = toBase64Url(pubRaw)
  const privateKeyBase64 = toBase64Url(privPkcs8)

  localStorage.setItem(STORAGE_DEVICE_ID, deviceId)
  localStorage.setItem(STORAGE_PUBKEY, publicKeyBase64)
  localStorage.setItem(STORAGE_PRIVKEY, privateKeyBase64)

  return {
    deviceId,
    publicKeyBase64,
    privateKey: keyPair.privateKey,
  }
}

/**
 * 获取或创建设备身份
 */
export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  if (!isEd25519Supported()) {
    throw new Error('Ed25519 not supported')
  }

  const storedId = localStorage.getItem(STORAGE_DEVICE_ID)
  const storedPub = localStorage.getItem(STORAGE_PUBKEY)
  const storedPriv = localStorage.getItem(STORAGE_PRIVKEY)

  if (storedId && storedPub && storedPriv) {
    try {
      const privateKey = await importPrivateKey(fromBase64Url(storedPriv))
      return {
        deviceId: storedId,
        publicKeyBase64: storedPub,
        privateKey,
      }
    } catch {
      console.warn('[DeviceIdentity] Keys corrupted, regenerating...')
    }
  }

  return createNewIdentity()
}

/**
 * 签名 payload
 */
export async function signPayload(
  privateKey: CryptoKey,
  payload: string,
  signedAt = Date.now()
): Promise<{ signature: string; signedAt: number }> {
  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payload)
  const signatureBuffer = await crypto.subtle.sign('Ed25519', privateKey, payloadBytes)
  return {
    signature: toBase64Url(signatureBuffer),
    signedAt,
  }
}

/**
 * 获取缓存的设备令牌
 */
export function getCachedDeviceToken(): string | null {
  return localStorage.getItem(STORAGE_DEVICE_TOKEN)
}

/**
 * 缓存设备令牌
 */
export function cacheDeviceToken(token: string): void {
  localStorage.setItem(STORAGE_DEVICE_TOKEN, token)
}

/**
 * 清除设备身份
 */
export function clearDeviceIdentity(): void {
  localStorage.removeItem(STORAGE_DEVICE_ID)
  localStorage.removeItem(STORAGE_PUBKEY)
  localStorage.removeItem(STORAGE_PRIVKEY)
  localStorage.removeItem(STORAGE_DEVICE_TOKEN)
}
