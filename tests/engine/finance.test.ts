import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import {
  estimateValue,
  paySeasonBonuses,
  recomputeWeeklyExpenses,
  reputationAfterSeason,
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
