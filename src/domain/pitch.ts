import { createRng } from '../lib'
import { clamp, positionGroup } from './attributes'
import type { MatchLineups, MatchSide } from './matchTypes'
import {
  attackDirection,
  goalkeeperX,
  laneY,
  shapePoint,
  type PitchLine,
  type PitchPoint,
} from './pitchShape'
import type { Position } from './types'

export type { PitchPoint } from './pitchShape'

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
  possession?: MatchSide
}

export interface PitchFrameInput {
  seed: number
  fixtureId: string
  minute: number
  lineups: MatchLineups
  possession: MatchSide
  ballX: number
  carrierId?: string | null
  goalSide?: MatchSide
  history?: PitchHistoryPoint[]
}

export interface PitchFrame {
  minute: number
  home: PitchPlayer[]
  away: PitchPlayer[]
  ball: PitchPoint
  possession: MatchSide
  trails: PitchPoint[]
  passPath: PitchPoint[]
  carrierId: string | null
  goalSide?: MatchSide
}

function sidePlayers(input: PitchFrameInput, side: MatchSide): PitchPlayer[] {
  const rng = createRng(input.seed, 'pitch', input.fixtureId, input.minute, side)
  const groupIndex: Record<PitchLine, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  return input.lineups[side].map((player) => {
    const group = positionGroup(player.position) as PitchLine
    const slotIndex = groupIndex[group]
    groupIndex[group] += 1
    const point = group === 'GK'
      ? {
          x: goalkeeperX(side, input.ballX, rng.float(-0.004, 0.004)),
          y: clamp(0.5 + rng.float(-0.02, 0.02), 0.06, 0.94),
        }
      : shapePoint({
          side,
          group,
          slotIndex,
          possession: input.possession,
          ballX: input.ballX,
          jitterX: rng.float(-0.018, 0.018),
          jitterY: rng.float(-0.02, 0.02),
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

function pickCarrier(
  input: PitchFrameInput,
  side: MatchSide,
  players: PitchPlayer[],
): PitchPlayer | null {
  if (players.length === 0) return null
  const requested = input.carrierId
    ? players.find((player) => player.id === input.carrierId)
    : undefined
  if (requested) return requested
  const attackers = players.filter((player) => {
    const group = positionGroup(player.position)
    return group === 'FWD' || group === 'MID'
  })
  const pool = attackers.length > 0 ? attackers : players
  return createRng(input.seed, 'pitch-carrier', input.fixtureId, input.minute, side).pick(pool)
}

function attachBall(
  carrier: PitchPlayer | null,
  ballX: number,
  lane: number,
): PitchPoint {
  if (!carrier) return { x: clamp(ballX, 0.02, 0.98), y: lane }
  const direction = attackDirection(carrier.side)
  const x = clamp(ballX - direction * 0.012, 0.02, 0.98)
  carrier.x = x
  carrier.y = lane
  carrier.hasBall = true
  return { x: clamp(x + direction * 0.012, 0.01, 0.99), y: lane }
}

function applyPressure(players: PitchPlayer[], ball: PitchPoint, defending: MatchSide): void {
  const outfield = players.filter((player) => positionGroup(player.position) !== 'GK')
  if (outfield.length === 0) return
  const closest = outfield.reduce((best, player) =>
    Math.hypot(player.x - ball.x, player.y - ball.y) <
    Math.hypot(best.x - ball.x, best.y - ball.y)
      ? player
      : best,
  )
  const goalSide = defending === 'home' ? -1 : 1
  closest.x = clamp(ball.x + goalSide * 0.04, 0.02, 0.98)
  closest.y = clamp(closest.y + (ball.y - closest.y) * 0.75, 0.06, 0.94)
}

function historicalPoints(input: PitchFrameInput): PitchPoint[] {
  return (input.history ?? []).slice(-4).map((point) => ({
    x: clamp(point.ballX, 0.02, 0.98),
    y: laneY(
      input.seed,
      input.fixtureId,
      point.minute,
      point.possession ?? input.possession,
    ),
  }))
}

function previousBallPoint(input: PitchFrameInput): PitchPoint | undefined {
  const previous = (input.history ?? [])
    .filter((point) => point.minute < input.minute)
    .at(-1)
  if (!previous) return undefined
  return {
    x: clamp(previous.ballX, 0.02, 0.98),
    y: laneY(
      input.seed,
      input.fixtureId,
      previous.minute,
      previous.possession ?? input.possession,
    ),
  }
}

function pathToBall(previous: PitchPoint | undefined, ball: PitchPoint): PitchPoint[] {
  if (!previous) return []
  const middle = {
    x: (previous.x + ball.x) / 2,
    y: clamp((previous.y + ball.y) / 2 + 0.035, 0.06, 0.94),
  }
  return [previous, middle, ball]
}

export function buildPitchFrame(input: PitchFrameInput): PitchFrame {
  const home = sidePlayers(input, 'home')
  const away = sidePlayers(input, 'away')
  const attacking = input.possession === 'home' ? home : away
  const defending = input.possession === 'home' ? away : home
  const carrier = pickCarrier(input, input.possession, attacking)
  const lane = laneY(input.seed, input.fixtureId, input.minute, input.possession)
  const ball = attachBall(carrier, input.ballX, lane)
  applyPressure(defending, ball, input.possession === 'home' ? 'away' : 'home')
  const trails = historicalPoints(input)
  return {
    minute: input.minute,
    home,
    away,
    ball,
    possession: input.possession,
    trails,
    passPath: pathToBall(previousBallPoint(input), ball),
    carrierId: carrier?.id ?? null,
    goalSide: input.goalSide,
  }
}
