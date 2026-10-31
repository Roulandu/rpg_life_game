import { clamp, round1 } from '../domain'
import type { KeyMoment, KeyMomentOption, MatchReport, Player, WorldState } from '../domain'
import { buildMediaReaction, outcomeText, refreshMatchNews, refreshScoreTimeline } from './keyMomentNarrative'
import { hasPendingKeyMoments } from './keyMomentGen'
import { finalizeLiveMatch } from './matchFinalize'
import { adjustRelationship, getRelationshipByRole } from './relationships'
import { advanceLiveMatch, applyLiveKeyMomentOutcome, userSideOf } from './liveMatch'

export { generateKeyMoments, hasPendingKeyMoments, pendingKeyMoments } from './keyMomentGen'

interface AppliedOutcome {
  success: boolean
  goal: boolean
  assist: boolean
  ratingDelta: number
  moraleDelta: number
  coachDelta: number
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

function applyLivePlayerEffects(user: Player, outcome: AppliedOutcome): void {
  user.morale = clamp(user.morale + outcome.moraleDelta, 0, 100)
  user.confidence = clamp(user.confidence + (outcome.success ? 1 : -1), 0, 100)
}

function applyScoreEffects(
  world: WorldState,
  report: MatchReport,
  moment: KeyMoment,
  user: Player,
  outcome: AppliedOutcome,
): void {
  if (userSideOf(report, world) === 'home') {
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

function outcomeEventType(moment: KeyMoment, outcome: AppliedOutcome): 'goal' | 'assist' | 'save' | 'chance' {
  if (outcome.goal) return 'goal'
  if (outcome.assist) return 'assist'
  return moment.kind === 'save' ? 'save' : 'chance'
}

function appendMomentEvent(report: MatchReport, moment: KeyMoment, outcome: AppliedOutcome): void {
  report.events.push({
    minute: moment.minute,
    type: outcomeEventType(moment, outcome),
    text: moment.outcome?.textZh ?? '',
    isUser: true,
  })
  report.events.sort((a, b) => a.minute - b.minute)
}

function appendTimeline(
  world: WorldState,
  report: MatchReport,
  moment: KeyMoment,
  playerName: string,
  outcome: AppliedOutcome,
): void {
  appendMomentEvent(report, moment, outcome)
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
  if (report.status === 'live') {
    if (outcome.goal || outcome.assist) {
      applyLiveKeyMomentOutcome(world, report, pending.moment.minute, pending.moment.outcome)
    }
    applyLivePlayerEffects(user, outcome)
    adjustMatchRelationships(world, outcome)
    appendMomentEvent(report, pending.moment, outcome)
    advanceLiveMatch(world)
    return report
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
  if (report.status === 'live') {
    if (hasPendingKeyMoments(world)) return null
    advanceLiveMatch(world)
    return finalizeLiveMatch(world)
  }

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
