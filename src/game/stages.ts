import type { LifeStage } from './types'

export const STAGE_RANGES = {
  childhood: { min: 0, max: 6 },
  education: { min: 7, max: 18 },
  career: { min: 19, max: 60 },
  elderly: { min: 61, max: Number.POSITIVE_INFINITY },
} as const satisfies Record<LifeStage, { min: number; max: number }>

export function getStage(age: number): LifeStage {
  if (age < 0) {
    throw new RangeError(`age cannot be negative: ${age}`)
  }
  if (age <= STAGE_RANGES.childhood.max) return 'childhood'
  if (age <= STAGE_RANGES.education.max) return 'education'
  if (age <= STAGE_RANGES.career.max) return 'career'
  return 'elderly'
}
