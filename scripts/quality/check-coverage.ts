import { baselinePath, loadJson } from './lib/baseline'
import {
  COVERAGE_METRICS,
  collectCoverage,
  type CoverageBaseline,
  type CoverageSummary,
} from './lib/coverage'

const TOLERANCE = 0.2

function compare(
  label: string,
  actual: CoverageSummary,
  floor: CoverageSummary,
  problems: string[],
): void {
  for (const metric of COVERAGE_METRICS) {
    const now = actual[metric].pct
    const was = floor[metric].pct
    if (now + TOLERANCE < was) {
      problems.push(`${label} ${metric} 覆盖率 ${now}% 低于基线 ${was}%（容差 ${TOLERANCE}pp）`)
    }
  }
}

function main(): void {
  const baseline = loadJson<CoverageBaseline>(baselinePath('coverage'))
  if (!baseline) {
    console.error('缺少 quality/coverage-baseline.json，请运行 npm run quality:update')
    process.exitCode = 1
    return
  }

  const current = collectCoverage()
  const problems: string[] = []
  compare('全局', current.global, baseline.global, problems)

  for (const [module, floor] of Object.entries(baseline.modules)) {
    const now = current.modules[module]
    if (!now) {
      problems.push(`基线中的模块没有覆盖率数据：${module}`)
      continue
    }
    compare(module, now, floor, problems)
  }
  for (const module of Object.keys(current.modules)) {
    if (!(module in baseline.modules)) {
      console.log(`新模块 ${module} 尚无覆盖率基线，首次运行 quality:update 时纳入。`)
    }
  }

  if (problems.length > 0) {
    console.error('覆盖率检查失败：')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(
    `覆盖率检查通过：全局 lines ${current.global.lines.pct}% / branches ${current.global.branches.pct}% / functions ${current.global.functions.pct}%。`,
  )
}

main()
