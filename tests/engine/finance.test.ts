import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import {
  estimateValue,
  paySeasonBonuses,
  recomputeWeeklyExpenses,
  reputationAfterSeason,
  settleWeekFinance,
  weeklySuffix,
} from '../../src/engine/finance'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function withReputation(world: WorldState, appearances: number, local: number): WorldState {
  const user = world.players[world.playerId]
  return {
    ...world,
    players: {
      ...world.players,
      [world.playerId]: {
        ...user,
        seasonStats: { ...user.seasonStats, appearances },
        reputation: { ...user.reputation, local, national: local, fanbase: local, media: local, continental: local },
      },
    },
  }
}

const BONUSES = { appearances: 10, goals: 5, assists: 3, champion: true, promoted: false }

describe('engine finance helpers', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('recomputes weekly expenses from the user wage', () => {
    const next: WorldState = { ...world, finance: { ...world.finance } }
    recomputeWeeklyExpenses(next)
    const wage = next.players[next.playerId].contract.wageWeekly
    expect(next.finance.weeklyWage).toBe(wage)
    expect(next.finance.weeklyExpenses).toBe(Math.round(wage * 0.18) + 15000)
  })

  it('estimates a rounded transfer value that scales with age', () => {
    const user = world.players[world.playerId]
    const young = estimateValue({ ...user, age: 18 })
    expect(young).toBeGreaterThan(estimateValue({ ...user, age: 34 }))
    expect(young % 10000).toBe(0)
  })

  it('builds a season:week suffix', () => {
    expect(weeklySuffix(world)).toBe(`${world.season}:${world.week}`)
  })

  it('pays season bonuses into the ledger and balance', () => {
    const next: WorldState = { ...world, finance: { ...world.finance, ledger: [], balance: 0 } }
    const total = paySeasonBonuses(next, BONUSES)
    expect(total).toBe(10 * 50000 + 5 * 75000 + 3 * 40000 + 2000000)
    expect(next.finance.balance).toBe(total)
    expect(next.finance.ledger).toHaveLength(4)
  })

  it('pays nothing when the season summary is empty', () => {
    const next: WorldState = { ...world, finance: { ...world.finance, ledger: [], balance: 0 } }
    const empty = { appearances: 0, goals: 0, assists: 0, champion: false, promoted: false }
    expect(paySeasonBonuses(next, empty)).toBe(0)
    expect(next.finance.ledger).toHaveLength(0)
  })

  it('raises reputation after a season with enough appearances', () => {
    const next = withReputation(world, 12, 50)
    reputationAfterSeason(next, 7.5)
    expect(next.players[next.playerId].reputation.local).toBeGreaterThan(50)
  })

  it('skips reputation changes when appearances are too low', () => {
    const next = withReputation(world, 3, 50)
    reputationAfterSeason(next, 7.5)
    expect(next.players[next.playerId].reputation.local).toBe(50)
  })
})

describe('周账目结算', () => {
  it('赞助合同在有效期内计入周收入，过期后只剩周薪', () => {
    const base = generateWorld(testOptions(), TEST_NOW)
    const withDeal: WorldState = {
      ...base,
      finance: {
        ...base.finance,
        sponsorships: [{ name: '本地品牌', weekly: 5000, endSeason: base.season }],
        ledger: [],
        balance: 0,
      },
    }
    const expiredDeal: WorldState = {
      ...withDeal,
      finance: { ...withDeal.finance, sponsorships: [{ name: '本地品牌', weekly: 5000, endSeason: base.season - 1 }], ledger: [], balance: 0 },
    }

    const active = settleWeekFinance(withDeal)
    const stale = settleWeekFinance(expiredDeal)

    expect(active.income).toBe(withDeal.finance.weeklyWage + 5000)
    expect(stale.income).toBe(expiredDeal.finance.weeklyWage)
    expect(withDeal.finance.ledger[0]!.label).toBe('周薪、赞助与开销')
    expect(expiredDeal.finance.ledger[0]!.label).toBe('周薪与开销')
  })

  it('余额为负时掉士气，并在整四周写一条告急新闻', () => {
    const base = generateWorld(testOptions(), TEST_NOW)
    const makeWorld = (week: number): WorldState => {
      const user = base.players[base.playerId]
      return {
        ...base,
        week,
        players: {
          ...base.players,
          [base.playerId]: { ...user, contract: { ...user.contract, wageWeekly: 0 }, morale: 60 },
        },
        finance: { ...base.finance, sponsorships: [], ledger: [], balance: -20000 },
        news: [],
      }
    }

    const mid = settleWeekFinance(makeWorld(4))
    const debtWorld = makeWorld(4)
    settleWeekFinance(debtWorld)

    expect(mid.net).toBeLessThan(0)
    expect(debtWorld.players[debtWorld.playerId].morale).toBeLessThan(60)
    expect(debtWorld.news.some((item) => item.id.startsWith('news:finance:debt:'))).toBe(true)

    const offCycle = makeWorld(5)
    settleWeekFinance(offCycle)
    expect(offCycle.news.some((item) => item.id.startsWith('news:finance:debt:'))).toBe(false)
  })
})
