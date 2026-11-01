import { describe, expect, it } from 'vitest'
import type { Fixture } from '../../src/domain'
import {
  DAYS_PER_WEEK,
  absoluteDay,
  dayForRound,
  fixtureDayOf,
  weekDayRoles,
} from '../../src/domain'

function fixture(input: {
  round: number
  week?: number
  season?: number
  homeId?: string
  awayId?: string
  day?: number
}): Fixture {
  const season = input.season ?? 2026
  const week = input.week ?? 1
  return {
    id: `fixture:ENG:1:${season}:${String(week).padStart(2, '0')}:${input.round}`,
    competitionId: 'league:ENG:1',
    season,
    week,
    round: input.round,
    homeId: input.homeId ?? 'club:ENG:1:01',
    awayId: input.awayId ?? 'club:ENG:1:02',
    status: 'scheduled',
    ...(input.day === undefined ? {} : { day: input.day }),
  }
}

describe('轮次与日序', () => {
  it('一周七天，轮次决定比赛日', () => {
    expect(DAYS_PER_WEEK).toBe(7)
    expect(dayForRound(1)).toBe(7)
    expect(dayForRound(2)).toBe(6)
    expect(dayForRound(13)).toBe(7)
    expect(dayForRound(12)).toBe(6)
    expect(dayForRound(5)).toBe(3)
    expect(dayForRound(10)).toBe(3)
    expect(dayForRound(20)).toBe(3)
  })

  it('赛季内日序从 1 开始连续编号', () => {
    expect(absoluteDay(1, 1)).toBe(1)
    expect(absoluteDay(1, 7)).toBe(7)
    expect(absoluteDay(3, 6)).toBe(20)
    expect(absoluteDay(38, 7)).toBe(266)
  })

  it('未落盘的赛程按轮次推导比赛日', () => {
    expect(fixtureDayOf(fixture({ round: 2 }))).toBe(6)
    expect(fixtureDayOf(fixture({ round: 5 }))).toBe(3)
    expect(fixtureDayOf(fixture({ round: 5, day: 6 }))).toBe(6)
  })
})

describe('一周内的角色日', () => {
  it('周日联赛周保留周五活动与周三特训', () => {
    const roles = weekDayRoles([fixture({ round: 1 })], 2026, 1)
    expect(roles.matchDays).toEqual([7])
    expect(roles.extraDay).toBe(5)
    expect(roles.specializationDay).toBe(3)
    expect(roles.trainingDays).toEqual([1, 2, 3, 4, 5])
    expect(roles.decisionDays).toEqual([3, 5, 7])
  })

  it('周中轮占用周三时特训日挪到周二', () => {
    const roles = weekDayRoles([fixture({ round: 5 })], 2026, 1)
    expect(roles.matchDays).toEqual([3])
    expect(roles.specializationDay).toBe(2)
    expect(roles.extraDay).toBe(5)
    expect(roles.trainingDays).toEqual([1, 2, 4, 5])
    expect(roles.decisionDays).toEqual([2, 3, 5])
  })

  it('比赛占用活动日时活动日按周五周四周二顺序避让', () => {
    const roles = weekDayRoles(
      [fixture({ round: 5 }), fixture({ round: 6, day: 5 })],
      2026,
      1,
    )
    expect(roles.matchDays).toEqual([3, 5])
    expect(roles.extraDay).toBe(4)
    expect(roles.specializationDay).toBe(2)
    expect(roles.trainingDays).toEqual([1, 2, 4])
    expect(roles.decisionDays).toEqual([2, 3, 4, 5])
  })
})

describe('赛程过滤与空周', () => {
  it('一周多赛时比赛日去重升序', () => {
    const roles = weekDayRoles(
      [fixture({ round: 2 }), fixture({ round: 3, day: 6 }), fixture({ round: 4, day: 7 })],
      2026,
      1,
    )
    expect(roles.matchDays).toEqual([6, 7])
  })

  it('指定俱乐部时只看它自己的场次', () => {
    const mine = fixture({ round: 1, homeId: 'club:ENG:1:07' })
    const others = fixture({ round: 2, homeId: 'club:ENG:1:01', awayId: 'club:ENG:1:02' })
    const roles = weekDayRoles([mine, others], 2026, 1, 'club:ENG:1:07')
    expect(roles.matchDays).toEqual([7])
    expect(weekDayRoles([others], 2026, 1, 'club:ENG:1:07').matchDays).toEqual([])
  })

  it('客场也算这一家的比赛', () => {
    const away = fixture({ round: 1, homeId: 'club:ENG:1:01', awayId: 'club:ENG:1:07' })
    const roles = weekDayRoles([away], 2026, 1, 'club:ENG:1:07')
    expect(roles.matchDays).toEqual([7])
    expect(roles.decisionDays).toEqual([3, 5, 7])
  })

  it('不串赛季也不串周', () => {
    const roles = weekDayRoles(
      [fixture({ round: 2, season: 2027 }), fixture({ round: 3, week: 2 })],
      2026,
      1,
    )
    expect(roles.matchDays).toEqual([])
    expect(roles.decisionDays).toEqual([3, 5])
  })

  it('没有比赛时训练日仍是五个工作日', () => {
    const roles = weekDayRoles([], 2026, 20)
    expect(roles.matchDays).toEqual([])
    expect(roles.trainingDays).toEqual([1, 2, 3, 4, 5])
    expect(roles.specializationDay).toBe(3)
    expect(roles.extraDay).toBe(5)
  })
})

describe('优先日排满后的避让', () => {
  it('特训优先日全被比赛占用时往后找一个空闲日', () => {
    const roles = weekDayRoles(
      [fixture({ round: 1, day: 2 }), fixture({ round: 2, day: 3 }), fixture({ round: 3, day: 4 })],
      2026,
      1,
    )
    expect(roles.matchDays).toEqual([2, 3, 4])
    expect(roles.specializationDay).toBe(1)
    expect(roles.extraDay).toBe(5)
    expect(roles.trainingDays).toEqual([1, 5])
  })

  it('一周七天全被占用时兜底回优先日，不返回 undefined', () => {
    const roles = weekDayRoles(
      [1, 2, 3, 4, 5, 6].map((day) => fixture({ round: day, day })),
      2026,
      1,
    )
    expect(roles.matchDays).toEqual([1, 2, 3, 4, 5, 6])
    expect(roles.specializationDay).toBe(7)
    expect(roles.extraDay).toBe(5)
    expect(roles.trainingDays).toEqual([])
  })
})
