import { expect, vi } from 'vitest'
import type { KeyMoment, WeeklyPlan } from '../../src/domain/types'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from './career'
import { PLAN } from './matchday'

const { saveWorldMock } = vi.hoisted(() => ({ saveWorldMock: vi.fn() }))

vi.mock('../../src/db', async (importActual) => {
  const actual = await importActual<typeof import('../../src/db')>()
  return { ...actual, saveWorld: saveWorldMock }
})

const plan: WeeklyPlan = PLAN

export { saveWorldMock }

export async function createLiveCareer() {
  await useGameStore.getState().createCareer(testOptions())
  useGameStore.getState().updateSettings({ aiMode: 'llm' })
  const result = await useGameStore.getState().advance(plan)
  expect(result?.live).toBe(true)
  return result!
}

export function pendingMoments(): KeyMoment[] {
  return (useGameStore.getState().world?.lastMatch?.keyMoments ?? []).filter(
    (moment) => !moment.outcome,
  )
}

export function nextPending(): KeyMoment | undefined {
  return pendingMoments()[0]
}
