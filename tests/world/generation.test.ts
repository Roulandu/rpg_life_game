import { describe, expect, it } from 'vitest'
import { generateWorld } from '../../src/world/generator'
import { START_SEASON } from '../../src/world/constants'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('world generation fallbacks', () => {
  it('falls back to the default starting club for an unknown club id', () => {
    const world = generateWorld(testOptions({ clubId: 'club:missing' }), TEST_NOW)
    expect(world.clubId).toBe('club:ENG:2:04')
    expect(world.clubs[world.clubId]?.id).toBe('club:ENG:2:04')
  })

  it('gives older prospects a shorter contract than minors', () => {
    const minor = generateWorld(testOptions({ age: 17 }), TEST_NOW)
    const senior = generateWorld(testOptions({ age: 21 }), TEST_NOW)
    expect(minor.players[minor.playerId]?.contract.endSeason).toBe(START_SEASON + 3)
    expect(senior.players[senior.playerId]?.contract.endSeason).toBe(START_SEASON + 2)
  })

  it('lowers the initial coach trust bonus for older prospects', () => {
    const minor = generateWorld(testOptions({ age: 17 }), TEST_NOW)
    const senior = generateWorld(testOptions({ age: 21 }), TEST_NOW)
    const minorTrust = minor.relationships[`rel:coach:${minor.playerId}`]?.trust ?? 0
    const seniorTrust = senior.relationships[`rel:coach:${senior.playerId}`]?.trust ?? 0
    expect(minorTrust).toBeGreaterThanOrEqual(49)
    expect(minorTrust).toBeLessThanOrEqual(61)
    expect(seniorTrust).toBeGreaterThanOrEqual(45)
    expect(seniorTrust).toBeLessThanOrEqual(57)
  })
})
