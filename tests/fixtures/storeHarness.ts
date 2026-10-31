import type { Mock } from 'vitest'
import { db } from '../../src/db/db'
import { useGameStore } from '../../src/store/gameStore'

export const EMPTY_STORE_STATE = {
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
  aiBusy: false,
  aiError: null,
}

export async function resetStore(saveWorldMock: Mock, init = false): Promise<void> {
  await db.saves.clear()
  await db.meta.clear()
  useGameStore.setState(EMPTY_STORE_STATE)
  const repository = await import('../../src/db/repository')
  saveWorldMock.mockReset()
  saveWorldMock.mockImplementation(repository.saveWorld)
  if (init) await useGameStore.getState().init()
}
