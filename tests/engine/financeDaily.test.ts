import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { accrueDailyFinance, postWeeklyLedger } from '../../src/engine/financeDaily'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/** 每天累计是就地改写，测试必须拿一份能随便糟蹋的副本。 */
function freshWorld(seed = 424242): WorldState {
  const world = structuredClone(generateWorld(testOptions({ seed }), TEST_NOW))
  world.finance.ledger = []
  world.finance.balance = 0
  world.finance.pendingIncome = 0
  world.finance.pendingExpenses = 0
  return world
}

function withDebt(world: WorldState, morale: number): WorldState {
  const user = world.players[world.playerId]
  user.contract = { ...user.contract, wageWeekly: 0 }
  user.morale = morale
  world.finance.sponsorships = []
  world.finance.balance = -20000
  return world
}

function debtNews(world: WorldState) {
  return world.news.filter((item) => item.id.startsWith('news:finance:debt:'))
}

describe('财务按日累计与周日入账', () => {
  it('七天每天只累加待入账，余额在周日入账前一分不动', () => {
    const world = freshWorld()
    world.finance.sponsorships = [{ name: '本地品牌', weekly: 5000, endSeason: world.season }]
    const weeklyIncome = world.finance.weeklyWage + 5000

    for (let day = 1; day <= 6; day += 1) {
      world.day = day
      accrueDailyFinance(world)
    }

    expect(world.finance.balance).toBe(0)
    expect(world.finance.ledger).toHaveLength(0)
    expect(world.finance.pendingIncome).toBeCloseTo(weeklyIncome * 6 / 7, 6)

    world.day = 7
    accrueDailyFinance(world)
    expect(world.finance.pendingIncome).toBeCloseTo(weeklyIncome, 6)
  })

  it('周日一次入账把待入账折成现金并只写一条流水', () => {
    const world = freshWorld()
    world.finance.sponsorships = [{ name: '本地品牌', weekly: 5000, endSeason: world.season }]

    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      accrueDailyFinance(world)
    }

    const result = postWeeklyLedger(world)

    expect(result.income).toBe(world.finance.weeklyWage + 5000)
    expect(result.expenses).toBe(world.finance.weeklyExpenses)
    expect(result.net).toBe(result.income - result.expenses)
    expect(world.finance.balance).toBe(result.net)
    expect(world.finance.ledger).toHaveLength(1)
    expect(world.finance.ledger[0]).toMatchObject({ type: 'wage', season: world.season, week: world.week })
    expect(world.finance.ledger[0]?.label).toBe('周薪、赞助与开销')
    expect(world.finance.pendingIncome).toBe(0)
    expect(world.finance.pendingExpenses).toBe(0)
  })

  it('赞助过期后不再进待入账，流水标签跟着改回周薪与开销', () => {
    const world = freshWorld()
    world.finance.sponsorships = [{ name: '本地品牌', weekly: 5000, endSeason: world.season - 1 }]

    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      accrueDailyFinance(world)
    }
    const result = postWeeklyLedger(world)

    expect(result.income).toBe(world.finance.weeklyWage)
    expect(world.finance.ledger[0]?.label).toBe('周薪与开销')
  })

  it('换合同当天起就按新周薪累计，不必等到下周', () => {
    const world = freshWorld()
    world.day = 1
    accrueDailyFinance(world)
    const before = world.finance.pendingIncome

    const user = world.players[world.playerId]
    user.contract = { ...user.contract, wageWeekly: user.contract.wageWeekly + 7000 }
    world.day = 2
    accrueDailyFinance(world)

    expect(world.finance.pendingIncome - before).toBeCloseTo((world.finance.weeklyWage) / 7, 6)
  })
})

describe('欠款按日惩罚', () => {
  it('余额为负时每天扣士气，一周的惩罚量与旧的周结算同量级', () => {
    const world = withDebt(freshWorld(), 60)

    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      accrueDailyFinance(world)
    }

    const drop = 60 - world.players[world.playerId].morale
    expect(drop).toBeGreaterThan(0)
    expect(drop).toBeGreaterThanOrEqual(0.6)
    expect(drop).toBeLessThanOrEqual(1.4)
  })

  it('每 28 个绝对日只播一条告急新闻，其余日子只掉士气', () => {
    // 第 4 周的周日正好是绝对日 28，第 5 周没有任何一天落在 28 的倍数的日序上。
    const alarmWeek = withDebt(freshWorld(), 60)
    alarmWeek.week = 4
    for (let day = 1; day <= 7; day += 1) {
      alarmWeek.day = day
      accrueDailyFinance(alarmWeek)
    }

    expect(debtNews(alarmWeek)).toHaveLength(1)
    expect(debtNews(alarmWeek)[0]?.id).toBe(`news:finance:debt:${alarmWeek.season}:4:7`)

    const quietWeek = withDebt(freshWorld(), 60)
    quietWeek.week = 5
    for (let day = 1; day <= 7; day += 1) {
      quietWeek.day = day
      accrueDailyFinance(quietWeek)
    }

    expect(debtNews(quietWeek)).toHaveLength(0)
    expect(quietWeek.players[quietWeek.playerId].morale).toBeLessThan(60)
  })

  it('欠款把士气磨到底也不会变成负数', () => {
    const world = withDebt(freshWorld(), 0.4)

    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      accrueDailyFinance(world)
    }

    expect(world.players[world.playerId].morale).toBe(0)
  })

  it('余额回正后不再掉士气', () => {
    const world = withDebt(freshWorld(), 60)
    world.day = 1
    accrueDailyFinance(world)
    world.finance.balance = 5000
    const morale = world.players[world.playerId].morale
    world.day = 2
    accrueDailyFinance(world)

    expect(world.players[world.playerId].morale).toBe(morale)
  })
})

describe('日粒度财务走进日步进', () => {
  function ledgerTotal(world: WorldState): number {
    return world.finance.ledger.reduce((sum, item) => sum + item.amount, 0)
  }

  function weeklyRows(world: WorldState) {
    return world.finance.ledger.filter((item) => item.label.includes('周薪'))
  }

  function playWeek(startWorld: WorldState, days: number): WorldState {
    let world = startWorld
    for (let index = 0; index < days; index += 1) world = advanceDay(world).world
    return world
  }

  it('推进一整周后待入账归零且只留下一条周账流水', () => {
    const world = playWeek(freshWorld(), 7)

    expect(world.week).toBe(2)
    expect(world.day).toBe(1)
    expect(world.finance.pendingIncome).toBe(0)
    expect(world.finance.pendingExpenses).toBe(0)
    expect(weeklyRows(world)).toHaveLength(1)
    expect(world.finance.balance).toBe(ledgerTotal(world))
  })

  it('推进到周中时本周的钱仍挂在待入账上，一条流水都没写', () => {
    const world = playWeek(freshWorld(), 3)

    expect(world.day).toBe(4)
    expect(world.finance.pendingIncome).toBeCloseTo(world.finance.weeklyWage * 3 / 7, 6)
    expect(world.finance.pendingExpenses).toBeCloseTo(world.finance.weeklyExpenses * 3 / 7, 6)
    expect(weeklyRows(world)).toHaveLength(0)
    expect(world.finance.balance).toBe(ledgerTotal(world))
  })

  it('同种子两次跑完两周得到同一份财务账本', () => {
    const first = playWeek(freshWorld(), 14)
    const second = playWeek(freshWorld(), 14)

    expect(second.finance).toEqual(first.finance)
    expect(second.finance.balance).toBe(first.finance.balance)
  })
})
