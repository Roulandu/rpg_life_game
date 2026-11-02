import { describe, expect, it } from 'vitest'
import type { InvestmentKind, WorldState } from '../../src/domain'
import { advanceDay } from '../../src/engine'
import { closeInvestment, openInvestment, settleInvestmentsWeekly } from '../../src/engine/investments'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const OPENING_CASH = 1000000

function cashWorld(seed = 424242): WorldState {
  const world = structuredClone(generateWorld(testOptions({ seed }), TEST_NOW))
  world.week = 1
  world.day = 1
  world.finance.ledger = []
  world.finance.investments = []
  world.finance.balance = OPENING_CASH
  world.finance.pendingIncome = 0
  world.finance.pendingExpenses = 0
  return world
}

/** 账本不变式：余额永远等于起始现金加上全部流水之和。 */
function expectedBalance(world: WorldState): number {
  return OPENING_CASH + world.finance.ledger.reduce((sum, item) => sum + item.amount, 0)
}

function rows(world: WorldState, label: string) {
  return world.finance.ledger.filter((item) => item.label.includes(label))
}

/** 连着结算若干周：周日那一拍由测试直接驱动，绕开比赛与事件。 */
function settleWeeks(world: WorldState, from: number, to: number): void {
  for (let week = from; week <= to; week += 1) {
    world.week = week
    world.day = 7
    settleInvestmentsWeekly(world)
  }
}

function firstHolding(world: WorldState): string {
  return world.finance.investments[0]!.id
}

function heldValue(world: WorldState): number {
  return world.finance.investments[0]?.value ?? 0
}

describe('开仓把现金换成持仓', () => {
  it('开仓的余额与流水成对变化', () => {
    const world = cashWorld()

    const result = openInvestment(world, 'deposit', 20000)

    expect(result.ok).toBe(true)
    expect(world.finance.balance).toBe(980000)
    expect(world.finance.balance).toBe(expectedBalance(world))
    expect(world.finance.investments).toHaveLength(1)
    expect(world.finance.investments[0]).toMatchObject({
      kind: 'deposit',
      name: '银行活期存款',
      principal: 20000,
      rateBps: 120,
      risk: 0,
      openedDay: 1,
      termDays: 0,
    })
    expect(world.finance.ledger[0]).toMatchObject({ type: 'investment', amount: -20000 })
    expect(world.finance.ledger[0]?.label).toBe('开仓 银行活期存款')
  })

  it('不波动的品种不写现值，波动的品种一开仓就带现值', () => {
    const world = cashWorld()

    expect(openInvestment(world, 'deposit', 20000).investment?.value).toBeUndefined()
    expect(openInvestment(world, 'property', 200000).investment?.value).toBe(200000)
  })
})

describe('开仓的三种整笔拒绝', () => {
  it('起投额不够、现金不足与未知品种都不改世界', () => {
    const world = cashWorld()
    const snapshot = structuredClone(world)

    expect(openInvestment(world, 'deposit', 5000).reason).toBe('belowMinimum')
    expect(openInvestment(world, 'property', 1200000).reason).toBe('notEnoughCash')
    expect(openInvestment(world, 'vault' as InvestmentKind, 50000).reason).toBe('unknownKind')

    expect(world).toEqual(snapshot)
  })
})

describe('赎回按现值与锁定期结算', () => {
  it('锁定期内赎回按现值收罚息，销账后现金回来', () => {
    const world = cashWorld()
    openInvestment(world, 'bond', 100000)
    world.day = 3

    const result = closeInvestment(world, firstHolding(world))

    expect(result.proceeds).toBe(98000)
    expect(world.finance.investments).toHaveLength(0)
    expect(world.finance.balance).toBe(998000)
    expect(world.finance.balance).toBe(expectedBalance(world))
    expect(world.finance.ledger[0]?.label).toBe('提前赎回 俱乐部债券（罚息）')
    expect(world.finance.ledger[1]?.label).toBe('开仓 俱乐部债券')
  })

  it('锁定期到点后赎回不付罚息', () => {
    const world = cashWorld()
    openInvestment(world, 'bond', 100000)
    // 绝对日 169 = 第 25 周第 1 天，距开仓整 168 天，正好走完锁定期。
    world.week = 25
    world.day = 1

    expect(closeInvestment(world, firstHolding(world)).proceeds).toBe(100000)
    expect(world.finance.ledger[0]?.label).toBe('赎回 俱乐部债券')
  })

  it('查不到的持仓整笔拒绝赎回', () => {
    const world = cashWorld()
    openInvestment(world, 'deposit', 20000)
    const snapshot = structuredClone(world)

    expect(closeInvestment(world, 'inv:none').reason).toBe('unknownInvestment')
    expect(world).toEqual(snapshot)
  })
})

