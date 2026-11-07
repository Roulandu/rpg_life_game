import { buildMatchLineups } from '../domain'
import type { MatchReport, MatchStatLine, MatchStats, WorldState } from '../domain'
import { CURRENT_SAVE_VERSION, assertWorld } from '../domain'
import { MIGRATION_STEPS } from './migrateSteps'

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
  const upgraded: MatchReport = {
    ...report,
    stats: report.stats ?? backfillStats(report),
    lineups: report.lineups ?? buildMatchLineups(world, report),
  }
  if (upgraded.liveState) return upgraded
  return { ...upgraded, liveState: { possession: 'home', ballX: 0.5 } }
}

/**
 * 职责：把低版本存档一路上推到 CURRENT_SAVE_VERSION，是所有读档与导入的唯一入口。
 * 边界：只补字段、不重算世界；比当前版本更新的存档直接拒绝，避免半读半写。
 * 依赖：./migrateSteps 的版本步骤表与 ./domain 的战报补全工具，逐档缺什么由步骤表自己说。
 */
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

  for (const step of MIGRATION_STEPS) {
    if (sourceVersion < step.from) step.run(world)
  }
  world.version = CURRENT_SAVE_VERSION
  return assertWorld(world)
}
