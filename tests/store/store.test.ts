import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db/db'
import { listSaves } from '../../src/db/repository'
import { useGameStore } from '../../src/store/gameStore'
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

describe('game store', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
    useGameStore.setState(INITIAL_STATE)
  })

  it('creates, advances and autosaves a career', async () => {
    await useGameStore.getState().init()
    expect(useGameStore.getState().hydrated).toBe(true)

    await useGameStore.getState().createCareer(testOptions())
    const created = useGameStore.getState()
    expect(created.world).not.toBeNull()
    expect(created.saveId).toBeTruthy()
    expect(created.world?.week).toBe(1)
    expect(await listSaves()).toHaveLength(1)

    const result = await useGameStore.getState().advance({ training: 'technical', extra: 'none' })
    expect(result).not.toBeNull()
    expect(result?.weekPlayed).toBe(1)
    expect(result?.match).not.toBeNull()
    expect(useGameStore.getState().world?.week).toBe(2)
    expect(useGameStore.getState().lastTurn?.match?.fixtureId).toBe(result?.match?.fixtureId)
    expect(await listSaves()).toHaveLength(1)
  })

  it('loads the last save during init', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const saveId = useGameStore.getState().saveId

    useGameStore.setState(INITIAL_STATE)
    await useGameStore.getState().init()

    expect(useGameStore.getState().hydrated).toBe(true)
    expect(useGameStore.getState().saveId).toBe(saveId)
    expect(useGameStore.getState().world?.players[useGameStore.getState().world!.playerId].name).toBe('测试球员')
  })
})
