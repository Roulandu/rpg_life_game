import { clamp } from '../domain'
import type {
  KeyMoment,
  KeyMomentKind,
  MatchEventLine,
  MatchReport,
  MatchSide,
  MatchStatLine,
  WorldState,
} from '../domain'
import { createRng } from '../lib'
import { contextFor, type MatchContext } from './liveSetup'
import { buildBeats } from './matchBeats'
import { pickAssister, pickScorer } from './matchGoals'
import {
  addBeatStats,
  appendEvent,
  appendGoal,
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

function scoreGoal(
  world: WorldState,
  report: MatchReport,
  context: MatchContext,
  side: MatchSide,
  minute: number,
): void {
  const rng = createRng(world.seed, 'goal', report.fixtureId, minute, side)
  const club = side === 'home' ? context.homeClub : context.awayClub
  const scorer = pickScorer({
    world,
    club,
    rng,
    userClubId: world.clubId,
    minute,
    userEntryMinute: report.userStarted ? 0 : 90 - report.userMinutes,
    userPlayed: report.userPlayed,
  })
  const assist = pickAssister(
    {
      world,
      club,
      rng,
      userClubId: world.clubId,
      minute,
      userEntryMinute: report.userStarted ? 0 : 90 - report.userMinutes,
      userPlayed: report.userPlayed,
    },
    scorer,
  )
  const goal = {
    minute,
    side,
    scorerId: scorer.id,
    scorerName: scorer.name,
    assistId: assist?.id,
    assistName: assist?.name,
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
  const rng = createRng(world.seed, 'live', report.fixtureId, minute)
  const momentum = momentumFor(report, minute)
  const userHome = context.userSide === 'home'
  const homeFactor = userHome ? momentum.user : momentum.opponent
  const awayFactor = userHome ? momentum.opponent : momentum.user
  const homeP = clamp((context.homeXg / 90) * homeFactor, 0, 0.5)
  const awayP = clamp((context.awayXg / 90) * awayFactor, 0, 0.5)

  if (rng.chance(homeP)) scoreGoal(world, report, context, 'home', minute)
  if (rng.chance(awayP)) scoreGoal(world, report, context, 'away', minute)

  const beats = buildBeats({
    seed: world.seed,
    fixtureId: report.fixtureId,
    minute,
    homeStrength: context.homeStrength,
    awayStrength: context.awayStrength,
    homeName: report.homeName,
    awayName: report.awayName,
    lineups: context.lineups,
  })
  for (const event of beats.events) appendEvent(report, event)
  addBeatStats(report, beats.stats)

  report.currentMinute = minute
  return {
    minute,
    paused: false,
    finished: minute >= 90,
    halfTime: report.halfTimeHomeGoals != null,
    possession: beats.possession,
    ballX: beats.ballX,
    events: beats.events,
  }
}

function pausedResult(
  report: MatchReport,
  minute: number,
  possession: MatchSide,
  ballX: number,
): LiveMinuteResult {
  return {
    minute,
    paused: true,
    finished: false,
    halfTime: report.halfTimeHomeGoals != null,
    possession,
    ballX,
    events: [],
  }
}

function finishedResult(report: MatchReport): LiveMinuteResult {
  return {
    minute: report.currentMinute,
    paused: false,
    finished: true,
    halfTime: report.halfTimeHomeGoals != null,
    possession: 'home',
    ballX: 0.5,
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
    report.currentMinute = nextMinute
    addBeatStats(report, possessionStats(possession))
    return pausedResult(report, nextMinute, possession, possession === 'home' ? 0.62 : 0.38)
  }
  if (moment.minute <= report.currentMinute) {
    return pausedResult(report, report.currentMinute, userSide, 0.5)
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
