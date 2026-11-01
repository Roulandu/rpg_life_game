import { describe, expect, it } from 'vitest'
import { EVENT_SCOPE_FIELDS } from '../../src/domain'
import type { EventScope, MatchReport } from '../../src/domain'
import { buildEventScope, scopeMatches } from '../../src/engine/eventCondition'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

/** 投影只读这几项，所以测试用最小报告即可，不必伪造整场数据。 */
function partialReport(patch: Partial<MatchReport>): MatchReport {
  return { status: 'final', week: world.week, season: world.season, ...patch } as MatchReport
}

describe('事件条件白名单投影', () => {
  it('投影字段正好等于白名单，值取自当天世界状态', () => {
    const scope = buildEventScope(world, null)
    expect(Object.keys(scope).sort()).toEqual([...EVENT_SCOPE_FIELDS].sort())
    const user = world.players[world.playerId]
    expect(scope.weekday).toBe(world.day)
    expect(scope.absoluteDay).toBe((world.week - 1) * 7 + world.day)
    expect(scope.morale).toBe(user.morale)
    expect(scope.age).toBe(user.age)
    expect(scope.clubTier).toBe(world.clubs[world.clubId].tier)
  })

  it('带当日比赛报告时评分与出场进入投影', () => {
    const scope = buildEventScope(world, partialReport({ userRating: 7.6, userPlayed: true, userStarted: true }))
    expect(scope.lastRating).toBeCloseTo(7.6)
    expect(scope.lastPlayed).toBe(1)
    expect(scope.isMatchDay).toBe(true)
  })

  it('没有报告时评分为空、出场为 0', () => {
    const scope = buildEventScope(world, null)
    expect(scope.lastRating).toBeNull()
    expect(scope.lastPlayed).toBe(0)
  })
})

describe('事件条件求值', () => {
  const base = buildEventScope(world, null) as EventScope

  it('eq / lt / lte / gte / between / in 六种比较各自成立', () => {
    expect(scopeMatches(base, [{ field: 'weekday', op: 'eq', value: base.weekday }])).toBe(true)
    expect(scopeMatches(base, [{ field: 'weekday', op: 'lt', value: 8 }])).toBe(true)
    expect(scopeMatches(base, [{ field: 'weekday', op: 'lte', value: base.weekday }])).toBe(true)
    expect(scopeMatches(base, [{ field: 'weekday', op: 'gte', value: 1 }])).toBe(true)
    expect(scopeMatches(base, [{ field: 'weekday', op: 'between', value: [1, 7] }])).toBe(true)
    expect(scopeMatches(base, [{ field: 'weekday', op: 'in', value: [base.weekday] }])).toBe(true)
  })

  it('多条条件是合取，任一不成立整条模板出局', () => {
    expect(scopeMatches(base, [
      { field: 'weekday', op: 'eq', value: base.weekday },
      { field: 'weekday', op: 'eq', value: base.weekday + 1 },
    ])).toBe(false)
  })

  it('空条件恒成立，白名单外的字段直接报错而不是静默通过', () => {
    expect(scopeMatches(base, [])).toBe(true)
    const bogus = [{ field: 'isTuringComplete', op: 'eq', value: true }]
    expect(() => scopeMatches(base, bogus as never)).toThrow(/isTuringComplete/)
  })

  it('布尔字段用 eq，数字字段可以用区间，字符串字段用 in', () => {
    const injured = { ...base, injuryDaysLeft: 12 }
    expect(scopeMatches(injured, [{ field: 'injuryDaysLeft', op: 'between', value: [1, 30] }])).toBe(true)
    expect(scopeMatches({ ...base, positionGroup: 'GK' }, [{ field: 'positionGroup', op: 'in', value: ['GK'] }])).toBe(true)
    expect(scopeMatches({ ...base, isMatchDay: true }, [{ field: 'isMatchDay', op: 'eq', value: true }])).toBe(true)
    expect(scopeMatches({ ...base, isMatchDay: false }, [{ field: 'isMatchDay', op: 'eq', value: true }])).toBe(false)
  })
})
