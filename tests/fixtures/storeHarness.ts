import type { Mock } from 'vitest'
import { db } from '../../src/db/db'
import type { GameStore } from '../../src/store'
import { useGameStore } from '../../src/store/gameStore'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'

export const EMPTY_STORE_STATE: Partial<GameStore> = {
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
  livePlayback: IDLE_PLAYBACK,
  aiBusy: false,
  aiError: null,
  themePreference: 'system',
  systemScheme: 'dark',
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
