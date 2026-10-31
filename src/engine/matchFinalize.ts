import type { Fixture, MatchReport, Player, WorldState } from '../domain'
import type { Rng } from '../lib'
import { createRng } from '../lib'
import { buildMediaReaction } from './keyMomentNarrative'
import { appendEvent, appendFulltime, pickManOfTheMatch } from './matchReport'
import { computeUserRating, rollUserMatchEvents, updateUserAfterMatch } from './matchUser'

interface FinalizeContext {
  world: WorldState
  report: MatchReport
  user: Player
  fixture: Fixture
  rng: Rng
}

function tallyGoalStats(world: WorldState, report: MatchReport): void {
  const userId = world.playerId
  for (const goal of report.goals) {
    if (goal.scorerId !== userId) {
      const scorer = world.players[goal.scorerId]
      if (scorer) scorer.seasonStats.goals += 1
    }
    if (goal.assistId && goal.assistId !== userId) {
      const assister = world.players[goal.assistId]
      if (assister) assister.seasonStats.assists += 1
    }
  }
}

function publishMatchNews(world: WorldState, report: MatchReport, injured: boolean): void {
  const user = world.players[world.playerId]
  if (!user) return
  const summary = report.userPlayed
    ? `${user.name} ${report.userStarted ? '首发' : '替补'}出场 ${report.userMinutes} 分钟，获得 ${report.userRating?.toFixed(1)} 分，${report.userGoals} 球 ${report.userAssists} 助攻。`
    : `${user.name} 未获得出场机会。`
  world.news.unshift({
    id: `news:match:${report.fixtureId}`,
    season: report.season,
    week: report.week,
    title: `${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}`,
    body: `${summary}${injured ? ' 他在本场比赛中受伤。' : ''}`,
    kind: 'match',
  })
  if (report.homeGoals + report.awayGoals >= 6) {
    world.news.unshift({
      id: `news:thriller:${report.fixtureId}`,
      season: report.season,
      week: report.week,
      title: '进球大战',
      body: `${report.homeName} 与 ${report.awayName} 联手奉献了 ${report.homeGoals + report.awayGoals} 个进球。`,
      kind: 'media',
    })
  }
  world.news = world.news.slice(0, 80)
}

function momentRatingDelta(report: MatchReport): number {
  return (report.keyMoments ?? []).reduce(
    (total, moment) => total + (moment.outcome?.ratingDelta ?? 0),
    0,
  )
}

function readyToFinalize(report: MatchReport): boolean {
  const pending = (report.keyMoments ?? []).some((moment) => !moment.outcome)
  return !pending && report.currentMinute >= 90
}

function recordUserMinutes(user: Player, report: MatchReport): void {
  if (!report.userPlayed) return
  if (report.userStarted) user.seasonStats.starts += 1
  user.seasonStats.minutes += report.userMinutes
}

function settleUser(ctx: FinalizeContext): boolean {
  const { world, report, user, rng } = ctx
  const goalsFor = report.homeId === world.clubId ? report.homeGoals : report.awayGoals
  const goalsAgainst = report.homeId === world.clubId ? report.awayGoals : report.homeGoals
  const rating = computeUserRating({
    user,
    goals: report.userGoals,
    assists: report.userAssists,
    goalsFor,
    goalsAgainst,
    minutes: report.userMinutes,
    played: report.userPlayed,
    rng,
    keyMomentDelta: momentRatingDelta(report),
  })
  const extras = report.userPlayed
    ? rollUserMatchEvents(user, report.userGoals, report.userAssists, rng)
    : { events: [], injured: false }

  report.userRating = rating
  report.userPosition = user.position
  const motm = pickManOfTheMatch(report, user, rating, rng)
  report.motmName = motm.name
  report.motmRating = motm.rating
  updateUserAfterMatch({
    world,
    user,
    rating,
    goals: report.userGoals,
    assists: report.userAssists,
    goalsFor,
    goalsAgainst,
    played: report.userPlayed,
    rng,
  })
  recordUserMinutes(user, report)
  tallyGoalStats(world, report)
  for (const event of extras.events) appendEvent(report, event)
  return extras.injured
}

function closeReport(ctx: FinalizeContext, injured: boolean): void {
  const { world, report, user, fixture } = ctx
  appendFulltime(report)
  const moments = report.keyMoments ?? []
  report.mediaReaction = buildMediaReaction(
    report,
    user.name,
    moments.filter((moment) => moment.outcome?.success).length,
    moments.length,
    report.homeId === world.clubId,
  )
  report.status = 'final'
  report.currentMinute = 90
  fixture.status = 'played'
  fixture.homeGoals = report.homeGoals
  fixture.awayGoals = report.awayGoals
  fixture.report = report
  publishMatchNews(world, report, injured)
}

export function finalizeLiveMatch(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  if (report.status === 'final') return report
  if (!readyToFinalize(report)) return null
  const fixture = world.fixtures[report.fixtureId]
  const user = world.players[world.playerId]
  if (!fixture || !user) return report

  const ctx: FinalizeContext = {
    world,
    report,
    user,
    fixture,
    rng: createRng(world.seed, 'finalize', report.fixtureId),
  }
  const injured = settleUser(ctx)
  closeReport(ctx, injured)
  return report
}
