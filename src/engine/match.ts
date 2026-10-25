import { clamp, overall, positionGroup, round1 } from '../domain/attributes'
import type {
  Club,
  Fixture,
  Id,
  MatchEventLine,
  MatchReport,
  Player,
  WorldState,
} from '../domain/types'
import { computeClubStrength } from '../world/generator'
import { generateKeyMoments } from './keyMoments'
import { createRng, type Rng } from './rng'
import { adjustRelationship, adjustRoleTrust, coachTrust, getRelationshipByRole } from './relationships'

export interface SelectionResult {
  started: boolean
  minutes: number
}

export function determineUserSelection(
  world: WorldState,
  club: Club,
  rng: Rng,
): SelectionResult {
  const user = world.players[world.playerId]
  if (!user || user.injury || user.fitness < 26) return { started: false, minutes: 0 }

  const withoutUser = computeClubStrength(club, world.players, { excludePlayerId: user.id })
  const trust = coachTrust(world)
  const score =
    (overall(user) - withoutUser.overall) * 2.2 +
    (trust - 50) * 0.22 +
    (user.fitness - 70) * 0.2 +
    (user.form - 50) * 0.12 +
    (user.sharpness - 50) * 0.08

  if (user.fitness >= 38 && (score >= -3.5 || (score >= -9 && rng.chance(0.55)))) {
    return { started: true, minutes: 90 }
  }
  if (user.fitness >= 45 && score >= -18 && rng.chance(0.45)) {
    return { started: false, minutes: rng.int(15, 30) }
  }
  return { started: false, minutes: 0 }
}

interface GoalContribution {
  scorer: Player
  assist: Player | null
  minute: number
  side: 'home' | 'away'
}

function pickScorer(
  world: WorldState,
  club: Club,
  rng: Rng,
  userClubId: Id,
  userPlaying: boolean,
): Player {
  const squad = club.squadIds
    .map((id) => world.players[id])
    .filter((player): player is Player => Boolean(player))
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    let weight =
      group === 'FWD' ? 4.2 : group === 'MID' ? 1.8 : group === 'DEF' ? 0.45 : 0.02
    weight *= 0.5 + player.attributes.shooting / 100
    if (player.isUser) {
      weight = player.id === world.playerId && userPlaying && club.id === userClubId
        ? weight * 1.4
        : 0
    }
    return { value: player, weight }
  })
  return rng.weighted(candidates)
}

function pickAssister(
  world: WorldState,
  club: Club,
  scorer: Player,
  rng: Rng,
  userClubId: Id,
  userPlaying: boolean,
): Player | null {
  if (!rng.chance(0.7)) return null
  const squad = club.squadIds
    .map((id) => world.players[id])
    .filter((player): player is Player => Boolean(player) && player.id !== scorer.id)
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    let weight =
      (0.5 + player.attributes.passing / 100) *
      (group === 'MID' ? 1.5 : group === 'FWD' ? 1.2 : group === 'DEF' ? 0.55 : 0.08)
    if (player.isUser) {
      weight = player.id === world.playerId && userPlaying && club.id === userClubId
        ? weight * 1.3
        : 0
    }
    return { value: player, weight }
  })
  return rng.weighted(candidates)
}

function expectedGoals(attack: number, defense: number, home: boolean): number {
  const base = home ? 1.3 : 1.1
  const advantage = home ? 0.18 : 0
  return clamp(base + (attack - defense) * 0.055 + advantage, 0.15, 4.2)
}

function styleModifier(club: Club): number {
  switch (club.style) {
    case 'counter':
      return 0.08
    case 'highPress':
      return 0.06
    case 'possession':
      return 0.03
    case 'direct':
      return 0.05
  }
}

function makeGoalContributions(
  world: WorldState,
  homeClub: Club,
  awayClub: Club,
  homeGoals: number,
  awayGoals: number,
  rng: Rng,
  userPlaying: boolean,
): GoalContribution[] {
  const contributions: GoalContribution[] = []
  for (let i = 0; i < homeGoals; i += 1) {
    const scorer = pickScorer(world, homeClub, rng, world.clubId, userPlaying)
    const assist = pickAssister(world, homeClub, scorer, rng, world.clubId, userPlaying)
    contributions.push({
      scorer,
      assist,
      minute: rng.int(1, 90),
      side: 'home',
    })
  }
  for (let i = 0; i < awayGoals; i += 1) {
    const scorer = pickScorer(world, awayClub, rng, world.clubId, userPlaying)
    const assist = pickAssister(world, awayClub, scorer, rng, world.clubId, userPlaying)
    contributions.push({
      scorer,
      assist,
      minute: rng.int(1, 90),
      side: 'away',
    })
  }
  return contributions.sort((a, b) => a.minute - b.minute)
}

function pickInjuryKind(rng: Rng): string {
  return rng.pick(['脚踝扭伤', '大腿肌肉拉伤', '膝盖不适', '腹股沟拉伤', '疲劳性损伤'])
}

