import type { Player, WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { playToKeyMoments } from './matchday'

/**
 * v8 存档还没有绝技层：球员的 `moves` 与周计划的 `specialization` 整体缺失。
 * 先跑出现代存档再把它们抹掉，用来验证 v8→v9 迁移能补回来。
 */
function asV8(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 8
  delete legacy.weekPlan.specialization
  for (const player of Object.values(legacy.players) as Array<Partial<Player>>) {
    delete player.moves
  }
  return legacy
}

export function v8World(seed = 2026): WorldState {
  return asV8(generateWorld(testOptions({ seed }), TEST_NOW))
}

/** 脏档：主角已经带着一条二级绝技，队友什么都没有，迁移要各补各的且不覆盖已有值。 */
export function v8HalfWorld(seed = 2026): WorldState {
  const world = v8World(seed)
  const user = world.players[world.playerId]
  user.moves = [{ moveId: 'mv_rainbow', level: 2, progress: 1 }]
  return world
}

/** 停在开球的 v8 旧档：迁移后要能接着把这场踢完。 */
export function v8LiveWorld(): WorldState {
  const { world } = playToKeyMoments(7)
  return asV8(world)
}
