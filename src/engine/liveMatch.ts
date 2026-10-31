import { clamp } from '../domain'
import type { Fixture, KeyMomentOutcome, MatchReport, WorldState } from '../domain'
import { createRng } from '../lib'
import { generateKeyMoments } from './keyMomentGen'
import { pickAssister, pickScorer } from './matchGoals'
import {
  appendEvent,
  appendGoal,
  buildGoalText,
  computeAttendance,
  createLiveReport,
  enterHalfTime,
} from './matchReport'
import { contextFor, prepareUserFixture, type MatchContext } from './liveSetup'

export function startUserMatch(world: WorldState, fixture: Fixture): MatchReport {
  if (fixture.report?.status === 'live') {
    world.lastMatch = fixture.report
    return fixture.report
  }
  const setup = prepareUserFixture(world, fixture)
  const rng = createRng(world.seed, 'keymoments', fixture.id)
  const keyMoments = setup.userPlayed
    ? generateKeyMoments(
        setup.user,
        rng,
        setup.userMinutes,
        setup.isHome,
        setup.userStarted ? 0 : 90 - setup.userMinutes,
      )
    : []
  const attendance = computeAttendance(setup.homeClub, rng)
  const report = createLiveReport(fixture, setup, keyMoments, attendance)

  fixture.status = 'live'
  fixture.homeGoals = 0
  fixture.awayGoals = 0
  fixture.report = report
  world.lastMatch = report
  advanceLiveMatch(world)
  return report
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
  side: 'home' | 'away',
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
  appendEvent(report, { minute, type: 'goal', text: buildGoalText(report, goal), isUser: goal.isUser || goal.isUserAssist })
}

function simulateMinute(
  world: WorldState,
  report: MatchReport,
  context: MatchContext,
  minute: number,
): void {
  if ((report.keyMoments ?? []).some((moment) => moment.minute === minute)) return
  const rng = createRng(world.seed, 'live', report.fixtureId, minute)
  const momentum = momentumFor(report, minute)
  const userHome = context.userSide === 'home'
  const homeFactor = userHome ? momentum.user : momentum.opponent
  const awayFactor = userHome ? momentum.opponent : momentum.user
  const homeP = clamp((context.homeXg / 90) * homeFactor, 0, 0.5)
  const awayP = clamp((context.awayXg / 90) * awayFactor, 0, 0.5)

  if (rng.chance(homeP)) scoreGoal(world, report, context, 'home', minute)
  if (rng.chance(awayP)) scoreGoal(world, report, context, 'away', minute)
}

function simulateTo(
  world: WorldState,
  report: MatchReport,
  context: MatchContext,
  pendingMinute: number | null,
): void {
  const lastMinute = pendingMinute == null ? 90 : pendingMinute - 1
  for (let minute = report.currentMinute + 1; minute <= lastMinute; minute += 1) {
    if (report.halfTimeHomeGoals == null && minute > 45) enterHalfTime(report)
    simulateMinute(world, report, context, minute)
  }
}

export function advanceLiveMatch(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  if (report.status === 'final') return report
  const context = contextFor(world, report)
  if (!context) return report

  const pendingMinute = (report.keyMoments ?? []).find((moment) => !moment.outcome)?.minute ?? null
  if (pendingMinute != null && pendingMinute <= report.currentMinute) return report
  const target = pendingMinute ?? 90
  if (report.currentMinute >= target) return report

  simulateTo(world, report, context, pendingMinute)
  report.currentMinute = Math.max(report.currentMinute, target)
  return report
}

export function applyLiveKeyMomentOutcome(
  world: WorldState,
  report: MatchReport,
  momentMinute: number,
  outcome: KeyMomentOutcome,
): void {
  const fixture = world.fixtures[report.fixtureId]
  const user = world.players[world.playerId]
  if (!fixture || !user) return
  const side = report.homeId === world.clubId ? 'home' : 'away'

  if (outcome.goal) {
    appendGoal(report, fixture, {
      minute: momentMinute,
      side,
      scorerId: user.id,
      scorerName: user.name,
      isUser: true,
      fromKeyMoment: true,
    })
    return
  }
  if (!outcome.assist) return

  const club = side === 'home' ? world.clubs[report.homeId] : world.clubs[report.awayId]
  if (!club) return
  const rng = createRng(world.seed, 'moment-assist', report.fixtureId, momentMinute)
  const scorer = pickScorer({
    world,
    club,
    rng,
    userClubId: world.clubId,
    minute: momentMinute,
    userEntryMinute: 0,
    userPlayed: false,
  })
  appendGoal(report, fixture, {
    minute: momentMinute,
    side,
    scorerId: scorer.id,
    scorerName: scorer.name,
    assistId: user.id,
    assistName: user.name,
    isUser: false,
    isUserAssist: true,
    fromKeyMoment: true,
  })
}

export function userSideOf(report: MatchReport, world: WorldState): 'home' | 'away' {
  return report.homeId === world.clubId ? 'home' : 'away'
}
