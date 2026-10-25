import { describe, expect, it } from 'vitest'
import { overall } from '../../src/domain/attributes'
import { hashState } from '../../src/engine/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('world generation', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('creates the English two-tier pyramid', () => {
    expect(Object.keys(world.leagues)).toHaveLength(2)
    expect(Object.keys(world.clubs)).toHaveLength(40)
    for (const league of Object.values(world.leagues)) {
      expect(league.clubIds).toHaveLength(20)
    }
  })

  it('generates complete squads and a full fixture list', () => {
    expect(Object.keys(world.players)).toHaveLength(40 * 23 + 1)
    expect(Object.keys(world.fixtures)).toHaveLength(760)
    for (const league of Object.values(world.leagues)) {
      const fixtures = Object.values(world.fixtures).filter(
        (fixture) => fixture.competitionId === league.id,
      )
      expect(fixtures).toHaveLength(380)
      for (const clubId of league.clubIds) {
        const clubFixtures = fixtures.filter(
          (fixture) => fixture.homeId === clubId || fixture.awayId === clubId,
        )
        expect(clubFixtures).toHaveLength(38)
      }
    }
    for (const fixture of Object.values(world.fixtures)) {
      expect(fixture.homeId).not.toBe(fixture.awayId)
      expect(fixture.week).toBeGreaterThanOrEqual(1)
      expect(fixture.week).toBeLessThanOrEqual(38)
      expect(fixture.status).toBe('scheduled')
    }
  })

  it('alternates home and away without long streaks', () => {
    for (const clubId of Object.keys(world.clubs)) {
      const fixtures = Object.values(world.fixtures)
        .filter((fixture) => fixture.homeId === clubId || fixture.awayId === clubId)
        .sort((a, b) => a.week - b.week)
      expect(fixtures).toHaveLength(38)
      expect(fixtures.filter((fixture) => fixture.homeId === clubId)).toHaveLength(19)
      expect(fixtures.filter((fixture) => fixture.awayId === clubId)).toHaveLength(19)

      let streak = 1
      let longest = 1
      for (let index = 1; index < fixtures.length; index += 1) {
        const previous = fixtures[index - 1]!
        const current = fixtures[index]!
        const previousHome = previous.homeId === clubId
        const currentHome = current.homeId === clubId
        streak = previousHome === currentHome ? streak + 1 : 1
        longest = Math.max(longest, streak)
      }
      expect(longest).toBeLessThanOrEqual(3)
    }
  })

  it('places the user in the chosen club', () => {
    const user = world.players[world.playerId]
    expect(user.isUser).toBe(true)
    expect(user.clubId).toBe('club:ENG:2:04')
    expect(world.clubs['club:ENG:2:04'].squadIds).toContain(user.id)
    expect(world.clubs['club:ENG:2:04'].squadIds).toHaveLength(24)
    expect(user.age).toBe(17)
    expect(overall(user)).toBeGreaterThan(30)
  })

  it('keeps all generated values finite and inside bounds', () => {
    for (const player of Object.values(world.players)) {
      expect(Number.isFinite(overall(player))).toBe(true)
      for (const value of Object.values(player.attributes)) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
      expect(Number.isFinite(player.value)).toBe(true)
      expect(player.value).toBeGreaterThan(0)
    }
    expect(Number.isFinite(world.finance.balance)).toBe(true)
    expect(world.finance.balance).toBeGreaterThanOrEqual(0)
  })

  it('is byte-for-byte deterministic for the same seed and options', () => {
    const again = generateWorld(testOptions(), TEST_NOW)
    expect(hashState(again)).toBe(hashState(world))
  })

  it('changes when the seed changes', () => {
    const other = generateWorld(testOptions({ seed: 987654 }), TEST_NOW)
    expect(hashState(other)).not.toBe(hashState(world))
  })
})
