import { describe, expect, it } from 'vitest'
import type { WeeklyPlan, WorldState } from '../../src/domain/types'
import { collectAwards, leagueTopScorer } from '../../src/engine/seasonAwards'
import { advanceWeek } from '../../src/engine/turn'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const PLAN: WeeklyPlan = { training: 'technical', extra: 'none' }

function playWeeks(world: WorldState, count: number): WorldState {
  let current = world
  for (let i = 0; i < count; i += 1) current = advanceWeek(current, PLAN).world
  return current
}

function leagueGoalCoverage(world: WorldState, leagueId: string): number {
  const clubIds = new Set(world.leagues[leagueId]?.clubIds ?? [])
  const credited = Object.values(world.players)
    .filter((player) => clubIds.has(player.clubId))
    .reduce((sum, player) => sum + player.seasonStats.goals, 0)
  const scored = Object.values(world.fixtures)
    .filter((fixture) => fixture.season === world.season && clubIds.has(fixture.homeId) && fixture.status === 'played')
    .reduce((sum, fixture) => sum + (fixture.homeGoals ?? 0) + (fixture.awayGoals ?? 0), 0)
  return scored === 0 ? 1 : credited / scored
}

function leagueAppearances(world: WorldState, leagueId: string): number {
  const clubIds = new Set(world.leagues[leagueId]?.clubIds ?? [])
  return Object.values(world.players).filter(
    (player) => clubIds.has(player.clubId) && player.seasonStats.appearances > 0,
  ).length
}

describe('联赛射手榜的数据来源', () => {
  it('联赛里的进球绝大部分能追到具体球员，出场名单覆盖各队主力', () => {
    const start = generateWorld(testOptions({ age: 21, position: 'ST' }), TEST_NOW)
    const leagueId = start.clubs[start.clubId]!.leagueId!
    const world = playWeeks(start, 37)

    expect(leagueGoalCoverage(world, leagueId)).toBeGreaterThanOrEqual(0.95)
    // 20 队 × 11 名主力，只有主角一家对手有出场记录远远不够。
    expect(leagueAppearances(world, leagueId)).toBeGreaterThanOrEqual(200)

    const top = leagueTopScorer(world, leagueId)
    expect(top).not.toBeNull()
    const max = Math.max(
      ...Object.values(world.players)
        .filter((player) => new Set(world.leagues[leagueId]!.clubIds).has(player.clubId))
        .map((player) => player.seasonStats.goals),
    )
    expect(top!.seasonStats.goals).toBe(max)
  })

  it('主角进球不是联赛最多时拿不到金靴', () => {
    const world = playWeeks(generateWorld(testOptions(), TEST_NOW), 30)
    const leagueId = world.clubs[world.clubId]!.leagueId!
    const league = world.leagues[leagueId]!
    const user = world.players[world.playerId]!
    const rival = Object.values(world.players).find(
      (player) => player.clubId !== user.clubId && league.clubIds.includes(player.clubId),
    )!
    rival.seasonStats.goals = user.seasonStats.goals + 5

    const awards = collectAwards(world, user, league, 18, 7.0)
    expect(awards).not.toContain('联赛金靴')
  })
})

describe('赛季最佳年轻球员的竞争判定', () => {
  function u21World(): WorldState {
    const world = generateWorld(testOptions({ age: 20 }), TEST_NOW)
    const user = world.players[world.playerId]!
    user.seasonStats.appearances = 25
    user.seasonStats.ratingCount = 25
    user.seasonStats.ratingSum = 7.4 * 25
    return world
  }

  it('联赛里有数据更好的 U21 时不发给主角', () => {
    const world = u21World()
    const leagueId = world.clubs[world.clubId]!.leagueId!
    const league = world.leagues[leagueId]!
    const clubIds = new Set(league.clubIds)
    const rival = Object.values(world.players).find(
      (player) => !player.isUser && player.age <= 21 && clubIds.has(player.clubId),
    )
    expect(rival).toBeDefined()
    rival!.seasonStats.appearances = 25
    rival!.seasonStats.goals = 18
    rival!.seasonStats.ratingCount = 25
    rival!.seasonStats.ratingSum = 8.0 * 25

    const awards = collectAwards(world, world.players[world.playerId]!, league, 8, 7.4)
    expect(awards).not.toContain('赛季最佳年轻球员')
  })

  it('主角仍是最好的 U21 时照常获奖', () => {
    const world = u21World()
    const user = world.players[world.playerId]!
    user.seasonStats.goals = 12
    const league = world.leagues[world.clubs[world.clubId]!.leagueId!]!

    const awards = collectAwards(world, user, league, 8, 7.4)
    expect(awards).toContain('赛季最佳年轻球员')
  })
})
