import { DEFAULT_WEEK_PLAN, buildMatchLineups, dayForRound, fixtureDayOf } from '../domain'
import type { MatchReport, MatchStatLine, MatchStats, WorldState } from '../domain'
import { CURRENT_SAVE_VERSION, assertWorld } from '../domain/schema/save.schema'

type LegacyReport = MatchReport & {
  status?: MatchReport['status']
  currentMinute?: number
  goals?: MatchReport['goals']
}

/** v4 只有周时钟：这些字段在 v5 里被日时钟取代，迁移后必须消失。 */
type LegacyWeekClock = WorldState & {
  day?: number
  weekPlan?: WorldState['weekPlan']
  pendingWeekPlan?: WorldState['pendingDayPlan']
  pendingDayPlan?: WorldState['pendingDayPlan']
}

type LegacyInjury = { kind: string; severity: number; weeksLeft?: number; daysLeft?: number }

function normalizeReport(report: MatchReport): MatchReport {
  const legacy = report as LegacyReport
  if (legacy.status && legacy.currentMinute != null && Array.isArray(legacy.goals)) {
    return report
  }
  return {
    ...legacy,
    status: legacy.status ?? 'final',
    currentMinute: legacy.currentMinute ?? 90,
    goals: legacy.goals ?? [],
  }
}

function statLine(possession: number, goals: number): MatchStatLine {
  return { possession, shots: goals, shotsOnTarget: goals, corners: 0 }
}

function backfillStats(report: MatchReport): MatchStats {
  const minutes = Math.max(0, Math.min(90, report.currentMinute))
  const homePossession = Math.round(minutes / 2)
  return {
    home: statLine(homePossession, report.homeGoals),
    away: statLine(minutes - homePossession, report.awayGoals),
  }
}

function upgradeLiveReport(world: WorldState, report: MatchReport): MatchReport {
  if (report.status !== 'live') return report
  const upgraded: MatchReport = {
    ...report,
    stats: report.stats ?? backfillStats(report),
    lineups: report.lineups ?? buildMatchLineups(world, report),
  }
  if (upgraded.liveState) return upgraded
  return { ...upgraded, liveState: { possession: 'home', ballX: 0.5 } }
}

/**
 * v4→v5：周时钟换成日时钟。停着的 live 比赛要把时钟摆回它所在的那一天，
 * 否则读档后那天永远等不到开球，未踢完的关键回合就废了。
 */
function migrateFixtureDays(world: WorldState): void {
  for (const fixture of Object.values(world.fixtures)) {
    fixture.day = fixture.day ?? dayForRound(fixture.round)
  }
}

function migrateInjuryDays(world: WorldState): void {
  for (const player of Object.values(world.players)) {
    const injury = player.injury as LegacyInjury | null
    if (!injury || injury.daysLeft != null || injury.weeksLeft == null) continue
    injury.daysLeft = Math.max(1, Math.round(injury.weeksLeft * 7))
    delete injury.weeksLeft
  }
}

function migrateTimeModel(world: WorldState): void {
  const legacy = world as LegacyWeekClock
  migrateFixtureDays(world)
  migrateInjuryDays(world)
  const pending = legacy.pendingWeekPlan ?? legacy.pendingDayPlan ?? null
  delete legacy.pendingWeekPlan
  legacy.pendingDayPlan = pending
  legacy.weekPlan = legacy.weekPlan ?? DEFAULT_WEEK_PLAN
  const liveFixture =
    world.lastMatch?.status === 'live' ? world.fixtures[world.lastMatch.fixtureId] : undefined
  legacy.day = liveFixture ? fixtureDayOf(liveFixture) : 1
}

export function migrateWorld(input: WorldState): WorldState {
  if (input.version > CURRENT_SAVE_VERSION) {
    throw new Error('这个存档来自更新版本的游戏，请先更新。')
  }
  if (input.version >= CURRENT_SAVE_VERSION) return input

  const sourceVersion = input.version
  const world = structuredClone(input)
  const reports = new Map<MatchReport, MatchReport>()
  const migrateReport = (report: MatchReport): MatchReport => {
    const existing = reports.get(report)
    if (existing) return existing
    const migrated = upgradeLiveReport(world, normalizeReport(report))
    reports.set(report, migrated)
    return migrated
  }

  for (const fixture of Object.values(world.fixtures)) {
    if (fixture.report) fixture.report = migrateReport(fixture.report)
  }
  if (world.lastMatch) world.lastMatch = migrateReport(world.lastMatch)

  if (sourceVersion < 5) migrateTimeModel(world)
  if (sourceVersion < 2) world.pendingDayPlan = null
  world.version = CURRENT_SAVE_VERSION
  return sourceVersion < 5 ? assertWorld(world) : world
}
