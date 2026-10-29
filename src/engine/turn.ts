import { computeClubStrength } from '../domain'
import type { GameEvent, MatchReport, SeasonSummary, WeeklyPlan, WorldState } from '../domain'
import { expireEvents, generateWeeklyEvent } from './events'
import { settleWeekFinance, updatePlayerValue } from './finance'
import { simulateWeekFixtures } from './match'
import { applySeasonTransition, evaluateSeason } from './season'
import { applyExtraAction, applyTraining, recoverInjuries } from './training'

export interface SeasonTransition {
  season: number
  newSeason: number
  summary: SeasonSummary
  champion: boolean
  promoted: boolean
  relegated: boolean
  retired: boolean
  retirementReason: string | null
  awards: string[]
}

export interface TurnResult {
  world: WorldState
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
  weekPlayed: number
  seasonPlayed: number
}

function recomputeAllStrengths(world: WorldState): void {
  for (const club of Object.values(world.clubs)) {
    club.strength = computeClubStrength(club, world.players)
  }
}

export function endSeason(world: WorldState): SeasonTransition {
  const endedSeason = world.season
  const nextSeason = endedSeason + 1
  const user = world.players[world.playerId]
  if (!user) throw new Error('User player not found')

  world.clubId = user.clubId
  const evaluation = evaluateSeason(world, endedSeason, nextSeason)
  const retirement = applySeasonTransition(world, user, evaluation)

  return {
    season: endedSeason,
    newSeason: nextSeason,
    summary: evaluation.summary,
    champion: evaluation.champion,
    promoted: evaluation.promoted,
    relegated: evaluation.relegated,
    retired: retirement.retired,
    retirementReason: retirement.retirementReason,
    awards: evaluation.awards,
  }
}

export function advanceWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  if (world.retired) {
    return { world, match: null, event: null, seasonTransition: null, weekPlayed, seasonPlayed }
  }

  recomputeAllStrengths(world)
  recoverInjuries(world)
  applyTraining(world, plan.training)
  applyExtraAction(world, plan.extra)
  expireEvents(world)

  const match = simulateWeekFixtures(world)
  if (match) world.lastMatch = match

  settleWeekFinance(world)
  const event = generateWeeklyEvent(world, match, plan)
  if (world.week % 3 === 0) updatePlayerValue(world)

  let seasonTransition: SeasonTransition | null = null
  world.week += 1
  if (world.week > world.totalWeeks) {
    seasonTransition = endSeason(world)
  }

  return { world, match, event, seasonTransition, weekPlayed, seasonPlayed }
}

export function advanceWeeks(world: WorldState, plan: WeeklyPlan, count: number): TurnResult[] {
  const results: TurnResult[] = []
  let current = world
  for (let i = 0; i < count; i += 1) {
    if (current.retired) break
    const result = advanceWeek(current, plan)
    results.push(result)
    current = result.world
    if (result.seasonTransition) break
  }
  return results
}
