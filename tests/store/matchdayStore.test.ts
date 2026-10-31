import { createLiveCareer, pendingMoments, saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WeeklyPlan } from '../../src/domain/types'
import { listSaves } from '../../src/db/repository'
import { startWeek } from '../../src/engine/turn'
import { useGameStore } from '../../src/store/gameStore'
import { createMatchSlice } from '../../src/store/matchSlice'
import { selectPendingKeyMoments } from '../../src/store/selectors'
import { migrateWorld } from '../../src/db/migrate'
import { PLAN, readyWorld } from '../fixtures/matchday'
import { legacyWorld } from '../fixtures/legacySave'
import { resetStore } from '../fixtures/storeHarness'
import { testOptions } from '../fixtures/career'

const plan: WeeklyPlan = PLAN

beforeEach(() => resetStore(saveWorldMock, true))

async function resolveAllButLast(week: number) {
  let pending = pendingMoments()
  while (pending.length > 1) {
    await useGameStore.getState().resolveKeyMoment(pending[0]!.id, pending[0]!.defaultOptionId)
    expect(useGameStore.getState().world?.week).toBe(week)
    useGameStore.getState().continueAfterMoment()
    useGameStore.getState().jumpToNextKeyMoment()
    pending = pendingMoments()
  }
  return pending
}

describe('matchday store', () => {
  it('matchSlice 暴露比赛日动作，live 世界被 selector 识别为未完成', async () => {
    const noop = (() => {}) as never
    const slice = createMatchSlice(noop, noop, noop)
    expect(typeof slice.advance).toBe('function')
    expect(typeof slice.skipKeyMoments).toBe('function')

    const result = await createLiveCareer()
    expect(selectPendingKeyMoments(result?.world ?? null)).toBe(true)
  })

  it('advance 停在 live 比赛，周次不变、已落盘且不触发叙事', async () => {
    await useGameStore.getState().createCareer(testOptions())
    useGameStore.getState().updateSettings({ aiMode: 'llm' })
    saveWorldMock.mockClear()
    const week = useGameStore.getState().world!.week

    const result = await useGameStore.getState().advance(plan)

    expect(result?.live).toBe(true)
    expect(result?.world.week).toBe(week)
    expect(useGameStore.getState().world?.week).toBe(week)
    expect(useGameStore.getState().world?.lastMatch?.status).toBe('live')
    expect(useGameStore.getState().lastTurn?.live).toBe(true)
    expect(useGameStore.getState().aiError).toBeNull()
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
    const saves = await listSaves()
    expect(saves).toHaveLength(1)
    expect(saves[0]!.week).toBe(week)
  })
})

describe('matchday store completion', () => {
  it('skipKeyMoments 完成 live 比赛：终场结算、推进周次并只保存一次', async () => {
    await createLiveCareer()
    const week = useGameStore.getState().world!.week
    saveWorldMock.mockClear()

    await useGameStore.getState().skipKeyMoments()

    const state = useGameStore.getState()
    expect(state.world?.week).toBe(week + 1)
    expect(state.world?.pendingWeekPlan).toBeNull()
    expect(state.lastTurn?.match?.status).toBe('final')
    expect(state.lastTurn?.live).toBe(false)
    expect(state.aiError).toContain('还没有保存 API Key')
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
    expect(await listSaves()).toHaveLength(1)
  })

  it('resolveKeyMoment 处理最后一个回合后停在 result，继续播放并完成后推进周次', async () => {
    await createLiveCareer()
    const week = useGameStore.getState().world!.week
    const pending = await resolveAllButLast(week)

    await useGameStore.getState().resolveKeyMoment(pending[0]!.id, pending[0]!.defaultOptionId)

    expect(useGameStore.getState().livePlayback.phase).toBe('result')
    expect(useGameStore.getState().world?.lastMatch?.status).toBe('live')
    expect(useGameStore.getState().world?.week).toBe(week)

    useGameStore.getState().continueAfterMoment()
    useGameStore.getState().jumpToNextKeyMoment()
    expect(useGameStore.getState().livePlayback.phase).toBe('ended')

    saveWorldMock.mockClear()
    await useGameStore.getState().finishLiveMatch()

    const state = useGameStore.getState()
    expect(state.world?.week).toBe(week + 1)
    expect(state.lastTurn?.match?.status).toBe('final')
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })
})

describe('matchday store failure and legacy', () => {
  it('保存失败时保留完成后状态，再次 skip 不会重复推进', async () => {
    await createLiveCareer()
    const week = useGameStore.getState().world!.week
    saveWorldMock.mockRejectedValueOnce(new Error('磁盘不可用'))

    await useGameStore.getState().skipKeyMoments()

    expect(useGameStore.getState().world?.week).toBe(week + 1)
    expect(useGameStore.getState().error).toContain('保存失败')
    await useGameStore.getState().skipKeyMoments()
    expect(useGameStore.getState().world?.week).toBe(week + 1)
  })

  it('旧档没有 pendingWeekPlan 时完成回合不会多推一周', async () => {
    const legacy = migrateWorld(legacyWorld())
    useGameStore.setState({ world: legacy, saveId: 'legacy-save', hydrated: true })
    const week = legacy.week
    const moment = legacy.lastMatch!.keyMoments![0]!

    await useGameStore.getState().resolveKeyMoment(moment.id, moment.defaultOptionId)

    expect(useGameStore.getState().world?.week).toBe(week)
    expect(useGameStore.getState().world?.lastMatch?.status).toBe('final')
    expect(useGameStore.getState().world?.pendingWeekPlan).toBeFalsy()
  })

  it('旧档缺少 pendingWeekPlan 的 live 比赛在 skip 后同样不会多推一周', async () => {
    const started = startWeek(readyWorld(), plan)
    const world = structuredClone(started.world)
    world.pendingWeekPlan = null
    useGameStore.setState({ world, saveId: 'live-save', hydrated: true })
    const week = world.week

    await useGameStore.getState().skipKeyMoments()

    expect(useGameStore.getState().world?.week).toBe(week)
    expect(useGameStore.getState().world?.lastMatch?.status).toBe('final')
  })
})
