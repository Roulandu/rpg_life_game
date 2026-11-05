import type { Id, LiveTrackStep, MatchReport, MatchSide, WorldState } from '../domain'

export type LiveSpeed = 1 | 2 | 4

export type LivePhase = 'idle' | 'playing' | 'paused' | 'awaiting' | 'result' | 'ended'

export const LIVE_SPEEDS: LiveSpeed[] = [1, 2, 4]

export const SPEED_INTERVAL_MS: Record<LiveSpeed, number> = { 1: 500, 2: 250, 4: 120 }

export interface LiveFrame {
  minute: number
  possession: MatchSide
  ballX: number
}

export interface LivePlayback {
  fixtureId: Id | null
  phase: LivePhase
  speed: LiveSpeed
  possession: MatchSide
  ballX: number
  carrierId: Id | null
  track: LiveTrackStep[]
  history: LiveFrame[]
  resultMomentId: string | null
  revision: number
}

export const IDLE_PLAYBACK: LivePlayback = {
  fixtureId: null,
  phase: 'idle',
  speed: 1,
  possession: 'home',
  ballX: 0.5,
  carrierId: null,
  track: [],
  history: [],
  resultMomentId: null,
  revision: 0,
}

export function historyWith(history: LiveFrame[], frame: LiveFrame): LiveFrame[] {
  return [...history, frame].slice(-5)
}

export function playbackPhaseFor(report: MatchReport | undefined): LivePhase {
  if (!report || report.status !== 'live') return 'idle'
  if (report.currentMinute >= 90) return 'ended'
  const pending = (report.keyMoments ?? []).find((moment) => !moment.outcome)
  if (pending && pending.minute <= report.currentMinute) return 'awaiting'
  return 'playing'
}

export function playbackFor(world: WorldState | null): LivePlayback {
  const report = world?.lastMatch
  if (!report || report.status !== 'live') return IDLE_PLAYBACK
  return {
    ...IDLE_PLAYBACK,
    fixtureId: report.fixtureId,
    phase: playbackPhaseFor(report),
    possession: report.liveState?.possession ?? 'home',
    ballX: report.liveState?.ballX ?? 0.5,
    carrierId: report.liveState?.carrierId ?? null,
  }
}

/** 每一分钟都落盘会把写入放大 90 倍；超过这个间隔仍要等比分或事件变化才写。 */
const TICK_PERSIST_MINUTES = 5

export interface LiveProgress {
  minute: number
  events: number
  homeGoals: number
  awayGoals: number
}

export function progressOf(report: MatchReport): LiveProgress {
  return {
    minute: report.currentMinute,
    events: report.events.length,
    homeGoals: report.homeGoals,
    awayGoals: report.awayGoals,
  }
}

/** 不写库的 tick 会让刷新回退到上一次落盘的分钟，所以停表、终场、比分与事件变化都必须落盘。 */
export function shouldPersistTick(
  before: LiveProgress,
  result: { paused: boolean; finished: boolean },
  report: MatchReport,
): boolean {
  if (result.paused || result.finished) return true
  if (report.currentMinute % TICK_PERSIST_MINUTES === 0) return true
  const now = progressOf(report)
  return (
    now.events !== before.events ||
    now.homeGoals !== before.homeGoals ||
    now.awayGoals !== before.awayGoals
  )
}
