import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  ATTR_KEYS,
  CURRENT_SAVE_VERSION,
  POSITION_LABELS,
  buildMatchLineups,
  buildPitchFrame,
  clamp,
  computeClubStrength,
  computeLeagueTable,
  effectsSummary,
  generateFixtures,
  overall,
  selectLineup,
  successBasisText,
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
    expect(typeof selectLineup).toBe('function')
    expect(typeof buildMatchLineups).toBe('function')
    expect(typeof buildPitchFrame).toBe('function')
    expect(typeof successBasisText).toBe('function')
    expect(typeof effectsSummary).toBe('function')
    expect(CURRENT_SAVE_VERSION).toBeGreaterThanOrEqual(2)
  })

  it('exposes domain types', () => {
    expectTypeOf<WorldState>().not.toBeAny()
    expectTypeOf<Club>().not.toBeAny()
    expectTypeOf<ChatActionProposal>().not.toBeAny()
  })
})
