import { createLiveCareer, nextPending, saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import { listSaves } from '../../src/db/repository'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine'
import { useGameStore } from '../../src/store/gameStore'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'
import { hashState } from '../../src/lib/rng'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

async function playToEnd() {
  for (let guard = 0; guard < 30; guard += 1) {
    const state = useGameStore.getState()
    if (state.livePlayback.phase === 'result') {
      state.continueAfterMoment()
      continue
    }
    if (state.livePlayback.phase === 'awaiting') {
      const moment = nextPending()
      if (!moment) break
      await state.resolveKeyMoment(moment.id, moment.defaultOptionId)
      useGameStore.getState().continueAfterMoment()
      useGameStore.getState().jumpToNextKeyMoment()
      continue
    }
    if (state.livePlayback.phase === 'playing') {
      state.jumpToNextKeyMoment()
      continue
    }
    break
  }
}

describe('live playback clock', () => {
  it('advance 进入比赛后 livePlayback 以 1 倍速从 0 分钟自动开赛', async () => {
    await createLiveCareer()
    const state = useGameStore.getState()

    expect(state.livePlayback.phase).toBe('playing')
    expect(state.livePlayback.speed).toBe(1)
    expect(state.world?.lastMatch?.currentMinute).toBe(0)
  })

  it('tickLiveMatch 推进一分钟并刷新分钟、球权、球位与 revision', async () => {
    await createLiveCareer()
    const before = useGameStore.getState().livePlayback
    const worldBefore = useGameStore.getState().world

    useGameStore.getState().tickLiveMatch()

    const state = useGameStore.getState()
    expect(state.world?.lastMatch?.currentMinute).toBe(1)
    expect(state.world).not.toBe(worldBefore)
    expect(state.livePlayback.revision).toBe(before.revision + 1)
    expect(['home', 'away']).toContain(state.livePlayback.possession)
    expect(state.livePlayback.ballX).toBeGreaterThanOrEqual(0)
    expect(state.livePlayback.ballX).toBeLessThanOrEqual(1)
  })

  it('tick 遇到关键回合时停表并进入 awaiting，不越过该分钟', async () => {
    await createLiveCareer()

    for (let guard = 0; guard < 200; guard += 1) {
      if (useGameStore.getState().livePlayback.phase !== 'playing') break
      useGameStore.getState().tickLiveMatch()
    }

    const state = useGameStore.getState()
    const moment = nextPending()
    expect(state.livePlayback.phase).toBe('awaiting')
    expect(moment).toBeDefined()
    expect(state.world?.lastMatch?.currentMinute).toBe(moment!.minute)
    expect(moment!.minute).toBeLessThan(90)
  })

  it('jumpToNextKeyMoment 一次推进到下一回合分钟并暂停', async () => {
    await createLiveCareer()
    const moment = nextPending()!

    useGameStore.getState().jumpToNextKeyMoment()

    const state = useGameStore.getState()
    expect(state.livePlayback.phase).toBe('awaiting')
    expect(state.world?.lastMatch?.currentMinute).toBe(moment.minute)
  })
})

describe('live playback key moments', () => {
  it('resolveKeyMoment 后停在 result 阶段，不再自动完成整周', async () => {
    await createLiveCareer()
    useGameStore.getState().jumpToNextKeyMoment()
    const moment = nextPending()!
    const week = useGameStore.getState().world!.week

    await useGameStore.getState().resolveKeyMoment(moment.id, moment.defaultOptionId)

    const state = useGameStore.getState()
    expect(state.livePlayback.phase).toBe('result')
    expect(state.livePlayback.resultMomentId).toBe(moment.id)
    expect(state.world?.lastMatch?.status).toBe('live')
    expect(state.world?.week).toBe(week)
    expect(week).toBe(useGameStore.getState().world?.week)
  })

  it('最后一条回合结束后仍为 live，finishLiveMatch 才终场并推进周次', async () => {
    await createLiveCareer()
    const week = useGameStore.getState().world!.week

    await playToEnd()

    expect(useGameStore.getState().livePlayback.phase).toBe('ended')
    expect(useGameStore.getState().world?.lastMatch?.status).toBe('live')
    expect(useGameStore.getState().world?.week).toBe(week)

    saveWorldMock.mockClear()
    await useGameStore.getState().finishLiveMatch()

    const state = useGameStore.getState()
    expect(state.world?.week).toBe(week + 1)
    expect(state.lastTurn?.match?.status).toBe('final')
    expect(state.livePlayback.phase).toBe('idle')
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })
})

describe('live playback persistence', () => {
  it('播放中 tick 不写库，关键回合结算与完成比赛各只写库一次', async () => {
    await createLiveCareer()
    saveWorldMock.mockClear()

    for (let index = 0; index < 3 && useGameStore.getState().livePlayback.phase === 'playing'; index += 1) {
      useGameStore.getState().tickLiveMatch()
    }
    useGameStore.getState().jumpToNextKeyMoment()
    expect(saveWorldMock).not.toHaveBeenCalled()

    const moment = nextPending()!
    await useGameStore.getState().resolveKeyMoment(moment.id, moment.defaultOptionId)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)

    await playToEnd()
    saveWorldMock.mockClear()
    await useGameStore.getState().finishLiveMatch()

    expect(saveWorldMock).toHaveBeenCalledTimes(1)
    expect(await listSaves()).toHaveLength(1)
  })

  it('刷新后从最近一次关键回合结算点重放，终场报告哈希一致', async () => {
    await createLiveCareer()
    useGameStore.getState().jumpToNextKeyMoment()
    const first = nextPending()!
    await useGameStore.getState().resolveKeyMoment(first.id, first.defaultOptionId)
    const saveId = useGameStore.getState().saveId!
    const checkpoint = structuredClone(useGameStore.getState().world!)

    autoResolveKeyMoments(checkpoint)
    const expected = finalizeMatchday(checkpoint)!

    expect(await useGameStore.getState().loadGame(saveId)).toBe(true)
    useGameStore.getState().startLivePlayback()
    await playToEnd()
    expect(useGameStore.getState().livePlayback.phase).toBe('ended')

    await useGameStore.getState().finishLiveMatch()
    const actual = useGameStore.getState().lastTurn?.match

    expect(actual).toBeTruthy()
    expect(hashState(actual)).toBe(hashState(expected))
  })
})

