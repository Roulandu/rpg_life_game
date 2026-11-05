import { displayName, userEntryMinuteOf, onPitchAt } from '../domain'
import type {
  Id,
  KeyMoment,
  KeyMomentKind,
  LiveTrackStep,
  MatchEventLine,
  MatchLineupPlayer,
  MatchReport,
  MatchSide,
  MatchStatLine,
  Player,
  WorldState,
} from '../domain'
import { createRng } from '../lib'
import { contextFor, type MatchContext } from './liveSetup'
import { buildBeats } from './matchBeats'
import { pickAssister, pickScorer } from './matchGoals'
import { kickoffState, momentState } from './liveSpell'
import {
  addBeatStats,
  appendEvent,
  appendGoal,
  appendSubAppearance,
  buildGoalText,
  enterHalfTime,
} from './matchReport'

export interface LiveMinuteResult {
  minute: number
  paused: boolean
  finished: boolean
  halfTime: boolean
  possession: MatchSide
  ballX: number
  carrierId?: Id
  steps: LiveTrackStep[]
  goalSide?: MatchSide
  events: MatchEventLine[]
}

const ATTACKING_KINDS = new Set<KeyMomentKind>([
  'bigChance',
  'penalty',
  'throughBall',
  'freeKick',
  'oneOnOne',
  'counterAttack',
  'cross',
  'longShot',
])

function momentPossession(moment: KeyMoment, userSide: MatchSide): MatchSide {
  if (ATTACKING_KINDS.has(moment.kind)) return userSide
  return userSide === 'home' ? 'away' : 'home'
}

function momentumFor(report: MatchReport, minute: number): { user: number; opponent: number } {
  const resolved = (report.keyMoments ?? []).filter(
    (moment) => moment.outcome && moment.minute < minute,
  )
  const last = resolved.at(-1)
  if (!last?.outcome || minute - last.minute > 10) return { user: 1, opponent: 1 }
  const decay = 1 - (minute - last.minute) / 10
  return last.outcome.success
    ? { user: 1 + 0.15 * decay, opponent: 1 - 0.1 * decay }
    : { user: 1 - 0.1 * decay, opponent: 1 + 0.12 * decay }
}

interface CarrierInput {
  world: WorldState
  context: MatchContext
  side: MatchSide
  carrierId: Id | undefined
  minute: number
  entry: number
}

/** 持球人也要过分钟闸门：登场前的主角不能靠「上游把他标成持球人」绕过。 */
function carrierPlayer(input: CarrierInput): Player | null {
  const { world, context, side, carrierId, minute, entry } = input
  if (!carrierId) return null
  const lineup: MatchLineupPlayer | undefined = context.lineups[side].find(
    (player) => player.id === carrierId,
  )
  const player = world.players[carrierId]
  if (!lineup || !player) return null
  return onPitchAt(lineup, entry, minute) ? player : null
}

interface ScoredGoal {
  side: MatchSide
  minute: number
  carrierId?: Id
}

function scoreGoal(
  world: WorldState,
  report: MatchReport,
  context: MatchContext,
  scored: ScoredGoal,
): void {
  const { side, minute, carrierId } = scored
  const entry = userEntryMinuteOf(report)
  const rng = createRng(world.seed, 'goal', report.fixtureId, minute, side)
  const club = side === 'home' ? context.homeClub : context.awayClub
  const scorer = carrierPlayer({ world, context, side, carrierId, minute, entry }) ?? pickScorer({
    world,
    club,
    rng,
    userClubId: world.clubId,
    minute,
    userEntryMinute: entry,
    userPlayed: report.userPlayed,
  })
  const assist = pickAssister(
    {
      world,
      club,
      rng,
      userClubId: world.clubId,
      minute,
      userEntryMinute: entry,
      userPlayed: report.userPlayed,
    },
    scorer,
  )
  const goal = {
    minute,
    side,
    scorerId: scorer.id,
    scorerName: displayName(scorer),
    assistId: assist?.id,
    assistName: assist ? displayName(assist) : undefined,
    isUser: scorer.id === world.playerId,
    isUserAssist: assist?.id === world.playerId,
  }
  appendGoal(report, context.fixture, goal)
  appendEvent(report, {
    minute,
    type: 'goal',
    side,
    text: buildGoalText(report, goal),
    isUser: goal.isUser || goal.isUserAssist,
  })
}

