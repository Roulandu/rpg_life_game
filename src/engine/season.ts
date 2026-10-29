import { clamp, overall, round1 } from '../domain/attributes'
import { generateFixtures } from '../domain/fixtures'
import { computeLeagueTable } from '../domain/leagueTable'
import { computeClubStrength } from '../domain/strength'
import type {
  Club,
  Id,
  League,
  Player,
  SeasonStat,
  SeasonSummary,
  WorldState,
} from '../domain/types'
import { createRng } from '../lib/rng'
import { paySeasonBonuses, reputationAfterSeason, updatePlayerValue } from './finance'
import { retirementReason } from './retirement'
import { buildSeasonSummary, collectAwards, publishSeasonNews, recordSeasonHistory } from './seasonAwards'

export interface SeasonEvaluation {
  endedSeason: number
  nextSeason: number
  club: Club
  league: League | undefined
  position: number
  stats: SeasonStat
  averageRating: number
  champion: boolean
  promoted: boolean
  relegated: boolean
  awards: string[]
  summary: SeasonSummary
}

export interface SeasonRetirement {
  retired: boolean
  retirementReason: string | null
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

function seasonStanding(world: WorldState, club: Club, endedSeason: number): { league: League | undefined; position: number } {
  const league = Object.values(world.leagues).find((item) => item.id === club.leagueId)
  const table = league ? computeLeagueTable(world, league.id, endedSeason) : []
  const position = table.findIndex((row) => row.clubId === club.id) + 1
  return { league, position }
}

function seasonFlags(league: League | undefined, position: number): { champion: boolean; promoted: boolean; relegated: boolean } {
  const champion = position === 1
  const promoted = Boolean(league) && league!.tier === 2 && position > 0 && position <= (league!.promotionSlots || 0)
  const relegated = Boolean(league) && league!.tier === 1 && position > 0 && position > (league!.clubIds.length - (league!.relegationSlots || 0))
  return { champion, promoted, relegated }
}

export function evaluateSeason(world: WorldState, endedSeason: number, nextSeason: number): SeasonEvaluation {
  const user = world.players[world.playerId]
  if (!user) throw new Error('User player not found')
  const club = world.clubs[user.clubId] ?? Object.values(world.clubs)[0]
  const { league, position } = seasonStanding(world, club, endedSeason)
  const stats = user.seasonStats
  const averageRating = stats.ratingCount > 0 ? round1(stats.ratingSum / stats.ratingCount) : 0
  const flags = seasonFlags(league, position)
  const awards = collectAwards(world, user, league, position, averageRating)

  const noteParts: string[] = []
  if (flags.promoted) noteParts.push('随队升级')
  if (flags.relegated) noteParts.push('随队降级')

  paySeasonBonuses(world, {
    appearances: stats.appearances,
    goals: stats.goals,
    assists: stats.assists,
    champion: flags.champion,
    promoted: flags.promoted,
  })
  reputationAfterSeason(world, averageRating)

  const summary = buildSeasonSummary({
    endedSeason,
    club,
    position,
    stats,
    averageRating,
    awards,
    note: noteParts.length > 0 ? noteParts.join(' · ') : undefined,
  })
  return { endedSeason, nextSeason, club, league, position, stats, averageRating, awards, summary, ...flags }
}

function handleRetirement(world: WorldState, summary: SeasonSummary): SeasonRetirement {
  const reason = retirementReason(world)
  const retired = reason != null
  if (retired) {
    world.retired = true
    summary.note = [summary.note, `宣布退役（${reason}）`].filter(Boolean).join(' · ')
  }
  return { retired, retirementReason: reason }
}

function prepareNextSeason(world: WorldState, nextSeason: number): void {
  for (const player of Object.values(world.players)) {
    player.seasonStats = emptySeasonStat(nextSeason, player.clubId)
  }
  updatePlayerValue(world)
  world.season = nextSeason
  world.week = 1
  world.lastMatch = null
  world.fixtures = { ...world.fixtures, ...generateFixtures(world.leagues, world.seed, nextSeason) }
  for (const club of Object.values(world.clubs)) {
    club.strength = computeClubStrength(club, world.players)
  }
  for (const event of Object.values(world.events)) {
    if (event.status === 'open') event.status = 'expired'
  }
}

export function applySeasonTransition(
  world: WorldState,
  user: Player,
  evaluation: SeasonEvaluation,
): SeasonRetirement {
  applyPromotionRelegation(world, evaluation.endedSeason)
  agePlayers(world)

  const retirement = handleRetirement(world, evaluation.summary)
  recordSeasonHistory({
    endedSeason: evaluation.endedSeason,
    user,
    club: evaluation.club,
    stats: evaluation.stats,
    averageRating: evaluation.averageRating,
    note: evaluation.summary.note,
  })

  renewContracts(world, evaluation.endedSeason, evaluation.nextSeason)
  world.seasonSummaries.push(evaluation.summary)
  prepareNextSeason(world, evaluation.nextSeason)
  publishSeasonNews({
    world,
    user,
    endedSeason: evaluation.endedSeason,
    nextSeason: evaluation.nextSeason,
    club: evaluation.club,
    position: evaluation.position,
    stats: evaluation.stats,
    averageRating: evaluation.averageRating,
    awards: evaluation.awards,
    promoted: evaluation.promoted,
    relegated: evaluation.relegated,
    retired: retirement.retired,
    reason: retirement.retirementReason,
  })
  return retirement
}
