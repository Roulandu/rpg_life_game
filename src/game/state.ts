import {
  clampAttribute,
  createInitialAttributes,
  getStartingProfile,
} from './attributes'
import { getStage } from './stages'
import type {
  AttributeName,
  Difficulty,
  GameState,
  ProfileId,
} from './types'

export interface DifficultyConfig {
  label: string
  gain: number
  startingWealth: number
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { label: '简单', gain: 1.2, startingWealth: 100 },
  normal: { label: '普通', gain: 1, startingWealth: 0 },
  hard: { label: '困难', gain: 0.8, startingWealth: -30 },
}

export interface NewGameOptions {
  difficulty?: Difficulty
  profile?: ProfileId
}

export function createInitialState(options: NewGameOptions = {}): GameState {
  const difficulty = options.difficulty ?? 'normal'
  const profile = getStartingProfile(options.profile ?? 'balanced')

  const attributes = { ...createInitialAttributes() }
  for (const [name, delta] of Object.entries(profile.attributes)) {
    attributes[name as AttributeName] = clampAttribute(
      name as AttributeName,
      attributes[name as AttributeName] + (delta ?? 0),
    )
  }

  const wealth = Math.max(
    0,
    (profile.wealth ?? 0) + DIFFICULTY_CONFIG[difficulty].startingWealth,
  )

  return {
    age: 0,
    stage: 'childhood',
    attributes,
    wealth,
    milestones: [],
    difficulty,
  }
}

export function setAttribute(
  state: GameState,
  name: AttributeName,
  delta: number,
): GameState {
  const value = clampAttribute(name, state.attributes[name] + delta)
  return {
    ...state,
    attributes: { ...state.attributes, [name]: value },
  }
}

export function advanceAge(state: GameState, years = 1): GameState {
  const age = state.age + years
  return {
    ...state,
    age,
    stage: getStage(age),
  }
}
