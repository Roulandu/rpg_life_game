import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_CONFIG } from '../attributes'
import { createInitialState, setAttribute, advanceAge } from '../state'
import type { SaveStorage } from '../save'
import { deserialize, loadGame, saveGame, serialize, SAVE_KEY } from '../save'

function createMemoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function advancedState() {
  let state = createInitialState()
  state = setAttribute(state, 'intelligence', 30)
  state = setAttribute(state, 'charm', -10)
  state = advanceAge(state, 25)
  return { ...state, wealth: 120 }
}

describe('serialize / deserialize', () => {
  it('round-trips a valid state', () => {
    const state = advancedState()
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('returns null for invalid JSON', () => {
    expect(deserialize('not json{')).toBeNull()
  })

  it('returns null for non-object payloads', () => {
    expect(deserialize('"hello"')).toBeNull()
    expect(deserialize('42')).toBeNull()
    expect(deserialize('null')).toBeNull()
  })

  it('returns null when attributes are missing or wrong type', () => {
    const valid = advancedState()
    const base = JSON.parse(serialize(valid))
    expect(deserialize(JSON.stringify({ ...base, attributes: undefined }))).toBeNull()
    expect(deserialize(JSON.stringify({ ...base, attributes: { intelligence: 'x' } }))).toBeNull()
  })

  it('returns null for negative age', () => {
    const valid = advancedState()
    const base = JSON.parse(serialize(valid))
    expect(deserialize(JSON.stringify({ ...base, age: -1 }))).toBeNull()
  })

  it('returns null for non-numeric wealth', () => {
    const valid = advancedState()
    const base = JSON.parse(serialize(valid))
    expect(deserialize(JSON.stringify({ ...base, wealth: 'lots' }))).toBeNull()
  })

  it('clamps out-of-bounds attribute values on load', () => {
    const valid = advancedState()
    const base = JSON.parse(serialize(valid))
    base.attributes.intelligence = 9999
    base.attributes.physique = -99
    base.wealth = -500
    const restored = deserialize(JSON.stringify(base))
    expect(restored).not.toBeNull()
    expect(restored!.attributes.intelligence).toBe(ATTRIBUTE_CONFIG.intelligence.max)
    expect(restored!.attributes.physique).toBe(ATTRIBUTE_CONFIG.physique.min)
    expect(restored!.wealth).toBe(0)
  })

  it('recomputes the life stage from age', () => {
    const valid = advancedState()
    const base = JSON.parse(serialize(valid))
    base.age = 10
    base.stage = 'career'
    const restored = deserialize(JSON.stringify(base))
    expect(restored?.age).toBe(10)
    expect(restored?.stage).toBe('education')
  })

  it('preserves milestones and defaults to empty when absent', () => {
    const valid = { ...advancedState(), milestones: ['studied', 'started-business'] }
    expect(deserialize(serialize(valid))?.milestones).toEqual(['studied', 'started-business'])

    const base = JSON.parse(serialize(valid))
    delete base.milestones
    expect(deserialize(JSON.stringify(base))?.milestones).toEqual([])
  })
})

describe('saveGame / loadGame', () => {
  it('saves a state and loads it back', () => {
    const storage = createMemoryStorage()
    const state = advancedState()
    saveGame(storage, state)
    expect(storage.data.has(SAVE_KEY)).toBe(true)
    expect(loadGame(storage)).toEqual(state)
  })

  it('returns null when nothing is saved', () => {
    expect(loadGame(createMemoryStorage())).toBeNull()
  })

  it('returns null when saved data is corrupted', () => {
    const storage = createMemoryStorage()
    storage.setItem(SAVE_KEY, 'garbage{')
    expect(loadGame(storage)).toBeNull()
  })
})
