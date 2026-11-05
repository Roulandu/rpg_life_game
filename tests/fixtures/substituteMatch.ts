import { ATTR_KEYS, buildMatchLineups, computeClubStrength } from '../../src/domain'
import type { Fixture, MatchLineups, MatchSide, WorldState } from '../../src/domain'
import { createRng } from '../../src/lib'
import { determineUserSelection } from '../../src/engine/matchUser'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export interface SubMatchCase {
  world: WorldState
  fixture: Fixture
  /** 主角登场分钟（替补为 90 - 出场分钟）。 */
  entryMinute: number
  /** 主角出场分钟。 */
  userMinutes: number
  userSide: MatchSide
}

/**
 * 造一个「主角这轮替补登场」的真实赛季场次：
 * 把主角压到比球队平均略差，让他落进 `determineUserSelection` 的替补分支，
 * 再扫本赛季的联赛场次找到一场真的替补出场。
 */
export function subMatchCase(seed = 2026): SubMatchCase {
  const world = generateWorld(testOptions({ seed }), TEST_NOW)
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  const squadOverall = computeClubStrength(club, world.players, {
    excludePlayerId: user.id,
  }).overall
  Object.assign(user.attributes, Object.fromEntries(
    ATTR_KEYS.map((key) => [key, Math.round(squadOverall) - 3]),
  ))
  Object.assign(user, { fitness: 70, sharpness: 50, form: 50, morale: 60 })
  user.injury = null
  const coach = Object.values(world.relationships).find((item) => item.role === 'coach')
  if (coach) coach.trust = 50

  for (const fixture of Object.values(world.fixtures)) {
    if (fixture.homeId !== club.id && fixture.awayId !== club.id) continue
    const fixtureClub = world.clubs[fixture.homeId === club.id ? fixture.homeId : fixture.awayId]
    const selection = determineUserSelection(
      world,
      fixtureClub,
      createRng(world.seed, 'selection', fixture.id),
    )
    if (selection.started || selection.minutes <= 0) continue
    return {
      world,
      fixture,
      entryMinute: 90 - selection.minutes,
      userMinutes: selection.minutes,
      userSide: fixture.homeId === club.id ? 'home' : 'away',
    }
  }
  throw new Error(`种子 ${seed} 的赛季里找不到替补出场`)
}

/**
 * 把主角做成他那一侧唯一的前场球员：不加分钟闸门时 `pickCarrier` 必然选中他，
 * 加了闸门必然选不到他 —— 这样「闸门有没有生效」就不是概率问题。
 */
export function soleAttackerLineups(
  world: WorldState,
  fixture: Fixture,
  entry: { userPlayed: boolean },
): MatchLineups {
  const lineups = buildMatchLineups(world, {
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    userPlayed: entry.userPlayed,
  })
  const side: MatchSide = fixture.homeId === world.clubId ? 'home' : 'away'
  const reshaped = lineups[side].map((player) =>
    player.isUser || player.position === 'GK' ? player : { ...player, position: 'CB' as const },
  )
  return { ...lineups, [side]: reshaped }
}
