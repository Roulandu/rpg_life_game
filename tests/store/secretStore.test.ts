import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db/db'
import { clearApiKey, getLoadedApiKey, loadApiKey, saveApiKey } from '../../src/platform/keyStore'
import '../../src/store/secretStore'

describe('secretStore 端口注入', () => {
  beforeEach(async () => {
    await db.secrets.clear()
    await clearApiKey()
  })

  it('无会话密钥时经注入端口查询 db.secrets 返回 null', async () => {
    expect(getLoadedApiKey()).toBeNull()
    expect(await loadApiKey()).toBeNull()
  })

  it('记住密钥时经注入端口加密写入 db.secrets', async () => {
    const result = await saveApiKey('sk-remember-me', true)
    expect(result.persisted).toBe('encrypted')
    expect(await db.secrets.get('llm-api-key')).toBeTruthy()
    expect(await db.secrets.get('llm-api-key-wrap')).toBeTruthy()
    expect(getLoadedApiKey()).toBe('sk-remember-me')
  })

  it('不记住密钥时经注入端口清空 db.secrets', async () => {
    await saveApiKey('sk-remember-me', true)
    const result = await saveApiKey('sk-session-only', false)
    expect(result.persisted).toBe('session')
    expect(await db.secrets.get('llm-api-key')).toBeUndefined()
  })

  it('clearApiKey 经注入端口删除 db.secrets 记录', async () => {
    await saveApiKey('sk-remember-me', true)
    await clearApiKey()
    expect(getLoadedApiKey()).toBeNull()
    expect(await db.secrets.get('llm-api-key')).toBeUndefined()
  })
})
