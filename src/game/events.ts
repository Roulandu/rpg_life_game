import { setAttribute, DIFFICULTY_CONFIG } from './state'
import type {
  AttributeName,
  Effect,
  EventOption,
  EventRequirement,
  GameEvent,
  GameState,
  RandomSource,
} from './types'

export type { Effect, EventOption, EventRequirement, GameEvent, RandomSource }

export function applyOption(state: GameState, option: EventOption): GameState {
  const gain = DIFFICULTY_CONFIG[state.difficulty].gain
  let next = state
  for (const [name, delta] of Object.entries(option.effect.attributes ?? {})) {
    next = setAttribute(next, name as AttributeName, Math.round((delta ?? 0) * gain))
  }
  const wealthDelta = Math.round((option.effect.wealth ?? 0) * gain)
  const milestones = option.effect.milestones ?? []
  return {
    ...next,
    wealth: Math.max(0, next.wealth + wealthDelta),
    milestones: Array.from(new Set([...next.milestones, ...milestones])),
  }
}

export function eventAvailable(state: GameState, event: GameEvent): boolean {
  const req = event.requires
  if (!req) return true

  if (req.wealth !== undefined && state.wealth < req.wealth) return false

  for (const [name, min] of Object.entries(req.attributes ?? {})) {
    if (state.attributes[name as AttributeName] < (min ?? 0)) return false
  }

  for (const milestone of req.milestones ?? []) {
    if (!state.milestones.includes(milestone)) return false
  }

  return true
}

export function selectEvent(
  state: GameState,
  pool: GameEvent[],
  random: RandomSource = Math.random,
): GameEvent | null {
  const eligible = pool.filter(
    (event) => event.stage === state.stage && eventAvailable(state, event),
  )
  if (eligible.length === 0) return null

  const recent = state.recentEvents
  const unseen = recent.length > 0 ? eligible.filter((e) => !recent.includes(e.id)) : eligible
  const candidates = unseen.length > 0 ? unseen : eligible

  const total = candidates.reduce((sum, event) => sum + (event.weight ?? 1), 0)
  let cursor = random() * total
  for (const event of candidates) {
    cursor -= event.weight ?? 1
    if (cursor < 0) return event
  }
  return candidates[candidates.length - 1]
}
