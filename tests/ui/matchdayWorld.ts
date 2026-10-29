import type { WorldState } from '../../src/domain/types'
import { autoResolveKeyMoments, finalizeMatchday, resolveKeyMoment } from '../../src/engine/keyMoments'
import { playToKeyMoments } from '../fixtures/matchday'

export function worldWithKeyMoments(seed = 2026): WorldState {
  return playToKeyMoments(seed).world
}

export function resolveFirstMoment(world: WorldState): WorldState {
  const next = structuredClone(world)
  const pending = (next.lastMatch?.keyMoments ?? []).filter((moment) => !moment.outcome)
  const moment = pending[0]
  if (!moment) throw new Error('no pending moment')
  resolveKeyMoment(next, moment.id, moment.defaultOptionId)
  return next
}

export function finalizedWorld(world: WorldState): WorldState {
  const next = structuredClone(world)
  autoResolveKeyMoments(next)
  finalizeMatchday(next)
  return next
}
