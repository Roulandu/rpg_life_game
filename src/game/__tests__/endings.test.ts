import { describe, expect, it } from 'vitest'
import { createInitialState, setAttribute, advanceAge } from '../state'
import type { GameState } from '../types'
import { evaluateEnding, isLifeOver, TERMINAL_AGE } from '../endings'

function stateWith(
  overrides: Partial<Record<'intelligence' | 'physique' | 'charm', number>> = {},
  wealth = 0,
  age = 80,
  milestones: string[] = [],
): GameState {
  let state = createInitialState()
  state = setAttribute(state, 'intelligence', overrides.intelligence ?? 0)
  state = setAttribute(state, 'physique', overrides.physique ?? 0)
  state = setAttribute(state, 'charm', overrides.charm ?? 0)
  state = { ...state, wealth, milestones }
  state = advanceAge(state, age - state.age)
  return state
}

describe('isLifeOver', () => {
  it('returns false for ages below the terminal age', () => {
    expect(isLifeOver({ ...createInitialState(), age: TERMINAL_AGE - 1 })).toBe(false)
  })

  it('returns true at and beyond the terminal age', () => {
    expect(isLifeOver({ ...createInitialState(), age: TERMINAL_AGE })).toBe(true)
    expect(isLifeOver({ ...createInitialState(), age: TERMINAL_AGE + 10 })).toBe(true)
  })
})

describe('evaluateEnding', () => {
  it('awards career success for high wealth and intelligence', () => {
    const ending = evaluateEnding(stateWith({ intelligence: 80 }, 600))
    expect(ending.id).toBe('career-success')
  })

  it('awards impoverished for low wealth', () => {
    const ending = evaluateEnding(stateWith({ intelligence: 90 }, 20))
    expect(ending.id).toBe('impoverished')
  })

  it('awards family happiness for high charm and decent wealth', () => {
    const ending = evaluateEnding(stateWith({ charm: 80 }, 200))
    expect(ending.id).toBe('family-happiness')
  })

  it('awards balanced life for good physique and intelligence', () => {
    const ending = evaluateEnding(stateWith({ physique: 80, intelligence: 60 }, 200))
    expect(ending.id).toBe('balanced-life')
  })

  it('awards entrepreneurial legend for starting a business with wealth', () => {
    const ending = evaluateEnding(stateWith({ intelligence: 30 }, 450, 80, ['started-business']))
    expect(ending.id).toBe('entrepreneur-legend')
  })

  it('awards scholar life for studying with high intelligence', () => {
    const ending = evaluateEnding(stateWith({ intelligence: 85 }, 100, 80, ['studied']))
    expect(ending.id).toBe('scholar-life')
  })

  it('awards celebrity for elite network, charm and wealth', () => {
    const ending = evaluateEnding(
      stateWith({ charm: 85 }, 300, 80, ['vip-network']),
    )
    expect(ending.id).toBe('celebrity')
  })

  it('awards recluse for high intelligence and low charm', () => {
    const ending = evaluateEnding(stateWith({ intelligence: 50, charm: -30 }, 200))
    expect(ending.id).toBe('recluse')
  })

  it('falls back to plain life otherwise', () => {
    const ending = evaluateEnding(stateWith({}, 200))
    expect(ending.id).toBe('plain-life')
  })

  it('every ending has a title and description', () => {
    for (const ending of [
      evaluateEnding(stateWith({ intelligence: 30 }, 450, 80, ['started-business'])),
      evaluateEnding(stateWith({ intelligence: 85 }, 100, 80, ['studied'])),
      evaluateEnding(stateWith({ charm: 85 }, 300, 80, ['vip-network'])),
      evaluateEnding(stateWith({ intelligence: 50, charm: -30 }, 200)),
      evaluateEnding(stateWith({ intelligence: 80 }, 600)),
      evaluateEnding(stateWith({ intelligence: 90 }, 20)),
      evaluateEnding(stateWith({ charm: 80 }, 200)),
      evaluateEnding(stateWith({ physique: 80, intelligence: 60 }, 200)),
      evaluateEnding(stateWith({}, 200)),
    ]) {
      expect(ending.title.length).toBeGreaterThan(0)
      expect(ending.description.length).toBeGreaterThan(0)
    }
  })
})
