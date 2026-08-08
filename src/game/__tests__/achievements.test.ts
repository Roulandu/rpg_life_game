import { describe, expect, it } from 'vitest'
import { createInitialState, setAttribute } from '../state'
import type { SaveStorage } from '../save'
import type { GameState } from '../types'
import {
  ACHIEVEMENTS,
  achievementsFor,
  loadAchievements,
  newlyUnlocked,
  saveAchievements,
  ACHIEVEMENTS_KEY,
} from '../achievements'

function stateWith(
  overrides: { wealth?: number; milestones?: string[] } = {},
  attributes: Partial<Record<'intelligence' | 'physique' | 'charm', number>> = {},
): GameState {
  let state = createInitialState()
  state = setAttribute(state, 'intelligence', attributes.intelligence ?? 0)
  state = setAttribute(state, 'physique', attributes.physique ?? 0)
  state = setAttribute(state, 'charm', attributes.charm ?? 0)
  return { ...state, wealth: overrides.wealth ?? 0, milestones: overrides.milestones ?? [] }
}

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

describe('achievementsFor', () => {
  it('unlocks the first-choice achievement after a choice is made', () => {
    const ids = achievementsFor({ ...createInitialState(), age: 1 }).map((a) => a.id)
    expect(ids).toContain('first-choice')
    expect(achievementsFor(createInitialState()).map((a) => a.id)).not.toContain('first-choice')
  })

  it('unlocks milestone-based achievements', () => {
    const ids = achievementsFor(
      stateWith({ milestones: ['studied', 'started-business', 'prestige-school', 'vip-network'] }),
    ).map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(['lifelong-learner', 'serial-entrepreneur', 'prestige-graduate', 'socialite']))
  })

  it('unlocks wealth and attribute achievements', () => {
    const ids = achievementsFor(stateWith({ wealth: 1200 })).map((a) => a.id)
    expect(ids).toContain('wealthy')

    const genius = achievementsFor(
      stateWith({}, { intelligence: 95 }),
    ).map((a) => a.id)
    expect(genius).toContain('genius')
  })

  it('unlocks all-rounder when every attribute is high', () => {
    const ids = achievementsFor(
      stateWith({}, { intelligence: 80, physique: 80, charm: 80 }),
    ).map((a) => a.id)
    expect(ids).toContain('all-rounder')
  })
})

describe('newlyUnlocked', () => {
  it('returns only achievements not already unlocked', () => {
    const state = stateWith({ wealth: 1200 })
    const all = newlyUnlocked(state, [])
    expect(all.map((a) => a.id)).toContain('wealthy')

    const none = newlyUnlocked(state, ['wealthy'])
    expect(none.map((a) => a.id)).not.toContain('wealthy')
  })
})

describe('achievement storage', () => {
  it('saves and loads unlocked achievement ids', () => {
    const storage = createMemoryStorage()
    saveAchievements(storage, ['wealthy', 'genius'])
    expect(storage.data.has(ACHIEVEMENTS_KEY)).toBe(true)
    expect(loadAchievements(storage)).toEqual(['wealthy', 'genius'])
  })

  it('returns an empty list when nothing is saved or data is invalid', () => {
    expect(loadAchievements(createMemoryStorage())).toEqual([])
    const storage = createMemoryStorage()
    storage.setItem(ACHIEVEMENTS_KEY, 'not-json{')
    expect(loadAchievements(storage)).toEqual([])
  })

  it('is independent of the game save key', () => {
    expect(ACHIEVEMENTS_KEY).not.toBe('rpg-life-game:save')
  })

  it('defines every achievement with title and description', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.title.length).toBeGreaterThan(0)
      expect(achievement.description.length).toBeGreaterThan(0)
      expect(achievement.id.length).toBeGreaterThan(0)
    }
  })
})