function updateUserAfterMatch(
  world: WorldState,
  user: Player,
  rating: number | null,
  goals: number,
  assists: number,
  goalsFor: number,
  goalsAgainst: number,
  played: boolean,
  rng: Rng,
): void {
  const result = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
  user.seasonStats.appearances += played ? 1 : 0
  user.seasonStats.goals += goals
  user.seasonStats.assists += assists
  if (rating != null) {
    user.seasonStats.ratingSum += rating
    user.seasonStats.ratingCount += 1
  }

  if (played) {
    user.fitness = clamp(user.fitness - (12 + rng.int(0, 10)), 20, 100)
    user.sharpness = clamp(user.sharpness + 6, 0, 100)
  } else {
    user.fitness = clamp(user.fitness + 5, 0, 100)
    user.sharpness = clamp(user.sharpness - 1, 0, 100)
  }

  if (rating != null) {
    user.form = clamp(round1(user.form + (rating - 6.7) * 5), 0, 100)
  } else {
    user.form = clamp(round1(user.form - 1), 0, 100)
  }

  let moraleDelta = result === 'win' ? 4 : result === 'loss' ? -3 : 0
  if (played && rating != null && rating >= 7.5) moraleDelta += 2
  if (!played) moraleDelta -= 1
  user.morale = clamp(user.morale + moraleDelta, 0, 100)

  let confidenceDelta = goals * 3 + assists * 2
  if (rating != null) {
    if (rating >= 7.5) confidenceDelta += 2
    else if (rating < 6) confidenceDelta -= 2
  }
  user.confidence = clamp(user.confidence + confidenceDelta, 0, 100)

  const coachDelta =
    rating == null
      ? 0
      : rating >= 8.2
        ? 3
        : rating >= 7.2
          ? 1.5
          : rating < 6
            ? -2
            : 0.5
  adjustRelationship(getRelationshipByRole(world, 'coach'), coachDelta)

  if (rating != null && rating >= 7.5) {
    adjustRoleTrust(world, 'teammate', 1)
  }

  const mediaDelta = goals * 1.5 + assists + (rating != null && rating >= 7.5 ? 1 : rating != null && rating < 6 ? -1 : 0)
  if (mediaDelta !== 0) {
    user.reputation.media = clamp(user.reputation.media + mediaDelta, 0, 100)
    user.reputation.fanbase = clamp(user.reputation.fanbase + Math.max(-1, mediaDelta * 0.8), 0, 100)
    user.reputation.local = clamp(user.reputation.local + Math.max(-1, mediaDelta * 0.6), 0, 100)
    user.reputation.national = clamp(user.reputation.national + Math.max(-0.5, mediaDelta * 0.35), 0, 100)
    adjustRelationship(getRelationshipByRole(world, 'media'), mediaDelta)
    adjustRelationship(getRelationshipByRole(world, 'fan'), mediaDelta * 0.8)
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

export function simulateUserFixture(world: WorldState, fixture: Fixture): MatchReport {
  const user = world.players[world.playerId]
  const homeClub = world.clubs[fixture.homeId]
  const awayClub = world.clubs[fixture.awayId]
  if (!user || !homeClub || !awayClub) throw new Error('Missing clubs for user fixture')

  const isHome = fixture.homeId === user.clubId
  const userClub = isHome ? homeClub : awayClub
  const selectionRng = createRng(world.seed, 'selection', fixture.id)
  const selection = determineUserSelection(world, userClub, selectionRng)
  const userStarted = selection.started
  const userMinutes = selection.minutes
  const userPlayed = userMinutes > 0

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

  const rng = createRng(world.seed, 'match', fixture.id)
  const homeXg = expectedGoals(
    homeStrength.attack + styleModifier(homeClub),
    awayStrength.defense,
    true,
  )
  const awayXg = expectedGoals(
    awayStrength.attack + styleModifier(awayClub),
    homeStrength.defense,
    false,
  )
  const homeGoals = rng.poisson(homeXg)
  const awayGoals = rng.poisson(awayXg)
  const contributions = makeGoalContributions(
    world,
    homeClub,
    awayClub,
    homeGoals,
    awayGoals,
    rng,
    userPlayed,
  )

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

  const extraEvents: MatchEventLine[] = []
  let injuryThisMatch = false
  if (userPlayed) {
    if (rng.chance(0.06)) {
      user.seasonStats.yellowCards += 1
      extraEvents.push({
        minute: rng.int(15, 85),
        type: 'card',
        text: `${user.name} 因一次战术犯规吃到黄牌。`,
        isUser: true,
      })
    }
    const injuryChance = 0.012 * (1 + (100 - user.fitness) / 100) * (user.position === 'GK' ? 0.5 : 1)
    if (rng.chance(injuryChance)) {
      injuryThisMatch = true
      user.injury = {
        kind: pickInjuryKind(rng),
        weeksLeft: rng.int(2, 8),
        severity: rng.int(1, 3),
      }
      extraEvents.push({
        minute: rng.int(20, 88),
        type: 'injury',
        text: `${user.name} 在对抗中受伤，无法坚持比赛。`,
        isUser: true,
      })
    }
    if (userGoals === 0 && userAssists === 0 && rng.chance(0.3)) {
      extraEvents.push({
        minute: rng.int(10, 85),
        type: 'chance',
        text:
          user.position === 'GK'
            ? `${user.name} 做出一次关键扑救，阻止了对手的必进球。`
            : `${user.name} 在禁区内制造威胁，可惜射门稍稍偏出。`,
        isUser: true,
      })
    }
  }

  const userGoalsFor = isHome ? homeGoals : awayGoals
  const userGoalsAgainst = isHome ? awayGoals : homeGoals
  let userRating: number | null = null
  if (userPlayed) {
    const resultBonus = userGoalsFor > userGoalsAgainst ? 0.3 : userGoalsFor < userGoalsAgainst ? -0.25 : 0
    let rating = 6.35 + userGoals * 0.95 + userAssists * 0.65 + resultBonus + rng.normal(0, 0.35)
    if (user.position === 'GK') rating += userGoalsAgainst === 0 ? 0.7 : -0.15 * userGoalsAgainst
    if (positionGroup(user.position) === 'DEF') rating += userGoalsAgainst === 0 ? 0.35 : 0
    if (userMinutes < 90) rating = 6 + (rating - 6) * (userMinutes / 90)
    userRating = clamp(round1(rating), 4.3, 9.9)
  }

  updateUserAfterMatch(
    world,
    user,
    userRating,
    userGoals,
    userAssists,
    userGoalsFor,
    userGoalsAgainst,
    userPlayed,
    rng,
  )

  const goalCounts = new Map<Id, { player: Player; count: number }>()
  for (const contribution of contributions) {
    const existing = goalCounts.get(contribution.scorer.id)
    if (existing) existing.count += 1
    else goalCounts.set(contribution.scorer.id, { player: contribution.scorer, count: 1 })
  }
  const topScorer = [...goalCounts.values()].sort((a, b) => b.count - a.count)[0]?.player
  const motmName = userRating != null && userRating >= 8.3 ? user.name : topScorer?.name ?? (isHome ? homeClub.nameZh : awayClub.nameZh)
  const motmRating = userRating != null && userRating >= 8.3 ? userRating : round1(rng.float(7.2, 8.5))

  const attendance = clamp(
    Math.round(homeClub.reputation * 380 + rng.int(-3000, 4500)),
    3200,
    78000,
  )

  const keyMoments = userPlayed
    ? generateKeyMoments(user, rng, userMinutes, isHome, userStarted ? 0 : 90 - userMinutes)
    : []

  const halfTimeHomeGoals = contributions.filter(
    (goal) => goal.side === 'home' && goal.minute <= 45,
  ).length
  const halfTimeAwayGoals = contributions.filter(
    (goal) => goal.side === 'away' && goal.minute <= 45,
  ).length

  const baseReport: Omit<MatchReport, 'events'> = {
    fixtureId: fixture.id,
    season: fixture.season,
    week: fixture.week,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeName: homeClub.nameZh,
    awayName: awayClub.nameZh,
    homeGoals,
    awayGoals,
    halfTimeHomeGoals,
    halfTimeAwayGoals,
    userPlayed,
    userStarted,
    userMinutes,
    userGoals,
    userAssists,
    userRating,
    userPosition: user.position,
    motmName,
    motmRating,
    attendance,
    keyMoments,
  }
  const report: MatchReport = {
    ...baseReport,
    events: buildTimeline(baseReport, contributions, user, extraEvents),
  }

  fixture.status = 'played'
  fixture.homeGoals = homeGoals
  fixture.awayGoals = awayGoals
  fixture.report = report
  if (userStarted) user.seasonStats.starts += 1
  user.seasonStats.minutes += userMinutes

  const userSummary = userPlayed
    ? `${user.name} ${userStarted ? '首发' : '替补'}出场 ${userMinutes} 分钟，获得 ${userRating?.toFixed(1)} 分，${userGoals} 球 ${userAssists} 助攻。`
    : `${user.name} 未获得出场机会。`
  world.news.unshift({
    id: `news:match:${fixture.id}`,
    season: fixture.season,
    week: fixture.week,
    title: `${homeClub.nameZh} ${homeGoals}-${awayGoals} ${awayClub.nameZh}`,
    body: `${userSummary}${injuryThisMatch ? ' 他在本场比赛中受伤。' : ''}`,
    kind: 'match',
  })
  if (homeGoals + awayGoals >= 6) {
    world.news.unshift({
      id: `news:thriller:${fixture.id}`,
      season: fixture.season,
      week: fixture.week,
      title: '进球大战',
      body: `${homeClub.nameZh} 与 ${awayClub.nameZh} 联手奉献了 ${homeGoals + awayGoals} 个进球。`,
      kind: 'media',
    })
  }
  world.news = world.news.slice(0, 80)
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
