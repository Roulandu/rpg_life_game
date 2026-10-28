import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { isNativePlatform } from './native'

const NATIVE_KEY = 'pitch-life-llm-key'
const KEY_ID = 'llm-api-key'
const WRAP_ID = 'llm-api-key-wrap'

export interface SecretRecord {
  id: string
  value: unknown
}

export interface SecretStore {
  get(id: string): Promise<SecretRecord | undefined>
  put(record: SecretRecord): Promise<void>
  delete(id: string): Promise<void>
}

let secretStore: SecretStore | null = null
let sessionKey: string | null = null

export function configureSecretStore(store: SecretStore | null): void {
  secretStore = store
}

function isCryptoKey(value: unknown): value is CryptoKey {
  return typeof CryptoKey !== 'undefined' && value instanceof CryptoKey
}

async function decryptStoredKey(): Promise<string | null> {
  if (!secretStore) return null
  const record = await secretStore.get(KEY_ID)
  const wrap = await secretStore.get(WRAP_ID)
  if (!record || !wrap || !isCryptoKey(wrap.value)) return null

  const payload = record.value as { iv?: number[]; data?: number[] } | undefined
  if (!payload?.iv || !payload.data) return null
  if (!globalThis.crypto?.subtle) return null

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
      wrap.value,
      new Uint8Array(payload.data),
    )
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

async function rememberKey(key: string): Promise<boolean> {
  if (!secretStore || !globalThis.crypto?.subtle) return false
  try {
    const wrap = await secretStore.get(WRAP_ID)
    let cryptoKey = isCryptoKey(wrap?.value) ? wrap.value : null
    if (!cryptoKey) {
      cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
      await secretStore.put({ id: WRAP_ID, value: cryptoKey })
    }

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      new TextEncoder().encode(key),
    )
    await secretStore.put({
      id: KEY_ID,
      value: { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) },
    })
    return true
  } catch {
    return false
  }
}

export async function loadApiKey(): Promise<string | null> {
  if (sessionKey) return sessionKey
  if (isNativePlatform()) {
    try {
      const stored = await SecureStorage.get(NATIVE_KEY)
      if (typeof stored === 'string' && stored.length > 0) {
        sessionKey = stored
        return stored
      }
    } catch {
      return null
    }
    return null
  }

  sessionKey = await decryptStoredKey()
  return sessionKey
}

export function getLoadedApiKey(): string | null {
  return sessionKey
}

export async function saveApiKey(
  key: string,
  remember: boolean,
): Promise<{ persisted: 'native' | 'encrypted' | 'session'; warning?: string }> {
  sessionKey = key

  if (isNativePlatform()) {
    try {
      await SecureStorage.set(NATIVE_KEY, key)
      return { persisted: 'native' }
    } catch {
      return { persisted: 'session', warning: '系统安全存储不可用，密钥只保留在本次会话。' }
    }
  }

  if (!remember) {
    await clearRememberedKey()
    return { persisted: 'session' }
  }

  const ok = await rememberKey(key)
  if (ok) return { persisted: 'encrypted' }
  return { persisted: 'session', warning: '浏览器无法加密保存密钥，已仅保留在本次会话。' }
}

async function clearRememberedKey(): Promise<void> {
  if (!secretStore) return
  await secretStore.delete(KEY_ID)
  await secretStore.delete(WRAP_ID)
}

export async function clearApiKey(): Promise<void> {
  sessionKey = null
  if (isNativePlatform()) {
    try {
      await SecureStorage.remove(NATIVE_KEY)
    } catch {
      // 会话内存已经清空，系统存储失败不应阻塞退出流程。
    }
  }
  await clearRememberedKey()
}
