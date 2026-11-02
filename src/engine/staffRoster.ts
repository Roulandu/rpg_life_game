import { absoluteDay, buildStaffPool, hasStaffRole } from '../domain'
import type { StaffCandidate, WorldState } from '../domain'
import { matchInProgress } from './dayContext'

/**
 * 职责：个人团队名册的读写口——本赛季能请谁、把人请进来、把人送走。
 * 边界：比赛进行中不做人事变动；同一角色只认一个人；进门得先付得起第一周周薪。
 * 依赖：src/domain 的招聘池推导与 ./dayContext 的比赛闸门。
 */
export type StaffHireReject = 'matchLive' | 'unknownCandidate' | 'roleTaken' | 'notEnoughBalance'

export interface StaffHireOutcome {
  ok: boolean
  reason: StaffHireReject | null
  candidate: StaffCandidate | null
  weeklyCost: number
}

/** 本赛季的招聘池：纯推导，不落盘，换季会换人。 */
export function staffCandidatesOf(world: WorldState): StaffCandidate[] {
  return buildStaffPool(world.seed, world.season)
}

function rejected(reason: StaffHireReject, candidate: StaffCandidate | null): StaffHireOutcome {
  return { ok: false, reason, candidate, weeklyCost: candidate?.weeklyCost ?? 0 }
}

function hireBlocker(world: WorldState, candidate: StaffCandidate | null): StaffHireReject | null {
  if (matchInProgress(world)) return 'matchLive'
  if (!candidate) return 'unknownCandidate'
  if (hasStaffRole(world.staff, candidate.role)) return 'roleTaken'
  if (world.finance.balance < candidate.weeklyCost) return 'notEnoughBalance'
  return null
}

/**
 * 雇一个人：先付得起第一周周薪才准进门，之后每周按 1/7 挂进待入账。
 * 周薪与水平随人一起进存档，所以换季换了招聘池也不会影响已经请进来的人。
 * 被拒时同样把候选人带回去：UI 要报出「差多少钱」，而不是只说「付不起」。
 */
export function hireStaff(world: WorldState, candidateId: string): StaffHireOutcome {
  const candidate = staffCandidatesOf(world).find((item) => item.id === candidateId) ?? null
  const reason = hireBlocker(world, candidate)
  if (reason || !candidate) return rejected(reason ?? 'unknownCandidate', candidate)

  world.staff.push({ ...candidate, hiredDay: absoluteDay(world.week, world.day) })
  return { ok: true, reason: null, candidate, weeklyCost: candidate.weeklyCost }
}

export function releaseStaff(world: WorldState, staffId: string): boolean {
  if (matchInProgress(world)) return false
  const index = world.staff.findIndex((member) => member.id === staffId)
  if (index < 0) return false
  world.staff.splice(index, 1)
  return true
}
