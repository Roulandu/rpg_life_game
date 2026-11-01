import { ATTR_KEYS, computeOverall, positionGroup } from './attributes'
import type { AttrInvestment, AttrKey, Attributes, Player, Position } from './types'

/** 第 1 点经验投资的价格；此后每多投一点贵 2，越练越贵，天然收敛。 */
export const INVEST_FIRST_COST = 6
export const INVEST_STEP_COST = 2

/** 属性值的绝对天花板：任何投资都不许越过它。 */
export const INVEST_HARD_CAP = 96

/** 单属性可投上限从 40 起步，每 20 点累计经验再解锁 1 点。 */
export const INVEST_CAP_BASE = 40
export const INVEST_CAP_PER_EXP = 20

export function emptyAttrInvestment(): AttrInvestment {
  const ledger = {} as AttrInvestment
  for (const key of ATTR_KEYS) ledger[key] = 0
  return ledger
}

/** 该属性在已投 `invested` 点之后再投 1 点的单价。 */
export function investmentCost(invested: number): number {
  return INVEST_FIRST_COST + INVEST_STEP_COST * invested
}

/** 从 `invested` 点起连投 `points` 点的总价。 */
export function investmentSeriesCost(invested: number, points: number): number {
  let total = 0
  for (let step = 0; step < points; step++) total += investmentCost(invested + step)
  return total
}

/** 这名球员当前允许把单项属性练到多高。 */
export function attributeCap(player: Player): number {
  const unlocked = INVEST_CAP_BASE + Math.floor(player.lifetimeExp / INVEST_CAP_PER_EXP)
  return Math.min(INVEST_HARD_CAP, unlocked)
}

/** 十项属性都能投资，只有门将属性需要球员是门将，否则等于烧经验。 */
export function canInvestAttribute(attrKey: AttrKey, position: Position): boolean {
  return attrKey !== 'goalkeeping' || positionGroup(position) === 'GK'
}

function withRaised(attributes: Attributes, attrKey: AttrKey, points: number): Attributes {
  return { ...attributes, [attrKey]: attributes[attrKey] + points }
}

/** 潜力是属性投资的唯一刹车：综合分不得越过 `potential`。 */
export function fitsPotential(player: Player, attrKey: AttrKey, points: number): boolean {
  return computeOverall(player.position, withRaised(player.attributes, attrKey, points)) <= player.potential
}

/**
 * 现在最多能往这项属性投几点：同时受「买得起」「练得到上限」「不越过潜力」三条约束。
 * UI 用它决定置灰与步长，引擎用它做校验，两边不会出现第二套口径。
 */
export function maxInvestable(player: Player, attrKey: AttrKey): number {
  if (!canInvestAttribute(attrKey, player.position)) return 0
  const invested = player.attrInvestment[attrKey] ?? 0
  const headroom = Math.min(attributeCap(player), INVEST_HARD_CAP) - player.attributes[attrKey]
  let points = 0
  while (
    points < headroom &&
    fitsPotential(player, attrKey, points + 1) &&
    investmentSeriesCost(invested, points + 1) <= player.exp
  ) {
    points += 1
  }
  return points
}
