import { groupByEntity, collectOxlintMetrics } from './lint-report'

export interface TechDebtMetric {
  value: number
  max: number
}

export interface TechDebtEntry {
  metrics: Record<string, TechDebtMetric>
}

export interface TechDebtBaseline {
  version: number
  tool: string
  entities: Record<string, TechDebtEntry>
}

export interface TechDebtDiff {
  added: { entity: string; metric: string; finding: TechDebtMetric }[]
  worsened: { entity: string; metric: string; was: TechDebtMetric; now: TechDebtMetric }[]
  improved: { entity: string; metric: string; was: TechDebtMetric; now: TechDebtMetric }[]
  pruned: string[]
}

export function collectTechDebt(): TechDebtBaseline {
  const entities: Record<string, TechDebtEntry> = {}
  for (const [entity, findings] of groupByEntity(collectOxlintMetrics())) {
    const metrics: Record<string, TechDebtMetric> = {}
    for (const finding of findings) {
      const existing = metrics[finding.metric]
      metrics[finding.metric] = {
        value: Math.max(existing?.value ?? 0, finding.value),
        max: finding.max,
      }
    }
    entities[entity] = { metrics }
  }
  const sorted: Record<string, TechDebtEntry> = {}
  for (const key of Object.keys(entities).sort()) sorted[key] = entities[key]!
  return { version: 1, tool: 'oxlint', entities: sorted }
}

export function diffTechDebt(
  current: TechDebtBaseline,
  baseline: TechDebtBaseline,
): TechDebtDiff {
  const diff: TechDebtDiff = { added: [], worsened: [], improved: [], pruned: [] }
  for (const [entity, entry] of Object.entries(current.entities)) {
    const old = baseline.entities[entity]
    if (!old) {
      for (const [metric, finding] of Object.entries(entry.metrics)) {
        diff.added.push({ entity, metric, finding })
      }
      continue
    }
    for (const [metric, finding] of Object.entries(entry.metrics)) {
      const was = old.metrics[metric]
      if (!was) {
        diff.added.push({ entity, metric, finding })
      } else if (finding.value > was.value) {
        diff.worsened.push({ entity, metric, was, now: finding })
      } else if (finding.value < was.value) {
        diff.improved.push({ entity, metric, was, now: finding })
      }
    }
  }
  for (const entity of Object.keys(baseline.entities)) {
    if (!current.entities[entity]) diff.pruned.push(entity)
  }
  return diff
}
