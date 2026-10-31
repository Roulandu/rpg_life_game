import type { Id, MatchReport, MatchSide, WorldState } from '../domain'

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
  if (pending && pending.minute === report.currentMinute) return 'awaiting'
  return 'playing'
}

export function playbackFor(world: WorldState | null): LivePlayback {
  const report = world?.lastMatch
  if (!report || report.status !== 'live') return IDLE_PLAYBACK
  return {
    ...IDLE_PLAYBACK,
    fixtureId: report.fixtureId,
    phase: playbackPhaseFor(report),
  }
}
