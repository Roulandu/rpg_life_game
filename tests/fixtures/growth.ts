import { ATTR_KEYS, emptyAttrInvestment } from '../../src/domain'
import type { AttrKey, Player, WorldState } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export function freshWorld(seed = 2026): WorldState {
  return generateWorld(testOptions({ seed }), TEST_NOW)
}

export function userOf(world: WorldState): Player {
  return world.players[world.playerId]
}

export interface TunePatch {
  exp?: number
  lifetimeExp?: number
  potential?: number
}

/**
 * 把主角调成一个可控样本：属性一律压到 30、潜力抬到 96，
 * 好让「买不起 / 练不到上限 / 越过潜力」三条约束各测各的，不再受生成时的随机属性影响。
 * 需要潜力刹车时由用例自己把 potential 压回当前综合分。
 */
export function tune(world: WorldState, patch: TunePatch = {}): Player {
  const user = userOf(world)
  for (const key of ATTR_KEYS) user.attributes[key] = 30
  user.exp = patch.exp ?? 20
  user.lifetimeExp = patch.lifetimeExp ?? 400
  user.potential = patch.potential ?? 96
  user.attrInvestment = emptyAttrInvestment()
  return user
}

export function keyAttrOf(player: Player): AttrKey {
  return player.position === 'GK' ? 'goalkeeping' : 'shooting'
}
