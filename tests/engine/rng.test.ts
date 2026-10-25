import { describe, expect, it } from 'vitest'
import {
  createRng,
  cyrb128,
  hashString,
  hashState,
  mulberry32,
  stableStringify,
} from '../../src/engine/rng'

describe('deterministic rng', () => {
  it('matches the golden mulberry32 sequence', () => {
    const rng = createRng(12345, 'match', 'fixture-1')
    const values = Array.from({ length: 6 }, () => rng.next())
    expect(values).toEqual([
      0.8669259420130402,
      0.9797901755664498,
      0.9956702962517738,
      0.8206110286992043,
      0.5901568774133921,
      0.48683098680339754,
    ])
  })

  it('matches the cyrb128 golden vector', () => {
    expect(cyrb128('hello')).toEqual([1690739734, 429188867, 73174269, 2031013864])
  })

  it('hashes strings deterministically', () => {
    expect(hashString('hello')).toBe('4f9f2cab')
    expect(hashString('pitch-life')).toBe('0e2d9efe')
  })

  it('keeps integer helpers in range', () => {
    const rng = createRng(42, 'fixtures', 'league:ENG:1', 2026)
    const ints = Array.from({ length: 8 }, () => rng.int(1, 20))
    expect(ints).toEqual([15, 15, 16, 14, 6, 16, 17, 8])
    for (const value of ints) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  it('derives independent streams from different domains', () => {
    const a = createRng(7, 'training', 1, 2)
    const b = createRng(7, 'match', 1, 2)
    expect(a.next()).not.toBe(b.next())
  })

  it('supports pick, shuffle, weighted and poisson', () => {
    const rng = createRng(99, 'helpers')
    const items = ['a', 'b', 'c', 'd']
    expect(items).toContain(rng.pick(items))
    const shuffled = rng.shuffle(items)
    expect([...shuffled].sort()).toEqual([...items].sort())
    expect(items).toEqual(['a', 'b', 'c', 'd'])
    expect(['x', 'y']).toContain(
      rng.weighted([
        { value: 'x', weight: 1 },
        { value: 'y', weight: 0 },
      ]),
    )
    const goals = rng.poisson(1.4)
    expect(Number.isInteger(goals)).toBe(true)
    expect(goals).toBeGreaterThanOrEqual(0)
    expect(rng.poisson(0)).toBe(0)
  })

  it('produces identical sequences across runs', () => {
    const first = createRng(2026, 'season', 1)
    const second = createRng(2026, 'season', 1)
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next()),
    )
  })

  it('stable stringify ignores key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
    expect(hashState({ a: [1, 2], b: 'x' })).toBe(hashState({ b: 'x', a: [1, 2] }))
  })

  it('exposes mulberry32 directly', () => {
    const next = mulberry32(1)
    expect(next()).toBeGreaterThanOrEqual(0)
    expect(next()).toBeLessThan(1)
  })
})
