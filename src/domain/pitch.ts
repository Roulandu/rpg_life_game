import { clamp, positionGroup } from './attributes'
import { createRng } from '../lib'
import type { MatchLineupPlayer, MatchLineups, MatchSide } from './matchTypes'
import type { Position } from './types'

export interface PitchPoint {
  x: number
  y: number
}

export interface PitchPlayer extends PitchPoint {
  id: string
  name: string
  number: number
  position: Position
  side: MatchSide
  isUser: boolean
  hasBall: boolean
}

export interface PitchHistoryPoint {
  minute: number
  ballX: number
}

export interface PitchFrameInput {
  seed: number
  fixtureId: string
  minute: number
  lineups: MatchLineups
  possession: MatchSide
  ballX: number
  history?: PitchHistoryPoint[]
}

export interface PitchFrame {
  minute: number
  home: PitchPlayer[]
  away: PitchPlayer[]
  ball: PitchPoint
  possession: MatchSide
  trails: PitchPoint[]
}

type Line = 'GK' | 'DEF' | 'MID' | 'FWD'

const SLOTS: Record<Line, { x: number; ys: number[] }> = {
  GK: { x: 0.06, ys: [0.5] },
  DEF: { x: 0.24, ys: [0.16, 0.38, 0.62, 0.84] },
  MID: { x: 0.4, ys: [0.18, 0.4, 0.6, 0.82] },
  FWD: { x: 0.46, ys: [0.38, 0.62] },
}

function ballPoint(seed: number, fixtureId: string, minute: number, ballX: number): PitchPoint {
  const rng = createRng(seed, 'pitch', fixtureId, minute, 'ball')
  return {
    x: clamp(ballX, 0.02, 0.98),
    y: rng.float(0.18, 0.82),
  }
}

interface PlayerPointInput {
  seed: number
  fixtureId: string
  minute: number
  side: MatchSide
  index: number
  slotIndex: number
  group: Line
}

function playerPoint(input: PlayerPointInput): PitchPoint {
  const { seed, fixtureId, minute, side, index, slotIndex, group } = input
  const rng = createRng(seed, 'pitch', fixtureId, minute, side, index)
  const slot = SLOTS[group]
  const y = clamp((slot.ys[Math.min(slotIndex, slot.ys.length - 1)] ?? 0.5) + rng.float(-0.04, 0.04), 0.05, 0.95)
  const x = side === 'home'
    ? clamp(slot.x + rng.float(-0.03, 0.03), 0.02, 0.48)
    : clamp(1 - slot.x + rng.float(-0.03, 0.03), 0.52, 0.98)
  return { x, y }
}

function sidePlayers(
  input: PitchFrameInput,
  side: MatchSide,
  lineup: MatchLineupPlayer[],
): PitchPlayer[] {
  const groupIndex: Record<Line, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  return lineup.map((player, index) => {
    const group = positionGroup(player.position)
    const slotIndex = groupIndex[group]
    groupIndex[group] += 1
    const point = playerPoint({
      seed: input.seed,
      fixtureId: input.fixtureId,
      minute: input.minute,
      side,
      index,
      slotIndex,
      group,
    })
    return {
      ...point,
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      side,
      isUser: player.isUser,
      hasBall: false,
    }
  })
}

function markBallCarrier(players: PitchPlayer[], ball: PitchPoint): void {
  let closest: PitchPlayer | null = null
  let closestDistance = Number.POSITIVE_INFINITY
  for (const player of players) {
    const distance = (player.x - ball.x) ** 2 + (player.y - ball.y) ** 2
    if (distance < closestDistance) {
      closest = player
      closestDistance = distance
    }
  }
  if (closest) closest.hasBall = true
}

export function buildPitchFrame(input: PitchFrameInput): PitchFrame {
  const ball = ballPoint(input.seed, input.fixtureId, input.minute, input.ballX)
  const home = sidePlayers(input, 'home', input.lineups.home)
  const away = sidePlayers(input, 'away', input.lineups.away)
  markBallCarrier(input.possession === 'home' ? home : away, ball)
  const trails = (input.history ?? [])
    .slice(-4)
    .map((point) => ballPoint(input.seed, input.fixtureId, point.minute, point.ballX))
  return {
    minute: input.minute,
    home,
    away,
    ball,
    possession: input.possession,
    trails,
  }
}
