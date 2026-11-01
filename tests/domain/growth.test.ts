import { describe, expect, it } from 'vitest'
import {
  ATTR_KEYS,
  attributeCap,
  canInvestAttribute,
  computeOverall,
  investmentCost,
  investmentSeriesCost,
  maxInvestable,
} from '../../src/domain'
import type { AttrKey, Player, Position } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const baseWorld = generateWorld(testOptions({ seed: 7 }), TEST_NOW)
const template = baseWorld.players[baseWorld.playerId]!

interface Tune {
  position?: Position
  value?: number
  potential?: number
  exp?: number
  lifetimeExp?: number
  invested?: number
}

/**
 * 造一个可控试验体：除被测试属性外一律压到 30，别的项不会来干扰潜力判定。
 * 默认给 400 点累计经验，让单属性上限解锁到 60，好把「买得起 / 练得到 / 不越潜力」三件事分开验。
 */
function playerOf(tune: Tune = {}): Player {
  const player = structuredClone(template)
  const position = tune.position ?? 'ST'
  const key: AttrKey = position === 'GK' ? 'goalkeeping' : 'shooting'
  for (const attr of ATTR_KEYS) player.attributes[attr] = 30
  player.position = position
  player.attributes[key] = tune.value ?? 50
  player.potential = tune.potential ?? 90
  player.exp = tune.exp ?? 0
  player.lifetimeExp = tune.lifetimeExp ?? 400
  for (const attr of ATTR_KEYS) player.attrInvestment[attr] = 0
  player.attrInvestment[key] = tune.invested ?? 0
  return player
}

/** 该球员真正能练的那一项（门将练门将，其他人练射门）。 */
function ownKey(player: Player): AttrKey {
  return player.position === 'GK' ? 'goalkeeping' : 'shooting'
}

describe('经验投资曲线与上限', () => {
  it('回归: 同一属性越投越贵，第 1 点 6、第 2 点 8、第 3 点 10', () => {
    expect(investmentCost(0)).toBe(6)
    expect(investmentCost(1)).toBe(8)
    expect(investmentCost(2)).toBe(10)
    expect(investmentSeriesCost(0, 3)).toBe(24)
    expect(investmentSeriesCost(2, 2)).toBe(22)
  })

  it('单属性上限随累计经验解锁，并且永不过 96', () => {
    expect(attributeCap(playerOf({ lifetimeExp: 0 }))).toBe(40)
    expect(attributeCap(playerOf({ lifetimeExp: 400 }))).toBe(60)
    expect(attributeCap(playerOf({ lifetimeExp: 1120 }))).toBe(96)
    expect(attributeCap(playerOf({ lifetimeExp: 5000 }))).toBe(96)
  })

  it('已经练过上限的属性不再给点数', () => {
    const player = playerOf({ value: 70, exp: 60 })

    expect(maxInvestable(player, ownKey(player))).toBe(0)
  })

  it('经验只够买得起的点数，多一点都不给', () => {
    const player = playerOf({ exp: 14 })

    expect(maxInvestable(player, ownKey(player))).toBe(2)
  })

  it('已投点数计入价格，同样经验能买的点更少', () => {
    const fresh = playerOf({ exp: 14 })
    const used = playerOf({ exp: 14, invested: 2 })

    expect(maxInvestable(fresh, ownKey(fresh))).toBe(2)
    expect(maxInvestable(used, ownKey(used))).toBe(1)
  })
})

describe('属性投资的位置与潜力闸门', () => {
  it('门将属性只有门将能投，其余九项谁都练得到', () => {
    expect(canInvestAttribute('goalkeeping', 'GK')).toBe(true)
    expect(canInvestAttribute('goalkeeping', 'ST')).toBe(false)
    expect(canInvestAttribute('shooting', 'GK')).toBe(true)
    expect(canInvestAttribute('defending', 'ST')).toBe(true)
  })

  it('外场球员点门将属性等于烧经验，直接给 0 点', () => {
    const player = playerOf({ exp: 60 })

    expect(maxInvestable(player, 'goalkeeping')).toBe(0)
  })

  it('回归: 潜力是唯一的刹车，把可投属性全部投满也不越过 potential', () => {
    const player = playerOf({ potential: 55, exp: 4000, lifetimeExp: 1120 })

    for (const key of ATTR_KEYS) {
      if (!canInvestAttribute(key, player.position)) continue
      const attributes = { ...player.attributes, [key]: player.attributes[key] + maxInvestable(player, key) }
      expect(computeOverall(player.position, attributes), key).toBeLessThanOrEqual(55)
    }
  })

  it('潜力已经见顶的球员买不到任何点数', () => {
    const player = playerOf({ exp: 60 })
    player.potential = computeOverall(player.position, player.attributes)

    expect(maxInvestable(player, ownKey(player))).toBe(0)
  })

  it('门将可以练射门，练满受同一条潜力闸门约束', () => {
    const keeper = playerOf({ position: 'GK', potential: 70, exp: 4000, lifetimeExp: 1120 })
    const points = maxInvestable(keeper, 'shooting')

    expect(points).toBeGreaterThan(0)
    const attributes = { ...keeper.attributes, shooting: keeper.attributes.shooting + points }
    expect(computeOverall('GK', attributes)).toBeLessThanOrEqual(70)
  })
})
