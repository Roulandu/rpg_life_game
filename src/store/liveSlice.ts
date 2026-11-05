import { advanceLiveMinute } from '../engine'
import type { LiveMinuteResult } from '../engine'
import type { MatchReport, WorldState } from '../domain'
import {
  IDLE_PLAYBACK,
  LIVE_SPEEDS,
  historyWith,
  playbackFor,
  progressOf,
  shouldPersistTick,
  type LivePhase,
  type LivePlayback,
  type LiveSpeed,
} from './livePlayback'
import { persist } from './helpers'
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
    carrierId: result.carrierId ?? null,
    track: result.steps,
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

/** 播放中的落盘不改动世界内容，只把最新分钟写下去；这里不能碰 updatedAt，否则重放哈希会漂。 */
async function persistTick(set: StoreSet, get: StoreGet, world: WorldState): Promise<void> {
  const saved = await persist(world, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
}

async function tickLiveMatch(set: StoreSet, get: StoreGet): Promise<void> {
  const state = get()
  const world = state.world
  if (!world || state.livePlayback.phase !== 'playing') return
  const report = world.lastMatch
  if (!report) return
  const before = progressOf(report)
  const result = advanceLiveMinute(world)
  if (!result) return
  const phase: LivePhase = result.finished ? 'ended' : result.paused ? 'awaiting' : 'playing'
  set({ world: { ...world }, livePlayback: { ...advancedFrame(state.livePlayback, result), phase } })
  if (shouldPersistTick(before, result, report)) await persistTick(set, get, world)
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

function jumpFrames(world: WorldState, start: LivePlayback): { playback: LivePlayback; phase: LivePhase } {
  let playback = start
  for (let guard = 0; guard < 180; guard += 1) {
    const result = advanceLiveMinute(world)
    if (!result) return { playback, phase: 'idle' }
    playback = advancedFrame(playback, result)
    if (result.paused) return { playback, phase: 'awaiting' }
    if (result.finished) return { playback, phase: 'ended' }
  }
  return { playback, phase: 'playing' }
}

async function jumpToNextKeyMoment(set: StoreSet, get: StoreGet): Promise<void> {
  const state = get()
  const world = state.world
  const running = state.livePlayback.phase === 'playing' || state.livePlayback.phase === 'paused'
  if (!world || !running) return
  const startedAt = world.lastMatch?.currentMinute ?? -1
  const jumped = jumpFrames(world, state.livePlayback)
  set({ world: { ...world }, livePlayback: { ...jumped.playback, phase: jumped.phase } })
  if ((world.lastMatch?.currentMinute ?? -1) > startedAt) await persistTick(set, get, world)
}

function resumedPlayback(
  playback: LivePlayback,
  report: MatchReport | null | undefined,
): LivePlayback {
  const state = report?.liveState
  return {
    ...playback,
    phase: report && report.currentMinute >= 90 ? 'ended' : 'playing',
    possession: state?.possession ?? playback.possession,
    ballX: state?.ballX ?? playback.ballX,
    carrierId: state?.carrierId ?? null,
    track: [],
    resultMomentId: null,
    revision: playback.revision + 1,
  }
}

function continueAfterMoment(set: StoreSet, get: StoreGet): void {
  const state = get()
  const playback = state.livePlayback
  if (playback.phase !== 'result') return
  set({ livePlayback: resumedPlayback(playback, state.world?.lastMatch) })
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
