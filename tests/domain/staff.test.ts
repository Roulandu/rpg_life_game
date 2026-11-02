import { describe, expect, it } from 'vitest'
import {
  STAFF_CANDIDATES,
  STAFF_ROLE_ORDER,
  buildStaffPool,
  findStaffCandidate,
  hasStaffRole,
  staffFactors,
  staffWeeklyCostOf,
  staffWeeklyTotal,
} from '../../src/domain'
import type { StaffMember } from '../../src/domain'

/** 造一个在职成员：只关心角色与水平，其余字段按最小可信值填。 */
function hired(role: StaffMember['role'], quality: number, id = `staff:${role}:test`): StaffMember {
  return {
    id,
    role,
    name: 'Test Person',
    nameZh: '测试成员',
    quality,
    weeklyCost: staffWeeklyCostOf(role, quality),
    hiredDay: 3,
  }
}

describe('个人团队的招聘池', () => {
  it('同一种子同一赛季两次出题完全一致', () => {
    expect(buildStaffPool(42, 2026)).toEqual(buildStaffPool(42, 2026))
  })

  it('每个角色都出 3 个候选，中文名列在候选里可用', () => {
    const pool = buildStaffPool(42, 2026)
    expect(pool).toHaveLength(STAFF_ROLE_ORDER.length * 3)
    for (const role of STAFF_ROLE_ORDER) {
      expect(pool.filter((item) => item.role === role)).toHaveLength(3)
    }
    for (const candidate of pool) {
      expect(candidate.nameZh.length).toBeGreaterThan(1)
      expect(candidate.weeklyCost).toBe(staffWeeklyCostOf(candidate.role, candidate.quality))
    }
  })

  it('换一季会换人，候选不会一辈子只有那三个', () => {
    const idsOf = (season: number) => buildStaffPool(42, season).map((item) => item.id).join('|')
    expect(idsOf(2026)).not.toBe(idsOf(2027))
  })

  it('候选按 id 能取回同一个人，取不到时返回空而不是编一个', () => {
    const first = STAFF_CANDIDATES[0]!
    expect(findStaffCandidate(first.id)).toEqual(first)
    expect(findStaffCandidate('staff:doctor:nobody')).toBeNull()
  })
})

describe('个人团队的周薪', () => {
  it('周薪由角色基线乘水平系数：队医 90 水平每周 £98', () => {
    expect(staffWeeklyCostOf('doctor', 90)).toBe(9800)
  })

  it('水平越低越便宜，但同一角色内部单调', () => {
    expect(staffWeeklyCostOf('trainer', 60)).toBeLessThan(staffWeeklyCostOf('trainer', 90))
    expect(staffWeeklyCostOf('psychologist', 75)).toBeLessThan(staffWeeklyCostOf('psychologist', 80))
  })

  it('在职成员的周薪合计就是团队每周固定开销', () => {
    const members = [hired('doctor', 90), hired('psychologist', 75)]
    expect(staffWeeklyTotal(members)).toBe(staffWeeklyCostOf('doctor', 90) + staffWeeklyCostOf('psychologist', 75))
  })
})

describe('个人团队对每日结算的系数', () => {
  it('一个人都没有时所有系数都是恒等值', () => {
    expect(staffFactors([])).toEqual({
      injuryRisk: 1,
      recoveryDays: 1,
      dailyFitness: 0,
      moraleFloor: 0,
      confidencePerDay: 0,
      psychBonus: 0,
      expFactor: 1,
      investDiscount: 0,
      specializationFactor: 1,
    })
  })

  it('队医把受伤概率压到七成、恢复天数压到八成，伤停期间每天多维护 1 点体能', () => {
    const factors = staffFactors([hired('doctor', 90)])
    expect(factors.injuryRisk).toBe(0.7)
    expect(factors.recoveryDays).toBe(0.8)
    expect(factors.dailyFitness).toBe(1)
  })

  it('水平不足的队医只兑现相应比例，不是雇了就满配', () => {
    const factors = staffFactors([hired('doctor', 45)])
    expect(factors.injuryRisk).toBe(0.85)
    expect(factors.recoveryDays).toBe(0.9)
  })

  it('心理咨询师托住士气下限，并按水平给每日自信与关键回合心态加成', () => {
    const full = staffFactors([hired('psychologist', 90)])
    expect(full.moraleFloor).toBe(45)
    expect(full.confidencePerDay).toBe(0.2)
    expect(full.psychBonus).toBe(0.012)

    const half = staffFactors([hired('psychologist', 45)])
    expect(half.confidencePerDay).toBe(0.1)
    expect(half.psychBonus).toBe(0.006)
  })

  it('私教把训练经验与特训效率提到 1.5 倍，属性投资打九折', () => {
    const factors = staffFactors([hired('trainer', 90)])
    expect(factors.expFactor).toBe(1.5)
    expect(factors.specializationFactor).toBe(1.5)
    expect(factors.investDiscount).toBe(0.1)
  })

  it('同一角色重复在职只按水平最高的那位生效，不叠成两倍', () => {
    const factors = staffFactors([hired('doctor', 60), hired('doctor', 90)])
    expect(factors.injuryRisk).toBe(0.7)
    expect(hasStaffRole([hired('trainer', 70)], 'doctor')).toBe(false)
  })

  it('三个角色同时在岗时各自的系数互不干扰', () => {
    const factors = staffFactors([hired('doctor', 90), hired('psychologist', 90), hired('trainer', 90)])
    expect(factors.injuryRisk).toBe(0.7)
    expect(factors.moraleFloor).toBe(45)
    expect(factors.expFactor).toBe(1.5)
  })
})
