import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadJson } from './lib/baseline'
import { COVERAGE_METRICS, type CoverageBaseline } from './lib/coverage'
import type { DuplicationBaseline } from './lib/duplication'
import { changedFiles, commitsSince, mergeBase, resolveBase, showAt, workingFiles } from './lib/git'
import { repoRoot } from './lib/manifest'
import type { TechDebtBaseline } from './lib/tech-debt'

const BASELINES = ['tech-debt', 'duplication', 'coverage'] as const

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function checkTechDebt(
  name: string,
  before: TechDebtBaseline,
  after: TechDebtBaseline,
  problems: string[],
): void {
  for (const [entity, entry] of Object.entries(after.entities)) {
    const old = before.entities[entity]
    if (!old) {
      problems.push(`${name} 不能新增实体：${entity}`)
      continue
    }
    for (const [metric, finding] of Object.entries(entry.metrics)) {
      const was = old.metrics[metric]
      if (!was) problems.push(`${name} 不能为 ${entity} 新增指标：${metric}`)
      else if (finding.value > was.value) {
        problems.push(`${name} 不能调高：${entity} ${metric} ${was.value} → ${finding.value}`)
      }
    }
  }
}

function checkDuplication(
  before: DuplicationBaseline,
  after: DuplicationBaseline,
  problems: string[],
): void {
  if (after.total.percentage > before.total.percentage + 0.01) {
    problems.push(`duplication 总体重复率不能调高：${before.total.percentage}% → ${after.total.percentage}%`)
  }
  if (after.total.duplicatedLines > before.total.duplicatedLines) {
    problems.push(
      `duplication 重复行数不能调高：${before.total.duplicatedLines} → ${after.total.duplicatedLines}`,
    )
  }
  for (const [file, value] of Object.entries(after.files)) {
    const was = before.files[file]
    if (was === undefined) problems.push(`duplication 不能新增文件条目：${file}`)
    else if (value > was) problems.push(`duplication 不能调高：${file} ${was} → ${value}`)
  }
}

function checkCoverage(
  before: CoverageBaseline,
  after: CoverageBaseline,
  problems: string[],
): void {
  for (const metric of COVERAGE_METRICS) {
    if (after.global[metric].pct < before.global[metric].pct - 0.001) {
      problems.push(
        `coverage 全局 ${metric} floor 不能调低：${before.global[metric].pct}% → ${after.global[metric].pct}%`,
      )
    }
  }
  for (const [module, summary] of Object.entries(after.modules)) {
    const old = before.modules[module]
    if (!old) continue
    for (const metric of COVERAGE_METRICS) {
      if (summary[metric].pct < old[metric].pct - 0.001) {
        problems.push(
          `coverage ${module} ${metric} floor 不能调低：${old[metric].pct}% → ${summary[metric].pct}%`,
        )
      }
    }
  }
}

function main(): void {
  const base = resolveBase(argValue('base'))
  const baseCommit = mergeBase(base)
  const changed = changedFiles(base).filter((file) =>
    BASELINES.some((name) => file === `quality/${name}-baseline.json`),
  )
  if (changed.length === 0) {
    console.log('基线检查通过：本次没有修改质量基线。')
    return
  }

  const messageFile = argValue('message-file')
  const messages = messageFile
    ? readFileSync(resolve(repoRoot, messageFile), 'utf8')
    : commitsSince(base)
        .map((commit) => commit.message)
        .join('\n')

  const working = new Set(workingFiles())
  const uncommittedOnly = changed.every((file) => working.has(file))
  const problems: string[] = []
  if (uncommittedOnly && !messageFile) {
    console.log('提示：基线改动尚未提交；提交时必须带 Baseline-Update: <说明>。')
  } else if (!/^Baseline-Update:\s*\S+/m.test(messages)) {
    problems.push('修改质量基线必须提供 Baseline-Update: <说明> trailer。')
  }

  for (const file of changed) {
    const name = file.match(/quality\/(.+-baseline)\.json$/)?.[1] ?? file
    const currentPath = resolve(repoRoot, file)
    if (!existsSync(currentPath)) {
      problems.push(`基线文件被删除：${file}；如确需删除必须提供 Baseline-Update 说明。`)
      continue
    }
    const beforeText = showAt(baseCommit, file)
    if (beforeText === null) continue
    const before = JSON.parse(beforeText) as TechDebtBaseline | DuplicationBaseline | CoverageBaseline
    const after = loadJson<typeof before>(currentPath)
    if (!after) continue
    if (name.startsWith('tech-debt')) {
      checkTechDebt(name, before as TechDebtBaseline, after as TechDebtBaseline, problems)
    } else if (name.startsWith('duplication')) {
      checkDuplication(before as DuplicationBaseline, after as DuplicationBaseline, problems)
    } else {
      checkCoverage(before as CoverageBaseline, after as CoverageBaseline, problems)
    }
  }

  if (problems.length > 0) {
    console.error('基线变更检查失败：基线只能收紧（技术债/重复率调低，覆盖率 floor 调高）。')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`基线检查通过：${changed.length} 个基线文件只允许收紧的变更。`)
}

main()
