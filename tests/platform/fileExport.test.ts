import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：钉住导出端口的分派与结论——原生必须真的写盘再交给分享面板，失败/取消/不可用三态要能分辨。
 * 边界：只 mock Capacitor 插件与平台探针，不碰真实文件系统；Web 分支用 jsdom 的 anchor。
 * 依赖：src/platform/fileExport.ts、src/platform/native.ts。
 */
const native = vi.hoisted(() => ({ value: false }))
const writeFileMock = vi.hoisted(() => vi.fn())
const shareMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/platform/native', () => ({ isNativePlatform: () => native.value }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: writeFileMock },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: shareMock } }))

const { exportTextFile } = await import('../../src/platform/fileExport')

function rejectWith(message: string): () => Promise<never> {
  return () => Promise.reject(new Error(message))
}

beforeEach(() => {
  native.value = false
  writeFileMock.mockReset().mockResolvedValue({ uri: 'file:///data/user/0/com.example/cache/save.json' })
  shareMock.mockReset().mockResolvedValue({ activityType: undefined })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('原生导出', () => {
  it('回归: 安卓导出仍走浏览器下载分支，WebView 不接下载所以文件静默消失', async () => {
    native.value = true

    const result = await exportTextFile('{"world":1}', 'pitch-life-save.json')

    expect(writeFileMock).toHaveBeenCalledOnce()
    expect(writeFileMock.mock.calls[0]![0]).toMatchObject({
      path: 'pitch-life-save.json',
      data: '{"world":1}',
      directory: 'CACHE',
      encoding: 'utf8',
    })
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///data/user/0/com.example/cache/save.json'] }),
    )
    expect(result).toMatchObject({ ok: true, channel: 'native-share' })
  })

  it('回归: 原生写盘失败时提示仍然说「存档已导出为 JSON 文件」', async () => {
    native.value = true
    writeFileMock.mockRejectedValueOnce(new Error('Quota exceeded'))

    const result = await exportTextFile('{}', 'bad.json')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.messageZh).toContain('Quota exceeded')
    expect(shareMock).not.toHaveBeenCalled()
  })

  it('在分享面板取消不算失败：文件已写进缓存，只给一条轻提示', async () => {
    native.value = true
    shareMock.mockImplementationOnce(rejectWith('Cancel'))

    const result = await exportTextFile('{}', 'save.json')

    expect(result).toMatchObject({ ok: false, reason: 'canceled' })
    expect(writeFileMock).toHaveBeenCalledOnce()
  })

  it('设备没有分享目标时判为不可用而不是取消', async () => {
    native.value = true
    shareMock.mockImplementationOnce(rejectWith('Share is not available on this device'))

    const result = await exportTextFile('{}', 'save.json')

    expect(result).toMatchObject({ ok: false, reason: 'unavailable' })
  })
})

describe('Web 导出', () => {
  it('浏览器分支照旧触发 anchor 下载，不碰 Capacitor', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const clicked: string[] = []
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement
      if (tag === 'a') {
        el.click = () => clicked.push(el.getAttribute('download') ?? '')
      }
      return el
    })

    const result = await exportTextFile('{}', 'life.json')

    expect(result).toMatchObject({ ok: true, channel: 'browser-download' })
    expect(clicked).toEqual(['life.json'])
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(writeFileMock).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
