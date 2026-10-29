import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  Rng,
  canonicalStringify,
  createRng,
  formatDateLabel,
  formatMoney,
  formatMoneyShort,
  formatOverall,
  formatPercent,
  formatRating,
  formatSeasonLabel,
  formatWeekLabel,
  hashState,
  hashString,
  seededId,
  titleCaseLabel,
} from '../../src/lib'

describe('lib public entry', () => {
  it('exports rng and hashing helpers', () => {
    const rng = createRng(7, 'seed')
    expect(rng).toBeInstanceOf(Rng)
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashState({ a: 1 })).not.toBe('')
    expect(canonicalStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    expect(seededId(7, 'seed')).not.toBe('')
  })

  it('exports formatters', () => {
    expect(formatMoney(100)).toContain('1')
    expect(formatMoneyShort(100)).toBeTruthy()
    expect(formatSeasonLabel(2027)).toBe('2027/28')
    expect(formatWeekLabel(2026, 3)).toContain('3')
    expect(formatDateLabel(2026, 3)).toBeTruthy()
    expect(formatRating(7.1)).toBe('7.1')
    expect(formatPercent(0.5)).toBeTruthy()
    expect(formatOverall(80)).toBeTruthy()
    expect(titleCaseLabel('hello')).toBeTruthy()
    expectTypeOf(createRng).toBeFunction()
  })
})
