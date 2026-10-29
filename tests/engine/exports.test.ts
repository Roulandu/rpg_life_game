import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  advanceWeek,
  applyChatActionProposal,
  applyEffects,
  autoResolveKeyMoments,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveEvent,
  resolveKeyMoment,
} from '../../src/engine'
import type { SeasonTransition, TurnResult } from '../../src/engine'

describe('engine public entry', () => {
  it('exports turn and event actions', () => {
    expect(typeof advanceWeek).toBe('function')
    expect(typeof resolveEvent).toBe('function')
    expect(typeof applyEffects).toBe('function')
    expect(typeof applyChatActionProposal).toBe('function')
  })

  it('exports key moment actions', () => {
    expect(typeof hasPendingKeyMoments).toBe('function')
    expect(typeof resolveKeyMoment).toBe('function')
    expect(typeof autoResolveKeyMoments).toBe('function')
    expect(typeof finalizeMatchday).toBe('function')
  })

  it('exposes result types', () => {
    expectTypeOf<TurnResult>().not.toBeAny()
    expectTypeOf<SeasonTransition>().not.toBeAny()
  })
})
