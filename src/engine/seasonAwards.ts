import type { CareerEntry, Club, Id, League, Player, SeasonStat, SeasonSummary, WorldState } from '../domain/types'

export function leagueTopScorer(world: WorldState, leagueId: Id): Player | null {
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
  return candidates[0]!
}

export function collectAwards(
  world: WorldState,
  user: Player,
  league: League | undefined,
  position: number,
  averageRating: number,
): string[] {
  const awards: string[] = []
  if (position === 1) awards.push(`${league?.nameZh ?? '联赛'}冠军`)
  if (league) {
    const topScorer = leagueTopScorer(world, league.id)
    if (topScorer?.isUser && topScorer.seasonStats.goals > 0) awards.push('联赛金靴')
  }
  if (user.age <= 21 && user.seasonStats.appearances >= 15 && averageRating >= 7) {
    awards.push('赛季最佳年轻球员')
  }
  return awards
}

interface SeasonSummaryInput {
  endedSeason: number
  club: Club
  position: number
  stats: SeasonStat
  averageRating: number
  awards: string[]
  note: string | undefined
}

export function buildSeasonSummary(input: SeasonSummaryInput): SeasonSummary {
  return {
    season: input.endedSeason,
    clubId: input.club.id,
    clubName: input.club.nameZh,
    tier: input.club.tier,
    leaguePosition: input.position,
    appearances: input.stats.appearances,
    goals: input.stats.goals,
    assists: input.stats.assists,
    averageRating: input.averageRating,
    awards: input.awards,
    note: input.note,
  }
}

interface SeasonHistoryInput {
  endedSeason: number
  user: Player
  club: Club
  stats: SeasonStat
  averageRating: number
  note: string | undefined
}

export function recordSeasonHistory(input: SeasonHistoryInput): void {
  const entry: CareerEntry = {
    season: input.endedSeason,
    age: input.user.age - 1,
    clubId: input.club.id,
    clubName: input.club.nameZh,
    tier: input.club.tier,
    appearances: input.stats.appearances,
    goals: input.stats.goals,
    assists: input.stats.assists,
    averageRating: input.averageRating,
    note: input.note,
  }
  input.user.careerStats.push({ ...input.stats })
  input.user.history.push(entry)
}

interface SeasonNewsInput {
  world: WorldState
  user: Player
  endedSeason: number
  nextSeason: number
  club: Club
  position: number
  stats: SeasonStat
  averageRating: number
  awards: string[]
  promoted: boolean
  relegated: boolean
  retired: boolean
  reason: string | null
}

export function publishSeasonNews(input: SeasonNewsInput): void {
  const { world, club, endedSeason, nextSeason, stats, averageRating, awards } = input
  const awardText = awards.length > 0 ? ` 个人荣誉：${awards.join('、')}。` : ''
  world.news.unshift({
    id: `news:season:end:${endedSeason}`,
    season: endedSeason,
    week: world.totalWeeks,
    title: `${endedSeason}/${String(endedSeason + 1).slice(-2)} 赛季结束`,
    body: `${club.nameZh} 最终排名第 ${input.position || '—'} 位。你出场 ${stats.appearances} 次，打进 ${stats.goals} 球，平均评分 ${averageRating.toFixed(1)}。${awardText}`,
    kind: 'award',
  })
  if (input.promoted || input.relegated) {
    world.news.unshift({
      id: `news:season:movement:${endedSeason}`,
      season: endedSeason,
      week: world.totalWeeks,
      title: input.promoted ? '升级成功' : '不幸降级',
      body: input.promoted
        ? `${club.nameZh} 获得了升级资格，下赛季将征战更高一级联赛。`
        : `${club.nameZh} 排名靠后，下赛季将降入低一级联赛。`,
      kind: 'club',
    })
  }
  if (input.retired) {
    world.news.unshift({
      id: `news:retire:${endedSeason}`,
      season: endedSeason,
      week: world.totalWeeks,
      title: '挂靴时刻',
      body: `${input.user.name} 宣布结束球员生涯。${input.reason}让他做出了这个决定。`,
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
}
