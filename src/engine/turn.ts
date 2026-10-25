import { clamp, overall, round1 } from '../domain/attributes'
import type {
  GameEvent,
  Id,
  MatchReport,
  Player,
  SeasonStat,
  SeasonSummary,
  WeeklyPlan,
  WorldState,
} from '../domain/types'
import { computeClubStrength, generateFixtures } from '../world/generator'
import { expireEvents, generateWeeklyEvent } from './events'
import {
  paySeasonBonuses,
  reputationAfterSeason,
  settleWeekFinance,
  updatePlayerValue,
} from './finance'
import { computeLeagueTable } from './leagueTable'
import { simulateWeekFixtures } from './match'
import { retirementReason } from './retirement'
import { createRng } from './rng'
import { applyExtraAction, applyTraining, recoverInjuries } from './training'

export interface SeasonTransition {
  season: number
  newSeason: number
  summary: SeasonSummary
  champion: boolean
  promoted: boolean
  relegated: boolean
  retired: boolean
  retirementReason: string | null
  awards: string[]
}

export interface TurnResult {
  world: WorldState
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
  weekPlayed: number
  seasonPlayed: number
}

function emptySeasonStat(season: number, clubId: Id): SeasonStat {
  return {
    season,
    clubId,
    appearances: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    ratingSum: 0,
    ratingCount: 0,
    yellowCards: 0,
    redCards: 0,
  }
}

function recomputeAllStrengths(world: WorldState): void {
  for (const club of Object.values(world.clubs)) {
    club.strength = computeClubStrength(club, world.players)
  }
}

function agePlayers(world: WorldState): void {
  for (const player of Object.values(world.players)) {
    player.age += 1
    if (player.age >= 30) {
      const decline = player.age >= 35 ? 2 : player.age >= 32 ? 1.2 : 0.7
      player.attributes.pace = clamp(round1(player.attributes.pace - decline), 10, 96)
      player.attributes.stamina = clamp(round1(player.attributes.stamina - decline * 0.8), 10, 96)
      player.attributes.physical = clamp(round1(player.attributes.physical - decline * 0.6), 10, 96)
      player.attributes.mental = clamp(round1(player.attributes.mental + 0.3), 10, 96)
    } else if (!player.isUser && player.age <= 22) {
      const headroom = Math.max(0, player.potential - overall(player))
      const growth = Math.min(1.1, headroom * 0.05)
      if (growth > 0) {
        const keys = ['technique', 'passing', 'mental', 'physical'] as const
        for (const key of keys) {
          player.attributes[key] = clamp(round1(player.attributes[key] + growth * 0.45), 10, 96)
        }
      }
    }
  }
}

function applyPromotionRelegation(world: WorldState, endedSeason: number): void {
  const top = Object.values(world.leagues).find((league) => league.tier === 1)
  const second = Object.values(world.leagues).find((league) => league.tier === 2)
  if (!top || !second || top.relegationSlots === 0 || second.promotionSlots === 0) return

  const topTable = computeLeagueTable(world, top.id, endedSeason)
  const secondTable = computeLeagueTable(world, second.id, endedSeason)
  const relegatedIds = topTable.slice(-top.relegationSlots).map((row) => row.clubId)
  const promotedIds = secondTable.slice(0, second.promotionSlots).map((row) => row.clubId)
  if (relegatedIds.length === 0 || relegatedIds.length !== promotedIds.length) return

  top.clubIds = top.clubIds.filter((id) => !relegatedIds.includes(id))
  second.clubIds = second.clubIds.filter((id) => !promotedIds.includes(id))

  for (const id of relegatedIds) {
    const club = world.clubs[id]
    if (!club) continue
    club.leagueId = second.id
    club.tier = second.tier
    second.clubIds.push(id)
  }
  for (const id of promotedIds) {
    const club = world.clubs[id]
    if (!club) continue
    club.leagueId = top.id
    club.tier = top.tier
    top.clubIds.push(id)
  }
  top.clubIds.sort()
  second.clubIds.sort()
}