describe('live playback speed', () => {
  it('速度切换不改变引擎结果，只改变播放节奏', async () => {
    await createLiveCareer()
    const base = structuredClone(useGameStore.getState().world!)

    useGameStore.setState({ world: structuredClone(base), livePlayback: IDLE_PLAYBACK })
    useGameStore.getState().startLivePlayback()
    useGameStore.getState().setLiveSpeed(1)
    for (let index = 0; index < 3; index += 1) useGameStore.getState().tickLiveMatch()
    const slow = structuredClone(useGameStore.getState().world!.lastMatch)

    useGameStore.setState({ world: structuredClone(base), livePlayback: IDLE_PLAYBACK })
    useGameStore.getState().startLivePlayback()
    useGameStore.getState().setLiveSpeed(4)
    expect(useGameStore.getState().livePlayback.speed).toBe(4)
    for (let index = 0; index < 3; index += 1) useGameStore.getState().tickLiveMatch()
    const fast = structuredClone(useGameStore.getState().world!.lastMatch)

    expect(hashState(fast)).toBe(hashState(slow))
  })
})

describe('live playback guards', () => {
  it('尚未到 90 分钟或仍有回合时 finishLiveMatch 拒绝提前结算', async () => {
    await createLiveCareer()
    const week = useGameStore.getState().world!.week
    saveWorldMock.mockClear()

    await useGameStore.getState().finishLiveMatch()

    expect(useGameStore.getState().error).toBeTruthy()
    expect(useGameStore.getState().world?.week).toBe(week)
    expect(saveWorldMock).not.toHaveBeenCalled()

    useGameStore.getState().jumpToNextKeyMoment()
    useGameStore.getState().setError(null)
    await useGameStore.getState().finishLiveMatch()

    expect(useGameStore.getState().error).toBeTruthy()
    expect(useGameStore.getState().world?.week).toBe(week)
  })

  it('重复 tick 不会重复计分或重复写入事件', async () => {
    await createLiveCareer()
    useGameStore.getState().jumpToNextKeyMoment()
    const before = hashState(useGameStore.getState().world!.lastMatch)
    const revision = useGameStore.getState().livePlayback.revision

    useGameStore.getState().tickLiveMatch()

    expect(hashState(useGameStore.getState().world!.lastMatch)).toBe(before)
    expect(useGameStore.getState().livePlayback.revision).toBe(revision)

    const moment = nextPending()!
    await useGameStore.getState().resolveKeyMoment(moment.id, moment.defaultOptionId)
    const afterResolve = hashState(useGameStore.getState().world!.lastMatch)
    const resultRevision = useGameStore.getState().livePlayback.revision

    useGameStore.getState().tickLiveMatch()

    expect(hashState(useGameStore.getState().world!.lastMatch)).toBe(afterResolve)
    expect(useGameStore.getState().livePlayback.revision).toBe(resultRevision)
  })
})
