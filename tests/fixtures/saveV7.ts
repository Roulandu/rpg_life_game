import type { Player, WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { playToKeyMoments } from './matchday'

/**
 * v7 存档还没有成长账本：`exp` / `lifetimeExp` / `attrInvestment` 三个字段整体缺失。
 * 先跑出现代存档，再把它们抹掉，用来验证 v7→v8 迁移能补回来。
 */
function asV7(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 7
  for (const player of Object.values(legacy.players) as Array<Partial<Player>>) {
    delete player.exp
    delete player.lifetimeExp
    delete player.attrInvestment
  }
  return legacy
}

export function v7World(seed = 2026): WorldState {
  return asV7(generateWorld(testOptions({ seed }), TEST_NOW))
}

/** 脏档：只有主角带着经验，队友一个字段都没有，迁移必须各补各的、不覆盖已有值。 */
export function v7HalfWorld(seed = 2026): WorldState {
  const world = v7World(seed)
  const user = world.players[world.playerId]
  user.exp = 12
  user.lifetimeExp = 30
  return world
}

/**
 * 停在开球的 v7 旧档：迁移后要能接着把这场踢完。
 * 种子挑 7 而不是 2026，因为 2026 这场的评分只有 5.8，换算出来是 0 点经验，证明不了成长通道。
 */
export function v7LiveWorld(): WorldState {
  const { world } = playToKeyMoments(7)
  return asV7(world)
}
