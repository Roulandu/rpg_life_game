import type { AttributeName, Attributes, ProfileId } from './types'

export interface AttributeConfig {
  min: number
  max: number
  initial: number
}

export interface StartingProfile {
  id: ProfileId
  name: string
  description: string
  attributes: Partial<Record<AttributeName, number>>
  wealth?: number
}

export const ATTRIBUTE_CONFIG: Record<AttributeName, AttributeConfig> = {
  intelligence: { min: 0, max: 100, initial: 40 },
  physique: { min: 0, max: 100, initial: 50 },
  charm: { min: 0, max: 100, initial: 40 },
}

export const ATTRIBUTE_NAMES = Object.keys(ATTRIBUTE_CONFIG) as AttributeName[]

export function createInitialAttributes(): Attributes {
  return ATTRIBUTE_NAMES.reduce<Attributes>((acc, name) => {
    acc[name] = ATTRIBUTE_CONFIG[name].initial
    return acc
  }, {} as Attributes)
}

export function clampAttribute(name: AttributeName, value: number): number {
  const { min, max } = ATTRIBUTE_CONFIG[name]
  return Math.min(max, Math.max(min, value))
}

export const STARTING_PROFILES: StartingProfile[] = [
  {
    id: 'balanced',
    name: '均衡人生',
    description: '各项能力均衡，稳步成长。',
    attributes: {},
  },
  {
    id: 'scholar',
    name: '天生学霸',
    description: '智力出众，但身体与交际稍弱。',
    attributes: { intelligence: 15, physique: -8, charm: -5 },
  },
  {
    id: 'athlete',
    name: '运动健将',
    description: '体力过人，学业稍有欠缺。',
    attributes: { physique: 15, intelligence: -10 },
  },
  {
    id: 'socialite',
    name: '社交达人',
    description: '魅力四射，学业平平。',
    attributes: { charm: 15, intelligence: -5 },
  },
  {
    id: 'tycoon',
    name: '富家子弟',
    description: '家境殷实，赢在起跑线。',
    attributes: { charm: 5 },
    wealth: 200,
  },
  {
    id: 'hardscrabble',
    name: '寒门出身',
    description: '起点艰难，需要加倍努力。',
    attributes: { intelligence: -5, physique: -5, charm: -5 },
  },
]

export function getStartingProfile(id: ProfileId): StartingProfile {
  return STARTING_PROFILES.find((profile) => profile.id === id) ?? STARTING_PROFILES[0]
}
