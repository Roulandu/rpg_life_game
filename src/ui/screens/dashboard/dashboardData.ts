import { computeLeagueTable } from '../../../domain/leagueTable'
import type { Club, Fixture, GameEvent, League, LeagueTableRow, MatchReport, NewsItem, Player, WorldState } from '../../../domain/types'
import { selectPendingKeyMoments } from '../../../store/selectors'
import { formLabel, formOf, nextFixtureOf, opponentOfClub } from '../../gameHelpers'

export interface DashboardData {
  user: Player
  club: Club
  league: League
  table: LeagueTableRow[]
  position: number
  next: Fixture | undefined
  opponent: Club | null
  isHome: boolean
  opponentFormLabel: string
  last: MatchReport | null
  pendingMatch: boolean
  pendingCount: number
  resolvedMoments: number
  totalMoments: number
  openEvents: GameEvent[]
  latestEvent: GameEvent | undefined
  news: NewsItem[]
}

export function buildDashboardData(world: WorldState): DashboardData {
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  const league = world.leagues[club.leagueId]
  const table = computeLeagueTable(world, league.id)
  const position = table.findIndex((item) => item.clubId === club.id) + 1
  const next = nextFixtureOf(world, club.id)
  const opponent = next ? opponentOfClub(world, next, club.id) : null
  const isHome = next?.homeId === club.id
  const opponentForm = opponent ? formOf(world, opponent.id) : []
  const opponentFormLabel = opponentForm.length > 0 ? opponentForm.map(formLabel).join('') : '尚无比赛'
  const last = world.lastMatch
  const pendingMatch = selectPendingKeyMoments(world)
  const moments = last?.keyMoments ?? []
  const pendingCount = moments.filter((moment) => !moment.outcome).length
  const openEvents = Object.values(world.events)
    .filter((event) => event.status === 'open')
    .sort((a, b) => b.week - a.week)

  return {
    user,
    club,
    league,
    table,
    position,
    next,
    opponent,
    isHome,
    opponentFormLabel,
    last,
    pendingMatch,
    pendingCount,
    resolvedMoments: moments.length - pendingCount,
    totalMoments: moments.length,
    openEvents,
    latestEvent: openEvents[0],
    news: world.news.slice(0, 3),
  }
}
