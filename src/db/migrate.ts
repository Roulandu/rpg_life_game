import type { MatchReport, WorldState } from '../domain'
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

export function migrateWorld(input: WorldState): WorldState {
  if (input.version > CURRENT_SAVE_VERSION) {
    throw new Error('这个存档来自更新版本的游戏，请先更新。')
  }
  if (input.version >= CURRENT_SAVE_VERSION) return input

  const world = structuredClone(input)
  const reports = new Map<MatchReport, MatchReport>()
  const migrateReport = (report: MatchReport): MatchReport => {
    const existing = reports.get(report)
    if (existing) return existing
    const migrated = normalizeReport(report)
    reports.set(report, migrated)
    return migrated
  }

  for (const fixture of Object.values(world.fixtures)) {
    if (fixture.report) fixture.report = migrateReport(fixture.report)
  }
  if (world.lastMatch) world.lastMatch = migrateReport(world.lastMatch)

  world.pendingWeekPlan = null
  world.version = CURRENT_SAVE_VERSION
  return world
}
