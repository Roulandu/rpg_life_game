import { MOVE_MAX_LEVEL, moveById, moveFitsPosition } from '../domain'
import type { WorldState } from '../domain'
import { trainMove } from './moveProgress'
import { grantExp } from './growth'

/**
 * 职责：每周一次的「特训槽」日结算——把周计划里指定的那条绝技练出进度，攒满一格就升级。
 * 边界：只有位置对得上、且 unlock.via 允许特训的绝技才涨进度；受伤当天不练；满级后不再攒进度。
 * 依赖：src/domain 的绝技查询（moveById / moveFitsPosition）、./moveProgress 的进度落地与 ./growth 的经验入口。
 */
export const SPECIALIZATION_PROGRESS = 1
export const SPECIALIZATION_EXP = 1

export function applySpecialization(world: WorldState): void {
  const user = world.players[world.playerId]
  const moveId = world.weekPlan.specialization
  if (!user || !moveId || user.injury) return
  const move = moveById(moveId)
  if (!move || !moveFitsPosition(move, user.position)) return

  const held = user.moves?.some((item) => item.moveId === move.id && item.level < MOVE_MAX_LEVEL)
  const learns = move.unlock.via.includes('specialization')
  if (!held && !learns) return
  if (trainMove(world, user, move, SPECIALIZATION_PROGRESS, 'specialization')) {
    grantExp(world, SPECIALIZATION_EXP, 'specialization')
  }
}
