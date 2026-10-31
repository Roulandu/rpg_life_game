import { advanceLiveMinute } from '../engine'
import type { LiveMinuteResult } from '../engine'
import {
  IDLE_PLAYBACK,
  LIVE_SPEEDS,
  historyWith,
  playbackFor,
  type LivePhase,
  type LivePlayback,
  type LiveSpeed,
} from './livePlayback'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type LiveSlice = Pick<
  GameStore,
  | 'livePlayback'
  | 'startLivePlayback'
  | 'tickLiveMatch'
  | 'pauseLivePlayback'
  | 'resumeLivePlayback'
  | 'setLiveSpeed'
  | 'jumpToNextKeyMoment'
  | 'continueAfterMoment'
>

function advancedFrame(playback: LivePlayback, result: LiveMinuteResult): LivePlayback {
  return {
    ...playback,
    possession: result.possession,
    ballX: result.ballX,
    history: historyWith(playback.history, {
      minute: result.minute,
      possession: result.possession,
      ballX: result.ballX,
    }),
    revision: playback.revision + 1,
  }
}

function startLivePlayback(set: StoreSet, get: StoreGet): void {
  const world = get().world
  const report = world?.lastMatch
  if (!world || !report || report.status !== 'live') {
    set({ livePlayback: IDLE_PLAYBACK })
    return
  }
  if (get().livePlayback.fixtureId === report.fixtureId) return
  set({ livePlayback: playbackFor(world) })
}

function tickLiveMatch(set: StoreSet, get: StoreGet): void {
  const state = get()
  const world = state.world
  if (!world || state.livePlayback.phase !== 'playing') return
  const result = advanceLiveMinute(world)
  if (!result) return
  const phase: LivePhase = result.finished ? 'ended' : result.paused ? 'awaiting' : 'playing'
  set({ world: { ...world }, livePlayback: { ...advancedFrame(state.livePlayback, result), phase } })
}

function pauseLivePlayback(set: StoreSet, get: StoreGet): void {
  const playback = get().livePlayback
  if (playback.phase !== 'playing') return
  set({ livePlayback: { ...playback, phase: 'paused' } })
}

function resumeLivePlayback(set: StoreSet, get: StoreGet): void {
  const playback = get().livePlayback
  if (playback.phase !== 'paused') return
  set({ livePlayback: { ...playback, phase: 'playing' } })
}

function setLiveSpeed(set: StoreSet, get: StoreGet, speed: LiveSpeed): void {
  if (!LIVE_SPEEDS.includes(speed)) return
  const playback = get().livePlayback
  if (playback.speed === speed) return
  set({ livePlayback: { ...playback, speed } })
}

function jumpToNextKeyMoment(set: StoreSet, get: StoreGet): void {
  const state = get()
  const world = state.world
  if (!world || state.livePlayback.phase !== 'playing') return
  let playback = state.livePlayback
  let phase: LivePhase = 'playing'
  for (let guard = 0; guard < 180; guard += 1) {
    const result = advanceLiveMinute(world)
    if (!result) {
      phase = 'idle'
      break
    }
    playback = advancedFrame(playback, result)
    if (result.paused) {
      phase = 'awaiting'
      break
    }
    if (result.finished) {
      phase = 'ended'
      break
    }
  }
  set({ world: { ...world }, livePlayback: { ...playback, phase } })
}

function continueAfterMoment(set: StoreSet, get: StoreGet): void {
  const state = get()
  const playback = state.livePlayback
  if (playback.phase !== 'result') return
  const report = state.world?.lastMatch
  const phase: LivePhase = report && report.currentMinute >= 90 ? 'ended' : 'playing'
  set({
    livePlayback: {
      ...playback,
      phase,
      resultMomentId: null,
      revision: playback.revision + 1,
    },
  })
}

export const createLiveSlice: StoreSlice<LiveSlice> = (set, get) => ({
  livePlayback: IDLE_PLAYBACK,

  startLivePlayback: () => startLivePlayback(set, get),
  tickLiveMatch: () => tickLiveMatch(set, get),
  pauseLivePlayback: () => pauseLivePlayback(set, get),
  resumeLivePlayback: () => resumeLivePlayback(set, get),
  setLiveSpeed: (speed) => setLiveSpeed(set, get, speed),
  jumpToNextKeyMoment: () => jumpToNextKeyMoment(set, get),
  continueAfterMoment: () => continueAfterMoment(set, get),
})
