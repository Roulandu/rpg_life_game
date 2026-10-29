import { clamp, overall, positionGroup, round1 } from '../domain'
import type { Club, MatchEventLine, Player, WorldState } from '../domain'
import type { Rng } from '../lib'
import { computeClubStrength } from '../domain'
import { pickInjuryKind } from './matchGoals'
import { adjustRelationship, adjustRoleTrust, coachTrust, getRelationshipByRole } from './relationships'

export interface SelectionResult {
  started: boolean
  minutes: number
}

export function determineUserSelection(
  world: WorldState,
  club: Club,
  rng: Rng,
): SelectionResult {
  const user = world.players[world.playerId]
  if (!user || user.injury || user.fitness < 26) return { started: false, minutes: 0 }

  const withoutUser = computeClubStrength(club, world.players, { excludePlayerId: user.id })
  const trust = coachTrust(world)
  const score =
    (overall(user) - withoutUser.overall) * 2.2 +
    (trust - 50) * 0.22 +
    (user.fitness - 70) * 0.2 +
    (user.form - 50) * 0.12 +
    (user.sharpness - 50) * 0.08

  if (user.fitness >= 38 && (score >= -3.5 || (score >= -9 && rng.chance(0.55)))) {
    return { started: true, minutes: 90 }
  }
  if (user.fitness >= 45 && score >= -18 && rng.chance(0.45)) {
    return { started: false, minutes: rng.int(15, 30) }
  }
  return { started: false, minutes: 0 }
}

interface UserRatingInput {
  user: Player
  goals: number
  assists: number
  goalsFor: number
  goalsAgainst: number
  minutes: number
  played: boolean
  rng: Rng
}

export function computeUserRating(input: UserRatingInput): number | null {
  if (!input.played) return null
  const { user } = input
  const resultBonus = input.goalsFor > input.goalsAgainst ? 0.3 : input.goalsFor < input.goalsAgainst ? -0.25 : 0
  let rating =
    6.35 + input.goals * 0.95 + input.assists * 0.65 + resultBonus + input.rng.normal(0, 0.35)
  if (user.position === 'GK') rating += input.goalsAgainst === 0 ? 0.7 : -0.15 * input.goalsAgainst
  if (positionGroup(user.position) === 'DEF') rating += input.goalsAgainst === 0 ? 0.35 : 0
  if (input.minutes < 90) rating = 6 + (rating - 6) * (input.minutes / 90)
  return clamp(round1(rating), 4.3, 9.9)
}

interface UserMatchEvents {
  events: MatchEventLine[]
  injured: boolean
}

export function rollUserMatchEvents(
  user: Player,
  goals: number,
  assists: number,
  rng: Rng,
): UserMatchEvents {
  const events: MatchEventLine[] = []
  let injured = false
  if (rng.chance(0.06)) {
    user.seasonStats.yellowCards += 1
    events.push({
      minute: rng.int(15, 85),
      type: 'card',
      text: `${user.name} 因一次战术犯规吃到黄牌。`,
      isUser: true,
    })
  }
  const injuryChance = 0.012 * (1 + (100 - user.fitness) / 100) * (user.position === 'GK' ? 0.5 : 1)
  if (rng.chance(injuryChance)) {
    injured = true
    user.injury = {
      kind: pickInjuryKind(rng),
      weeksLeft: rng.int(2, 8),
      severity: rng.int(1, 3),
    }
    events.push({
      minute: rng.int(20, 88),
      type: 'injury',
      text: `${user.name} 在对抗中受伤，无法坚持比赛。`,
      isUser: true,
    })
  }
  if (goals === 0 && assists === 0 && rng.chance(0.3)) {
    events.push({
      minute: rng.int(10, 85),
      type: 'chance',
      text:
        user.position === 'GK'
          ? `${user.name} 做出一次关键扑救，阻止了对手的必进球。`
          : `${user.name} 在禁区内制造威胁，可惜射门稍稍偏出。`,
      isUser: true,
    })
  }
  return { events, injured }
}

