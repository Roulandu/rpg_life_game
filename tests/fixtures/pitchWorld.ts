import { buildMatchLineups } from '../../src/domain'
import type { MatchReport } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export function pitchWorld(seed = 2026) {
  const world = generateWorld(testOptions({ seed }), TEST_NOW)
  const homeClub = world.clubs[world.clubId]!
  const awayClub = Object.values(world.clubs).find((club) => club.id !== homeClub.id)!
  const lineups = buildMatchLineups(world, {
    homeId: homeClub.id,
    awayId: awayClub.id,
    userPlayed: true,
  } as MatchReport)
  return { world, homeClub, awayClub, lineups }
}
