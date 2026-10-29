import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  ATTR_KEYS,
  POSITION_LABELS,
  clamp,
  computeClubStrength,
  computeLeagueTable,
  generateFixtures,
  overall,
} from '../../src/domain'
import type { ChatActionProposal, Club, WorldState } from '../../src/domain'

describe('domain public entry', () => {
  it('exports attribute and league helpers', () => {
    expect(ATTR_KEYS.length).toBeGreaterThan(0)
    expect(POSITION_LABELS.ST).toBeTruthy()
    expect(clamp(5, 0, 3)).toBe(3)
    expect(typeof generateFixtures).toBe('function')
    expect(typeof computeLeagueTable).toBe('function')
    expect(typeof computeClubStrength).toBe('function')
    expect(typeof overall).toBe('function')
  })

  it('exposes domain types', () => {
    expectTypeOf<WorldState>().not.toBeAny()
    expectTypeOf<Club>().not.toBeAny()
    expectTypeOf<ChatActionProposal>().not.toBeAny()
  })
})
