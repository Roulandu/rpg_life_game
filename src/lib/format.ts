import { WEEKDAY_LABELS, dateForSeasonWeekDay } from './calendar'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatMoney(cents: number, compact = false): string {
  const pounds = Math.round(cents / 100)
  const sign = pounds < 0 ? '-' : ''
  const absolute = Math.abs(pounds)
  if (compact && absolute >= 10000) {
    const value = (absolute / 10000).toFixed(1).replace(/\.0$/, '')
    return `${sign}£${value}万`
  }
  const digits = absolute.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}£${digits}`
}

export function formatMoneyShort(cents: number): string {
  return formatMoney(cents, true)
}

export function formatWeekLabel(season: number, week: number): string {
  return `${season}/${String(season + 1).slice(-2)} 赛季 · 第 ${week} 周`
}

export function formatSeasonLabel(season: number): string {
  return `${season}/${String(season + 1).slice(-2)}`
}

export function formatDateLabel(season: number, week: number, day = 1): string {
  const date = dateForSeasonWeekDay(season, week, day)
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

export function formatDateShort(season: number, week: number, day: number): string {
  const date = dateForSeasonWeekDay(season, week, day)
  return `${pad(date.month)}-${pad(date.day)}`
}

export function formatDayLabel(season: number, week: number, day: number): string {
  return `第 ${week} 周 · ${WEEKDAY_LABELS[day - 1]} ${formatDateShort(season, week, day)}`
}

export function formatRating(rating: number | null): string {
  return rating == null ? '—' : rating.toFixed(1)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatOverall(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function titleCaseLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}
