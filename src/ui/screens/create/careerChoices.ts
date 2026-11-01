import { ATTR_KEYS, archetypeBonus, backgroundBonus } from '../../../domain'
import type { Archetype, AttrKey, CareerBackground, Position } from '../../../domain'

export const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST']
export const ARCHETYPES: Archetype[] = ['speedster', 'technician', 'engine', 'finisher', 'wall']
export const BACKGROUNDS: CareerBackground[] = ['academy', 'lowerLeague', 'overseas']

export const BACKGROUND_DESCRIPTIONS: Record<CareerBackground, string> = {
  academy: '从小在青训学院长大，技术基础扎实。',
  lowerLeague: '在低级别联赛摸爬滚打，身体与对抗更成熟。',
  overseas: '早早离开家乡，心理适应能力更强。',
}

/** 球员类型 + 成长背景叠加后每项属性的增减。 */
export function combinedBonusOf(archetype: Archetype, background: CareerBackground): Partial<Record<AttrKey, number>> {
  const bonus: Partial<Record<AttrKey, number>> = {}
  for (const source of [archetypeBonus(archetype), backgroundBonus(background)]) {
    for (const key of ATTR_KEYS) bonus[key] = (bonus[key] ?? 0) + (source[key] ?? 0)
  }
  return bonus
}