function simulateMinute(
  world: WorldState,
  report: MatchReport,
  context: MatchContext,
  minute: number,
): LiveMinuteResult {
  const momentum = momentumFor(report, minute)
  const userHome = context.userSide === 'home'
  const beats = buildBeats({
    seed: world.seed,
    fixtureId: report.fixtureId,
    minute,
    homeStrength: context.homeStrength,
    awayStrength: context.awayStrength,
    homeName: report.homeName,
    awayName: report.awayName,
    lineups: context.lineups,
    homeXg: context.homeXg,
    awayXg: context.awayXg,
    previous: report.liveState,
    userEntryMinute: userEntryMinuteOf(report),
    momentum: {
      home: userHome ? momentum.user : momentum.opponent,
      away: userHome ? momentum.opponent : momentum.user,
    },
  })
  for (const event of beats.events) appendEvent(report, event)
  addBeatStats(report, beats.stats)
  if (beats.goalSide) {
    scoreGoal(world, report, context, { side: beats.goalSide, minute, carrierId: beats.carrierId })
  }

  report.currentMinute = minute
  report.liveState = beats.liveState
  appendSubAppearance(report, world.players[world.playerId], minute)
  return {
    minute,
    paused: false,
    finished: minute >= 90,
    halfTime: report.halfTimeHomeGoals != null,
    possession: beats.possession,
    ballX: beats.ballX,
    carrierId: beats.carrierId,
    steps: beats.steps,
    goalSide: beats.goalSide,
    events: beats.events,
  }
}

function pausedResult(
  report: MatchReport,
  minute: number,
  possession: MatchSide,
  ballX: number,
  carrierId?: Id,
): LiveMinuteResult {
  return {
    minute,
    paused: true,
    finished: false,
    halfTime: report.halfTimeHomeGoals != null,
    possession,
    ballX,
    carrierId,
    steps: [],
    events: [],
  }
}

function finishedResult(report: MatchReport): LiveMinuteResult {
  const state = report.liveState ?? kickoffState('home')
  return {
    minute: report.currentMinute,
    paused: false,
    finished: true,
    halfTime: report.halfTimeHomeGoals != null,
    possession: state.possession,
    ballX: state.ballX,
    carrierId: state.carrierId,
    steps: [],
    events: [],
  }
}

function possessionStats(possession: MatchSide): { home: Partial<MatchStatLine>; away: Partial<MatchStatLine> } {
  return possession === 'home'
    ? { home: { possession: 1 }, away: {} }
    : { home: {}, away: { possession: 1 } }
}

function pauseForMoment(
  report: MatchReport,
  moment: KeyMoment,
  nextMinute: number,
  userSide: MatchSide,
): LiveMinuteResult | null {
  if (moment.minute === nextMinute) {
    const possession = momentPossession(moment, userSide)
    const state = momentState(possession)
    report.currentMinute = nextMinute
    report.liveState = state
    addBeatStats(report, possessionStats(possession))
    return pausedResult(report, nextMinute, state.possession, state.ballX, state.carrierId)
  }
  if (moment.minute <= report.currentMinute) {
    const state = report.liveState ?? kickoffState(userSide)
    return pausedResult(report, report.currentMinute, state.possession, state.ballX, state.carrierId)
  }
  return null
}

export function advanceLiveMinute(world: WorldState): LiveMinuteResult | null {
  const report = world.lastMatch
  if (!report || report.status !== 'live') return null
  if (report.currentMinute >= 90) return finishedResult(report)
  const context = contextFor(world, report)
  if (!context) return null

  const nextMinute = report.currentMinute + 1
  const pending = (report.keyMoments ?? []).find((moment) => !moment.outcome)
  const pause = pending ? pauseForMoment(report, pending, nextMinute, context.userSide) : null
  if (pause) return pause

  const result = simulateMinute(world, report, context, nextMinute)
  if (report.halfTimeHomeGoals == null && nextMinute >= 45) {
    enterHalfTime(report)
    result.halfTime = true
  }
  return result
}
