import { describe, expect, it } from 'vitest'
import {
  WEEKDAY_LABELS,
  civilFromDays,
  dateForSeasonWeekDay,
  daysFromCivil,
  formatDateLabel,
  formatDateShort,
  formatDayLabel,
  isoWeekdayFromDays,
  seasonStartDays,
} from '../../src/lib'

describe('公历日序换算', () => {
  it('日期与日序可以互相往返，覆盖闰日', () => {
    const samples = [
      { year: 1970, month: 1, day: 1 },
      { year: 2000, month: 2, day: 29 },
      { year: 2026, month: 8, day: 10 },
      { year: 2027, month: 2, day: 28 },
      { year: 2028, month: 2, day: 29 },
      { year: 2028, month: 3, day: 1 },
      { year: 2040, month: 12, day: 31 },
    ]
    for (const date of samples) {
      const serial = daysFromCivil(date.year, date.month, date.day)
      expect(civilFromDays(serial)).toEqual(date)
    }
    expect(daysFromCivil(2028, 3, 1) - daysFromCivil(2028, 2, 28)).toBe(2)
  })

  it('1970 元旦是周四，日序每加 7 星期几不变', () => {
    expect(isoWeekdayFromDays(0)).toBe(4)
    expect(isoWeekdayFromDays(daysFromCivil(2028, 2, 29))).toBe(2)
    const base = daysFromCivil(2026, 8, 10)
    for (const offset of [0, 7, 35, 189]) {
      expect(isoWeekdayFromDays(base + offset)).toBe(isoWeekdayFromDays(base))
    }
  })
})

describe('赛季锚点与整季星期几', () => {
  it('赛季起点落在 8 月 8 日当天或之后最近的周一', () => {
    expect(dateForSeasonWeekDay(2026, 1, 1)).toEqual({
      year: 2026,
      month: 8,
      day: 10,
      isoWeekday: 1,
    })
    expect(dateForSeasonWeekDay(2027, 1, 1)).toEqual({
      year: 2027,
      month: 8,
      day: 9,
      isoWeekday: 1,
    })
    expect(seasonStartDays(2026)).toBe(daysFromCivil(2026, 8, 10))
  })

  it('赛季内 266 天的星期几恒等于它的日位序号', () => {
    for (const season of [2026, 2027, 2028]) {
      for (let week = 1; week <= 38; week += 1) {
        for (let day = 1; day <= 7; day += 1) {
          expect(dateForSeasonWeekDay(season, week, day).isoWeekday).toBe(day)
        }
      }
    }
  })
})

describe('赛季跨年与日标签', () => {
  it('赛季跨自然年仍连续，末周落在次年 5 月初', () => {
    expect(dateForSeasonWeekDay(2026, 38, 7)).toEqual({
      year: 2027,
      month: 5,
      day: 2,
      isoWeekday: 7,
    })
    expect(dateForSeasonWeekDay(2027, 38, 7)).toEqual({
      year: 2028,
      month: 4,
      day: 30,
      isoWeekday: 7,
    })
    const previousDay = dateForSeasonWeekDay(2026, 20, 1)
    expect(daysFromCivil(previousDay.year, previousDay.month, previousDay.day)).toBe(
      daysFromCivil(2026, 8, 10) + (20 - 1) * 7,
    )
  })

  it('日期标签按周日到周六排布并带中文星期', () => {
    expect(WEEKDAY_LABELS).toEqual(['周一', '周二', '周三', '周四', '周五', '周六', '周日'])
    expect(formatDateLabel(2026, 3)).toBe('2026-08-24')
    expect(formatDateLabel(2026, 3, 6)).toBe('2026-08-29')
    expect(formatDateShort(2026, 3, 6)).toBe('08-29')
    expect(formatDayLabel(2026, 3, 6)).toBe('第 3 周 · 周六 08-29')
    expect(formatDayLabel(2026, 38, 7)).toBe('第 38 周 · 周日 05-02')
  })
})