describe('赎回把落袋的盈亏播报出来', () => {
  it('浮盈兑现时写一条当日新闻', () => {
    const world = cashWorld()
    const opened = openInvestment(world, 'property', 200000)
    world.finance.investments[0]!.value = 260000
    world.week = 40
    world.day = 1

    expect(closeInvestment(world, opened.investment!.id).proceeds).toBe(260000)
    const news = world.news.find((item) => item.id.startsWith('news:finance:exit:'))
    expect(news?.title).toContain('城市公寓')
    expect(news?.title).toContain('60000')
    expect(news?.day).toBe(1)
  })

  it('保本赎回不播新闻', () => {
    const world = cashWorld()
    openInvestment(world, 'deposit', 20000)

    closeInvestment(world, firstHolding(world))

    expect(world.news.some((item) => item.id.startsWith('news:finance:exit:'))).toBe(false)
  })
})

describe('比赛进行中不动钱', () => {
  it('停在开球的那天不能开仓', () => {
    const world = cashWorld()
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    const snapshot = structuredClone(world)

    expect(openInvestment(world, 'deposit', 20000).reason).toBe('matchLive')
    expect(world).toEqual(snapshot)
  })

  it('停在开球的那天也不能赎回', () => {
    const world = cashWorld()
    openInvestment(world, 'bond', 100000)
    const snapshot = structuredClone(world)
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }

    expect(closeInvestment(world, firstHolding(world)).reason).toBe('matchLive')
    expect(world.finance).toEqual(snapshot.finance)
  })
})

describe('周日利息结算', () => {
  it('活期存款每周结一次利息，本金不波动', () => {
    const world = cashWorld()
    openInvestment(world, 'deposit', 20000)

    settleWeeks(world, 1, 2)

    // 20000 × 1.2% = 240 镑/年，÷52 = 4.615 → 每周取整 5 镑。
    expect(world.finance.balance).toBe(980010)
    expect(world.finance.balance).toBe(expectedBalance(world))
    expect(rows(world, '利息')).toHaveLength(2)
    expect(world.finance.investments[0]?.value).toBeUndefined()
  })

  it('没卖出的涨跌不进余额，进账的只有利息', () => {
    const world = cashWorld()
    openInvestment(world, 'property', 200000)

    settleWeeks(world, 1, 8)

    const holding = world.finance.investments[0]!
    expect(holding.value).not.toBe(holding.principal)
    expect(world.finance.balance - 800000).toBe(rows(world, '利息').reduce((sum, item) => sum + item.amount, 0))
    expect(world.finance.balance).toBe(expectedBalance(world))
  })

  it('整周推进自动带上利息结算与一次漫步', () => {
    let world = cashWorld()
    openInvestment(world, 'property', 200000)

    for (let index = 0; index < 7; index += 1) world = advanceDay(world).world

    expect(world.week).toBe(2)
    expect(world.finance.investments[0]?.value).toBeDefined()
    expect(rows(world, '利息')).toHaveLength(1)
    expect(world.finance.pendingIncome).toBe(0)
  })
})

describe('价值漫步可重放', () => {
  it('同种子重放十周得到同一个现值', () => {
    const first = cashWorld()
    const second = cashWorld()
    openInvestment(first, 'property', 200000)
    openInvestment(second, 'property', 200000)

    settleWeeks(first, 1, 10)
    settleWeeks(second, 1, 10)

    expect(heldValue(second)).toBe(heldValue(first))
    expect(heldValue(first)).not.toBe(200000)
    expect(heldValue(first)).toBeGreaterThan(100000)
    expect(heldValue(first)).toBeLessThan(400000)
  })

  it('从周中另存的存档接着结算，整本账与一路跑下来完全一致', () => {
    const continuous = cashWorld()
    const resumed = cashWorld()
    openInvestment(continuous, 'property', 200000)
    openInvestment(resumed, 'property', 200000)

    settleWeeks(continuous, 1, 8)
    settleWeeks(resumed, 1, 4)
    const restored = structuredClone(resumed)
    settleWeeks(restored, 5, 8)

    expect(restored.finance).toEqual(continuous.finance)
  })
})
