import type { AttrKey, Attributes, CareerBackground, Player, Position, TrainingFocus } from './types'

export const ATTR_KEYS: AttrKey[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
  'mental',
  'technique',
  'stamina',
  'goalkeeping',
]

export const ATTR_LABELS: Record<AttrKey, string> = {
  pace: '速度',
  shooting: '射门',
  passing: '传球',
  dribbling: '盘带',
  defending: '防守',
  physical: '身体',
  mental: '心理',
  technique: '技术',
  stamina: '体能',
  goalkeeping: '门将',
}

export const POSITION_LABELS: Record<Position, string> = {
  GK: '门将',
  CB: '中后卫',
  LB: '左后卫',
  RB: '右后卫',
  DM: '后腰',
  CM: '中场',
  AM: '前腰',
  LW: '左边锋',
  RW: '右边锋',
  ST: '前锋',
}

export const POSITION_GROUPS: Record<Position, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK',
  CB: 'DEF',
  LB: 'DEF',
  RB: 'DEF',
  DM: 'MID',
  CM: 'MID',
  AM: 'MID',
  LW: 'FWD',
  RW: 'FWD',
  ST: 'FWD',
}

export const POSITION_WEIGHTS: Record<Position, Partial<Record<AttrKey, number>>> = {
  GK: { goalkeeping: 0.5, mental: 0.15, physical: 0.12, passing: 0.1, technique: 0.08, stamina: 0.05 },
  CB: { defending: 0.34, physical: 0.2, mental: 0.16, pace: 0.12, passing: 0.1, technique: 0.04, stamina: 0.04 },
  LB: { defending: 0.26, pace: 0.18, stamina: 0.16, passing: 0.14, mental: 0.12, technique: 0.08, physical: 0.06 },
  RB: { defending: 0.26, pace: 0.18, stamina: 0.16, passing: 0.14, mental: 0.12, technique: 0.08, physical: 0.06 },
  DM: { defending: 0.24, passing: 0.2, mental: 0.16, physical: 0.14, stamina: 0.12, technique: 0.1, dribbling: 0.04 },
  CM: { passing: 0.24, technique: 0.19, mental: 0.16, dribbling: 0.14, stamina: 0.12, defending: 0.1, shooting: 0.05 },
  AM: { passing: 0.22, technique: 0.22, dribbling: 0.2, shooting: 0.14, mental: 0.12, pace: 0.06, stamina: 0.04 },
  LW: { pace: 0.22, dribbling: 0.24, shooting: 0.18, technique: 0.16, passing: 0.1, mental: 0.06, physical: 0.04 },
  RW: { pace: 0.22, dribbling: 0.24, shooting: 0.18, technique: 0.16, passing: 0.1, mental: 0.06, physical: 0.04 },
  ST: { shooting: 0.32, pace: 0.18, dribbling: 0.16, physical: 0.14, technique: 0.12, mental: 0.08 },
}

export const TRAINING_ATTRS: Record<TrainingFocus, AttrKey[]> = {
  physical: ['physical', 'stamina', 'pace'],
  technical: ['technique', 'dribbling', 'passing'],
  tactical: ['mental', 'defending', 'passing'],
  recovery: ['stamina'],
}

export const TRAINING_LABELS: Record<TrainingFocus, string> = {
  physical: '身体强化',
  technical: '技术打磨',
  tactical: '战术训练',
  recovery: '恢复调整',
}

export const TRAINING_DESCRIPTIONS: Record<TrainingFocus, string> = {
  physical: '提升身体、速度与体能，消耗较大，受伤风险略高。',
  technical: '提升技术、盘带与传球，适合年轻球员打磨基本功。',
  tactical: '提升心理、防守与传球选择，体能与战术理解更均衡。',
  recovery: '以恢复为主，提升体能，成长收益较低。',
}

export const ARCHETYPE_LABELS = {
  speedster: '速度型',
  technician: '技术型',
  engine: '跑动型',
  finisher: '终结者',
  wall: '防守型',
} as const

export const BACKGROUND_LABELS = {
  academy: '青训学院',
  lowerLeague: '低级别联赛',
  overseas: '海外历练',
} as const

export const NATIONALITIES = [
  '英格兰',
  '中国',
  '日本',
  '韩国',
  '西班牙',
  '法国',
  '德国',
  '巴西',
  '阿根廷',
  '葡萄牙',
  '荷兰',
  '尼日利亚',
] as const

export function computeOverall(position: Position, attributes: Attributes): number {
  const weights = POSITION_WEIGHTS[position]
  let total = 0
  for (const key of ATTR_KEYS) {
    const weight = weights[key] ?? 0
    total += attributes[key] * weight
  }
  return Math.round(total * 10) / 10
}

export function overall(player: Player): number {
  return computeOverall(player.position, player.attributes)
}

export function positionGroup(position: Position) {
  return POSITION_GROUPS[position]
}

export function isGoalkeeper(position: Position) {
  return position === 'GK'
}

export function backgroundBonus(background: CareerBackground): Partial<Record<AttrKey, number>> {
  switch (background) {
    case 'academy':
      return { technique: 3, mental: 2, physical: -2 }
    case 'lowerLeague':
      return { physical: 3, mental: 2, defending: 1, technique: -2 }
    case 'overseas':
      return { mental: 3, pace: 1, technique: 1 }
  }
}

export function archetypeBonus(archetype: string): Partial<Record<AttrKey, number>> {
  switch (archetype) {
    case 'speedster':
      return { pace: 5, stamina: 2, defending: -1 }
    case 'technician':
      return { technique: 5, dribbling: 3, physical: -2 }
    case 'engine':
      return { stamina: 5, physical: 3, mental: 1 }
    case 'finisher':
      return { shooting: 5, mental: 2, defending: -2 }
    case 'wall':
      return { defending: 5, physical: 3, shooting: -2 }
    default:
      return {}
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
