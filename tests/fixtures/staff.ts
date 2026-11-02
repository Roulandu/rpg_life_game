import { staffWeeklyCostOf } from '../../src/domain'
import type { StaffMember, StaffRole, WorldState } from '../../src/domain'
import { accrueDailyFinance } from '../../src/engine/financeDaily'
import { freshWorld } from './growth'

/** 一名可控的在职成员：水平是唯一变量，价格按 domain 的公式算出来，省掉两处口径不一致。 */
export function member(role: StaffRole, quality: number): StaffMember {
  return {
    id: `staff:${role}:probe`,
    role,
    name: 'Probe Person',
    nameZh: '测试成员',
    quality,
    weeklyCost: staffWeeklyCostOf(role, quality),
    hiredDay: 1,
  }
}

export function staffed(members: StaffMember[], seed = 2026): WorldState {
  const world = freshWorld(seed)
  world.staff = members
  return world
}

/** 把一周七天的待入账走完，返回周日入账前的花费累计。 */
export function accrueWeek(world: WorldState): number {
  world.finance.pendingExpenses = 0
  for (let day = 1; day <= 7; day += 1) {
    world.day = day
    accrueDailyFinance(world)
  }
  return world.finance.pendingExpenses
}
