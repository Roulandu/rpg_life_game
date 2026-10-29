import { describe, expect, it } from 'vitest'
import { ATTR_KEYS } from '../../src/domain/attributes'
import type { WorldState } from '../../src/domain/types'
import { getUserMatchFixture, simulateUserFixture, simulateWeekFixtures } from '../../src/engine/match'
import { hashState } from '../../src/lib/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function worldWithUserFixture(seed = 2027): { world: WorldState; fixtureId: string } {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const world = generateWorld(testOptions({ seed: seed + attempt }), TEST_NOW)
    const user = world.players[world.playerId]
    for (const key of ATTR_KEYS) user.attributes[key] = 92
    user.fitness = 100
    const fixture = getUserMatchFixture(world)
    if (fixture) return { world, fixtureId: fixture.id }
  }
  throw new Error('no user fixture found')
}

describe('simulateUserFixture', () => {
  it('builds a consistent match report and marks the fixture played', () => {
    const { world, fixtureId } = worldWithUserFixture()
    const fixture = world.fixtures[fixtureId]!
    const report = simulateUserFixture(world, fixture)

    expect(fixture.status).toBe('played')
    expect(report.homeGoals).toBe(fixture.homeGoals)
    expect(report.awayGoals).toBe(fixture.awayGoals)
    expect(report.events[0]?.minute).toBe(0)
    expect(report.events.at(-1)?.type).toBe('fulltime')
    const minutes = report.events.map((event) => event.minute)
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
    if (report.userPlayed) {
      expect(report.userRating).toBeGreaterThanOrEqual(4.3)
      expect(report.userRating).toBeLessThanOrEqual(9.9)
    }
    expect(world.news[0]?.id).toBe(`news:match:${fixture.id}`)
  })

  it('is deterministic for identical worlds', () => {
    const first = worldWithUserFixture(2027)
    const second = worldWithUserFixture(2027)
    const a = simulateUserFixture(first.world, first.world.fixtures[first.fixtureId]!)
    const b = simulateUserFixture(second.world, second.world.fixtures[second.fixtureId]!)
    expect(hashState(a)).toBe(hashState(b))
  })

  it('plays every scheduled fixture of the current week', () => {
    const { world } = worldWithUserFixture()
    const report = simulateWeekFixtures(world)
    expect(report).not.toBeNull()
    const scheduled = Object.values(world.fixtures).filter(
      (fixture) => fixture.season === world.season && fixture.week === world.week && fixture.status === 'scheduled',
    )
    expect(scheduled).toHaveLength(0)
  })
})
