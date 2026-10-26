import { baselinePath, loadJson, sortRecord, writeJson } from './lib/baseline'
import {
  COVERAGE_METRICS,
  collectCoverage,
  type CoverageBaseline,
  type CoverageSummary,
} from './lib/coverage'
import { collectDuplication, fileLineCount, type DuplicationBaseline } from './lib/duplication'
import { collectTechDebt, type TechDebtBaseline } from './lib/tech-debt'

const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)

function shouldRun(name: string): boolean {
  return !ONLY || ONLY === name || ONLY === 'all'
}

function mergeTechDebt(): boolean {
  const current = collectTechDebt()
  const before = loadJson<TechDebtBaseline>(baselinePath('tech-debt'))
  if (!before) {
    writeJson(baselinePath('tech-debt'), current)
    console.log(`已建立技术债基线：${Object.keys(current.entities).length} 个实体。`)
    return true
  }
  const entities: TechDebtBaseline['entities'] = {}
  const problems: string[] = []
  for (const [entity, entry] of Object.entries(current.entities)) {
    const old = before.entities[entity]
    if (!old) {
      problems.push(`新增技术债实体：${entity}（不允许通过 update 加入基线）`)
      continue
    }
    const metrics: (typeof entry)['metrics'] = {}
    for (const [metric, finding] of Object.entries(entry.metrics)) {
      const was = old.metrics[metric]
      if (!was) {
        problems.push(`新增技术债指标：${entity} ${metric}`)
        continue
      }
      if (finding.value > was.value) {
        problems.push(`技术债恶化：${entity} ${metric} ${was.value} → ${finding.value}`)
        metrics[metric] = was
      } else {
        metrics[metric] = { value: finding.value, max: finding.max }
      }
    }
    if (Object.keys(metrics).length > 0) entities[entity] = { metrics }
  }
  writeJson(baselinePath('tech-debt'), { ...current, entities: sortRecord(entities) })
  if (problems.length > 0) {
    console.error('技术债基线已收紧，但以下债务不能被接纳：')
    for (const problem of problems) console.error(`  ${problem}`)
    return false
  }
  console.log(`技术债基线已更新：${Object.keys(entities).length} 个实体。`)
  return true
}

function mergeDuplication(): boolean {
  const current = collectDuplication()
  const before = loadJson<DuplicationBaseline>(baselinePath('duplication'))
  if (!before) {
    writeJson(baselinePath('duplication'), current)
    console.log(`已建立重复率基线：${current.total.percentage}%（${current.total.duplicatedLines} 行）。`)
    return true
  }
  const problems: string[] = []
  if (current.total.percentage > before.total.percentage + 0.01) {
    problems.push(
      `重复率上升：${before.total.percentage}% → ${current.total.percentage}%`,
    )
  }
  if (current.total.duplicatedLines > before.total.duplicatedLines) {
    problems.push(
      `重复行数上升：${before.total.duplicatedLines} → ${current.total.duplicatedLines}`,
    )
  }
  const files: Record<string, number> = {}
  for (const [file, value] of Object.entries(current.files)) {
    const was = before.files[file]
    if (was === undefined) {
      const lines = fileLineCount(file)
      const ratio = lines === 0 ? 0 : (value / lines) * 100
      const limit = file.startsWith('tests/') ? 5 : 3
      if (ratio > limit) {
        problems.push(`新文件重复率超标：${file} ${ratio.toFixed(1)}%（上限 ${limit}%）`)
        continue
      }
      files[file] = value
      continue
    }
    if (value > was) problems.push(`重复代码增加：${file} ${was} → ${value} 行`)
    files[file] = Math.min(value, was)
  }
  const total = {
    ...current.total,
    duplicatedLines: Math.min(current.total.duplicatedLines, before.total.duplicatedLines),
    percentage: Math.min(current.total.percentage, before.total.percentage),
  }
  writeJson(baselinePath('duplication'), { ...current, total, files: sortRecord(files) })
  if (problems.length > 0) {
    console.error('重复率基线已收紧，但以下债务不能被接纳：')
    for (const problem of problems) console.error(`  ${problem}`)
    return false
  }
  console.log(`重复率基线已更新：${total.percentage}%（${total.duplicatedLines} 行）。`)
  return true
}

function mergeSummary(
  before: CoverageSummary | undefined,
  current: CoverageSummary,
  label: string,
  problems: string[],
): CoverageSummary {
  const summary = {} as CoverageSummary
  for (const metric of COVERAGE_METRICS) {
    const pct = before ? Math.max(before[metric].pct, current[metric].pct) : current[metric].pct
    if (before && current[metric].pct < before[metric].pct) {
      problems.push(`${label} ${metric} 覆盖率下降：${before[metric].pct}% → ${current[metric].pct}%`)
    }
    summary[metric] = { ...current[metric], pct }
  }
  return summary
}

function mergeCoverage(): boolean {
  const current = collectCoverage()
  const before = loadJson<CoverageBaseline>(baselinePath('coverage'))
  if (!before) {
    writeJson(baselinePath('coverage'), current)
    console.log(`已建立覆盖率基线：lines ${current.global.lines.pct}%。`)
    return true
  }
  const problems: string[] = []
  const global = mergeSummary(before.global, current.global, '全局', problems)
  const modules: Record<string, CoverageSummary> = {}
  for (const [module, summary] of Object.entries(current.modules)) {
    modules[module] = mergeSummary(before.modules[module], summary, module, problems)
  }
  writeJson(baselinePath('coverage'), { version: 1, global, modules: sortRecord(modules) })
  if (problems.length > 0) {
    console.error('覆盖率 floor 已保持，但以下下降不能被接纳：')
    for (const problem of problems) console.error(`  ${problem}`)
    return false
  }
  console.log(`覆盖率基线已更新：全局 lines ${global.lines.pct}%。`)
  return true
}

function main(): void {
  let ok = true
  if (shouldRun('tech-debt')) ok = mergeTechDebt() && ok
  if (shouldRun('duplication')) ok = mergeDuplication() && ok
  if (shouldRun('coverage')) ok = mergeCoverage() && ok
  if (!ok) process.exitCode = 1
}

main()
