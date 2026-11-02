import { describe, expect, it } from 'vitest'
import { staffWeeklyTotal } from '../../src/domain'
import type { StaffCandidate, StaffRole, WorldState } from '../../src/domain'
import { hireStaff, releaseStaff, staffCandidatesOf } from '../../src/engine/staffRoster'
import { staffFactorsOf } from '../../src/engine/staff'
import { postWeeklyLedger } from '../../src/engine/financeDaily'
import { accrueWeek, member, staffed } from '../fixtures/staff'

/** 够付任何一个人第一周周薪的余额：雇佣闸门只关心「付不付得起」，不让用例先去猜价格。 */
function rich(world: WorldState): void {
  world.finance.balance = 1_000_000
}

/** 从本赛季招聘池里取一个真的可以雇的人：用例要的是「池子里有这个人」这件事。 */
function offerOf(world: WorldState, role: StaffRole): StaffCandidate {
  const candidate = staffCandidatesOf(world).find((item) => item.role === role)
  if (!candidate) throw new Error(`${role} 的招聘池是空的`)
  return candidate
}

describe('雇佣个人团队', () => {
  it('招聘池给每个角色三个候选，钱够就能把人请进名册', () => {
    const world = staffed([])
    rich(world)
    const offer = offerOf(world, 'doctor')

    const result = hireStaff(world, offer.id)

    expect(staffCandidatesOf(world)).toHaveLength(9)
    expect(result.ok).toBe(true)
    expect(world.staff).toHaveLength(1)
    expect(world.staff[0]).toMatchObject({ id: offer.id, role: 'doctor', weeklyCost: offer.weeklyCost })
    expect(staffFactorsOf(world).injuryRisk).toBeLessThan(1)
  })

  it('同一个角色已经有人的话拒绝第二次雇佣', () => {
    const world = staffed([])
    rich(world)
    const offer = offerOf(world, 'doctor')
    hireStaff(world, offer.id)

    expect(hireStaff(world, offer.id).reason).toBe('roleTaken')
    expect(world.staff).toHaveLength(1)
  })

  it('余额付不起第一周周薪时拒绝雇佣', () => {
    const world = staffed([])
    const offer = offerOf(world, 'trainer')
    world.finance.balance = offer.weeklyCost - 1

    expect(hireStaff(world, offer.id).reason).toBe('notEnoughBalance')
    expect(world.staff).toEqual([])
  })

  it('不在本赛季招聘池里的 id 拒绝雇佣', () => {
    const world = staffed([])
    rich(world)

    expect(hireStaff(world, 'staff:doctor:nobody').reason).toBe('unknownCandidate')
  })

  it('比赛进行中不做人事变动', () => {
    const world = staffed([])
    rich(world)
    const offer = offerOf(world, 'doctor')
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }

    expect(hireStaff(world, offer.id).reason).toBe('matchLive')
    expect(releaseStaff(world, offer.id)).toBe(false)
  })
})

describe('解雇个人团队成员', () => {
  it('解雇之后名册与每周支出同时降下来', () => {
    const world = staffed([])
    rich(world)
    const offer = offerOf(world, 'doctor')
    hireStaff(world, offer.id)

    expect(releaseStaff(world, offer.id)).toBe(true)
    expect(staffWeeklyTotal(world.staff)).toBe(0)
    expect(staffFactorsOf(world).injuryRisk).toBe(1)
  })

  it('解雇一个没雇过的人返回 false', () => {
    const world = staffed([member('trainer', 80)])

    expect(releaseStaff(world, 'staff:doctor:probe')).toBe(false)
    expect(world.staff).toHaveLength(1)
  })
})

describe('团队周薪进财务', () => {
  it('雇一名队医后每周待入账多出他的周薪，周日流水标签带上团队薪酬', () => {
    const doctor = member('doctor', 90)
    const world = staffed([doctor])
    const baseline = staffed([])
    world.finance.ledger = []

    const pending = accrueWeek(world)
    const plainPending = accrueWeek(baseline)
    const result = postWeeklyLedger(world)

    expect(pending - plainPending).toBeCloseTo(doctor.weeklyCost, 6)
    expect(result.expenses - Math.round(plainPending)).toBe(doctor.weeklyCost)
    expect(world.finance.ledger[0]?.label).toContain('团队')
  })

  it('没雇人时待入账就是生活开销，流水标签也不提团队', () => {
    const world = staffed([])
    world.finance.ledger = []

    const pending = accrueWeek(world)
    postWeeklyLedger(world)

    expect(Math.round(pending)).toBe(world.finance.weeklyExpenses)
    expect(world.finance.ledger[0]?.label).not.toContain('团队')
  })
})
