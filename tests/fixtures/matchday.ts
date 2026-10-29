import { ATTR_KEYS } from '../../src/domain/attributes'
import type { MatchReport, WeeklyPlan, WorldState } from '../../src/domain/types'
import { advanceWeek } from '../../src/engine/turn'
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
    const result = advanceWeek(world, PLAN)
    world = result.world
    if (result.match?.userPlayed && (result.match.keyMoments?.length ?? 0) > 0) {
      return { world, report: result.match }
    }
  }
  throw new Error('No user match with key moments within 10 weeks')
}
