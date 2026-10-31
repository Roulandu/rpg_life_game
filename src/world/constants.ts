import type { Position } from '../domain'

export const ENGINE_VERSION = '0.2.0'
export const START_SEASON = 2026
export const TOTAL_WEEKS = 38
export const TOTAL_CLUBS_PER_LEAGUE = 20

export const NO_SPACE_NATIONALITIES = new Set(['中国', '日本', '韩国'])

export const SQUAD_POSITIONS: Position[] = [
  'GK', 'GK',
  'CB', 'CB', 'CB', 'CB',
  'LB', 'LB',
  'RB', 'RB',
  'DM', 'DM',
  'CM', 'CM', 'CM',
  'AM', 'AM',
  'LW', 'LW',
  'RW', 'RW',
  'ST', 'ST',
]
