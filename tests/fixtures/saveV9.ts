import type { WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { playToKeyMoments } from './matchday'

/**
 * v9 存档还没有名宿：关系表里查不到 role 为 legend 的那条，绝技传授这条路对老档是断的。
 * 先把现代存档生成出来再抹掉名宿，用来验证 v9→v10 迁移能把它补回去。
 */
function asV9(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 9
  for (const id of Object.keys(legacy.relationships)) {
    if (legacy.relationships[id].role === 'legend') delete legacy.relationships[id]
  }
  return legacy
}

export function v9World(seed = 2026): WorldState {
  return asV9(generateWorld(testOptions({ seed }), TEST_NOW))
}

/** 脏档：名宿已经在册但信任被玩家刷高了，迁移不能把他抹掉重来。 */
export function v9HalfWorld(seed = 2026): WorldState {
  const world = v9World(seed)
  const id = `rel:legend:${world.playerId}`
  world.relationships[id] = {
    id,
    name: '俱乐部名宿',
    nameZh: '俱乐部名宿',
    role: 'legend',
    trust: 77,
    tension: 0,
    summary: '他已经把你当成能教的人。',
    lastInteractionWeek: 0,
  }
  return world
}

/** 停在开球的 v9 旧档：迁移后要能接着把这场踢完。 */
export function v9LiveWorld(): WorldState {
  const { world } = playToKeyMoments(7)
  return asV9(world)
}
