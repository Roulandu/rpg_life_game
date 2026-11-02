import type { StaffCandidate, StaffMember } from '../domain'
import { STAFF_ROLE_SPECS } from '../domain'
import { hireStaff, matchInProgress, releaseStaff } from '../engine'
import type { StaffHireOutcome, StaffHireReject } from '../engine'
import { formatMoney } from '../lib'
import { commitSettled } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type StaffSlice = Pick<GameStore, 'hireTeamMember' | 'releaseTeamMember'>

/** 引擎只回一个 reason 码，玩家要的是一句照着能做的话。 */
const REJECT_TEXT: Record<Exclude<StaffHireReject, null>, string> = {
  matchLive: '比赛进行中不能改人事，先把今天踢完。',
  unknownCandidate: '这个人已经不在本赛季的招聘池里，换季会换人。',
  roleTaken: '这个位置已经有了人，先解雇现任再换。',
  notEnoughBalance: '余额不够付第一周周薪。',
}

const NOT_IN_TEAM = '这个人已经不在团队里了，刷新一下再试。'

function roleLabel(candidate: StaffCandidate): string {
  return STAFF_ROLE_SPECS[candidate.role].label
}

/**
 * `notEnoughBalance` / `roleTaken` 时引擎把候选人一起带回，所以这里报得出「差多少钱、
 * 是哪个位置」；只有招聘池里查不到人时才退回通用文案。
 */
function rejectText(outcome: StaffHireOutcome): string {
  const { candidate, reason } = outcome
  if (candidate && reason === 'notEnoughBalance') {
    return `余额不够付 ${formatMoney(candidate.weeklyCost)} 的第一周周薪。`
  }
  if (candidate && reason === 'roleTaken') {
    return `${roleLabel(candidate)}这个位置已经有了人，先解雇现任再换。`
  }
  return REJECT_TEXT[reason ?? 'unknownCandidate']
}

function hireNotice(candidate: StaffCandidate): string {
  return `已签下 ${candidate.nameZh}（${roleLabel(candidate)}），周薪 ${formatMoney(candidate.weeklyCost)}`
}

function releaseNotice(member: StaffMember): string {
  return `已解雇 ${member.nameZh}（${roleLabel(member)}），每周省下 ${formatMoney(member.weeklyCost)}`
}

async function commitHire(
  set: StoreSet,
  get: StoreGet,
  candidateId: string,
): Promise<StaffHireOutcome | null> {
  const world = get().world
  if (!world || world.retired) return null
  const next = structuredClone(world)
  const outcome = hireStaff(next, candidateId)
  if (!outcome.ok || !outcome.candidate) {
    set({ error: rejectText(outcome) })
    return outcome
  }

  await commitSettled(set, get, next, hireNotice(outcome.candidate))
  return outcome
}

async function commitRelease(
  set: StoreSet,
  get: StoreGet,
  staffId: string,
): Promise<boolean> {
  const world = get().world
  if (!world || world.retired) return false
  const next = structuredClone(world)
  const member = next.staff.find((item) => item.id === staffId) ?? null
  if (!member) {
    set({ error: matchInProgress(next) ? REJECT_TEXT.matchLive : NOT_IN_TEAM })
    return false
  }
  if (!releaseStaff(next, staffId)) {
    set({ error: REJECT_TEXT.matchLive })
    return false
  }

  await commitSettled(set, get, next, releaseNotice(member))
  return true
}

export const createStaffSlice: StoreSlice<StaffSlice> = (set, get) => ({
  hireTeamMember: (candidateId) => commitHire(set, get, candidateId),
  releaseTeamMember: (staffId) => commitRelease(set, get, staffId),
})