function leagueTopScorer(world: WorldState, leagueId: Id): Player | null {
  const league = world.leagues[leagueId]
  if (!league) return null
  const clubIds = new Set(league.clubIds)
  const candidates = Object.values(world.players).filter(
    (player) => clubIds.has(player.clubId) && player.seasonStats.goals > 0,
  )
  if (candidates.length === 0) return null
  candidates.sort(
    (a, b) =>
      b.seasonStats.goals - a.seasonStats.goals ||
      b.seasonStats.assists - a.seasonStats.assists ||
      a.id.localeCompare(b.id),
  )
  return candidates[0]
}

function renewContracts(world: WorldState, endedSeason: number, nextSeason: number): void {
  const user = world.players[world.playerId]
  for (const player of Object.values(world.players)) {
    if (player.contract.endSeason > endedSeason) continue
    if (player.isUser) {
      if (world.retired) continue
      player.contract.wageWeekly = Math.round((player.contract.wageWeekly * 1.14) / 100) * 100
      player.contract.startSeason = nextSeason
      player.contract.endSeason = nextSeason + (player.age >= 33 ? 0 : 1)
    } else {
      const rng = createRng(world.seed, 'contracts', nextSeason, player.id)
      const years = rng.int(1, 3)
      player.contract.wageWeekly = Math.round((player.contract.wageWeekly * rng.float(1.02, 1.18)) / 100) * 100
      player.contract.startSeason = nextSeason
      player.contract.endSeason = nextSeason + years - 1
    }
  }

  if (user && !world.retired) {
    const renewed = user.contract.startSeason === nextSeason
    if (renewed) {
      world.finance.weeklyWage = user.contract.wageWeekly
      world.finance.weeklyExpenses = Math.round(user.contract.wageWeekly * 0.18) + 15000
      world.news.unshift({
        id: `news:contract:renew:${endedSeason}`,
        season: endedSeason,
        week: world.totalWeeks,
        title: '完成续约',
        body: `你与俱乐部续签了合同，周薪调整为 ${Math.round(user.contract.wageWeekly / 100)} 英镑。`,
        kind: 'club',
      })
    }
  }
}

