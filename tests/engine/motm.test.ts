import { describe, expect, it } from 'vitest'
import { ATTR_KEYS } from '../../src/domain/attributes'
import { getUserMatchFixture, simulateUserFixture } from '../../src/engine/match'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('man of the match', () => {
  it('uses the selected player rating instead of an unrelated random rating', () => {
    const world = generateWorld(testOptions({ seed: 24 }), TEST_NOW)
    const user = world.players[world.playerId]
    for (const key of ATTR_KEYS) user.attributes[key] = 92
    user.fitness = 100
    const fixture = getUserMatchFixture(world)
    expect(fixture).not.toBeNull()

    const report = simulateUserFixture(world, fixture!)

    expect(report.userRating).toBeLessThan(8.3)
    expect(report.motmName).toBe(user.name)
    expect(report.motmRating).toBe(report.userRating)
  })
})
