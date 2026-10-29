import { describe, expect, expectTypeOf, it } from 'vitest'
import { ENGINE_VERSION, STARTING_CLUBS, generateWorld, getClubFixtures } from '../../src/world'
import type { CountryPack } from '../../src/world'

describe('world public entry', () => {
  it('exports generation constants and helpers', () => {
    expect(ENGINE_VERSION).toBe('0.1.0')
    expect(STARTING_CLUBS.length).toBeGreaterThan(0)
    expect(typeof generateWorld).toBe('function')
    expect(typeof getClubFixtures).toBe('function')
  })

  it('exposes datapack types', () => {
    expectTypeOf<CountryPack>().not.toBeAny()
  })
})
