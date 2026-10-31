import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useLiveClock } from '../../src/ui/screens/matchday/useLiveClock'
import { useGameStore } from '../../src/store/gameStore'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'
import { liveKickoffWorld } from './matchdayWorld'
import { resetUiStore } from './resetStore'

beforeEach(() => {
  vi.useFakeTimers()
  resetUiStore()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useLiveClock', () => {
  it('按速度档间隔推进比赛，卸载后停止计时', () => {
    useGameStore.setState({
      world: liveKickoffWorld(),
      hydrated: true,
      livePlayback: { ...IDLE_PLAYBACK, fixtureId: 'live', phase: 'playing', speed: 4 },
    })
    const { unmount } = renderHook(() => useLiveClock())

    act(() => vi.advanceTimersByTime(240))

    expect(useGameStore.getState().world?.lastMatch?.currentMinute).toBe(2)

    unmount()
    act(() => vi.advanceTimersByTime(240))
    expect(useGameStore.getState().world?.lastMatch?.currentMinute).toBe(2)
  })

  it('暂停或等待选择时不推进比赛', () => {
    useGameStore.setState({
      world: liveKickoffWorld(),
      hydrated: true,
      livePlayback: { ...IDLE_PLAYBACK, fixtureId: 'live', phase: 'paused', speed: 1 },
    })
    renderHook(() => useLiveClock())

    act(() => vi.advanceTimersByTime(2000))

    expect(useGameStore.getState().world?.lastMatch?.currentMinute).toBe(0)
  })
})
