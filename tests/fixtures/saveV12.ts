import { advanceWeek } from '../../src/engine/turn'
import type { WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'
import { PLAN, playToKeyMoments } from './matchday'

const WEEKS_PER_SEASON = 38

/** v13 之前没有跨季清理，也没有 once 模板的独立记忆：把这两样抹掉就是老档形状。 */
function asV12(world: WorldState): WorldState {
  const legacy = world as WorldState & { version: number }
  legacy.version = 12
  delete (world as unknown as { eventOnceUsed?: string[] }).eventOnceUsed
  return legacy
}

const switchCache = new Map<number, { before: WorldState; after: WorldState }>()

/** 整季逐周推进要跑好几秒，按种子缓存一次，用例各拿一份克隆去改。 */
function playToNextSeason(seed: number): { before: WorldState; after: WorldState } {
  const cached = switchCache.get(seed)
  if (cached) return { before: structuredClone(cached.before), after: structuredClone(cached.after) }
  let world = generateWorld(testOptions({ seed }), TEST_NOW)
  for (let week = 1; week < WEEKS_PER_SEASON; week += 1) {
    world = advanceWeek(world, PLAN).world
  }
  const before = structuredClone(world)
  const switched = { before, after: advanceWeek(world, PLAN).world }
  switchCache.set(seed, switched)
  return { before: structuredClone(before), after: structuredClone(switched.after) }
}

/**
 * 停在第 2 季第 1 周、但还压着第 1 季赛程与事件的 v12 存档。
 * 脏数据是从赛季线之前那份真实状态整份搬回来的，所以带战报、带真实事件文案。
 */
export function v12CrossSeasonWorld(seed = 42): WorldState {
  const { before, after } = playToNextSeason(seed)
  const world = asV12(after)
  for (const [id, fixture] of Object.entries(before.fixtures)) {
    if (fixture.season === before.season) world.fixtures[id] = fixture
  }
  for (const [id, event] of Object.entries(before.events)) {
    if (event.season === before.season) world.events[id] = event
  }
  // 老档里总有几条是玩家当时点过的：处理过的往季事件属于「还在读的历史」，清理不该碰它。
  const handled = Object.values(world.events)
    .filter((event) => event.season === before.season && event.status === 'expired')
    .sort((a, b) => a.id.localeCompare(b.id))[0]
  if (handled) {
    handled.status = 'resolved'
    handled.resultText = handled.choices[0]?.label ?? '已处理'
  }
  return world
}

/** 只有当季数据的 v12 存档：迁移不该动它一根手指。 */
export function v12CleanWorld(seed = 42): WorldState {
  return asV12(playToNextSeason(seed).after)
}

/** 停在开球的 v12 旧档：迁移后这一场要能接着踢完。 */
export function v12LiveWorld(seed = 2026): WorldState {
  const { world } = playToKeyMoments(seed)
  return asV12(world)
}