interface UserMatchInput {
  world: WorldState
  user: Player
  rating: number | null
  goals: number
  assists: number
  goalsFor: number
  goalsAgainst: number
  played: boolean
  rng: Rng
}

function updateSeasonStats(input: UserMatchInput): void {
  const { user, rating, goals, assists, played } = input
  user.seasonStats.appearances += played ? 1 : 0
  user.seasonStats.goals += goals
  user.seasonStats.assists += assists
  if (rating != null) {
    user.seasonStats.ratingSum += rating
    user.seasonStats.ratingCount += 1
  }
}

function updatePhysicalState(user: Player, played: boolean, rng: Rng): void {
  if (played) {
    user.fitness = clamp(user.fitness - (12 + rng.int(0, 10)), 20, 100)
    user.sharpness = clamp(user.sharpness + 6, 0, 100)
  } else {
    user.fitness = clamp(user.fitness + 5, 0, 100)
    user.sharpness = clamp(user.sharpness - 1, 0, 100)
  }
}

function updateMoraleAndConfidence(
  user: Player,
  input: UserMatchInput,
  result: 'win' | 'loss' | 'draw',
): void {
  const { rating, goals, assists, played } = input
  let moraleDelta = result === 'win' ? 4 : result === 'loss' ? -3 : 0
  if (played && rating != null && rating >= 7.5) moraleDelta += 2
  if (!played) moraleDelta -= 1
  user.morale = clamp(user.morale + moraleDelta, 0, 100)

  let confidenceDelta = goals * 3 + assists * 2
  if (rating != null) {
    if (rating >= 7.5) confidenceDelta += 2
    else if (rating < 6) confidenceDelta -= 2
  }
  user.confidence = clamp(user.confidence + confidenceDelta, 0, 100)
}

function updateCoachRelationship(world: WorldState, rating: number | null): void {
  const coachDelta =
    rating == null
      ? 0
      : rating >= 8.2
        ? 3
        : rating >= 7.2
          ? 1.5
          : rating < 6
            ? -2
            : 0.5
  adjustRelationship(getRelationshipByRole(world, 'coach'), coachDelta)
  if (rating != null && rating >= 7.5) {
    adjustRoleTrust(world, 'teammate', 1)
  }
}

function updateReputation(world: WorldState, user: Player, rating: number | null, goals: number, assists: number): void {
  const mediaDelta = goals * 1.5 + assists + (rating != null && rating >= 7.5 ? 1 : rating != null && rating < 6 ? -1 : 0)
  if (mediaDelta === 0) return
  user.reputation.media = clamp(user.reputation.media + mediaDelta, 0, 100)
  user.reputation.fanbase = clamp(user.reputation.fanbase + Math.max(-1, mediaDelta * 0.8), 0, 100)
  user.reputation.local = clamp(user.reputation.local + Math.max(-1, mediaDelta * 0.6), 0, 100)
  user.reputation.national = clamp(user.reputation.national + Math.max(-0.5, mediaDelta * 0.35), 0, 100)
  adjustRelationship(getRelationshipByRole(world, 'media'), mediaDelta)
  adjustRelationship(getRelationshipByRole(world, 'fan'), mediaDelta * 0.8)
}

export function updateUserAfterMatch(input: UserMatchInput): void {
  const { world, user, rating, goals, assists, goalsFor, goalsAgainst, played } = input
  const result = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
  updateSeasonStats(input)
  updatePhysicalState(user, played, input.rng)
  if (rating != null) {
    user.form = clamp(round1(user.form + (rating - 6.7) * 5), 0, 100)
  } else {
    user.form = clamp(round1(user.form - 1), 0, 100)
  }
  updateMoraleAndConfidence(user, input, result)
  updateCoachRelationship(world, rating)
  updateReputation(world, user, rating, goals, assists)
}
