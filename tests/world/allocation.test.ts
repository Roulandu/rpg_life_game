import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, computeOverall, overall } from '../../src/domain'
import type { AttrAllocation, Player, WorldState } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function worldWith(allocation?: AttrAllocation, overrides = {}): WorldState {
  return generateWorld(testOptions({ seed: 33557, ...overrides, ...(allocation ? { allocation } : {}) }), TEST_NOW)
}

function userOf(world: WorldState): Player {
  return world.players[world.playerId]
}

/** RNG 序列是否被点买扰动，看这些由 rng 派生的字段最直观。 */
function rngFingerprint(user: Player): string {
  return [user.foot, user.contract.wageWeekly, user.potential, user.nameZh].join('|')
}

function attributesOf(user: Player): Record<string, number> {
  return { ...user.attributes }
}

describe('建号属性点买落到世界生成', () => {
  it('不传 allocation 时属性与基准完全一致', () => {
    const plain = userOf(worldWith())
    const empty = userOf(worldWith({}))
    expect(attributesOf(empty)).toEqual(attributesOf(plain))
  })

  it('合法点买把点数加进指定属性，且不动任何随机派生字段', () => {
    const base = userOf(worldWith())
    const bought = userOf(worldWith({ shooting: 3, passing: 2, technique: 4 }))
    const budget = 4 + (17 - 16) * 3 + 3

    expect(bought.attributes.shooting).toBe(base.attributes.shooting + 3)
    expect(bought.attributes.passing).toBe(base.attributes.passing + 2)
    expect(bought.attributes.technique).toBe(base.attributes.technique + 4)
    // 属性各自保留一位小数，逐项相减再累加必然带浮点尾差，所以这里用容差而不是全等。
    expect(
      ATTR_KEYS.reduce((sum, key) => sum + (bought.attributes[key] - base.attributes[key]), 0),
    ).toBeCloseTo(Math.min(budget, 9), 6)
    expect(rngFingerprint(bought)).toBe(rngFingerprint(base))
    expect(computeOverall(bought.position, bought.attributes)).toBeLessThanOrEqual(bought.potential)
  })

  it('超预算的点买整份作废，不留下半套加点', () => {
    const base = userOf(worldWith())
    const cheated = userOf(worldWith({ shooting: 4, pace: 4, physical: 4, mental: 4 }))
    expect(attributesOf(cheated)).toEqual(attributesOf(base))
  })

  it('单项超过 4 点、非整数与负数都算非法，一律整份作废', () => {
    const base = attributesOf(userOf(worldWith()))
    for (const bad of [{ shooting: 5 }, { shooting: 1.5 }, { shooting: -2 }]) {
      expect(attributesOf(userOf(worldWith(bad)))).toEqual(base)
    }
  })

  it('非门将不能在建号时点门将属性，门则可以', () => {
    const cmBase = attributesOf(userOf(worldWith()))
    expect(attributesOf(userOf(worldWith({ goalkeeping: 2 })))).toEqual(cmBase)

    const gkBase = attributesOf(userOf(worldWith(undefined, { position: 'GK' })))
    const gkBought = attributesOf(userOf(worldWith({ goalkeeping: 2 }, { position: 'GK' })))
    expect(gkBought.goalkeeping).toBe(gkBase.goalkeeping + 2)
  })

  it('加点会把定位与出场角色一起算进去', () => {
    const base = userOf(worldWith())
    const bought = userOf(worldWith({ shooting: 2, technique: 4, physical: 1 }))
    expect(overall(bought)).toBeGreaterThan(overall(base))
    expect(bought.attributes.technique).toBe(base.attributes.technique + 4)
    // 经验账本从 0 起步：建号点买不占经验投资的价格曲线。
    expect(bought.attrInvestment.technique).toBe(0)
    expect(bought.exp).toBe(0)
    expect(bought.lifetimeExp).toBe(0)
  })
})
