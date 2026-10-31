import { describe, expect, expectTypeOf, it } from 'vitest'
import { ENGINE_VERSION, STARTING_CLUBS, generateWorld, getClubFixtures } from '../../src/world'
import { ENGINE_VERSION as CORE_ENGINE_VERSION } from '../../src/world/constants'
import { generateWorld as generateCoreWorld } from '../../src/world/generator'
import type { CountryPack } from '../../src/world'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('world public entry', () => {
  it('exports generation constants and helpers', () => {
    expect(ENGINE_VERSION).toBe('0.2.0')
    expect(STARTING_CLUBS.length).toBeGreaterThan(0)
    expect(typeof generateWorld).toBe('function')
    expect(typeof getClubFixtures).toBe('function')
  })

  it('generates worlds with the current structure version', () => {
    expect(CORE_ENGINE_VERSION).toBe('0.2.0')
    const world = generateCoreWorld(testOptions(), TEST_NOW)
    expect(world.version).toBe(2)
  })

  it('exposes datapack types', () => {
    expectTypeOf<CountryPack>().not.toBeAny()
  })
})
