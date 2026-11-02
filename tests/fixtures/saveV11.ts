import type { WorldState } from '../../src/domain/types'
import type { StaffMember } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { playToKeyMoments } from './matchday'

/**
 * v11 还没有个人团队这一层：世界顶层缺 `staff`。
 * 先把现代存档生成出来再抹掉这个字段，用来验证 v11→v12 迁移只补名册、不动别的。
 */
function asV11(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 11
  delete (legacy as Partial<WorldState>).staff
  return legacy
}

export function v11World(seed = 2026): WorldState {
  return asV11(generateWorld(testOptions({ seed }), TEST_NOW))
}

/** 脏档：迁移之前就已经带着一名在职队医，迁移必须原样认下而不是清空。 */
export function v11HiredWorld(seed = 2026): WorldState {
  const world = v11World(seed)
  const member: StaffMember = {
    id: 'staff:doctor:hayes',
    role: 'doctor',
    name: 'Margaret Hayes',
    nameZh: '玛格丽特·海斯',
    quality: 92,
    weeklyCost: 9940,
    hiredDay: 5,
  }
  ;(world as Partial<WorldState>).staff = [member]
  return world
}

/** 停在开球的 v11 旧档：迁移后要能接着把这场踢完。 */
export function v11LiveWorld(): WorldState {
  const { world } = playToKeyMoments(7)
  return asV11(world)
}
