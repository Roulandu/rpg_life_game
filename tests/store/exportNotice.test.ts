import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../src/db/db'
import { useGameStore } from '../../src/store/gameStore'
import type { FileExportResult } from '../../src/platform'
import { testOptions } from '../fixtures/career'

/**
 * 职责：钉住导出结论必须如实反映到提示上——失败不能再报成功，取消不能报失败。
 * 边界：只 mock fileExport 端口，存档与文件名组装走真实代码；不碰 Capacitor 插件。
 * 依赖：src/store/exportSave.ts（经 src/platform 索引取端口）、src/store/careerSlice.ts。
 */
const exportMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/platform/fileExport', () => ({
  exportTextFile: (...args: unknown[]) => exportMock(...args),
}))

function settled(value: FileExportResult): Promise<FileExportResult> {
  return Promise.resolve(value)
}

beforeEach(async () => {
  await db.saves.clear()
  await db.meta.clear()
  exportMock.mockReset()
  useGameStore.setState({ world: null, saveId: null, saves: [], notice: null, error: null, hydrated: false })
  await useGameStore.getState().createCareer(testOptions())
})

describe('导出提示跟随真实结论', () => {
  it('回归: 安卓导出失败时仍然提示「存档已导出为 JSON 文件」', async () => {
    exportMock.mockResolvedValueOnce(
      settled({ ok: false, reason: 'failed', messageZh: '写入缓存文件失败：Quota exceeded' }),
    )

    await useGameStore.getState().exportCurrent()

    expect(useGameStore.getState().notice).not.toBe('存档已导出为 JSON 文件。')
    expect(useGameStore.getState().error).toContain('Quota exceeded')
  })

  it('原生成功提示说清「在哪里拿到文件」', async () => {
    exportMock.mockResolvedValueOnce(
      settled({ ok: true, channel: 'native-share', locationZh: '已生成 save.json，请在分享面板里保存或发送。' }),
    )

    await useGameStore.getState().exportCurrent()

    expect(useGameStore.getState().notice).toBe('已生成 save.json，请在分享面板里保存或发送。')
    expect(useGameStore.getState().error).toBeNull()
  })

  it('用户在分享面板取消只给轻提示，不记成错误', async () => {
    exportMock.mockResolvedValueOnce(
      settled({ ok: false, reason: 'canceled', messageZh: '已取消分享，文件仍留在 App 缓存里。' }),
    )

    await useGameStore.getState().exportCurrent()

    expect(useGameStore.getState().error).toBeNull()
    expect(useGameStore.getState().notice).toBe('已取消分享，文件仍留在 App 缓存里。')
  })

  it('没有当前存档时不调用导出端口', async () => {
    useGameStore.setState({ world: null })

    await useGameStore.getState().exportCurrent()

    expect(exportMock).not.toHaveBeenCalled()
  })
})
