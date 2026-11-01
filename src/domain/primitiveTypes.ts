/**
 * 领域原语：跨模块复用的标量别名。独立成文件，让 `types.ts` 只承载实体结构，
 * 也让新增字段时不必再把 `types.ts` 顶破技术债基线。
 */

export type Id = string

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST'

export type AttrKey =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical'
  | 'mental'
  | 'technique'
  | 'stamina'
  | 'goalkeeping'

export type Attributes = Record<AttrKey, number>

/** 每个属性已经花掉的经验点数：决定下一点的价格。 */
export type AttrInvestment = Record<AttrKey, number>

export type Foot = 'L' | 'R' | 'B'

export type TrainingFocus = 'physical' | 'technical' | 'tactical' | 'recovery'

export type ExtraAction = 'media' | 'agent' | 'social' | 'rest' | 'family' | 'none'

export type Archetype = 'speedster' | 'technician' | 'engine' | 'finisher' | 'wall'

export type CareerBackground = 'academy' | 'lowerLeague' | 'overseas'
