import { clamp, positionGroup, round1 } from '../domain/attributes'
import type {
  KeyMoment,
  KeyMomentKind,
  KeyMomentOption,
  MatchReport,
  Player,
  WorldState,
} from '../domain/types'
import type { Rng } from '../lib/rng'
import { KIND_PROMPTS, KIND_TITLES, optionsFor } from './data/keyMomentOptions'
import {
  buildMediaReaction,
  outcomeText,
  refreshMatchNews,
  refreshScoreTimeline,
} from './keyMomentNarrative'
import { adjustRelationship, getRelationshipByRole } from './relationships'

interface AppliedOutcome {
  success: boolean
  goal: boolean
  assist: boolean
  ratingDelta: number
  moraleDelta: number
  coachDelta: number
}

function kindPool(player: Player): KeyMomentKind[] {
  switch (positionGroup(player.position)) {
    case 'GK':
      return ['save', 'save', 'clearance']
    case 'DEF':
      return ['duel', 'clearance', 'duel', 'bigChance']
    case 'MID':
      return ['throughBall', 'bigChance', 'duel', 'penalty']
    case 'FWD':
      return ['bigChance', 'bigChance', 'penalty', 'throughBall']
  }
}

export function generateKeyMoments(
  player: Player,
  rng: Rng,
  minutes: number,
  isHome: boolean,
  startMinute = 0,
): KeyMoment[] {
  if (minutes <= 0) return []
  const windowStart = Math.max(1, startMinute + 2)
  const windowEnd = Math.min(89, startMinute + minutes - 1)
  if (windowEnd <= windowStart) return []

  const maxCount = minutes >= 70 ? 4 : minutes >= 40 ? 3 : 2
  const count = Math.min(rng.int(2, 4), maxCount)
  const pool = rng.shuffle(kindPool(player))
  const moments: KeyMoment[] = []
  let lastMinute = windowStart - 1

  for (let index = 0; index < count; index += 1) {
    const kind = pool[index % pool.length] as KeyMomentKind
    const target =
      Math.round(windowStart + ((index + 1) * (windowEnd - windowStart)) / (count + 1)) +
      rng.int(-3, 3)
    const minute = Math.max(lastMinute + 1, Math.min(windowEnd, target))
    if (minute <= lastMinute) break
    lastMinute = minute
    const options = optionsFor(kind, { player, isHome })
    const safest = [...options].sort((a, b) => b.successChance - a.successChance)[0] as KeyMomentOption
    moments.push({
      id: `km:${player.id}:${index}`,
      minute,
      kind,
      titleZh: KIND_TITLES[kind],
      promptZh: KIND_PROMPTS[kind],
      options,
      defaultOptionId: safest.id,
      roll: Math.round(rng.next() * 10000) / 10000,
    })
  }
  return moments
}

export function pendingKeyMoments(world: WorldState): KeyMoment[] {
  return (world.lastMatch?.keyMoments ?? []).filter((moment) => !moment.outcome)
}

export function hasPendingKeyMoments(world: WorldState): boolean {
  return pendingKeyMoments(world).length > 0
}

function findPendingOption(
  report: MatchReport,
  momentId: string,
  optionId: string,
): { moment: KeyMoment; choice: KeyMomentOption } | null {
  const moment = (report.keyMoments ?? []).find((item) => !item.outcome)
  if (!moment || moment.id !== momentId) return null
  const choice = moment.options.find((item) => item.id === optionId)
  return choice ? { moment, choice } : null
}

function evaluateOption(moment: KeyMoment, choice: KeyMomentOption): AppliedOutcome {
  const success = moment.roll < choice.successChance
  return {
    success,
    goal: success && Boolean(choice.goalOnSuccess),
    assist: success && Boolean(choice.assistOnSuccess),
    ratingDelta: success ? choice.ratingOnSuccess : choice.ratingOnFail,
    moraleDelta: success ? (choice.moraleOnSuccess ?? 0) : (choice.moraleOnFail ?? 0),
    coachDelta: success ? (choice.coachOnSuccess ?? 0) : (choice.coachOnFail ?? 0),
  }
}

function userSide(report: MatchReport, world: WorldState): 'home' | 'away' {
  return report.homeId === world.clubId ? 'home' : 'away'
}

