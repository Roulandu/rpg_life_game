import type { Injury, WorldState } from '../../src/domain/types'
import { startWeek } from '../../src/engine/turn'
import { PLAN, readyWorld } from './matchday'

/** v4 存档的形状：日时钟字段还不存在，待办计划叫 pendingWeekPlan。 */
interface V4Shape extends WorldState {
  pendingWeekPlan?: unknown
}

interface V4Options {
  live?: boolean
  injuryWeeks?: number
}

function toV4(world: V4Shape): WorldState {
  const legacy = world as unknown as Record<string, unknown>
  const pending = world.pendingDayPlan
  delete legacy.day
  delete legacy.weekPlan
  delete legacy.pendingDayPlan
  delete legacy.pendingWeekPlan
  for (const fixture of Object.values(world.fixtures)) delete fixture.day
  world.version = 4
  world.pendingWeekPlan = pending ?? null
  return world
}

/**
 * 造一份可迁移的 v4 存档。live 选项把它停在开球 0 分钟，
 * 用来验证迁移后还能接着踢完那场比赛。
 */
export function v4World(seed = 2026, options: V4Options = {}): WorldState {
  const base = options.live ? startWeek(readyWorld(seed), PLAN).world : readyWorld(seed)
  const world = toV4(structuredClone(base) as V4Shape)

  if (options.injuryWeeks) {
    const legacy = { kind: '脚踝扭伤', weeksLeft: options.injuryWeeks, severity: 2 }
    world.players[world.playerId]!.injury = legacy as unknown as Injury
  }
  return world
}
