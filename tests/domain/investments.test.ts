import { describe, expect, it } from 'vitest'
import type { Investment } from '../../src/domain'
import { INVESTMENT_KINDS, INVESTMENT_KIND_ORDER, holdingsValue, unrealizedGain } from '../../src/domain'

function holding(principal: number, value?: number): Investment {
  return { id: 'inv:test', kind: 'deposit', name: '测试持仓', principal, rateBps: 210, openedDay: 1, risk: 0, value }
}

describe('资金去处条款表', () => {
  it('四种去处都在册且各有一条中文标题与说明', () => {
    const kinds = INVESTMENT_KIND_ORDER

    expect(kinds).toEqual(['deposit', 'bond', 'property', 'business'])
    expect(Object.keys(INVESTMENT_KINDS).sort()).toEqual([...kinds].sort())
    for (const kind of kinds) {
      const spec = INVESTMENT_KINDS[kind]
      expect(spec.kind).toBe(kind)
      expect(spec.label.length).toBeGreaterThan(1)
      expect(spec.blurb.length).toBeGreaterThan(6)
      expect(spec.label).toMatch(/[一-龥]/)
    }
  })

  it('条款自洽：利率、周波动、起投额、锁定期与罚金都落在可读区间', () => {
    for (const kind of INVESTMENT_KIND_ORDER) {
      const spec = INVESTMENT_KINDS[kind]
      expect(spec.rateBps).toBeGreaterThan(0)
      expect(spec.rateBps).toBeLessThanOrEqual(1200)
      expect(spec.weeklyVol).toBeGreaterThanOrEqual(0)
      expect(spec.weeklyVol).toBeLessThanOrEqual(0.12)
      expect(spec.minPrincipal).toBeGreaterThanOrEqual(1000)
      expect(spec.termDays).toBeGreaterThanOrEqual(0)
      expect(spec.earlyExitFee).toBeGreaterThanOrEqual(0)
      expect(spec.earlyExitFee).toBeLessThanOrEqual(0.15)
    }
  })

  it('只有会波动的品种才收提前赎回罚金', () => {
    const volatile = INVESTMENT_KIND_ORDER.filter((kind) => INVESTMENT_KINDS[kind].weeklyVol > 0)
    const flat = INVESTMENT_KIND_ORDER.filter((kind) => INVESTMENT_KINDS[kind].weeklyVol === 0)

    expect(volatile.length).toBeGreaterThanOrEqual(2)
    expect(flat).toEqual(['deposit'])
    for (const kind of volatile) expect(INVESTMENT_KINDS[kind].earlyExitFee).toBeGreaterThan(0)
    for (const kind of flat) expect(INVESTMENT_KINDS[kind].earlyExitFee).toBe(0)
  })

  it('持仓估值把没有现值的品种按本金计，未实现盈亏只认带现值的那几笔', () => {
    const holdings: Investment[] = [holding(20000), holding(50000, 55000), holding(30000, 27000)]

    expect(holdingsValue(holdings)).toBe(102000)
    expect(unrealizedGain(holdings)).toBe(2000)
  })

  it('空仓时两条估值都是零，界面不用另判空数组', () => {
    expect(holdingsValue([])).toBe(0)
    expect(unrealizedGain([])).toBe(0)
  })
})
