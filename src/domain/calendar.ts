import type { ExtraAction, Fixture, Id, TrainingFocus, WeeklyPlan } from './types'

export const DEFAULT_TRAINING_FOCUS: TrainingFocus = 'technical'
export const DEFAULT_EXTRA_ACTION: ExtraAction = 'none'
export const DEFAULT_WEEK_PLAN: WeeklyPlan = {
  training: DEFAULT_TRAINING_FOCUS,
  extra: DEFAULT_EXTRA_ACTION,
  specialization: null,
}

export const DAYS_PER_WEEK = 7
export const MATCH_DAY = 6
export const MATCH_DAY_ALT = 7
export const MIDWEEK_DAY = 3
export const TRAINING_DAYS = [1, 2, 3, 4, 5]

const EXTRA_DAY_PRIORITY = [5, 4, 2]
const SPECIALIZATION_DAY_PRIORITY = [3, 2, 4]

export interface WeekDayRoles {
  matchDays: number[]
  extraDay: number
  specializationDay: number
  trainingDays: number[]
  decisionDays: number[]
}

export function absoluteDay(week: number, day: number): number {
  return (week - 1) * DAYS_PER_WEEK + day
}

export function dayForRound(round: number): number {
  if (round % 5 === 0) return MIDWEEK_DAY
  return round % 2 === 0 ? MATCH_DAY : MATCH_DAY_ALT
}

export function fixtureDayOf(fixture: Fixture): number {
  return fixture.day ?? dayForRound(fixture.round)
}

function isFixtureInWeek(fixture: Fixture, season: number, week: number, clubId?: Id): boolean {
  if (fixture.season !== season || fixture.week !== week) return false
  if (!clubId) return true
  return fixture.homeId === clubId || fixture.awayId === clubId
}

function sortedUniqueDays(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b)
}

function pickAvailableDay(priority: number[], taken: Set<number>): number {
  const free = priority.find((day) => !taken.has(day))
  if (free !== undefined) return free
  const fallback = [1, 2, 3, 4, 5, 6, 7].find((day) => !taken.has(day))
  return fallback ?? priority[0]
}

export function weekDayRoles(
  fixtures: Fixture[],
  season: number,
  week: number,
  clubId?: Id,
): WeekDayRoles {
  const matchDays = sortedUniqueDays(
    fixtures.filter((fixture) => isFixtureInWeek(fixture, season, week, clubId)).map(fixtureDayOf),
  )
  const takenByMatches = new Set(matchDays)
  const specializationDay = pickAvailableDay(SPECIALIZATION_DAY_PRIORITY, takenByMatches)
  const extraDay = pickAvailableDay(EXTRA_DAY_PRIORITY, new Set([...takenByMatches, specializationDay]))
  const trainingDays = TRAINING_DAYS.filter((day) => !takenByMatches.has(day))
  return {
    matchDays,
    extraDay,
    specializationDay,
    trainingDays,
    decisionDays: sortedUniqueDays([...matchDays, extraDay, specializationDay]),
  }
}
