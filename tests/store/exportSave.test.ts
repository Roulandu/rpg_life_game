import { describe, expect, it, vi } from 'vitest'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

vi.mock('../../src/platform/fileExport', () => ({
  downloadTextFile: vi.fn(),
}))

import { downloadTextFile } from '../../src/platform/fileExport'
import { downloadWorld } from '../../src/store/exportSave'

describe('downloadWorld', () => {
  it('用安全文件名导出当前存档 JSON', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    downloadWorld(world)

    expect(downloadTextFile).toHaveBeenCalledOnce()
    const [content, filename] = vi.mocked(downloadTextFile).mock.calls[0]!
    expect(filename).toBe(`pitch-life-测试球员-${world.season}-W${world.week}.json`)
    const parsed = JSON.parse(content as string) as { world?: unknown }
    expect(parsed.world).toBeTruthy()
  })

  it('把文件名中的非法字符替换为下划线', () => {
    const world = generateWorld(testOptions({ name: 'a/b c:d' }), TEST_NOW)
    downloadWorld(world)

    const [, filename] = vi.mocked(downloadTextFile).mock.calls.at(-1)!
    expect(filename).toContain('a_b_c_d')
    expect(filename).not.toMatch(/[\\/:*?"<>|\s]/)
  })
})
