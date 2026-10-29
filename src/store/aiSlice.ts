import { testLlmConnection } from '../llm'
import {
  clearApiKey as clearStoredApiKey,
  getLoadedApiKey,
  saveApiKey as storeApiKey,
} from '../platform'
import { narrateTurn, sendChat } from './aiActions'
import { messageOf } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type AiSlice = Pick<
  GameStore,
  | 'narrateTurn'
  | 'setApiKey'
  | 'clearApiKey'
  | 'testAi'
  | 'sendChat'
  | 'clearAiError'
  | 'aiKeyReady'
  | 'aiKeyHint'
  | 'aiBusy'
  | 'aiError'
>

async function setApiKey(
  set: StoreSet,
  get: StoreGet,
  key: string,
  remember: boolean,
): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed) {
    set({ aiError: 'API Key 不能为空。' })
    return
  }
  try {
    const stored = await storeApiKey(trimmed, remember)
    const hint =
      stored.persisted === 'native'
        ? '已保存到 Android 安全存储'
        : stored.persisted === 'encrypted'
          ? '已加密保存在本机浏览器'
          : '仅保留在本次会话，刷新后需要重新填写'
    set({
      aiKeyReady: true,
      aiKeyHint: hint,
      aiError: null,
      notice: stored.warning ?? 'API Key 已载入。',
    })
    if (get().world) get().updateSettings({ rememberKey: remember })
  } catch (error) {
    set({ aiError: `保存 API Key 失败：${messageOf(error)}` })
  }
}

async function clearApiKey(set: StoreSet): Promise<void> {
  try {
    await clearStoredApiKey()
    set({ aiKeyReady: false, aiKeyHint: null, notice: 'API Key 已从本机清除。' })
  } catch (error) {
    set({ aiError: `清除 API Key 失败：${messageOf(error)}` })
  }
}

async function testAi(get: StoreGet): Promise<Awaited<ReturnType<typeof testLlmConnection>>> {
  const world = get().world
  const apiKey = getLoadedApiKey()
  if (!world || !apiKey) {
    return { ok: false, message: '请先保存 API Key。', latencyMs: 0, model: null }
  }
  return testLlmConnection(
    {
      provider: world.settings.provider,
      model: world.settings.model.trim(),
      baseUrl: world.settings.baseUrl?.trim() || undefined,
      networkMode: world.settings.networkMode ?? 'auto',
      tokenParam: world.settings.tokenParam ?? 'max_tokens',
      temperature: world.settings.temperature ?? 0.85,
    },
    apiKey,
  )
}

export const createAiSlice: StoreSlice<AiSlice> = (set, get) => ({
  aiKeyReady: false,
  aiKeyHint: null,
  aiBusy: false,
  aiError: null,

  narrateTurn: (result) => narrateTurn(set, get, result),
  setApiKey: (key, remember) => setApiKey(set, get, key, remember),
  clearApiKey: () => clearApiKey(set),
  testAi: () => testAi(get),
  sendChat: (message) => sendChat(set, get, message),
  clearAiError: () => set({ aiError: null }),
})