function applyScoreEffects(
  world: WorldState,
  report: MatchReport,
  moment: KeyMoment,
  user: Player,
  outcome: AppliedOutcome,
): void {
  if (userSide(report, world) === 'home') {
    report.homeGoals += 1
    if (moment.minute <= 45 && report.halfTimeHomeGoals !== undefined) {
      report.halfTimeHomeGoals += 1
    }
  } else {
    report.awayGoals += 1
    if (moment.minute <= 45 && report.halfTimeAwayGoals !== undefined) {
      report.halfTimeAwayGoals += 1
    }
  }
  if (outcome.goal) {
    report.userGoals += 1
    user.seasonStats.goals += 1
  }
  if (outcome.assist) {
    report.userAssists += 1
    user.seasonStats.assists += 1
  }
  const fixture = world.fixtures[report.fixtureId]
  if (fixture) {
    fixture.homeGoals = report.homeGoals
    fixture.awayGoals = report.awayGoals
  }
}

function applyPlayerEffects(report: MatchReport, user: Player, outcome: AppliedOutcome): void {
  if (report.userRating != null) {
    const previous = report.userRating
    report.userRating = clamp(round1(previous + outcome.ratingDelta), 4.3, 9.9)
    user.seasonStats.ratingSum += report.userRating - previous
    user.form = clamp(round1(user.form + outcome.ratingDelta * 4), 0, 100)
    if (report.userRating >= 8.3) {
      report.motmName = user.name
      report.motmRating = report.userRating
    }
  }
  user.morale = clamp(user.morale + outcome.moraleDelta, 0, 100)
  user.confidence = clamp(user.confidence + (outcome.success ? 1 : -1), 0, 100)
}

function adjustMatchRelationships(world: WorldState, outcome: AppliedOutcome): void {
  adjustRelationship(getRelationshipByRole(world, 'coach'), outcome.coachDelta)
  if (outcome.goal || outcome.assist) {
    adjustRelationship(getRelationshipByRole(world, 'media'), outcome.goal ? 1.5 : 0.8)
    adjustRelationship(getRelationshipByRole(world, 'fan'), outcome.goal ? 1.2 : 0.6)
  }
}

function appendTimeline(
  world: WorldState,
  report: MatchReport,
  moment: KeyMoment,
  playerName: string,
  outcome: AppliedOutcome,
): void {
  const type = outcome.goal ? 'goal' : outcome.assist ? 'assist' : moment.kind === 'save' ? 'save' : 'chance'
  report.events.push({
    minute: moment.minute,
    type,
    text: moment.outcome?.textZh ?? '',
    isUser: true,
  })
  report.events.sort((a, b) => a.minute - b.minute)
  if (outcome.goal || outcome.assist) {
    refreshMatchNews(world, report, playerName)
    refreshScoreTimeline(report)
  }
}

export function resolveKeyMoment(
  world: WorldState,
  momentId: string,
  optionId: string,
): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  const pending = findPendingOption(report, momentId, optionId)
  if (!pending) return null
  const user = world.players[world.playerId]
  if (!user) return null

  const outcome = evaluateOption(pending.moment, pending.choice)
  pending.moment.outcome = {
    optionId,
    ...outcome,
    textZh: outcomeText(pending.moment, pending.choice, outcome.success, user.name),
  }
  if (outcome.goal || outcome.assist) {
    applyScoreEffects(world, report, pending.moment, user, outcome)
  }
  applyPlayerEffects(report, user, outcome)
  adjustMatchRelationships(world, outcome)
  appendTimeline(world, report, pending.moment, user.name, outcome)
  return report
}

export function autoResolveKeyMoments(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  for (const moment of report.keyMoments ?? []) {
    if (moment.outcome) continue
    resolveKeyMoment(world, moment.id, moment.defaultOptionId)
  }
  return report
}

export function finalizeMatchday(world: WorldState): MatchReport | null {
  const report = world.lastMatch
  if (!report) return null
  const moments = report.keyMoments ?? []
  if (moments.some((moment) => !moment.outcome)) return null
  const user = world.players[world.playerId]
  if (!user) return report
  const outcomes = moments.map((moment) => moment.outcome).filter((outcome) => Boolean(outcome))
  report.mediaReaction = buildMediaReaction(
    report,
    user.name,
    outcomes.filter((outcome) => outcome?.success).length,
    outcomes.length,
    report.homeId === world.clubId,
  )
  refreshMatchNews(world, report, user.name)
  refreshScoreTimeline(report)
  return report
}
