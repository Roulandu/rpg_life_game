import type { MatchReport, WeeklyPlan, WorldState } from '../../src/domain/types'
import { advanceLiveMatch } from '../../src/engine/liveMatch'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine/keyMoments'
import { startWeek } from '../../src/engine/turn'
import { PLAN, readyWorld } from './matchday'

export const SAVE_V2 = 2

function stripV3Fields(report: MatchReport): void {
  delete (report as { stats?: unknown }).stats
  delete (report as { lineups?: unknown }).lineups
}

function liveWorld(seed = 2026): { world: WorldState; plan: WeeklyPlan; report: MatchReport } {
  let world = readyWorld(seed)
  for (let index = 0; index < 10; index += 1) {
    const result = startWeek(world, PLAN)
    world = result.world
    if (result.live && result.match?.userPlayed) {
      advanceLiveMatch(world)
      return { world, plan: PLAN, report: world.lastMatch! }
    }
  }
  throw new Error('No live user match within 10 weeks')
}

export function liveV2World(seed = 2026): { world: WorldState; plan: WeeklyPlan } {
  const { world, plan, report } = liveWorld(seed)
  stripV3Fields(report)
  world.version = SAVE_V2
  return { world, plan }
}

export function finalV2World(seed = 2026): WorldState {
  const { world, report } = liveWorld(seed)
  autoResolveKeyMoments(world)
  finalizeMatchday(world)
  stripV3Fields(report)
  world.version = SAVE_V2
  return world
}
