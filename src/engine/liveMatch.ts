import type { Fixture, KeyMomentOutcome, MatchReport, MatchSide, WorldState } from '../domain'
import { createRng } from '../lib'
import { generateKeyMoments } from './keyMomentGen'
import { advanceLiveMinute } from './liveMinute'
import { pickScorer } from './matchGoals'
import { appendGoal, computeAttendance, createLiveReport } from './matchReport'
import { prepareUserFixture } from './liveSetup'

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
  return report
}

export function advanceLiveMatch(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  if (report.status === 'final') return report

  let guard = 0
  while (report.currentMinute < 90 && guard < 200) {
    const result = advanceLiveMinute(world)
    if (!result || result.paused) break
    guard += 1
  }
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
  const side: MatchSide = report.homeId === world.clubId ? 'home' : 'away'

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

export function userSideOf(report: MatchReport, world: WorldState): MatchSide {
  return report.homeId === world.clubId ? 'home' : 'away'
}
