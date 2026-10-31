import { computeClubStrength } from '../domain'
import type { GameEvent, MatchReport, SeasonSummary, WeeklyPlan, WorldState } from '../domain'
import { expireEvents, generateWeeklyEvent } from './events'
import { settleWeekFinance, updatePlayerValue } from './finance'
import { autoResolveKeyMoments, finalizeMatchday, hasPendingKeyMoments } from './keyMoments'
import { advanceLiveMatch, startUserMatch } from './liveMatch'
import { getUserMatchFixture, simulateWeekFixtures } from './match'
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
  live: boolean
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

function finishWeek(
  world: WorldState,
  plan: WeeklyPlan,
  match: MatchReport | null,
  weekPlayed: number,
  seasonPlayed: number,
): TurnResult {
  if (match?.status === 'final') world.lastMatch = match
  simulateWeekFixtures(world)
  settleWeekFinance(world)
  const event = generateWeeklyEvent(world, match, plan)
  if (world.week % 3 === 0) updatePlayerValue(world)

  let seasonTransition: SeasonTransition | null = null
  world.week += 1
  if (world.week > world.totalWeeks) {
    seasonTransition = endSeason(world)
  }
  world.pendingWeekPlan = null

  return {
    world,
    match,
    event,
    seasonTransition,
    weekPlayed,
    seasonPlayed,
    live: false,
  }
}

export function startWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  const live = world.lastMatch?.status === 'live'
  const idle: TurnResult = {
    world,
    match: world.lastMatch,
    event: null,
    seasonTransition: null,
    weekPlayed,
    seasonPlayed,
    live,
  }
  if (world.retired) return { ...idle, match: null, live: false }
  if (live || hasPendingKeyMoments(world)) return idle

  recomputeAllStrengths(world)
  recoverInjuries(world)
  applyTraining(world, plan.training)
  applyExtraAction(world, plan.extra)
  expireEvents(world)

  const fixture = getUserMatchFixture(world)
  if (!fixture) return finishWeek(world, plan, null, weekPlayed, seasonPlayed)

  const report = startUserMatch(world, fixture)
  if (report.status === 'live' && (report.keyMoments ?? []).some((moment) => !moment.outcome)) {
    world.pendingWeekPlan = { ...plan, fixtureId: fixture.id }
    return { ...idle, world, match: report, live: true }
  }

  const settled = finalizeMatchday(world)
  return finishWeek(world, plan, settled, weekPlayed, seasonPlayed)
}

export function completeWeek(input: WorldState): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  const plan = world.pendingWeekPlan
  const idle: TurnResult = {
    world,
    match: world.lastMatch,
    event: null,
    seasonTransition: null,
    weekPlayed,
    seasonPlayed,
    live: world.lastMatch?.status === 'live',
  }
  if (!plan) return idle

  if (world.lastMatch?.status === 'live') {
    if (hasPendingKeyMoments(world)) return idle
    advanceLiveMatch(world)
    finalizeMatchday(world)
  }

  const match = world.lastMatch?.status === 'final' ? world.lastMatch : null
  return finishWeek(world, plan, match, weekPlayed, seasonPlayed)
}

export function advanceWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const started = startWeek(input, plan)
  if (!started.live) return started

  const world = structuredClone(started.world)
  autoResolveKeyMoments(world)
  finalizeMatchday(world)
  return completeWeek(world)
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
