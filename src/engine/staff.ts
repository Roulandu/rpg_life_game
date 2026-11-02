import { clamp, round1, staffFactors } from '../domain'
import type { StaffFactors, WorldState } from '../domain'

/**
 * 职责：个人团队（队医 / 心理咨询师 / 私人教练）在引擎侧的读数口——把名册折算成系数，
 * 再折算伤停与每日效果。名册的读写在 ./staffRoster.ts。
 * 边界：系数一律来自 `src/domain/staff.ts`，这里不重复定义任何数字；同一角色只认水平最高的那位。
 * 依赖：src/domain 的团队系数。
 */
export function staffFactorsOf(world: WorldState): StaffFactors {
  return staffFactors(world.staff)
}

/** 队医按恢复系数压短伤停天数：至少留 1 天，免得把一次真伤算成没伤。 */
export function staffInjuryDays(world: WorldState, days: number): number {
  return Math.max(1, Math.round(days * staffFactorsOf(world).recoveryDays))
}

export function staffInjuryChance(world: WorldState, chance: number): number {
  return chance * staffFactorsOf(world).injuryRisk
}

/** 每日效果的落地点：士气托底、自信积累，以及伤停期间的体能维护。 */
export function applyStaffDailyEffects(world: WorldState): void {
  const user = world.players[world.playerId]
  if (!user) return
  const factors = staffFactorsOf(world)
  if (factors.moraleFloor > 0) user.morale = clamp(round1(user.morale), factors.moraleFloor, 100)
  if (factors.confidencePerDay > 0) {
    user.confidence = clamp(round1(user.confidence + factors.confidencePerDay), 0, 100)
  }
  if (user.injury && factors.dailyFitness > 0) {
    user.fitness = clamp(user.fitness + factors.dailyFitness, 0, 100)
  }
}