export function endSeason(world: WorldState): SeasonTransition {
  const endedSeason = world.season
  const nextSeason = endedSeason + 1
  const user = world.players[world.playerId]
  if (!user) throw new Error('User player not found')

  world.clubId = user.clubId
  const club = world.clubs[user.clubId] ?? Object.values(world.clubs)[0]
  const league = Object.values(world.leagues).find((item) => item.id === club.leagueId)
  const table = league ? computeLeagueTable(world, league.id, endedSeason) : []
  const position = table.findIndex((row) => row.clubId === club.id) + 1
  const stats = user.seasonStats
  const averageRating =
    stats.ratingCount > 0 ? round1(stats.ratingSum / stats.ratingCount) : 0

  const champion = position === 1
  const promoted =
    Boolean(league) &&
    league!.tier === 2 &&
    position > 0 &&
    position <= (league!.promotionSlots || 0)
  const relegated =
    Boolean(league) &&
    league!.tier === 1 &&
    position > 0 &&
    position > (league!.clubIds.length - (league!.relegationSlots || 0))

  const awards: string[] = []
  if (champion) awards.push(`${league?.nameZh ?? '联赛'}冠军`)
  if (league) {
    const topScorer = leagueTopScorer(world, league.id)
    if (topScorer?.isUser && topScorer.seasonStats.goals > 0) awards.push('联赛金靴')
  }
  if (user.age <= 21 && stats.appearances >= 15 && averageRating >= 7) {
    awards.push('赛季最佳年轻球员')
  }

  const noteParts: string[] = []
  if (promoted) noteParts.push('随队升级')
  if (relegated) noteParts.push('随队降级')

  paySeasonBonuses(world, {
    appearances: stats.appearances,
    goals: stats.goals,
    assists: stats.assists,
    champion,
    promoted,
  })
  reputationAfterSeason(world, averageRating)

  const summary: SeasonSummary = {
    season: endedSeason,
    clubId: club.id,
    clubName: club.nameZh,
    tier: club.tier,
    leaguePosition: position,
    appearances: stats.appearances,
    goals: stats.goals,
    assists: stats.assists,
    averageRating,
    awards,
    note: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
  }

  applyPromotionRelegation(world, endedSeason)
  agePlayers(world)

  const reason = retirementReason(world)
  const retired = reason != null
  if (retired) {
    world.retired = true
    summary.note = [summary.note, `宣布退役（${reason}）`].filter(Boolean).join(' · ')
  }

  user.careerStats.push({ ...stats })
  user.history.push({
    season: endedSeason,
    age: user.age - 1,
    clubId: club.id,
    clubName: club.nameZh,
    tier: club.tier,
    appearances: stats.appearances,
    goals: stats.goals,
    assists: stats.assists,
    averageRating,
    note: summary.note,
  })

  renewContracts(world, endedSeason, nextSeason)
  for (const player of Object.values(world.players)) {
    player.seasonStats = emptySeasonStat(nextSeason, player.clubId)
  }
  updatePlayerValue(world)

  world.seasonSummaries.push(summary)
  world.season = nextSeason
  world.week = 1
  world.lastMatch = null

  world.fixtures = { ...world.fixtures, ...generateFixtures(world.leagues, world.seed, nextSeason) }
  recomputeAllStrengths(world)

  for (const event of Object.values(world.events)) {
    if (event.status === 'open') event.status = 'expired'
  }

  const awardText = awards.length > 0 ? ` 个人荣誉：${awards.join('、')}。` : ''
  world.news.unshift({
    id: `news:season:end:${endedSeason}`,
    season: endedSeason,
    week: world.totalWeeks,
    title: `${endedSeason}/${String(endedSeason + 1).slice(-2)} 赛季结束`,
    body: `${club.nameZh} 最终排名第 ${position || '—'} 位。你出场 ${stats.appearances} 次，打进 ${stats.goals} 球，平均评分 ${averageRating.toFixed(1)}。${awardText}`,
    kind: 'award',
  })
  if (promoted || relegated) {
    world.news.unshift({
      id: `news:season:movement:${endedSeason}`,
      season: endedSeason,
      week: world.totalWeeks,
      title: promoted ? '升级成功' : '不幸降级',
      body: promoted
        ? `${club.nameZh} 获得了升级资格，下赛季将征战更高一级联赛。`
        : `${club.nameZh} 排名靠后，下赛季将降入低一级联赛。`,
      kind: 'club',
    })
  }
  if (retired) {
    world.news.unshift({
      id: `news:retire:${endedSeason}`,
      season: endedSeason,
      week: world.totalWeeks,
      title: '挂靴时刻',
      body: `${user.name} 宣布结束球员生涯。${reason}让他做出了这个决定。`,
      kind: 'award',
    })
  } else {
    world.news.unshift({
      id: `news:season:start:${nextSeason}`,
      season: nextSeason,
      week: 1,
      title: `${nextSeason}/${String(nextSeason + 1).slice(-2)} 赛季开始`,
      body: `新赛季的赛程已经公布。${club.nameZh} 将在 ${nextSeason} 赛季继续征战${world.leagues[club.leagueId]?.nameZh ?? '联赛'}。`,
      kind: 'system',
    })
  }
  world.news = world.news.slice(0, 120)

  return {
    season: endedSeason,
    newSeason: nextSeason,
    summary,
    champion,
    promoted,
    relegated,
    retired,
    retirementReason: reason,
    awards,
  }
}

export function advanceWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  if (world.retired) {
    return { world, match: null, event: null, seasonTransition: null, weekPlayed, seasonPlayed }
  }

  recomputeAllStrengths(world)
  recoverInjuries(world)
  applyTraining(world, plan.training)
  applyExtraAction(world, plan.extra)
  expireEvents(world)

  const match = simulateWeekFixtures(world)
  if (match) world.lastMatch = match

  settleWeekFinance(world)
  const event = generateWeeklyEvent(world, match, plan)
  if (world.week % 3 === 0) updatePlayerValue(world)

  let seasonTransition: SeasonTransition | null = null
  world.week += 1
  if (world.week > world.totalWeeks) {
    seasonTransition = endSeason(world)
  }

  return { world, match, event, seasonTransition, weekPlayed, seasonPlayed }
}

export function advanceWeeks(world: WorldState, plan: WeeklyPlan, count: number): TurnResult[] {
  const results: TurnResult[] = []
  let current = world
  for (let i = 0; i < count; i += 1) {
    if (current.retired) break
    const result = advanceWeek(current, plan)
    results.push(result)
    current = result.world
    if (result.seasonTransition) break
  }
  return results
}
