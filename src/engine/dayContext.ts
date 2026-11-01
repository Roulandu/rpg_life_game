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
