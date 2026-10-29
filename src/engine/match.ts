import { clamp, round1 } from '../domain/attributes'
import type {
  Club,
  Fixture,
  Id,
  KeyMoment,
  MatchEventLine,
  MatchReport,
  Player,
  WorldState,
} from '../domain/types'
import { computeClubStrength } from '../domain/strength'
import { createRng, type Rng } from '../lib/rng'
import { generateKeyMoments } from './keyMoments'
import {
  expectedGoals,
  makeGoalContributions,
  styleModifier,
  type GoalContribution,
} from './matchGoals'
import {
  computeUserRating,
  determineUserSelection,
  rollUserMatchEvents,
  updateUserAfterMatch,
} from './matchUser'

interface UserFixtureSetup {
  user: Player
  homeClub: Club
  awayClub: Club
  isHome: boolean
  userStarted: boolean
  userMinutes: number
  userPlayed: boolean
  homeStrength: Club['strength']
  awayStrength: Club['strength']
}

interface UserTally {
  userGoals: number
  userAssists: number
}

interface Scoreline {
  homeGoals: number
  awayGoals: number
  contributions: GoalContribution[]
  rng: Rng
}

function prepareUserFixture(world: WorldState, fixture: Fixture): UserFixtureSetup {
  const user = world.players[world.playerId]
  const homeClub = world.clubs[fixture.homeId]
  const awayClub = world.clubs[fixture.awayId]
  if (!user || !homeClub || !awayClub) throw new Error('Missing clubs for user fixture')

  const isHome = fixture.homeId === user.clubId
  const userClub = isHome ? homeClub : awayClub
  const selectionRng = createRng(world.seed, 'selection', fixture.id)
  const selection = determineUserSelection(world, userClub, selectionRng)
  const userPlayed = selection.minutes > 0

  const homeStrength = computeClubStrength(
    homeClub,
    world.players,
    isHome && userPlayed
      ? { forcePlayerId: user.id }
      : isHome
        ? { excludePlayerId: user.id }
        : undefined,
  )
  const awayStrength = computeClubStrength(
    awayClub,
    world.players,
    !isHome && userPlayed
      ? { forcePlayerId: user.id }
      : !isHome
        ? { excludePlayerId: user.id }
        : undefined,
  )
  return {
    user,
    homeClub,
    awayClub,
    isHome,
    userStarted: selection.started,
    userMinutes: selection.minutes,
    userPlayed,
    homeStrength,
    awayStrength,
  }
}

function simulateScoreline(world: WorldState, fixture: Fixture, setup: UserFixtureSetup): Scoreline {
  const rng = createRng(world.seed, 'match', fixture.id)
  const homeXg = expectedGoals(
    setup.homeStrength.attack + styleModifier(setup.homeClub),
    setup.awayStrength.defense,
    true,
  )
  const awayXg = expectedGoals(
    setup.awayStrength.attack + styleModifier(setup.awayClub),
    setup.homeStrength.defense,
    false,
  )
  const homeGoals = rng.poisson(homeXg)
  const awayGoals = rng.poisson(awayXg)
  const contributions = makeGoalContributions({
    world,
    homeClub: setup.homeClub,
    awayClub: setup.awayClub,
    homeGoals,
    awayGoals,
    rng,
    userPlaying: setup.userPlayed,
  })
  return { homeGoals, awayGoals, contributions, rng }
}

function tallyContributions(contributions: GoalContribution[]): UserTally {
  let userGoals = 0
  let userAssists = 0
  for (const contribution of contributions) {
    if (contribution.scorer.isUser) {
      userGoals += 1
    } else {
      contribution.scorer.seasonStats.goals += 1
    }
    if (contribution.assist?.isUser) {
      userAssists += 1
    } else if (contribution.assist) {
      contribution.assist.seasonStats.assists += 1
    }
  }
  return { userGoals, userAssists }
}

function pickManOfTheMatch(
  setup: UserFixtureSetup,
  contributions: GoalContribution[],
  userRating: number | null,
  rng: Rng,
): { name: string; rating: number } {
  const goalCounts = new Map<Id, { player: Player; count: number }>()
  for (const contribution of contributions) {
    const existing = goalCounts.get(contribution.scorer.id)
    if (existing) existing.count += 1
    else goalCounts.set(contribution.scorer.id, { player: contribution.scorer, count: 1 })
  }
  const topScorer = [...goalCounts.values()].sort((a, b) => b.count - a.count)[0]?.player
  const name =
    userRating != null && userRating >= 8.3
      ? setup.user.name
      : topScorer?.name ?? (setup.isHome ? setup.homeClub.nameZh : setup.awayClub.nameZh)
  const rating = userRating != null && userRating >= 8.3 ? userRating : round1(rng.float(7.2, 8.5))
  return { name, rating }
}

