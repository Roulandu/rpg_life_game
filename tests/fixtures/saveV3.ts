import type { MatchReport, WorldState } from '../../src/domain/types'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine/keyMoments'
import { playToKeyMoments } from './matchday'

export const SAVE_V3 = 3

function liveWorld(seed = 2026): { world: WorldState; report: MatchReport } {
  const { world } = playToKeyMoments(seed)
  return { world, report: world.lastMatch! }
}

function stripV4Fields(report: MatchReport): void {
  delete report.liveState
}

export function liveV3World(seed = 2026): WorldState {
  const { world, report } = liveWorld(seed)
  stripV4Fields(report)
  world.version = SAVE_V3
  return world
}

export function finalV3World(seed = 2026): WorldState {
  const { world } = liveWorld(seed)
  autoResolveKeyMoments(world)
  finalizeMatchday(world)
  stripV4Fields(world.lastMatch!)
  world.version = SAVE_V3
  return world
}
