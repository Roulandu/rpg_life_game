import { computeLeagueTable } from '../domain/leagueTable'
import type { Fixture, Id, LeagueTableRow, WorldState } from '../domain/types'

export type FormResult = 'W' | 'D' | 'L'

export function fixtureResultForClub(fixture: Fixture, clubId: Id): FormResult | null {
  if (fixture.status !== 'played' || fixture.homeGoals == null || fixture.awayGoals == null) return null
  const home = fixture.homeId === clubId
  if (!home && fixture.awayId !== clubId) return null
  const goalsFor = home ? fixture.homeGoals : fixture.awayGoals
  const goalsAgainst = home ? fixture.awayGoals : fixture.homeGoals
  if (goalsFor > goalsAgainst) return 'W'
  if (goalsFor < goalsAgainst) return 'L'
  return 'D'
}

export function formOf(world: WorldState, clubId: Id, limit = 5): FormResult[] {
  return Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.season === world.season &&
        fixture.status === 'played' &&
        (fixture.homeId === clubId || fixture.awayId === clubId),
    )
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))
    .map((fixture) => fixtureResultForClub(fixture, clubId))
    .filter((result): result is FormResult => result != null)
    .slice(-limit)
}

export function nextFixtureOf(world: WorldState, clubId: Id): Fixture | undefined {
  return Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.season === world.season &&
        fixture.status === 'scheduled' &&
        (fixture.homeId === clubId || fixture.awayId === clubId),
    )
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))[0]
}

export function leagueRowFor(world: WorldState, leagueId: Id, clubId: Id): LeagueTableRow | undefined {
  return computeLeagueTable(world, leagueId).find((row) => row.clubId === clubId)
}

export function leaguePositionFor(world: WorldState, leagueId: Id, clubId: Id): number {
  return computeLeagueTable(world, leagueId).findIndex((row) => row.clubId === clubId) + 1
}

export function opponentOfClub(world: WorldState, fixture: Fixture, clubId: Id) {
  return world.clubs[fixture.homeId === clubId ? fixture.awayId : fixture.homeId]
}

export function formLabel(result: FormResult): string {
  return result === 'W' ? '胜' : result === 'D' ? '平' : '负'
}

export function formClass(result: FormResult): string {
  return result === 'W'
    ? 'border-accent/30 bg-accent/10 text-accent'
    : result === 'D'
      ? 'border-line bg-card-2 text-muted'
      : 'border-danger/30 bg-danger/10 text-danger'
}