interface BaseReportInput {
  fixture: Fixture
  setup: UserFixtureSetup
  scoreline: Scoreline
  tally: UserTally
  userRating: number | null
  motm: { name: string; rating: number }
  attendance: number
  keyMoments: KeyMoment[]
}

function buildBaseReport(input: BaseReportInput): Omit<MatchReport, 'events'> {
  const { fixture, setup, scoreline, tally } = input
  return {
    fixtureId: fixture.id,
    season: fixture.season,
    week: fixture.week,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeName: setup.homeClub.nameZh,
    awayName: setup.awayClub.nameZh,
    homeGoals: scoreline.homeGoals,
    awayGoals: scoreline.awayGoals,
    halfTimeHomeGoals: scoreline.contributions.filter(
      (goal) => goal.side === 'home' && goal.minute <= 45,
    ).length,
    halfTimeAwayGoals: scoreline.contributions.filter(
      (goal) => goal.side === 'away' && goal.minute <= 45,
    ).length,
    userPlayed: setup.userPlayed,
    userStarted: setup.userStarted,
    userMinutes: setup.userMinutes,
    userGoals: tally.userGoals,
    userAssists: tally.userAssists,
    userRating: input.userRating,
    userPosition: setup.user.position,
    motmName: input.motm.name,
    motmRating: input.motm.rating,
    attendance: input.attendance,
    keyMoments: input.keyMoments,
  }
}

function buildTimeline(
  report: Omit<MatchReport, 'events'>,
  contributions: GoalContribution[],
  user: Player,
  extraEvents: MatchEventLine[],
): MatchEventLine[] {
  const events: MatchEventLine[] = [
    {
      minute: 0,
      type: 'info',
      text: `比赛开始，${report.homeName} 在主场迎战 ${report.awayName}。`,
    },
  ]
  for (const goal of contributions) {
    const teamName = goal.side === 'home' ? report.homeName : report.awayName
    const assistText = goal.assist ? ` 助攻：${goal.assist.name}。` : ''
    events.push({
      minute: goal.minute,
      type: 'goal',
      text: `第 ${goal.minute} 分钟，${goal.scorer.name} 为 ${teamName} 破门！${assistText}`,
      isUser: goal.scorer.isUser || Boolean(goal.assist?.isUser),
    })
  }
  events.push(...extraEvents)
  events.push({
    minute: 45,
    type: 'info',
    text: `半场结束，${report.homeName} ${report.halfTimeHomeGoals ?? 0}-${report.halfTimeAwayGoals ?? 0} ${report.awayName}。`,
  })
  if (!report.userPlayed) {
    events.push({
      minute: 46,
      type: 'info',
      text: `${user.name} 本场没有获得出场机会。`,
      isUser: true,
    })
  }
  events.push({
    minute: 90,
    type: 'fulltime',
    text: `全场结束，${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}。`,
  })
  return events.sort((a, b) => a.minute - b.minute)
}

function computeAttendance(homeClub: Club, rng: Rng): number {
  return clamp(Math.round(homeClub.reputation * 380 + rng.int(-3000, 4500)), 3200, 78000)
}

function applyFixtureResult(
  fixture: Fixture,
  setup: UserFixtureSetup,
  report: MatchReport,
  scoreline: Scoreline,
): void {
  fixture.status = 'played'
  fixture.homeGoals = scoreline.homeGoals
  fixture.awayGoals = scoreline.awayGoals
  fixture.report = report
  if (setup.userStarted) setup.user.seasonStats.starts += 1
  setup.user.seasonStats.minutes += setup.userMinutes
}

function publishMatchNews(
  world: WorldState,
  fixture: Fixture,
  setup: UserFixtureSetup,
  report: MatchReport,
  injured: boolean,
): void {
  const summary = report.userPlayed
    ? `${setup.user.name} ${report.userStarted ? '首发' : '替补'}出场 ${report.userMinutes} 分钟，获得 ${report.userRating?.toFixed(1)} 分，${report.userGoals} 球 ${report.userAssists} 助攻。`
    : `${setup.user.name} 未获得出场机会。`
  world.news.unshift({
    id: `news:match:${fixture.id}`,
    season: fixture.season,
    week: fixture.week,
    title: `${setup.homeClub.nameZh} ${report.homeGoals}-${report.awayGoals} ${setup.awayClub.nameZh}`,
    body: `${summary}${injured ? ' 他在本场比赛中受伤。' : ''}`,
    kind: 'match',
  })
  if (report.homeGoals + report.awayGoals >= 6) {
    world.news.unshift({
      id: `news:thriller:${fixture.id}`,
      season: fixture.season,
      week: fixture.week,
      title: '进球大战',
      body: `${setup.homeClub.nameZh} 与 ${setup.awayClub.nameZh} 联手奉献了 ${report.homeGoals + report.awayGoals} 个进球。`,
      kind: 'media',
    })
  }
  world.news = world.news.slice(0, 80)
}

