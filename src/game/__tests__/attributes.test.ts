import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTE_CONFIG,
  ATTRIBUTE_NAMES,
  clampAttribute,
  createInitialAttributes,
} from '../attributes'
import { getStage } from '../stages'
import { advanceAge, createInitialState, setAttribute } from '../state'

describe('attribute config', () => {
  it('exposes intelligence, physique and charm', () => {
    expect(ATTRIBUTE_NAMES).toEqual(['intelligence', 'physique', 'charm'])
  })

  it('has non-negative min, positive max, and initial within bounds', () => {
    for (const name of ATTRIBUTE_NAMES) {
      const cfg = ATTRIBUTE_CONFIG[name]
      expect(cfg.min).toBeGreaterThanOrEqual(0)
      expect(cfg.max).toBeGreaterThan(0)
      expect(cfg.initial).toBeGreaterThanOrEqual(cfg.min)
      expect(cfg.initial).toBeLessThanOrEqual(cfg.max)
    }
  })

  it('creates initial attributes matching config', () => {
    const attrs = createInitialAttributes()
    for (const name of ATTRIBUTE_NAMES) {
      expect(attrs[name]).toBe(ATTRIBUTE_CONFIG[name].initial)
    }
  })
})

describe('clampAttribute', () => {
  it('clamps below the minimum to the minimum', () => {
    expect(clampAttribute('physique', -10)).toBe(0)
  })

  it('clamps above the maximum to the maximum', () => {
    expect(clampAttribute('intelligence', 200)).toBe(100)
  })

  it('keeps in-range values unchanged', () => {
    expect(clampAttribute('charm', 50)).toBe(50)
  })
})

describe('getStage', () => {
  it('maps childhood ages', () => {
    expect(getStage(0)).toBe('childhood')
    expect(getStage(6)).toBe('childhood')
  })

  it('maps education ages', () => {
    expect(getStage(7)).toBe('education')
    expect(getStage(18)).toBe('education')
  })

  it('maps career ages', () => {
    expect(getStage(19)).toBe('career')
    expect(getStage(60)).toBe('career')
  })

  it('maps elderly ages', () => {
    expect(getStage(61)).toBe('elderly')
    expect(getStage(120)).toBe('elderly')
  })

  it('throws on negative age', () => {
    expect(() => getStage(-1)).toThrow(RangeError)
  })
})

describe('state', () => {
  it('creates an initial state at age 0 childhood', () => {
    const state = createInitialState()
    expect(state.age).toBe(0)
    expect(state.stage).toBe('childhood')
    expect(state.wealth).toBe(0)
    for (const name of ATTRIBUTE_NAMES) {
      expect(state.attributes[name]).toBe(ATTRIBUTE_CONFIG[name].initial)
    }
  })

  it('applies attribute deltas and clamps to bounds', () => {
    const state = createInitialState()
    const grown = setAttribute(state, 'intelligence', 30)
    expect(grown.attributes.intelligence).toBe(70)

    const over = setAttribute(grown, 'intelligence', 100)
    expect(over.attributes.intelligence).toBe(100)

    const under = setAttribute(over, 'intelligence', -1000)
    expect(under.attributes.intelligence).toBe(0)
  })

  it('does not mutate the original state', () => {
    const state = createInitialState()
    setAttribute(state, 'intelligence', 50)
    expect(state.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.initial)
  })

  it('advances age and updates the life stage', () => {
    const state = createInitialState()
    const child = advanceAge(state, 7)
    expect(child.age).toBe(7)
    expect(child.stage).toBe('education')

    const adult = advanceAge(child, 12)
    expect(adult.age).toBe(19)
    expect(adult.stage).toBe('career')

    const elder = advanceAge(adult, 41)
    expect(elder.age).toBe(60)
    expect(elder.stage).toBe('career')

    const elderly = advanceAge(elder, 1)
    expect(elderly.stage).toBe('elderly')
  })
})
