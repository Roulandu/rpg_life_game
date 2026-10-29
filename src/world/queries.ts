import { POSITION_GROUPS } from '../domain/attributes'
import type { Club, Fixture, Id, League, Player, Position, WorldState } from '../domain/types'

export function getPlayerWorldClub(world: WorldState): Club {
  return world.clubs[world.clubId] ?? Object.values(world.clubs)[0]
}

export function getUserPlayer(world: WorldState): Player {
  const player = world.players[world.playerId]
  if (!player) throw new Error('User player not found')
  return player
}

export function getLeague(world: WorldState, leagueId: Id): League | undefined {
  return world.leagues[leagueId]
}

export function getClubFixtures(world: WorldState, clubId: Id, season = world.season): Fixture[] {
  return Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.season === season && (fixture.homeId === clubId || fixture.awayId === clubId),
    )
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))
}

export function getWeekFixtures(
  world: WorldState,
  week = world.week,
  season = world.season,
): Fixture[] {
  return Object.values(world.fixtures)
    .filter((fixture) => fixture.season === season && fixture.week === week)
    .sort(
      (a, b) => a.competitionId.localeCompare(b.competitionId) || a.id.localeCompare(b.id),
    )
}

export function ageGroupWeight(position: Position): number {
  return POSITION_GROUPS[position] === 'FWD' ? 3 : POSITION_GROUPS[position] === 'MID' ? 1.5 : 0.4
}