export function simulateUserFixture(world: WorldState, fixture: Fixture): MatchReport {
  const setup = prepareUserFixture(world, fixture)
  const scoreline = simulateScoreline(world, fixture, setup)
  const tally = tallyContributions(scoreline.contributions)
  const extras = setup.userPlayed
    ? rollUserMatchEvents(setup.user, tally.userGoals, tally.userAssists, scoreline.rng)
    : { events: [], injured: false }

  const userGoalsFor = setup.isHome ? scoreline.homeGoals : scoreline.awayGoals
  const userGoalsAgainst = setup.isHome ? scoreline.awayGoals : scoreline.homeGoals
  const userRating = computeUserRating({
    user: setup.user,
    goals: tally.userGoals,
    assists: tally.userAssists,
    goalsFor: userGoalsFor,
    goalsAgainst: userGoalsAgainst,
    minutes: setup.userMinutes,
    played: setup.userPlayed,
    rng: scoreline.rng,
  })

  updateUserAfterMatch({
    world,
    user: setup.user,
    rating: userRating,
    goals: tally.userGoals,
    assists: tally.userAssists,
    goalsFor: userGoalsFor,
    goalsAgainst: userGoalsAgainst,
    played: setup.userPlayed,
    rng: scoreline.rng,
  })

  const motm = pickManOfTheMatch(setup, scoreline.contributions, userRating, scoreline.rng)
  const attendance = computeAttendance(setup.homeClub, scoreline.rng)
  const keyMoments = setup.userPlayed
    ? generateKeyMoments(
        setup.user,
        scoreline.rng,
        setup.userMinutes,
        setup.isHome,
        setup.userStarted ? 0 : 90 - setup.userMinutes,
      )
    : []

  const baseReport = buildBaseReport({
    fixture,
    setup,
    scoreline,
    tally,
    userRating,
    motm,
    attendance,
    keyMoments,
  })
  const report: MatchReport = {
    ...baseReport,
    events: buildTimeline(baseReport, scoreline.contributions, setup.user, extras.events),
  }
  applyFixtureResult(fixture, setup, report, scoreline)
  publishMatchNews(world, fixture, setup, report, extras.injured)
  return report
}

export function simulateBackgroundFixture(world: WorldState, fixture: Fixture): void {
  const homeClub = world.clubs[fixture.homeId]
  const awayClub = world.clubs[fixture.awayId]
  if (!homeClub || !awayClub) return
  const rng = createRng(world.seed, 'background', fixture.id)
  const homeXg = expectedGoals(homeClub.strength.attack, awayClub.strength.defense, true)
  const awayXg = expectedGoals(awayClub.strength.attack, homeClub.strength.defense, false)
  fixture.homeGoals = rng.poisson(homeXg)
  fixture.awayGoals = rng.poisson(awayXg)
  fixture.status = 'played'
}

export function simulateWeekFixtures(world: WorldState): MatchReport | null {
  const fixtures = Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.season === world.season &&
        fixture.week === world.week &&
        fixture.status === 'scheduled',
    )
    .sort((a, b) => a.competitionId.localeCompare(b.competitionId) || a.id.localeCompare(b.id))

  let userReport: MatchReport | null = null
  for (const fixture of fixtures) {
    if (fixture.homeId === world.clubId || fixture.awayId === world.clubId) {
      userReport = simulateUserFixture(world, fixture)
    } else {
      simulateBackgroundFixture(world, fixture)
    }
  }
  return userReport
}

export function getUserMatchFixture(world: WorldState, week = world.week): Fixture | undefined {
  return Object.values(world.fixtures).find(
    (fixture) =>
      fixture.season === world.season &&
      fixture.week === week &&
      (fixture.homeId === world.clubId || fixture.awayId === world.clubId),
  )
}

export function opponentOf(world: WorldState, fixture: Fixture): Club | undefined {
  const opponentId = fixture.homeId === world.clubId ? fixture.awayId : fixture.homeId
  return world.clubs[opponentId]
}
