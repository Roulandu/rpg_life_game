import { displayName, userEntryMinuteOf } from '../domain'
import type { Fixture, KeyMomentOutcome, MatchReport, MatchSide, WorldState } from '../domain'
import { createRng } from '../lib'
import { generateKeyMoments } from './keyMomentGen'
import { advanceLiveMinute } from './liveMinute'
import { goalState } from './liveSpell'
import { pickScorer } from './matchGoals'
import { resolveOpponents } from './matchOpponent'
import { computeAttendance, createLiveReport, recordGoal } from './matchReport'
import { prepareUserFixture } from './liveSetup'
import { staffFactorsOf } from './staff'

export function startUserMatch(world: WorldState, fixture: Fixture): MatchReport {
  if (fixture.report?.status === 'live') {
    world.lastMatch = fixture.report
    fastForwardToAppearance(world, fixture.report)
    return fixture.report
  }
  const setup = prepareUserFixture(world, fixture)
  const rng = createRng(world.seed, 'keymoments', fixture.id)
  // 关键回合的概率要在生成时就锁死对手：roll 已经预抽，结算阶段不允许再改算法。
  const opponents = resolveOpponents(world, {
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    lineups: setup.lineups,
  })
  const keyMoments = setup.userPlayed
    ? generateKeyMoments({
        player: setup.user,
        rng,
        minutes: setup.userMinutes,
        isHome: setup.isHome,
        startMinute: userEntryMinuteOf(setup),
        opponents,
        psychBonus: staffFactorsOf(world).psychBonus,
      })
    : []
  const attendance = computeAttendance(setup.homeClub, rng)
  const report = createLiveReport(fixture, setup, keyMoments, attendance)

  fixture.status = 'live'
  fixture.homeGoals = 0
  fixture.awayGoals = 0
  fixture.report = report
  world.lastMatch = report
  fastForwardToAppearance(world, report)
  return report
}

/**
 * 替补场次不该从 0 分钟空转到登场分钟。快进必须走玩家手点用的同一个
 * advanceLiveMinute，否则「逐分钟播到 70'」和「刷新后重放到 70'」会产出两场比赛。
 */
function fastForwardToAppearance(world: WorldState, report: MatchReport): void {
  if (!report.userPlayed || report.userStarted) return
  const entry = userEntryMinuteOf(report)
  let guard = 0
  while (report.currentMinute < entry && guard < 90) {
    const result = advanceLiveMinute(world)
    if (!result || result.paused || result.finished) break
    guard += 1
  }
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
    recordGoal(report, fixture, {
      minute: momentMinute,
      side,
      scorerId: user.id,
      scorerName: displayName(user),
      isUser: true,
      fromKeyMoment: true,
    })
    report.liveState = goalState(side)
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
  recordGoal(report, fixture, {
    minute: momentMinute,
    side,
    scorerId: scorer.id,
    scorerName: displayName(scorer),
    assistId: user.id,
    assistName: displayName(user),
    isUser: false,
    isUserAssist: true,
    fromKeyMoment: true,
  })
  report.liveState = goalState(side)
}

export function userSideOf(report: MatchReport, world: WorldState): MatchSide {
  return report.homeId === world.clubId ? 'home' : 'away'
}
