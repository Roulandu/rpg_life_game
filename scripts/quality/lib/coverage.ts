import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadManifest, moduleForFile, repoRoot, toPosix } from './manifest'

export interface CoverageMetric {
  total: number
  covered: number
  pct: number
}

export interface CoverageSummary {
  lines: CoverageMetric
  statements: CoverageMetric
  functions: CoverageMetric
  branches: CoverageMetric
}

export interface CoverageBaseline {
  version: number
  global: CoverageSummary
  modules: Record<string, CoverageSummary>
}

type RawMetric = { total?: number; covered?: number; pct?: number }
type RawSummary = Record<string, RawMetric | undefined>

const METRICS = ['lines', 'statements', 'functions', 'branches'] as const

function normalizeMetric(raw: RawMetric | undefined): CoverageMetric {
  return {
    total: raw?.total ?? 0,
    covered: raw?.covered ?? 0,
    pct: raw?.pct ?? 0,
  }
}

function normalizeSummary(raw: RawSummary): CoverageSummary {
  return {
    lines: normalizeMetric(raw.lines),
    statements: normalizeMetric(raw.statements),
    functions: normalizeMetric(raw.functions),
    branches: normalizeMetric(raw.branches),
  }
}

export function loadCoverageSummary(): CoverageSummary {
  const path = resolve(repoRoot, 'coverage/coverage-summary.json')
  if (!existsSync(path)) {
    throw new Error('缺少 coverage/coverage-summary.json，请先运行 npm run test:coverage')
  }
  const report = JSON.parse(readFileSync(path, 'utf8')) as Record<string, RawSummary>
  if (!report.total) throw new Error('覆盖率报告缺少 total 字段')
  return normalizeSummary(report.total)
}

export function collectCoverage(): CoverageBaseline {
  const path = resolve(repoRoot, 'coverage/coverage-summary.json')
  if (!existsSync(path)) {
    throw new Error('缺少 coverage/coverage-summary.json，请先运行 npm run test:coverage')
  }
  const report = JSON.parse(readFileSync(path, 'utf8')) as Record<string, RawSummary>
  const manifest = loadManifest()

  const totals = new Map<string, Record<string, { total: number; covered: number }>>()
  for (const [file, summary] of Object.entries(report)) {
    if (file === 'total' || !summary) continue
    const relative = toPosix(file).startsWith(repoRoot.replace(/\\/g, '/'))
      ? toPosix(file).slice(repoRoot.length + 1)
      : toPosix(file)
    const module = moduleForFile(manifest, relative)
    if (!module) continue
    const bucket = totals.get(module) ?? {}
    for (const metric of METRICS) {
      const raw = summary[metric]
      if (!raw) continue
      const current = bucket[metric] ?? { total: 0, covered: 0 }
      current.total += raw.total ?? 0
      current.covered += raw.covered ?? 0
      bucket[metric] = current
    }
    totals.set(module, bucket)
  }

  const modules: Record<string, CoverageSummary> = {}
  for (const [module, bucket] of totals) {
    const summary = {} as CoverageSummary
    for (const metric of METRICS) {
      const raw = bucket[metric] ?? { total: 0, covered: 0 }
      summary[metric] = {
        ...raw,
        pct: raw.total === 0 ? 100 : Math.round((raw.covered / raw.total) * 10000) / 100,
      }
    }
    modules[module] = summary
  }
  const sorted: Record<string, CoverageSummary> = {}
  for (const key of Object.keys(modules).sort()) sorted[key] = modules[key]!

  const total = report.total
  if (!total) throw new Error('覆盖率报告缺少 total 字段')
  return { version: 1, global: normalizeSummary(total), modules: sorted }
}

export const COVERAGE_METRICS = METRICS
