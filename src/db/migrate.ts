import { buildMatchLineups } from '../domain'
import type { MatchReport, MatchStatLine, MatchStats, WorldState } from '../domain'
import { CURRENT_SAVE_VERSION } from '../domain/schema/save.schema'

type LegacyReport = MatchReport & {
  status?: MatchReport['status']
  currentMinute?: number
  goals?: MatchReport['goals']
}

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
  return {
    ...report,
    stats: report.stats ?? backfillStats(report),
    lineups: report.lineups ?? buildMatchLineups(world, report),
  }
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

  if (sourceVersion < 2) world.pendingWeekPlan = null
  world.version = CURRENT_SAVE_VERSION
  return world
}
