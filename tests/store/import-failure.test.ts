import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db/db'
import { useGameStore } from '../../src/store/gameStore'
import type { GameStore } from '../../src/store/types'
import { testOptions } from '../fixtures/career'

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

describe('存档动作返回值', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
    useGameStore.setState(INITIAL_STATE)
  })

  it('导入损坏 JSON 返回 false 且不覆盖当前世界', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const store: GameStore = useGameStore.getState()
    const before = store.world

    const ok = await store.importFromText('{broken')

    expect(ok).toBe(false)
    expect(useGameStore.getState().world).toBe(before)
    expect(useGameStore.getState().error).toContain('导入失败')
  })

  it('载入不存在的存档返回 false 并保留当前世界', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const store: GameStore = useGameStore.getState()
    const before = store.world

    const ok = await store.loadGame('save:missing')

    expect(ok).toBe(false)
    expect(useGameStore.getState().world).toBe(before)
    expect(useGameStore.getState().error).toContain('读取存档失败')
  })

  it('删除存档成功返回 true 并清空当前存档', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const store: GameStore = useGameStore.getState()

    const ok = await store.removeSave(store.saveId!)

    expect(ok).toBe(true)
    expect(useGameStore.getState().saveId).toBeNull()
  })
})
