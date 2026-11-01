const EPOCH_OFFSET = 719468
const DAYS_PER_ERA = 146097

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor)
}

export function daysFromCivil(year: number, month: number, day: number): number {
  const shiftedYear = month <= 2 ? year - 1 : year
  const era = floorDiv(shiftedYear, 400)
  const yearOfEra = shiftedYear - era * 400
  const monthIndex = month + (month > 2 ? -3 : 9)
  const dayOfYear = floorDiv(153 * monthIndex + 2, 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100) + dayOfYear
  return era * DAYS_PER_ERA + dayOfEra - EPOCH_OFFSET
}

export function civilFromDays(serial: number): { year: number; month: number; day: number } {
  const shifted = serial + EPOCH_OFFSET
  const era = floorDiv(shifted, DAYS_PER_ERA)
  const dayOfEra = shifted - era * DAYS_PER_ERA
  const yearOfEra = floorDiv(
    dayOfEra - floorDiv(dayOfEra, 1460) + floorDiv(dayOfEra, 36524) - floorDiv(dayOfEra, 146096),
    365,
  )
  const dayOfYear =
    dayOfEra - (yearOfEra * 365 + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100))
  const monthPrime = floorDiv(5 * dayOfYear + 2, 153)
  const day = dayOfYear - floorDiv(153 * monthPrime + 2, 5) + 1
  const month = monthPrime + (monthPrime < 10 ? 3 : -9)
  return { year: month <= 2 ? yearOfEra + era * 400 + 1 : yearOfEra + era * 400, month, day }
}

export function isoWeekdayFromDays(serial: number): number {
  const remainder = ((serial % 7) + 7) % 7
  return ((remainder + 3) % 7) + 1
}

export function seasonStartDays(season: number): number {
  const anchor = daysFromCivil(season, 8, 8)
  return anchor + (((4 - (anchor % 7)) % 7 + 7) % 7)
}

export interface SeasonDate {
  year: number
  month: number
  day: number
  isoWeekday: number
}

export function dateForSeasonWeekDay(season: number, week: number, day: number): SeasonDate {
  const serial = seasonStartDays(season) + (week - 1) * 7 + (day - 1)
  const civil = civilFromDays(serial)
  return { ...civil, isoWeekday: isoWeekdayFromDays(serial) }
}
