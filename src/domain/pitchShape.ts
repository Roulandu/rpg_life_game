import { createRng } from '../lib'
import { clamp } from './attributes'
import type { MatchSide } from './matchTypes'

export type PitchLine = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface PitchPoint {
  x: number
  y: number
}

const BASE_X: Record<PitchLine, number> = {
  GK: 0.05,
  DEF: 0.24,
  MID: 0.44,
  FWD: 0.68,
}

const LANES: Record<PitchLine, number[]> = {
  GK: [0.5],
  DEF: [0.18, 0.4, 0.62, 0.82],
  MID: [0.18, 0.4, 0.62, 0.82],
  FWD: [0.36, 0.64],
}

export function attackDirection(side: MatchSide): 1 | -1 {
  return side === 'home' ? 1 : -1
}

export function toPitchX(side: MatchSide, normalized: number): number {
  return side === 'home' ? normalized : 1 - normalized
}

export function laneY(
  seed: number,
  fixtureId: string,
  minute: number,
  possession: MatchSide,
): number {
  const rng = createRng(seed, 'pitch-lane', fixtureId, minute, possession)
  return clamp(rng.float(0.22, 0.78), 0.22, 0.78)
}

export interface ShapePointInput {
  side: MatchSide
  group: PitchLine
  slotIndex: number
  possession: MatchSide
  ballX: number
  jitterX: number
  jitterY: number
}

const RETREAT_RATIO: Record<Exclude<PitchLine, 'GK'>, number> = {
  DEF: 0.45,
  MID: 0.7,
  FWD: 1,
}

export function shapePoint(input: ShapePointInput): PitchPoint {
  const direction = attackDirection(input.side)
  const push = (input.ballX - 0.5) * 0.22 * direction
  const attacking = input.side === input.possession
  const ballDistance = input.side === 'home' ? input.ballX : 1 - input.ballX
  const normalized = input.group === 'GK'
    ? BASE_X.GK
    : attacking
      ? clamp(BASE_X[input.group] + push + 0.06 + input.jitterX, 0.03, 0.96)
      : clamp(Math.max(0.065, ballDistance * RETREAT_RATIO[input.group]) + input.jitterX, 0.04, 0.96)
  const width = attacking ? 0.94 : 0.68
  const lanes = LANES[input.group]
  const baseY = lanes[Math.min(input.slotIndex, lanes.length - 1)] ?? 0.5
  return {
    x: clamp(toPitchX(input.side, normalized), 0.02, 0.98),
    y: clamp(0.5 + (baseY - 0.5) * width + input.jitterY, 0.06, 0.94),
  }
}

export function goalkeeperX(side: MatchSide, ballX: number, jitter: number): number {
  const value = side === 'home'
    ? 0.045 + ballX * 0.02
    : 0.955 - (1 - ballX) * 0.02
  return clamp(value + jitter, 0.025, 0.975)
}
