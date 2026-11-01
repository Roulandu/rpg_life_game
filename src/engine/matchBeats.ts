import { positionGroup } from '../domain'
import type {
  BeatKind,
  Club,
  Id,
  LiveTrackStep,
  MatchEventLine,
  MatchLineupPlayer,
  MatchLineups,
  MatchLiveState,
  MatchSide,
  MatchStatLine,
} from '../domain'
import { createRng } from '../lib'
import { beatText, goalShotText, saveText } from './data/beatTexts'
import { buildSpell, type SpellShot } from './liveSpell'
import { expectedGoals } from './matchGoals'

export interface BeatInput {
  seed: number
  fixtureId: string
  minute: number
  homeStrength: Club['strength']
  awayStrength: Club['strength']
  homeName: string
  awayName: string
  lineups?: MatchLineups
  homeXg?: number
  awayXg?: number
  previous?: MatchLiveState | null
  momentum?: Partial<Record<MatchSide, number>>
}

export interface BeatResult {
  possession: MatchSide
  ballX: number
  carrierId?: Id
  steps: LiveTrackStep[]
  goalSide?: MatchSide
  shot?: SpellShot
  liveState: MatchLiveState
  events: MatchEventLine[]
  stats: { home: Partial<MatchStatLine>; away: Partial<MatchStatLine> }
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

function teamName(input: BeatInput, side: MatchSide): string {
  return side === 'home' ? input.homeName : input.awayName
}

function otherSide(side: MatchSide): MatchSide {
  return side === 'home' ? 'away' : 'home'
}

function textContext(input: BeatInput, side: MatchSide, player: string) {
  return { player, team: teamName(input, side), opponent: teamName(input, otherSide(side)) }
}

function carrierActor(
  input: BeatInput,
  side: MatchSide,
  carrierId: Id | undefined,
): MatchLineupPlayer | null {
  const found = (input.lineups?.[side] ?? []).find((player) => player.id === carrierId)
  return found ?? pickActor({
    lineups: input.lineups,
    side,
    defending: false,
    seed: input.seed,
    fixtureId: input.fixtureId,
    minute: input.minute,
  })
}

function shotLines(input: BeatInput, shot: SpellShot, variant: number): MatchEventLine[] {
  const actor = carrierActor(input, shot.side, shot.carrierId)
  const context = textContext(input, shot.side, actor?.name ?? teamName(input, shot.side))
  return [{
    minute: input.minute,
    type: 'shot',
    side: shot.side,
    isUser: actor?.isUser ?? false,
    text: shot.goal ? goalShotText(context, variant) : beatText('shot', context, shot.onTarget, variant),
  }]
}

function saveLine(
  input: BeatInput,
  side: MatchSide,
  carrierId: Id | undefined,
  variant: number,
): MatchEventLine {
  const actor = carrierActor(input, side, carrierId)
  return {
    minute: input.minute,
    type: 'save',
    side: otherSide(side),
    isUser: false,
    text: saveText(textContext(input, side, actor?.name ?? teamName(input, side)), variant),
  }
}

function rareKind(roll: number): BeatKind | null {
  if (roll < 0.1) return 'attack'
  if (roll < 0.14) return 'corner'
  if (roll < 0.17) return 'foul'
  if (roll < 0.19) return 'offside'
  return null
}

function rareEvent(
  input: BeatInput,
  kind: BeatKind,
  possession: MatchSide,
  variant: number,
): { event: MatchEventLine; stats: Partial<MatchStatLine> } {
  const side = kind === 'foul' ? otherSide(possession) : possession
  const actor = pickActor({
    lineups: input.lineups,
    side,
    defending: kind === 'foul',
    seed: input.seed,
    fixtureId: input.fixtureId,
    minute: input.minute,
  })
  const context = textContext(input, side, actor?.name ?? teamName(input, side))
  return {
    event: {
      minute: input.minute,
      type: kind,
      side,
      isUser: actor?.isUser ?? false,
      text: beatText(kind, context, false, variant),
    },
    stats: kind === 'corner' ? { corners: 1 } : {},
  }
}

export function buildBeats(input: BeatInput): BeatResult {
  const spell = buildSpell({
    seed: input.seed,
    fixtureId: input.fixtureId,
    minute: input.minute,
    homeStrength: input.homeStrength,
    awayStrength: input.awayStrength,
    homeXg: input.homeXg ?? expectedGoals(input.homeStrength.attack, input.awayStrength.defense, true),
    awayXg: input.awayXg ?? expectedGoals(input.awayStrength.attack, input.homeStrength.defense, false),
    previous: input.previous,
    momentum: input.momentum,
    lineups: input.lineups,
  })
  const rng = createRng(input.seed, 'beats', input.fixtureId, input.minute)
  const stats: BeatResult['stats'] = {
    home: { possession: spell.possession === 'home' ? 1 : 0 },
    away: { possession: spell.possession === 'away' ? 1 : 0 },
  }
  const events: MatchEventLine[] = []
  const variant = rng.int(0, 2)

  if (spell.shot) {
    const side = spell.shot.side
    events.push(...shotLines(input, spell.shot, variant))
    if (!spell.shot.goal) {
      stats[side] = {
        ...stats[side],
        shots: 1,
        shotsOnTarget: spell.shot.onTarget ? 1 : 0,
      }
      if (spell.shot.onTarget) events.push(saveLine(input, side, spell.carrierId, variant))
    }
  } else {
    const kind = rareKind(rng.next())
    if (kind) {
      const rare = rareEvent(input, kind, spell.possession, variant)
      events.push(rare.event)
      const side = rare.event.side ?? spell.possession
      stats[side] = { ...stats[side], ...rare.stats }
    }
  }

  return { ...spell, events, stats }
}
