import { ATTRIBUTE_NAMES, clampAttribute } from './attributes'
import { getStage } from './stages'
import type { Attributes, Difficulty, GameState } from './types'

export const SAVE_KEY = 'rpg-life-game:save'

export interface SaveStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

function parseState(json: string): GameState | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }

  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  if (typeof record.age !== 'number' || !Number.isFinite(record.age) || record.age < 0) {
    return null
  }
  if (typeof record.wealth !== 'number' || !Number.isFinite(record.wealth)) {
    return null
  }
  if (typeof record.attributes !== 'object' || record.attributes === null) {
    return null
  }

  const sourceAttributes = record.attributes as Record<string, unknown>
  const attributes = {} as Attributes
  for (const name of ATTRIBUTE_NAMES) {
    const value = sourceAttributes[name]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    attributes[name] = clampAttribute(name, value)
  }

  const age = Math.floor(record.age)

  const rawMilestones = Array.isArray(record.milestones) ? record.milestones : []
  const milestones = rawMilestones.filter((m): m is string => typeof m === 'string')

  const difficulty: Difficulty =
    record.difficulty === 'easy' || record.difficulty === 'normal' || record.difficulty === 'hard'
      ? record.difficulty
      : 'normal'

  const rawRecent = Array.isArray(record.recentEvents) ? record.recentEvents : []
  const recentEvents = rawRecent.filter((r): r is string => typeof r === 'string')

  return {
    age,
    stage: getStage(age),
    attributes,
    wealth: Math.max(0, record.wealth),
    milestones,
    difficulty,
    recentEvents,
  }
}

export function deserialize(json: string): GameState | null {
  return parseState(json)
}

export function saveGame(storage: SaveStorage, state: GameState): void {
  storage.setItem(SAVE_KEY, serialize(state))
}

export function loadGame(storage: SaveStorage): GameState | null {
  const json = storage.getItem(SAVE_KEY)
  if (json === null) return null
  return deserialize(json)
}
