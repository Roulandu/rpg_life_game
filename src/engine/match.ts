import type { Club, Fixture, MatchReport, WorldState } from '../domain'
import { createRng } from '../lib'
import { autoResolveKeyMoments, finalizeMatchday } from './keyMoments'
import { startUserMatch } from './liveMatch'
import { expectedGoals } from './matchGoals'

export function simulateUserFixture(world: WorldState, fixture: Fixture): MatchReport {
  if (fixture.report?.status === 'final') return fixture.report
  startUserMatch(world, fixture)
  autoResolveKeyMoments(world)
  const report = finalizeMatchday(world)
  if (!report) throw new Error('比赛结算失败')
  return report
}

export function simulateBackgroundFixture(world: WorldState, fixture: Fixture): void {
  if (fixture.status !== 'scheduled') return
  const homeClub = world.clubs[fixture.homeId]
  const awayClub = world.clubs[fixture.awayId]
  if (!homeClub || !awayClub) return
  const rng = createRng(world.seed, 'background', fixture.id)
  const homeXg = expectedGoals(homeClub.strength.attack, awayClub.strength.defense, true)
  const awayXg = expectedGoals(awayClub.strength.attack, homeClub.strength.defense, false)
  fixture.homeGoals = rng.poisson(homeXg)
  fixture.awayGoals = rng.poisson(awayXg)
  fixture.status = 'played'
}

export function simulateWeekFixtures(world: WorldState): MatchReport | null {
  const fixtures = Object.values(world.fixtures)
    .filter(
      (fixture) =>
        fixture.season === world.season &&
        fixture.week === world.week &&
        (fixture.status === 'scheduled' || fixture.status === 'live'),
    )
    .sort((a, b) => a.competitionId.localeCompare(b.competitionId) || a.id.localeCompare(b.id))

  let userReport: MatchReport | null = null
  for (const fixture of fixtures) {
    if (fixture.homeId === world.clubId || fixture.awayId === world.clubId) {
      userReport = simulateUserFixture(world, fixture)
    } else {
      simulateBackgroundFixture(world, fixture)
    }
  }
  return userReport
}

export function getUserMatchFixture(world: WorldState, week = world.week): Fixture | undefined {
  return Object.values(world.fixtures).find(
    (fixture) =>
      fixture.season === world.season &&
      fixture.week === week &&
      (fixture.homeId === world.clubId || fixture.awayId === world.clubId),
  )
}

export function opponentOf(world: WorldState, fixture: Fixture): Club | undefined {
  const opponentId = fixture.homeId === world.clubId ? fixture.awayId : fixture.homeId
  return world.clubs[opponentId]
}
