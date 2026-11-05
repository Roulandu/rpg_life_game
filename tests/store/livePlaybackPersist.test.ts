/** fixtures/liveStore 里的 vi.mock('../../src/db') 必须最先加载，否则 store 会绑到真实 saveWorld，计数恒为 0。 */
import { createLiveCareer, nextPending, saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine'
import { useGameStore } from '../../src/store/gameStore'
import { hashState } from '../../src/lib/rng'
import { playToEnd } from '../fixtures/livePlaybackFlow'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** tick 之后「该不该落盘」的判定：与实现共用同一组事实（分钟、事件数、比分、停表）。 */
function shouldWrite(
  before: { minute: number; events: number; homeGoals: number; awayGoals: number },
  result: { minute: number; events: number; homeGoals: number; awayGoals: number },
  stillPlaying: boolean,
): boolean {
  return (
    !stillPlaying ||
    result.minute % 5 === 0 ||
    result.events !== before.events ||
    result.homeGoals !== before.homeGoals ||
    result.awayGoals !== before.awayGoals
  )
}

function progressOf() {
  const report = useGameStore.getState().world!.lastMatch!
  return {
    minute: report.currentMinute,
    events: report.events.length,
    homeGoals: report.homeGoals,
    awayGoals: report.awayGoals,
  }
}

describe('live playback tick persistence', () => {
  it('回归: tick 只在每 5 分钟、比分或事件变化、暂停与终场时写库', async () => {
    await createLiveCareer()
    saveWorldMock.mockClear()

    const decisions: boolean[] = []
    for (let index = 0; index < 40 && useGameStore.getState().livePlayback.phase === 'playing'; index += 1) {
      const before = progressOf()
      const calls = saveWorldMock.mock.calls.length
      await useGameStore.getState().tickLiveMatch()
      const result = progressOf()
      const expected = shouldWrite(before, result, useGameStore.getState().livePlayback.phase === 'playing')
      decisions.push(expected)
      expect(saveWorldMock.mock.calls.length - calls).toBe(expected ? 1 : 0)
      expect(result.minute).toBe(before.minute + 1)
    }

    expect(decisions).toContain(true)
    expect(decisions).toContain(false)
  })

  it('刷新后从最近一次落盘分钟重放，终场报告哈希一致', async () => {
    await createLiveCareer()
    await useGameStore.getState().jumpToNextKeyMoment()
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
