import type { WorldState } from '../domain'
import { createRng } from '../lib'
import type { Rng } from '../lib'

/** 日维度随机域：同一标签在不同天走不同流，逐日结算才不会把同一结果重复七次。 */
export function dayRng(world: WorldState, tag: string): Rng {
  return createRng(world.seed, tag, world.season, world.week, world.day)
}

export function dailyId(world: WorldState, prefix: string, suffix = ''): string {
  const tail = suffix ? `:${suffix}` : ''
  return `${prefix}:${world.season}:${world.week}:${world.day}${tail}`
}

/**
 * 今天这场比赛还没踢完。属性投资与投资动作都靠它闸门：关键回合的成功率在开球时就锁进选项，
 * 中途改世界会让已预抽的 roll 与文案对不上。只读 `pendingDayPlan` 与战报状态，不 import day.ts，
 * 免得走出 day → investments → day 的环。
 */
export function matchInProgress(world: WorldState): boolean {
  return Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live'
}
