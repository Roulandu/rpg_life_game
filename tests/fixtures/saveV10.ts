import type { WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { playToKeyMoments } from './matchday'

/**
 * v10 的财务只有「周日一次算清」这一档：没有待入账，也没有投资账本。
 * 先把现代存档生成出来再抹掉这三项，用来验证 v10→v11 迁移能补齐结构而不改余额。
 */
function asV10(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 10
  delete (legacy.finance as Partial<typeof legacy.finance>).pendingIncome
  delete (legacy.finance as Partial<typeof legacy.finance>).pendingExpenses
  delete (legacy.finance as Partial<typeof legacy.finance>).investments
  return legacy
}

export function v10World(seed = 2026): WorldState {
  return asV10(generateWorld(testOptions({ seed }), TEST_NOW))
}

/** 脏档：迁移之前就已经带着一笔定期存款和一条 investment 流水，迁移必须原样认下。 */
export function v10HalfWorld(seed = 2026): WorldState {
  const world = v10World(seed)
  world.finance.investments = [
    {
      id: 'inv:v10:saving',
      kind: 'deposit',
      name: '老账户定期',
      principal: 250000,
      rateBps: 180,
      openedDay: 12,
      risk: 0,
    },
  ]
  world.finance.pendingIncome = 9000
  world.finance.ledger.unshift({
    week: world.week,
    season: world.season,
    type: 'investment',
    amount: -250000,
    label: '老账户定期',
  })
  return world
}

/** 停在开球的 v10 旧档：迁移后要能接着把这场踢完。 */
export function v10LiveWorld(): WorldState {
  const { world } = playToKeyMoments(7)
  return asV10(world)
}
