import type { Id, LeagueTableRow, WorldState } from './types'

function emptyRow(clubId: Id): LeagueTableRow {
  return {
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [],
  }
}

function playedFixtures(world: WorldState, leagueId: Id, season: number) {
  return Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.competitionId === leagueId &&
        fixture.season === season &&
        fixture.status === 'played' &&
        fixture.homeGoals != null &&
        fixture.awayGoals != null,
    )
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))
}

function applyFixture(home: LeagueTableRow, away: LeagueTableRow, homeGoals: number, awayGoals: number): void {
  home.played += 1
  away.played += 1
  home.goalsFor += homeGoals
  home.goalsAgainst += awayGoals
  away.goalsFor += awayGoals
  away.goalsAgainst += homeGoals

  if (homeGoals > awayGoals) {
    home.won += 1
    away.lost += 1
    home.points += 3
    home.form.push('W')
    away.form.push('L')
  } else if (homeGoals < awayGoals) {
    away.won += 1
    home.lost += 1
    away.points += 3
    home.form.push('L')
    away.form.push('W')
  } else {
    home.drawn += 1
    away.drawn += 1
    home.points += 1
    away.points += 1
    home.form.push('D')
    away.form.push('D')
  }
}

function byRanking(a: LeagueTableRow, b: LeagueTableRow): number {
  if (b.points !== a.points) return b.points - a.points
  const aGd = a.goalsFor - a.goalsAgainst
  const bGd = b.goalsFor - b.goalsAgainst
  if (bGd !== aGd) return bGd - aGd
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  return a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0
}

export function computeLeagueTable(
  world: WorldState,
  leagueId: Id,
  season = world.season,
): LeagueTableRow[] {
  const league = world.leagues[leagueId]
  if (!league) return []
  const rows = new Map<Id, LeagueTableRow>()
  for (const clubId of league.clubIds) rows.set(clubId, emptyRow(clubId))

  for (const fixture of playedFixtures(world, leagueId, season)) {
    const home = rows.get(fixture.homeId)
    const away = rows.get(fixture.awayId)
    if (!home || !away) continue
    applyFixture(home, away, fixture.homeGoals ?? 0, fixture.awayGoals ?? 0)
  }

  const result = [...rows.values()]
  for (const row of result) row.form = row.form.slice(-5)
  result.sort(byRanking)
  return result
}

export function leaguePosition(world: WorldState, clubId: Id, season = world.season): number {
  const club = world.clubs[clubId]
  if (!club) return 0
  const table = computeLeagueTable(world, club.leagueId, season)
  const index = table.findIndex((row) => row.clubId === clubId)
  return index < 0 ? 0 : index + 1
}

export function goalDifference(row: LeagueTableRow): number {
  return row.goalsFor - row.goalsAgainst
}
