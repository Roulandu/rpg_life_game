import { describe, expect, it } from 'vitest'
import type { Position, WorldState } from '../../src/domain/types'
import {
  ageGroupWeight,
  getClubFixtures,
  getLeague,
  getPlayerWorldClub,
  getUserPlayer,
  getWeekFixtures,
} from '../../src/world/queries'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('world read-only queries', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('returns the user club and player', () => {
    expect(getPlayerWorldClub(world).id).toBe(world.clubId)
    expect(getUserPlayer(world).id).toBe(world.playerId)
    expect(getUserPlayer(world).isUser).toBe(true)
  })

  it('throws when the user player is missing', () => {
    const broken: WorldState = { ...world, playerId: 'player:missing' }
    expect(() => getUserPlayer(broken)).toThrow('User player not found')
  })

  it('falls back to the first club when the user club is missing', () => {
    const broken: WorldState = { ...world, clubId: 'club:missing' }
    expect(getPlayerWorldClub(broken).id).toBe(Object.values(world.clubs)[0].id)
  })

  it('looks up a league by id and returns undefined for unknown ids', () => {
    const club = getPlayerWorldClub(world)
    expect(getLeague(world, club.leagueId)?.id).toBe(club.leagueId)
    expect(getLeague(world, 'league:missing')).toBeUndefined()
  })

  it('lists a club season fixtures sorted by week', () => {
    const fixtures = getClubFixtures(world, world.clubId)
    expect(fixtures).toHaveLength(38)
    expect(fixtures.every((fixture) => fixture.homeId === world.clubId || fixture.awayId === world.clubId)).toBe(true)
    const weeks = fixtures.map((fixture) => fixture.week)
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b))
    expect(getClubFixtures(world, world.clubId, 9999)).toHaveLength(0)
  })

  it('lists all fixtures of a week across leagues', () => {
    const fixtures = getWeekFixtures(world, 1)
    expect(fixtures.length).toBeGreaterThan(0)
    expect(fixtures.every((fixture) => fixture.week === 1)).toBe(true)
    expect(getWeekFixtures(world, 1, 9999)).toHaveLength(0)
  })

  it('weights age groups by position', () => {
    const fwd: Position = 'ST'
    expect(ageGroupWeight(fwd)).toBe(3)
    expect(ageGroupWeight('CM')).toBe(1.5)
    expect(ageGroupWeight('CB')).toBe(0.4)
    expect(ageGroupWeight('GK')).toBe(0.4)
  })
})
