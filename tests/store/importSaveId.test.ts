import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorldState } from '../../src/domain'
import { exportWorld, saveWorld } from '../../src/db/repository'
import { db } from '../../src/db/db'
import { downloadWorld } from '../../src/store/exportSave'

const exported: { text: string; filename: string }[] = []

vi.mock('../../src/platform', async (importActual) => {
  const actual = await importActual<typeof import('../../src/platform')>()
  return {
    ...actual,
    exportTextFile: async (text: string, filename: string) => {
      exported.push({ text, filename })
      return { ok: true, locationZh: '测试缓存', reason: 'saved' } as never
    },
  }
})
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/**
 * 导入此前一律另开一条存档：同一个文件导两次就是两条看上去一模一样的生涯，
 * 既认不出也盖不回去。事实源是导出文件里那条来源 id。
 */
const INITIAL_STATE = {
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
}

function worldAtWeek(week: number): WorldState {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.week = week
  return world
}

beforeEach(async () => {
  await db.saves.clear()
  await db.meta.clear()
  useGameStore.setState(INITIAL_STATE as never)
})

describe('导出把来源 id 写进文件', () => {
  beforeEach(() => {
    exported.length = 0
  })

  it('downloadWorld 带 id 时导出文件里就有它', async () => {
    const result = await downloadWorld(worldAtWeek(2), 'save:omega')

    expect(result.ok).toBe(true)
    expect(JSON.parse(exported[0]!.text)).toMatchObject({ saveId: 'save:omega' })
  })

  it('不知道 id 时不写这个字段，读回照旧合法', async () => {
    await downloadWorld(worldAtWeek(3))

    expect((JSON.parse(exported[0]!.text) as { saveId?: string }).saveId).toBeUndefined()
  })
})

describe('导入按来源 id 原位覆盖', () => {
  it('同一个 id 再导入只更新那一条，不新增存档', async () => {
    await saveWorld(worldAtWeek(2), 'save:alpha')
    const first = exportWorld(worldAtWeek(2), 'save:alpha')
    const second = exportWorld(worldAtWeek(6), 'save:alpha')

    expect(await useGameStore.getState().importFromText(first)).toBe(true)
    expect(useGameStore.getState().notice).toContain('已覆盖原存档')
    expect(await useGameStore.getState().importFromText(second)).toBe(true)

    const rows = await db.saves.toArray()
    expect(rows.map((row) => row.id)).toEqual(['save:alpha'])
    expect(rows[0]?.world.week).toBe(6)
  })

  it('文件里没有 id 时仍然新建，绝不覆盖别人的生涯', async () => {
    await saveWorld(worldAtWeek(1), 'save:beta')
    const legacy = exportWorld(worldAtWeek(9))

    expect(await useGameStore.getState().importFromText(legacy)).toBe(true)

    const rows = await db.saves.toArray()
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.id === 'save:beta')?.world.week).toBe(1)
  })

  it('导入损坏文件不覆盖任何存档', async () => {
    await saveWorld(worldAtWeek(4), 'save:gamma')

    expect(await useGameStore.getState().importFromText('{broken')).toBe(false)

    const rows = await db.saves.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.world.week).toBe(4)
  })

  it('当前存档指针跟着导入结果走', async () => {
    await saveWorld(worldAtWeek(2), 'save:delta')

    expect(await useGameStore.getState().importFromText(exportWorld(worldAtWeek(7), 'save:delta'))).toBe(true)

    expect(useGameStore.getState().saveId).toBe('save:delta')
    expect((await db.meta.get('lastSaveId'))?.value).toBe('save:delta')
  })
})
