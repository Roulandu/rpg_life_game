import { clamp, positionGroup } from '../domain'
import type {
  BeatKind,
  Club,
  MatchEventLine,
  MatchLineupPlayer,
  MatchLineups,
  MatchSide,
  MatchStatLine,
} from '../domain'
import { createRng } from '../lib'
import { beatText } from './data/beatTexts'

export interface BeatInput {
  seed: number
  fixtureId: string
  minute: number
  homeStrength: Club['strength']
  awayStrength: Club['strength']
  homeName: string
  awayName: string
  lineups?: MatchLineups
}

export interface BeatResult {
  possession: MatchSide
  ballX: number
  events: MatchEventLine[]
  stats: { home: Partial<MatchStatLine>; away: Partial<MatchStatLine> }
}

interface BeatEventSpec {
  kind: BeatKind
  side: MatchSide
  onTarget: boolean
  stats: Partial<MatchStatLine>
}

function otherSide(side: MatchSide): MatchSide {
  return side === 'home' ? 'away' : 'home'
}

interface ActorInput {
  lineups: MatchLineups | undefined
  side: MatchSide
  defending: boolean
  seed: number
  fixtureId: string
  minute: number
}

function pickActor(input: ActorInput): MatchLineupPlayer | null {
  const players = input.lineups?.[input.side] ?? []
  const wanted = input.defending ? ['GK', 'DEF'] : ['FWD', 'MID']
  const candidates = players.filter((player) => wanted.includes(positionGroup(player.position)))
  if (candidates.length === 0) return null
  const rng = createRng(input.seed, 'beat-actor', input.fixtureId, input.minute, input.side, input.defending ? 'def' : 'att')
  return rng.pick(candidates)
}

function eventSpec(kind: BeatKind, possession: MatchSide, rng: ReturnType<typeof createRng>): BeatEventSpec {
  if (kind === 'shot') {
    const onTarget = rng.chance(0.42)
    return {
      kind,
      side: possession,
      onTarget,
      stats: { shots: 1, ...(onTarget ? { shotsOnTarget: 1 } : {}) },
    }
  }
  if (kind === 'corner') return { kind, side: possession, onTarget: false, stats: { corners: 1 } }
  if (kind === 'foul') {
    return { kind, side: otherSide(possession), onTarget: false, stats: {} }
  }
  return { kind, side: possession, onTarget: false, stats: {} }
}

function beatKind(roll: number): BeatKind | null {
  if (roll < 0.1) return 'shot'
  if (roll < 0.16) return 'corner'
  if (roll < 0.24) return 'attack'
  if (roll < 0.28) return 'foul'
  if (roll < 0.3) return 'offside'
  return null
}

export function buildBeats(input: BeatInput): BeatResult {
  const rng = createRng(input.seed, 'beats', input.fixtureId, input.minute)
  const homeShare = clamp(
    0.5 + (input.homeStrength.midfield - input.awayStrength.midfield) * 0.004 + 0.02,
    0.3,
    0.7,
  )
  const possession: MatchSide = rng.chance(homeShare) ? 'home' : 'away'
  const ballX = possession === 'home' ? rng.float(0.52, 0.94) : rng.float(0.06, 0.48)
  const stats: BeatResult['stats'] = { home: {}, away: {} }
  stats[possession] = { possession: 1 }
  const events: MatchEventLine[] = []

  const kind = beatKind(rng.next())
  if (!kind) return { possession, ballX, events, stats }

  const spec = eventSpec(kind, possession, rng)
  const teamName = spec.side === 'home' ? input.homeName : input.awayName
  const opponentName = spec.side === 'home' ? input.awayName : input.homeName
  const actor = pickActor({
    lineups: input.lineups,
    side: spec.side,
    defending: kind === 'foul',
    seed: input.seed,
    fixtureId: input.fixtureId,
    minute: input.minute,
  })
  events.push({
    minute: input.minute,
    type: spec.kind,
    side: spec.side,
    isUser: actor?.isUser ?? false,
    text: beatText(
      spec.kind,
      { player: actor?.name ?? teamName, team: teamName, opponent: opponentName },
      spec.onTarget,
      rng.int(0, 2),
    ),
  })
  stats[spec.side] = {
    ...stats[spec.side],
    ...spec.stats,
  }
  return { possession, ballX, events, stats }
}
