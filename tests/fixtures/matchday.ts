import { ATTR_KEYS } from '../../src/domain/attributes'
import type { MatchReport, WeeklyPlan, WorldState } from '../../src/domain/types'
import { advanceWeek, completeWeek, startWeek } from '../../src/engine/turn'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export const PLAN: WeeklyPlan = { training: 'technical', extra: 'none' }

export function readyWorld(seed = 2026): WorldState {
  const world = generateWorld(testOptions({ seed }), TEST_NOW)
  const user = world.players[world.playerId]
  for (const key of ATTR_KEYS) user.attributes[key] = 92
  user.fitness = 100
  user.sharpness = 96
  user.form = 92
  user.morale = 82
  const coach = Object.values(world.relationships).find((relationship) => relationship.role === 'coach')
  if (coach) coach.trust = 95
  return world
}

export function playToKeyMoments(seed = 2026): { world: WorldState; report: MatchReport } {
  let world = readyWorld(seed)
  for (let index = 0; index < 10; index += 1) {
    const result = startWeek(world, PLAN)
    world = result.world
    if (result.live && result.match?.userPlayed) {
      return { world, report: result.match }
    }
  }
  throw new Error('No live user match with key moments within 10 weeks')
}

export function completeCurrentWeek(world: WorldState): WorldState {
  return completeWeek(world).world
}

export function advanceOneWeek(world: WorldState, plan: WeeklyPlan = PLAN): WorldState {
  return advanceWeek(world, plan).world
}
