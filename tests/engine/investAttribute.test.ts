import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, INVEST_FIRST_COST, INVEST_HARD_CAP, attributeCap, computeOverall } from '../../src/domain'
import type { AttrKey } from '../../src/domain'
import { investAttribute } from '../../src/engine/growth'
import { freshWorld, keyAttrOf, tune, userOf } from '../fixtures/growth'
import { playToKeyMoments } from '../fixtures/matchday'

describe('经验投资的扣费与账本', () => {
  it('投资扣经验、写属性、记账本，第二点比第一点贵 2', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 40 })
    const attr: AttrKey = 'shooting'
    const before = user.attributes[attr]

    const first = investAttribute(world, attr, 1)
    expect(first).toMatchObject({ ok: true, points: 1, cost: 6, reason: null })
    expect(user.attributes[attr]).toBe(before + 1)
    expect(user.attrInvestment[attr]).toBe(1)

    const second = investAttribute(world, attr, 1)
    expect(second.cost).toBe(8)
    expect(user.attrInvestment[attr]).toBe(2)
    expect(user.exp).toBe(40 - 6 - 8)
  })

  it('花费经验不会倒退累计经验', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 20, lifetimeExp: 100 })
    expect(investAttribute(world, keyAttrOf(user), 1).ok).toBe(true)
    expect(user.exp).toBe(14)
    expect(user.lifetimeExp).toBe(100)
  })

  it('经验不够就拒绝，连投多点按递增价合计', () => {
    const world = freshWorld()
    const user = tune(world, { exp: INVEST_FIRST_COST })
    const attr: AttrKey = 'pace'
    expect(investAttribute(world, attr, 1).ok).toBe(true)
    // 下一点要 8 点经验，余额已经归零。
    expect(investAttribute(world, attr, 1).reason).toBe('notEnoughExp')
    expect(investAttribute(world, attr, 3).reason).toBe('notEnoughExp')
    expect(user.exp).toBe(0)
  })

  it('点数非法时拒绝而不是静默变成 0 点', () => {
    const world = freshWorld()
    tune(world, { exp: 200 })
    expect(investAttribute(world, 'shooting', 0).reason).toBe('invalidPoints')
    expect(investAttribute(world, 'shooting', 1.5).reason).toBe('invalidPoints')
    expect(investAttribute(world, 'shooting', -2).reason).toBe('invalidPoints')
  })
})

describe('经验投资的三道刹车', () => {
  it('综合分越不过潜力：被拒时属性与经验都不动', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 500, lifetimeExp: 2000 })
    const attr = keyAttrOf(user)
    user.potential = computeOverall(user.position, user.attributes)
    const before = user.exp

    const result = investAttribute(world, attr, 1)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('overPotential')
    expect(user.exp).toBe(before)
    expect(user.attrInvestment[attr]).toBe(0)
  })

  it('门将属性只开门将，非门将投 goalkeeping 直接拒绝', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 200 })
    user.position = 'ST'
    const rejected = investAttribute(world, 'goalkeeping', 1)
    expect(rejected.reason).toBe('notAllowed')
    expect(user.attrInvestment.goalkeeping).toBe(0)

    user.position = 'GK'
    expect(investAttribute(world, 'goalkeeping', 1).ok).toBe(true)
  })

  it('比赛进行中禁止投资：概率已在开球时锁死', () => {
    const { world } = playToKeyMoments()
    const user = tune(world, { exp: 200 })
    const attr = keyAttrOf(user)
    const before = user.attributes[attr]

    expect(investAttribute(world, attr, 1).reason).toBe('matchLive')

    // 手动踢关键回合时 pendingDayPlan 已被清掉，但战报仍是 live，同样不许中途改属性。
    world.pendingDayPlan = null
    expect(world.lastMatch?.status).toBe('live')
    expect(investAttribute(world, attr, 1).reason).toBe('matchLive')
    expect(user.attributes[attr]).toBe(before)
  })

  it('把能投的全投满也越不过潜力与两条上限', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 4000, lifetimeExp: 4000, potential: 70 })
    for (const key of ATTR_KEYS) {
      for (let step = 0; step < 120; step += 1) {
        if (!investAttribute(world, key, 1).ok) break
      }
    }
    expect(computeOverall(user.position, user.attributes)).toBeLessThanOrEqual(user.potential)
    expect(ATTR_KEYS.every((key) => user.attributes[key] <= INVEST_HARD_CAP)).toBe(true)
    expect(ATTR_KEYS.every((key) => (user.attrInvestment[key] ?? 0) <= attributeCap(userOf(world)))).toBe(true)
    expect(user.exp).toBeGreaterThanOrEqual(0)
  })
})

describe('属性投资的两条上限闸门', () => {
  it('单属性可投点数上限由累计经验解锁，投满了才拒', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 200, lifetimeExp: 0 })
    const attr = keyAttrOf(user)
    user.attrInvestment[attr] = attributeCap(user)
    expect(investAttribute(world, attr, 1).reason).toBe('overCap')

    user.lifetimeExp = 400
    expect(investAttribute(world, attr, 1).ok).toBe(true)
  })

  it('回归: 起始属性高于可投点数上限不再是拒绝理由', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 200, lifetimeExp: 20 })
    const attr = keyAttrOf(user)
    user.attributes[attr] = 64.8

    const result = investAttribute(world, attr, 1)
    expect(result.ok, result.reason ?? undefined).toBe(true)
    expect(user.attributes[attr]).toBe(65.8)
    expect(user.attrInvestment[attr]).toBe(1)
  })

  it('属性值的绝对天花板 96 仍然拦得住', () => {
    const world = freshWorld()
    const user = tune(world, { exp: 200, lifetimeExp: 4000 })
    const attr = keyAttrOf(user)
    user.attributes[attr] = INVEST_HARD_CAP

    expect(investAttribute(world, attr, 1).reason).toBe('overCap')
    expect(user.attrInvestment[attr]).toBe(0)
  })
})
