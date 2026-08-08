import { describe, expect, it } from 'vitest'
import { DIFFICULTY_CONFIG } from '../state'
import { createInitialState } from '../state'
import { applyOption } from '../events'
import { serialize, deserialize } from '../save'
import { ATTRIBUTE_CONFIG } from '../attributes'
import type { Difficulty, GameState } from '../types'

describe('createInitialState with setup options', () => {
  it('defaults to normal difficulty and balanced profile', () => {
    const state = createInitialState()
    expect(state.difficulty).toBe('normal')
    expect(state.wealth).toBe(0)
    expect(state.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.initial)
  })

  it('applies the scholar profile attribute deltas', () => {
    const state = createInitialState({ profile: 'scholar' })
    expect(state.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.initial + 15)
    expect(state.attributes.physique).toBe(ATTRIBUTE_CONFIG.physique.initial - 8)
  })

  it('applies the tycoon profile starting wealth', () => {
    const state = createInitialState({ profile: 'tycoon' })
    expect(state.wealth).toBe(200)
  })

  it('adds easy difficulty starting wealth', () => {
    const state = createInitialState({ difficulty: 'easy' })
    expect(state.wealth).toBe(DIFFICULTY_CONFIG.easy.startingWealth)
  })

  it('keeps starting wealth non-negative on hard', () => {
    const state = createInitialState({ difficulty: 'hard' })
    expect(state.wealth).toBeGreaterThanOrEqual(0)
  })

  it('clamps profile attributes to bounds', () => {
    const state = createInitialState({ profile: 'scholar' })
    expect(state.attributes.intelligence).toBeLessThanOrEqual(ATTRIBUTE_CONFIG.intelligence.max)
    expect(state.attributes.intelligence).toBeGreaterThanOrEqual(ATTRIBUTE_CONFIG.intelligence.min)
  })
})

describe('difficulty gain multiplier in applyOption', () => {
  function stateWithDifficulty(difficulty: Difficulty): GameState {
    return createInitialState({ difficulty })
  }

  it('scales attribute gains down on hard', () => {
    const state = stateWithDifficulty('hard')
    const next = applyOption(state, { label: 'x', effect: { attributes: { intelligence: 10 } } })
    expect(next.attributes.intelligence).toBe(
      Math.round(ATTRIBUTE_CONFIG.intelligence.initial + 10 * DIFFICULTY_CONFIG.hard.gain),
    )
  })

  it('scales attribute gains up on easy', () => {
    const state = stateWithDifficulty('easy')
    const next = applyOption(state, { label: 'x', effect: { attributes: { intelligence: 10 } } })
    expect(next.attributes.intelligence).toBe(
      Math.round(ATTRIBUTE_CONFIG.intelligence.initial + 10 * DIFFICULTY_CONFIG.easy.gain),
    )
  })

  it('does not change gains on normal', () => {
    const state = stateWithDifficulty('normal')
    const next = applyOption(state, { label: 'x', effect: { attributes: { intelligence: 10 } } })
    expect(next.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.initial + 10)
  })

  it('scales wealth gains by difficulty', () => {
    const state = stateWithDifficulty('easy')
    const next = applyOption(state, { label: 'x', effect: { wealth: 100 } })
    expect(next.wealth).toBe(
      DIFFICULTY_CONFIG.easy.startingWealth + Math.round(100 * DIFFICULTY_CONFIG.easy.gain),
    )
  })
})

describe('difficulty persistence', () => {
  it('round-trips difficulty through serialize/deserialize', () => {
    const state = createInitialState({ difficulty: 'hard', profile: 'scholar' })
    expect(deserialize(serialize(state))?.difficulty).toBe('hard')
  })

  it('defaults to normal when difficulty is invalid or missing', () => {
    const valid = createInitialState()
    const base = JSON.parse(serialize(valid))
    base.difficulty = 'nightmare'
    expect(deserialize(JSON.stringify(base))?.difficulty).toBe('normal')
    delete base.difficulty
    expect(deserialize(JSON.stringify(base))?.difficulty).toBe('normal')
  })
})
