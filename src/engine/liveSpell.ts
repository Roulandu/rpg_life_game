import { clamp, onPitchAt, positionGroup } from '../domain'
import type {
  Club,
  Id,
  LiveTrackStep,
  MatchLineups,
  MatchLiveState,
  MatchSide,
} from '../domain'
import { createRng, type Rng } from '../lib'

export interface SpellInput {
  seed: number
  fixtureId: string
  minute: number
  homeStrength: Club['strength']
  awayStrength: Club['strength']
  homeXg: number
  awayXg: number
  previous?: MatchLiveState | null
  momentum?: Partial<Record<MatchSide, number>>
  lineups?: MatchLineups
  /** 主角登场分钟；默认 0 表示首发或非用户比赛。 */
  userEntryMinute?: number
}

export interface SpellShot {
  side: MatchSide
  onTarget: boolean
  goal: boolean
  carrierId?: Id
}

export interface SpellResult {
  possession: MatchSide
  ballX: number
  carrierId?: Id
  steps: LiveTrackStep[]
  goalSide?: MatchSide
  shot?: SpellShot
  liveState: MatchLiveState
}

export function homePossessionShare(
  home: Club['strength'],
  away: Club['strength'],
): number {
  return clamp(0.5 + (home.midfield - away.midfield) * 0.004 + 0.02, 0.3, 0.7)
}

export function kickoffState(possession: MatchSide): MatchLiveState {
  return { possession, ballX: 0.5 }
}

export function momentState(possession: MatchSide): MatchLiveState {
  return { possession, ballX: possession === 'home' ? 0.82 : 0.18 }
}

export function goalState(scorer: MatchSide): MatchLiveState {
  return {
    possession: scorer,
    ballX: scorer === 'home' ? 0.96 : 0.04,
    pendingKickoff: scorer === 'home' ? 'away' : 'home',
  }
}

export function otherSide(side: MatchSide): MatchSide {
  return side === 'home' ? 'away' : 'home'
}

function stayProbability(share: number, possession: MatchSide): number {
  const edge = possession === 'home' ? share - 0.5 : 0.5 - share
  return clamp(0.77 + edge * 0.5, 0.64, 0.83)
}

function pickCarrier(input: SpellInput, side: MatchSide, rng: Rng): Id | undefined {
  const entry = input.userEntryMinute ?? 0
  const players = (input.lineups?.[side] ?? []).filter((player) => onPitchAt(player, entry, input.minute))
  const attackers = players.filter((player) => {
    const group = positionGroup(player.position)
    return group === 'FWD' || group === 'MID'
  })
  const pool = attackers.length > 0 ? attackers : players
  return pool.length > 0 ? rng.pick(pool).id : undefined
}

interface MovementInput {
  rng: Rng
  spell: SpellInput
  side: MatchSide
  startX: number
  turnover: boolean
}

interface MovementResult {
  ballX: number
  carrierId?: Id
  steps: LiveTrackStep[]
}

function buildMovement(input: MovementInput): MovementResult {
  const { rng, side } = input
  const direction = side === 'home' ? 1 : -1
  const steps: LiveTrackStep[] = []
  let ballX = input.startX
  if (input.turnover) {
    steps.push({
      kind: 'turnover',
      side,
      ballX,
      carrierId: pickCarrier(input.spell, side, rng),
    })
  }
  const moves = Math.min(rng.int(1, 3), 3 - steps.length)
  for (let index = 0; index < moves; index += 1) {
    const backward = rng.chance(0.18)
    const distance = backward ? -rng.float(0.03, 0.09) : rng.float(0.04, 0.18)
    ballX = clamp(ballX + direction * distance, 0.03, 0.97)
    steps.push({
      kind: rng.chance(0.3) ? 'carry' : 'pass',
      side,
      ballX,
      carrierId: pickCarrier(input.spell, side, rng),
    })
  }
  return { ballX, carrierId: steps.at(-1)?.carrierId, steps }
}

function decideShot(
  input: SpellInput,
  possession: MatchSide,
  share: number,
  rng: Rng,
): SpellShot | undefined {
  const xg = possession === 'home' ? input.homeXg : input.awayXg
  const momentum = input.momentum?.[possession] ?? 1
  const goalChance = clamp((xg / 90 / Math.max(0.35, share)) * momentum, 0, 0.35)
  const goal = rng.chance(goalChance)
  if (!goal && !rng.chance(0.12)) return undefined
  return {
    side: possession,
    onTarget: goal || rng.chance(0.38),
    goal,
  }
}

interface PossessionPlan {
  possession: MatchSide
  turnover: boolean
  startX: number
}

function resolvePossession(input: SpellInput, share: number, rng: Rng): PossessionPlan {
  const previous = input.previous ?? null
  if (previous?.pendingKickoff) {
    return { possession: previous.pendingKickoff, turnover: false, startX: 0.5 }
  }
  const baseSide = previous?.possession ?? (rng.chance(share) ? 'home' : 'away')
  const turnover = previous != null && !rng.chance(stayProbability(share, baseSide))
  return {
    possession: turnover ? otherSide(baseSide) : baseSide,
    turnover,
    startX: previous?.ballX ?? 0.5,
  }
}

function goalLineX(side: MatchSide): number {
  return side === 'home' ? 0.96 : 0.04
}

interface AppliedShot {
  ballX: number
  steps: LiveTrackStep[]
  carrierId?: Id
  liveState: MatchLiveState
}

function applyShot(possession: MatchSide, movement: MovementResult, shot: SpellShot | undefined): AppliedShot {
  const steps = movement.steps
  let ballX = movement.ballX
  const last = steps.at(-1)
  if (shot && last) {
    last.kind = 'shot'
    if (shot.goal) {
      ballX = goalLineX(possession)
      last.ballX = ballX
    }
    shot.carrierId = last.carrierId
  } else if (shot) {
    ballX = goalLineX(possession)
    steps.push({ kind: 'shot', side: possession, ballX })
  }
  const carrierId = steps.at(-1)?.carrierId
  const liveState: MatchLiveState = shot?.goal
    ? { ...goalState(possession), carrierId }
    : { possession, ballX, carrierId }
  return { ballX, steps, carrierId, liveState }
}

export function buildSpell(input: SpellInput): SpellResult {
  const share = homePossessionShare(input.homeStrength, input.awayStrength)
  const plan = resolvePossession(
    input,
    share,
    createRng(input.seed, 'spell', input.fixtureId, input.minute),
  )
  const movement = buildMovement({
    rng: createRng(input.seed, 'move', input.fixtureId, input.minute),
    spell: input,
    side: plan.possession,
    startX: plan.startX,
    turnover: plan.turnover,
  })
  const shareForSide = plan.possession === 'home' ? share : 1 - share
  const shot = decideShot(
    input,
    plan.possession,
    shareForSide,
    createRng(input.seed, 'chance', input.fixtureId, input.minute),
  )
  const applied = applyShot(plan.possession, movement, shot)
  return {
    possession: plan.possession,
    ballX: applied.ballX,
    carrierId: applied.carrierId,
    steps: applied.steps,
    goalSide: shot?.goal ? plan.possession : undefined,
    shot,
    liveState: applied.liveState,
  }
}
