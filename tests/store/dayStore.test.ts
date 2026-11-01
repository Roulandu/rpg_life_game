import { beforeEach, describe, expect, it } from 'vitest'
import { listSaves } from '../../src/db/repository'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { clearStore } from '../fixtures/storeHarness'

describe('逐日推进的 store', () => {
  beforeEach(clearStore)

  it('推进一天只让日时钟加一天并落盘', async () => {
    await useGameStore.getState().createCareer(testOptions())
    expect(useGameStore.getState().world?.day).toBe(1)

    const result = await useGameStore.getState().advanceDay()

    expect(result?.dayPlayed).toBe(1)
    expect(useGameStore.getState().world?.day).toBe(2)
    expect(useGameStore.getState().world?.week).toBe(1)
    expect(await listSaves()).toHaveLength(1)
  })

  it('推进到下一件事停在比赛日并汇总平静日', async () => {
    await useGameStore.getState().createCareer(testOptions())

    const fast = await useGameStore.getState().advanceToNextEvent()

    const world = useGameStore.getState().world
    expect(fast?.stopReason).toBe('matchday')
    expect(world?.day).toBe(7)
    expect(world?.lastMatch?.status).toBe('live')
    expect(useGameStore.getState().notice).toContain('个平静日')
  })

  it('保存本周安排只写周计划，不推进时钟', async () => {
    await useGameStore.getState().createCareer(testOptions())

    const ok = await useGameStore.getState().setWeekPlan({ training: 'physical', extra: 'media' })

    const world = useGameStore.getState().world
    expect(ok).toBe(true)
    expect(world?.weekPlan).toEqual({ training: 'physical', extra: 'media' })
    expect(world?.day).toBe(1)
    expect(world?.week).toBe(1)
  })

  it('今天的比赛没踢完时拒绝继续往后推日子', async () => {
    await useGameStore.getState().createCareer(testOptions())
    await useGameStore.getState().advanceToNextEvent()

    const blocked = await useGameStore.getState().advanceDay()

    expect(blocked).toBeNull()
    expect(useGameStore.getState().error).toContain('请先')
    expect(useGameStore.getState().world?.day).toBe(7)
  })
})
