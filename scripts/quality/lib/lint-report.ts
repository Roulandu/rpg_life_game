import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { repoRoot, toPosix } from './manifest'

export type MetricName =
  | 'lines'
  | 'functionLines'
  | 'complexity'
  | 'depth'
  | 'params'
  | 'nestedCallbacks'
  | 'statements'

export interface MetricFinding {
  file: string
  entity: string
  metric: MetricName
  value: number
  max: number
  line: number
  message: string
}

interface OxlintDiagnostic {
  message: string
  code: string
  filename: string
  labels?: { span?: { line?: number } }[]
}

interface OxlintReport {
  diagnostics?: OxlintDiagnostic[]
}

const RULES: Record<string, { metric: MetricName; pattern: RegExp }> = {
  'eslint(max-lines)': { metric: 'lines', pattern: /File has too many lines \((\d+)\)/ },
  'eslint(max-lines-per-function)': {
    metric: 'functionLines',
    pattern: /has too many lines \((\d+)\)/,
  },
  'eslint(complexity)': { metric: 'complexity', pattern: /has a complexity of (\d+)/ },
  'eslint(max-depth)': { metric: 'depth', pattern: /nested too deeply \((\d+)\)/ },
  'eslint(max-params)': { metric: 'params', pattern: /too many parameters \((\d+)\)/ },
  'eslint(max-nested-callbacks)': {
    metric: 'nestedCallbacks',
    pattern: /nested callbacks \((\d+)\)/,
  },
  'eslint(max-statements)': {
    metric: 'statements',
    pattern: /too many statements \((\d+)\)/,
  },
}

const SOURCE_THRESHOLDS: Record<MetricName, number> = {
  lines: 300,
  functionLines: 60,
  complexity: 12,
  depth: 4,
  params: 5,
  nestedCallbacks: 3,
  statements: 50,
}

const TEST_THRESHOLDS: Record<MetricName, number> = {
  ...SOURCE_THRESHOLDS,
  lines: 600,
  functionLines: 100,
  complexity: 20,
  statements: 80,
}

function extractName(message: string): string | null {
  const backtick = message.match(/function\s+`([^`]+)`/)
  if (backtick) return backtick[1] ?? null
  const quoted = message.match(/function\s+'([^']+)'/)
  return quoted?.[1] ?? null
}

export function collectOxlintMetrics(): MetricFinding[] {
  let raw = ''
  try {
    raw = execFileSync(
      process.execPath,
      [
        resolve(repoRoot, 'node_modules/oxlint/bin/oxlint'),
        '-c',
        'quality/oxlint-tech-debt.json',
        '-f',
        'json',
        'src',
        'tests',
      ],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    )
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string }
    if (!failed.stdout) {
      throw new Error(
        `oxlint 未返回可解析的 JSON，请检查 quality/oxlint-tech-debt.json：${failed.stderr ?? ''}`,
      )
    }
    raw = failed.stdout
  }

  let report: OxlintReport
  try {
    report = JSON.parse(raw) as OxlintReport
  } catch {
    throw new Error('oxlint 输出不是合法 JSON，升级 oxlint 后请先回归 check-tech-debt')
  }
  if (!Array.isArray(report.diagnostics)) {
    throw new Error('oxlint JSON 缺少 diagnostics 字段，拒绝静默通过')
  }

  const diagnostics = [...report.diagnostics].filter((item) => item.code in RULES)
  diagnostics.sort((a, b) => {
    const fileCompare = a.filename.localeCompare(b.filename)
    if (fileCompare !== 0) return fileCompare
    return (a.labels?.[0]?.span?.line ?? 0) - (b.labels?.[0]?.span?.line ?? 0)
  })

  const nameCounters = new Map<string, number>()
  const findings: MetricFinding[] = []
  for (const diagnostic of diagnostics) {
    const rule = RULES[diagnostic.code]
    if (!rule) continue
    const match = diagnostic.message.match(rule.pattern)
    if (!match) {
      throw new Error(`无法解析 oxlint 指标信息：${diagnostic.message}`)
    }
    const value = Number(match[1])
    const file = toPosix(diagnostic.filename)
    const line = diagnostic.labels?.[0]?.span?.line ?? 0
    const name = extractName(diagnostic.message)
    let entity = file
    if (rule.metric !== 'lines') {
      if (name) {
        const counterKey = `${file}::${name}`
        const seen = (nameCounters.get(counterKey) ?? 0) + 1
        nameCounters.set(counterKey, seen)
        entity = seen === 1 ? counterKey : `${counterKey}#${seen}`
      } else {
        entity = `${file}::<anonymous>`
      }
    }
    const thresholds = file.startsWith('tests/') ? TEST_THRESHOLDS : SOURCE_THRESHOLDS
    findings.push({
      file,
      entity,
      metric: rule.metric,
      value,
      max: thresholds[rule.metric],
      line,
      message: diagnostic.message,
    })
  }
  return findings
}

export function groupByEntity(findings: MetricFinding[]): Map<string, MetricFinding[]> {
  const grouped = new Map<string, MetricFinding[]>()
  for (const finding of findings) {
    const list = grouped.get(finding.entity) ?? []
    list.push(finding)
    grouped.set(finding.entity, list)
  }
  return grouped
}

export function formatMetric(metric: MetricName): string {
  return metric
}
