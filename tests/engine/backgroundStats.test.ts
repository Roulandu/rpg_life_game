import { describe, expect, it } from 'vitest'
import type { Fixture, Id, Player, WorldState } from '../../src/domain/types'
import { simulateBackgroundFixture, simulateUserFixture } from '../../src/engine/match'
import { hashState } from '../../src/lib/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function clubPlayers(world: WorldState, clubId: Id): Player[] {
  return Object.values(world.players).filter((player) => player.clubId === clubId)
}

function goalsOf(world: WorldState, clubIds: Id[]): number {
  return Object.values(world.players)
    .filter((player) => clubIds.includes(player.clubId))
    .reduce((sum, player) => sum + player.seasonStats.goals, 0)
}

function backgroundFixtures(world: WorldState): Fixture[] {
  return Object.values(world.fixtures).filter(
    (fixture) =>
      fixture.season === world.season &&
      fixture.week === world.week &&
      fixture.status === 'scheduled' &&
      fixture.homeId !== world.clubId &&
      fixture.awayId !== world.clubId,
  )
}

function clubIdsOf(fixtures: Fixture[]): Id[] {
  return [...new Set(fixtures.flatMap((fixture) => [fixture.homeId, fixture.awayId]))]
}

function seededWorld(seed: number): WorldState {
  return generateWorld(testOptions({ seed }), TEST_NOW)
}

describe('simulateBackgroundFixture 球员数据', () => {
  it('一轮背景比赛的进球确实落到球员头上，且与比分一致', () => {
    const world = seededWorld(31)
    const fixtures = backgroundFixtures(world)
    expect(fixtures.length).toBeGreaterThan(0)
    const clubIds = clubIdsOf(fixtures)
    const before = goalsOf(world, clubIds)

    for (const fixture of fixtures) simulateBackgroundFixture(world, fixture)

    const totalGoals = fixtures.reduce((sum, fixture) => sum + fixture.homeGoals! + fixture.awayGoals!, 0)
    expect(totalGoals).toBeGreaterThan(0)
    expect(goalsOf(world, clubIds)).toBe(before + totalGoals)
  })

  it('同种子重放得到同一份球员数据', () => {
    const first = seededWorld(909)
    const second = seededWorld(909)
    for (const fixture of backgroundFixtures(first)) simulateBackgroundFixture(first, fixture)
    for (const fixture of backgroundFixtures(second)) simulateBackgroundFixture(second, fixture)
    expect(hashState(first.players)).toBe(hashState(second.players))
  })
})

describe('背景比赛的首发记账', () => {
  it('双方各 11 人有出场、分钟与评分，进球只给出场球员', () => {
    const world = seededWorld(57)
    const fixtures = backgroundFixtures(world)
    for (const fixture of fixtures) simulateBackgroundFixture(world, fixture)

    const clubIds = clubIdsOf(fixtures)
    expect(clubIds.length).toBeGreaterThan(0)
    for (const clubId of clubIds) {
      const squad = clubPlayers(world, clubId)
      expect(squad.filter((player) => player.seasonStats.appearances > 0)).toHaveLength(11)
      expect(squad.filter((player) => player.seasonStats.minutes >= 90)).toHaveLength(11)
      expect(squad.filter((player) => player.seasonStats.ratingCount > 0)).toHaveLength(11)
    }

    const scorers = Object.values(world.players).filter(
      (player) => player.seasonStats.goals > 0 && clubIds.includes(player.clubId),
    )
    expect(scorers.every((player) => player.seasonStats.appearances > 0)).toBe(true)
  })
})

describe('主角那场比赛的双方首发', () => {
  it('终场后对手与队友的首发 11 人都有出场记录', () => {
    const world = seededWorld(31)
    const fixture = Object.values(world.fixtures).find(
      (item) =>
        item.season === world.season &&
        item.week === world.week &&
        (item.homeId === world.clubId || item.awayId === world.clubId),
    )
    if (!fixture) throw new Error('no user fixture this week')

    const report = simulateUserFixture(world, fixture)
    expect(report.lineups).toBeDefined()

    const starters = [...(report.lineups?.home ?? []), ...(report.lineups?.away ?? [])]
      .filter((entry) => !entry.isUser)
      .map((entry) => world.players[entry.id]!)
    expect(starters).toHaveLength(report.userPlayed ? 21 : 22)
    for (const player of starters) {
      expect(player.seasonStats.appearances, `${player.nameZh} 没有出场记录`).toBe(1)
      expect(player.seasonStats.minutes).toBe(90)
      expect(player.seasonStats.ratingCount).toBe(1)
    }
    expect(world.players[world.playerId]!.seasonStats.appearances).toBe(report.userPlayed ? 1 : 0)
  })
})
