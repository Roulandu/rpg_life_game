import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const exportMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/platform/fileExport', () => ({
  exportTextFile: (...args: unknown[]) => exportMock(...args),
}))

import { downloadWorld } from '../../src/store/exportSave'

beforeEach(() => {
  exportMock.mockReset().mockResolvedValue({
    ok: true,
    channel: 'browser-download',
    locationZh: '存档已导出为 JSON 文件。',
  })
})

describe('downloadWorld', () => {
  it('用安全文件名导出当前存档 JSON', async () => {
    const world = generateWorld(testOptions(), TEST_NOW)

    await downloadWorld(world)

    expect(exportMock).toHaveBeenCalledOnce()
    const [content, filename] = exportMock.mock.calls[0]!
    expect(filename).toBe(`pitch-life-测试球员-${world.season}-W${world.week}D${world.day}.json`)
    const parsed = JSON.parse(content as string) as { world?: unknown }
    expect(parsed.world).toBeTruthy()
  })

  it('把文件名中的非法字符替换为下划线', async () => {
    const world = generateWorld(testOptions({ name: 'a/b c:d' }), TEST_NOW)

    await downloadWorld(world)

    const [, filename] = exportMock.mock.calls.at(-1)!
    expect(filename).toContain('a_b_c_d')
    expect(filename).not.toMatch(/[\\/:*?"<>|\s]/)
  })

  it('原样透传导出端口的结论供上层决定提示', async () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    exportMock.mockResolvedValueOnce({ ok: false, reason: 'failed', messageZh: '写入缓存文件失败：磁盘已满' })

    const result = await downloadWorld(world)

    expect(result).toEqual({ ok: false, reason: 'failed', messageZh: '写入缓存文件失败：磁盘已满' })
  })
})
