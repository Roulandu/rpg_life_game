import { describe, expect, it } from 'vitest'
import type { WeeklyPlan, WorldState } from '../../src/domain/types'
import { resolveEvent } from '../../src/engine/events'
import { computeLeagueTable } from '../../src/engine/leagueTable'
import { hashState } from '../../src/engine/rng'
import { advanceWeek } from '../../src/engine/turn'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const PLAN: WeeklyPlan = { training: 'technical', extra: 'none' }

function simulateWeeks(world: WorldState, count: number): WorldState {
  let current = world
  for (let i = 0; i < count; i += 1) {
    current = advanceWeek(current, PLAN).world
  }
  return current
}

describe('season simulation', () => {
  it('plays a full season and rolls over into the next one', () => {
    const start = generateWorld(testOptions(), TEST_NOW)
    let world = simulateWeeks(start, 37)

    for (const league of Object.values(world.leagues)) {
      const table = computeLeagueTable(world, league.id, 2026)
      expect(table).toHaveLength(20)
      expect(table.every((row) => row.played === 37)).toBe(true)
      const goalsFor = table.reduce((sum, row) => sum + row.goalsFor, 0)
      const goalsAgainst = table.reduce((sum, row) => sum + row.goalsAgainst, 0)
      expect(goalsFor).toBe(goalsAgainst)
    }

    const final = advanceWeek(world, PLAN)
    world = final.world

    expect(final.seasonTransition).not.toBeNull()
    expect(final.seasonTransition?.season).toBe(2026)
    expect(final.seasonTransition?.summary.leaguePosition).toBeGreaterThan(0)
    expect(world.season).toBe(2027)
    expect(world.week).toBe(1)
    expect(world.seasonSummaries).toHaveLength(1)

    const user = world.players[world.playerId]
    expect(user.age).toBe(18)
    expect(user.history).toHaveLength(1)
    expect(user.careerStats).toHaveLength(1)
    expect(user.seasonStats.season).toBe(2027)
    expect(user.seasonStats.appearances).toBe(0)
    expect(world.clubs[world.clubId]).toBeTruthy()

    const nextFixtures = Object.values(world.fixtures).filter((fixture) => fixture.season === 2027)
    expect(nextFixtures).toHaveLength(760)
    expect(nextFixtures.every((fixture) => fixture.status === 'scheduled')).toBe(true)
    expect(Object.keys(world.fixtures)).toHaveLength(1520)
    expect(world.news.length).toBeLessThanOrEqual(120)
    expect(Number.isFinite(world.finance.balance)).toBe(true)

    const currentLeagueName = world.leagues[world.clubs[world.clubId].leagueId]!.nameZh
    const seasonStartNews = world.news.find(
      (item) => item.season === 2027 && item.title.includes('赛季开始'),
    )
    expect(seasonStartNews?.body).toContain(currentLeagueName)

    const champion = final.seasonTransition?.champion
    const promoted = final.seasonTransition?.promoted
    const relegated = final.seasonTransition?.relegated
    expect(typeof champion).toBe('boolean')
    expect(typeof promoted).toBe('boolean')
    expect(typeof relegated).toBe('boolean')
    expect([promoted, relegated].filter(Boolean).length).toBeLessThanOrEqual(1)
  })

  it('keeps the whole world finite over a full season', () => {
    const world = simulateWeeks(generateWorld(testOptions(), TEST_NOW), 38)
    for (const player of Object.values(world.players)) {
      for (const value of Object.values(player.attributes)) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
      expect(Number.isFinite(player.value)).toBe(true)
      expect(Number.isFinite(player.fitness)).toBe(true)
      expect(Number.isFinite(player.morale)).toBe(true)
    }
    for (const fixture of Object.values(world.fixtures)) {
      if (fixture.status === 'played') {
        expect(Number.isInteger(fixture.homeGoals)).toBe(true)
        expect(Number.isInteger(fixture.awayGoals)).toBe(true)
      }
    }
    expect(Number.isFinite(world.finance.balance)).toBe(true)
  })

  it('produces identical histories for identical inputs', () => {
    const first = simulateWeeks(generateWorld(testOptions(), TEST_NOW), 38)
    const second = simulateWeeks(generateWorld(testOptions(), TEST_NOW), 38)
    expect(hashState(second)).toBe(hashState(first))
  })

  it('generates template events that can be resolved', () => {
    let world = generateWorld(testOptions({ seed: 777 }), TEST_NOW)
    let eventId: string | null = null
    for (let i = 0; i < 12 && !eventId; i += 1) {
      const result = advanceWeek(world, PLAN)
      world = result.world
      if (result.event) eventId = result.event.id
    }

    expect(eventId).not.toBeNull()
    const event = eventId ? world.events[eventId] : undefined
    expect(event?.status).toBe('open')
    expect(event?.choices.length).toBeGreaterThan(1)

    const choice = event!.choices[0]
    const resolved = resolveEvent(world, event!.id, choice.id)
    expect(resolved?.status).toBe('resolved')
    expect(resolved?.resultText).toBeTruthy()
    expect(world.news[0]?.title).toContain('已处理')
  })

  it('does not advance a retired player', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const retired: WorldState = { ...world, retired: true }
    const result = advanceWeek(retired, PLAN)
    expect(result.match).toBeNull()
    expect(result.event).toBeNull()
    expect(result.world.week).toBe(world.week)
  })
})
