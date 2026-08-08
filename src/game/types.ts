export type AttributeName = 'intelligence' | 'physique' | 'charm'

export type LifeStage = 'childhood' | 'education' | 'career' | 'elderly'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type ProfileId =
  | 'balanced'
  | 'scholar'
  | 'athlete'
  | 'socialite'
  | 'tycoon'
  | 'hardscrabble'

export type Attributes = Record<AttributeName, number>

export interface GameState {
  age: number
  stage: LifeStage
  attributes: Attributes
  wealth: number
  milestones: string[]
  difficulty: Difficulty
}

export interface Effect {
  attributes?: Partial<Record<AttributeName, number>>
  wealth?: number
  milestones?: string[]
}

export interface EventOption {
  label: string
  effect: Effect
}

export interface EventRequirement {
  attributes?: Partial<Record<AttributeName, number>>
  wealth?: number
  milestones?: string[]
}

export interface GameEvent {
  id: string
  stage: LifeStage
  title: string
  description: string
  options: EventOption[]
  weight?: number
  requires?: EventRequirement
}

export type RandomSource = () => number
