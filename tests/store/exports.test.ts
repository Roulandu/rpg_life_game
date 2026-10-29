import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  selectActionLabel,
  selectClubFixtures,
  selectPendingKeyMoments,
  selectProviderDefaults,
  selectStartingClubs,
  useGameStore,
} from '../../src/store'
import type { GameStore } from '../../src/store'

describe('store public entry', () => {
  it('exports the store hook and selectors', () => {
    expect(typeof useGameStore).toBe('function')
    expect(typeof selectPendingKeyMoments).toBe('function')
    expect(typeof selectClubFixtures).toBe('function')
    expect(typeof selectStartingClubs).toBe('function')
    expect(typeof selectActionLabel).toBe('function')
    expect(typeof selectProviderDefaults('openai').model).toBe('string')
  })

  it('exposes the store type', () => {
    expectTypeOf<GameStore>().not.toBeAny()
  })
})
