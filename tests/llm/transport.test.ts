import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTransport } from '../../src/llm/transport'
import { LlmError } from '../../src/llm/types'

const request = { url: 'https://example.com/v1/chat', headers: {}, body: '{}' }

describe('createTransport 选择与错误映射', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('非原生环境下 auto 与 direct 都选择浏览器传输', () => {
    expect(createTransport('auto').kind).toBe('browser')
    expect(createTransport('direct').kind).toBe('browser')
    expect(createTransport().kind).toBe('browser')
  })

  it('非原生环境请求 native 模式抛出 config 错误', () => {
    let caught: unknown
    try {
      createTransport('native')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(LlmError)
    expect((caught as LlmError).kind).toBe('config')
    expect((caught as LlmError).message).toBe('原生 HTTP 模式只能在 Android 应用中使用。')
  })

  it('浏览器传输成功返回状态码与正文', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, text: async () => '{"ok":true}' })),
    )
    await expect(createTransport('auto').send(request)).resolves.toEqual({
      status: 200,
      bodyText: '{"ok":true}',
    })
  })

  it('浏览器传输把普通失败映射为可重试 network 错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('boom')
      }),
    )
    await expect(createTransport('auto').send(request)).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
    })
  })

  it('浏览器传输把 AbortError 映射为可重试 timeout 错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const abort = new Error('aborted')
        abort.name = 'AbortError'
        throw abort
      }),
    )
    await expect(createTransport('auto').send(request)).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    })
  })
})
