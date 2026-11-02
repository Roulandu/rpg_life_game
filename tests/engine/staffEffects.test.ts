import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { createRng } from '../../src/lib'
import { applyStaffDailyEffects, staffFactorsOf, staffInjuryChance, staffInjuryDays } from '../../src/engine/staff'
import { rollUserMatchEvents } from '../../src/engine/matchUser'
import { userOf } from '../fixtures/growth'
import { member, staffed } from '../fixtures/staff'

/**
 * 用一条可控的随机流踢一次「比赛事件」判定，返回伤停天数。
 * 体能压到 0 才有机会撞到受伤分支，两次跑法喂同一个 probe 才能对齐同一串数。
 */
function injuryDaysOf(world: WorldState, probe: number): number | null {
  const user = userOf(world)
  user.injury = null
  user.fitness = 0
  rollUserMatchEvents(world, user, 0, 0, createRng(probe, 'staff-probe'))
  return userOf(world).injury?.daysLeft ?? null
}

describe('队医把伤病按天折算', () => {
  it('没有队医时伤停天数与受伤概率原样落地', () => {
    const world = staffed([])
    expect(staffInjuryDays(world, 20)).toBe(20)
    expect(staffInjuryChance(world, 0.1)).toBeCloseTo(0.1, 10)
  })

  it('满配队医把 20 天伤停压到 16 天、受伤概率降到七成', () => {
    const world = staffed([member('doctor', 90)])
    expect(staffInjuryDays(world, 20)).toBe(16)
    expect(staffInjuryChance(world, 0.1)).toBeCloseTo(0.07, 10)
  })

  it('水平 45 的队医只兑现一半本事：20 天压到 18 天', () => {
    const world = staffed([member('doctor', 45)])
    expect(staffInjuryDays(world, 20)).toBe(18)
  })

  it('再短的伤停也不会被压成 0 天', () => {
    const world = staffed([member('doctor', 90)])
    expect(staffInjuryDays(world, 1)).toBe(1)
  })

  it('同一角色只认水平最高的那位', () => {
    const best = staffed([member('doctor', 50), member('doctor', 90)])
    expect(staffFactorsOf(best).recoveryDays).toBe(0.8)
  })

  it('比赛受伤真的走队医系数：同一串随机数下伤停压到八成', () => {
    const plain = staffed([])
    const doctored = staffed([member('doctor', 90)])
    const pairs: { raw: number; days: number }[] = []

    for (let probe = 1; probe <= 400 && pairs.length < 3; probe += 1) {
      const raw = injuryDaysOf(plain, probe)
      if (!raw) continue
      const days = injuryDaysOf(doctored, probe)
      if (days) pairs.push({ raw, days })
    }

    expect(pairs.length).toBeGreaterThan(0)
    for (const pair of pairs) expect(pair.days).toBe(Math.max(1, Math.round(pair.raw * 0.8)))
  })
})

describe('团队每日效果', () => {
  it('没雇人时士气与自信一步不动', () => {
    const world = staffed([])
    const user = userOf(world)
    user.morale = 20
    user.confidence = 50

    applyStaffDailyEffects(world)

    expect(user.morale).toBe(20)
    expect(user.confidence).toBe(50)
  })

  it('心理咨询师把跌到 20 的士气托回 45，并每天加 0.2 自信', () => {
    const world = staffed([member('psychologist', 90)])
    const user = userOf(world)
    user.morale = 20
    user.confidence = 50

    applyStaffDailyEffects(world)

    expect(user.morale).toBe(45)
    expect(user.confidence).toBeCloseTo(50.2, 6)
  })

  it('士气本来就在下限之上时心理咨询师不硬拉', () => {
    const world = staffed([member('psychologist', 90)])
    const user = userOf(world)
    user.morale = 70

    applyStaffDailyEffects(world)

    expect(user.morale).toBe(70)
  })

  it('队医在伤停期间每天补 1 点体能，健康那天不补', () => {
    const hurt = staffed([member('doctor', 90)])
    const user = userOf(hurt)
    user.fitness = 60
    user.injury = { kind: '脚踝扭伤', daysLeft: 10, severity: 2 }

    applyStaffDailyEffects(hurt)

    expect(user.fitness).toBe(61)

    const fit = staffed([member('doctor', 90)])
    const fitUser = userOf(fit)
    fitUser.fitness = 60
    applyStaffDailyEffects(fit)
    expect(fitUser.fitness).toBe(60)
  })
})
