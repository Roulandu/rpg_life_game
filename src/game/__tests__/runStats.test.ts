import { describe, expect, it } from 'vitest'
import type { SaveStorage } from '../save'
import {
  loadRunStats,
  recordEnding,
  RUN_STATS_KEY,
} from '../runStats'

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

describe('loadRunStats', () => {
  it('returns an empty map when nothing is stored', () => {
    expect(loadRunStats(createMemoryStorage())).toEqual({})
  })

  it('returns an empty map for invalid stored data', () => {
    const storage = createMemoryStorage()
    storage.setItem(RUN_STATS_KEY, 'not-json{')
    expect(loadRunStats(storage)).toEqual({})
    storage.setItem(RUN_STATS_KEY, '["array"]')
    expect(loadRunStats(storage)).toEqual({})
  })

  it('is independent of the save and achievements keys', () => {
    expect(RUN_STATS_KEY).not.toBe('rpg-life-game:save')
    expect(RUN_STATS_KEY).not.toBe('rpg-life-game:achievements')
  })
})

describe('recordEnding', () => {
  it('increments the count for an ending', () => {
    const storage = createMemoryStorage()
    recordEnding(storage, 'plain-life')
    recordEnding(storage, 'plain-life')
    recordEnding(storage, 'career-success')
    expect(loadRunStats(storage)).toEqual({ 'plain-life': 2, 'career-success': 1 })
  })

  it('persists the updated stats under the run-stats key', () => {
    const storage = createMemoryStorage()
    recordEnding(storage, 'recluse')
    expect(storage.data.has(RUN_STATS_KEY)).toBe(true)
    const parsed = JSON.parse(storage.data.get(RUN_STATS_KEY)!)
    expect(parsed).toEqual({ recluse: 1 })
  })
})
