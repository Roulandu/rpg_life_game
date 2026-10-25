import { overall } from '../domain/attributes'
import type { WorldState } from '../domain/types'

export function retirementReason(world: WorldState): string | null {
  const user = world.players[world.playerId]
  if (!user) return null
  if (user.age >= 38) return '年龄'
  if (user.age >= 34 && overall(user) < 48) return '状态下滑'
  if (user.age >= 32 && user.injury && user.injury.severity >= 3) return '伤病'
  return null
}

export function shouldRetire(world: WorldState): boolean {
  return retirementReason(world) != null
}
