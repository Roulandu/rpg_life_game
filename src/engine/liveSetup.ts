import type { Club, Fixture, MatchLineups, MatchReport, WorldState } from '../domain'
import { buildMatchLineups, computeClubStrength } from '../domain'
import { createRng } from '../lib'
import { expectedGoals, styleModifier } from './matchGoals'
import { type LiveReportSetup } from './matchReport'
import { determineUserSelection } from './matchUser'

export interface UserFixtureSetup extends LiveReportSetup {
  isHome: boolean
  homeStrength: Club['strength']
  awayStrength: Club['strength']
  homeXg: number
  awayXg: number
}

export function prepareUserFixture(world: WorldState, fixture: Fixture): UserFixtureSetup {
  const user = world.players[world.playerId]
  const homeClub = world.clubs[fixture.homeId]
  const awayClub = world.clubs[fixture.awayId]
  if (!user || !homeClub || !awayClub) throw new Error('Missing clubs for user fixture')

  const isHome = fixture.homeId === user.clubId
  const userClub = isHome ? homeClub : awayClub
  const selectionRng = createRng(world.seed, 'selection', fixture.id)
  const selection = determineUserSelection(world, userClub, selectionRng)
  const userPlayed = selection.minutes > 0

  const homeStrength = computeClubStrength(
    homeClub,
    world.players,
    isHome && userPlayed
      ? { forcePlayerId: user.id }
      : isHome
        ? { excludePlayerId: user.id }
        : undefined,
  )
  const awayStrength = computeClubStrength(
    awayClub,
    world.players,
    !isHome && userPlayed
      ? { forcePlayerId: user.id }
      : !isHome
        ? { excludePlayerId: user.id }
        : undefined,
  )
  const homeXg = expectedGoals(
    homeStrength.attack + styleModifier(homeClub),
    awayStrength.defense,
    true,
  )
  const awayXg = expectedGoals(
    awayStrength.attack + styleModifier(awayClub),
    homeStrength.defense,
    false,
  )
  const lineups = buildMatchLineups(world, {
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    userPlayed,
  })
  return {
    user,
    homeClub,
    awayClub,
    isHome,
    userStarted: selection.started,
    userMinutes: selection.minutes,
    userPlayed,
    lineups,
    homeStrength,
    awayStrength,
    homeXg,
    awayXg,
  }
}

export interface MatchContext {
  fixture: Fixture
  homeClub: Club
  awayClub: Club
  userSide: 'home' | 'away'
  homeStrength: Club['strength']
  awayStrength: Club['strength']
  homeXg: number
  awayXg: number
  lineups: MatchLineups
}

export function contextFor(world: WorldState, report: MatchReport): MatchContext | null {
  const fixture = world.fixtures[report.fixtureId]
  const homeClub = world.clubs[report.homeId]
  const awayClub = world.clubs[report.awayId]
  if (!fixture || !homeClub || !awayClub) return null

  const isHome = report.homeId === world.clubId
  const userPlayed = report.userPlayed
  const homeStrength = computeClubStrength(
    homeClub,
    world.players,
    isHome && userPlayed
      ? { forcePlayerId: world.playerId }
      : isHome
        ? { excludePlayerId: world.playerId }
        : undefined,
  )
  const awayStrength = computeClubStrength(
    awayClub,
    world.players,
    !isHome && userPlayed
      ? { forcePlayerId: world.playerId }
      : !isHome
        ? { excludePlayerId: world.playerId }
        : undefined,
  )
  return {
    fixture,
    homeClub,
    awayClub,
    userSide: isHome ? 'home' : 'away',
    homeStrength,
    awayStrength,
    homeXg: expectedGoals(homeStrength.attack + styleModifier(homeClub), awayStrength.defense, true),
    awayXg: expectedGoals(awayStrength.attack + styleModifier(awayClub), homeStrength.defense, false),
    lineups: report.lineups ?? buildMatchLineups(world, report),
  }
}
