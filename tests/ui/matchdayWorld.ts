import type { WorldState } from '../../src/domain/types'
import { autoResolveKeyMoments, finalizeMatchday, resolveKeyMoment } from '../../src/engine/keyMoments'
import { startWeek } from '../../src/engine/turn'
import { PLAN, playToKeyMoments, readyWorld } from '../fixtures/matchday'

export function worldWithKeyMoments(seed = 2026): WorldState {
  return playToKeyMoments(seed).world
}

export function liveKickoffWorld(seed = 2026): WorldState {
  let world = readyWorld(seed)
  for (let index = 0; index < 10; index += 1) {
    const result = startWeek(world, PLAN)
    world = result.world
    if (result.live && result.match?.userPlayed) return world
  }
  throw new Error('No live user match within 10 weeks')
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
