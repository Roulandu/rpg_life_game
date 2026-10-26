import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { baselinePath, loadJson } from './lib/baseline'
import { collectBoundaries } from './lib/boundaries'
import { collectCoverage } from './lib/coverage'
import { collectDuplication } from './lib/duplication'
import { repoRoot } from './lib/manifest'
import { collectTechDebt, diffTechDebt, type TechDebtBaseline } from './lib/tech-debt'

function walkTests(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkTests(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

function countTests(): number {
  let total = 0
  for (const file of walkTests(resolve(repoRoot, 'tests'))) {
    const text = readFileSync(file, 'utf8')
    total += (text.match(/\b(?:it|test)\s*(?:\.\w+)?\s*\(/g) ?? []).length
  }
  return total
}

async function main(): Promise<void> {
  const debt = collectTechDebt()
  const baseline = loadJson<TechDebtBaseline>(baselinePath('tech-debt'))
  const duplication = collectDuplication()
  const boundaries = await collectBoundaries()

  console.log('== 研发健康度 ==')
  console.log(`技术债实体：${Object.keys(debt.entities).length}`)
  if (baseline) {
    const diff = diffTechDebt(debt, baseline)
    console.log(
      `  新增 ${diff.added.length} / 恶化 ${diff.worsened.length} / 下降 ${diff.improved.length} / 已消除 ${diff.pruned.length}`,
    )
  }

  const fileLines = Object.entries(debt.entities)
    .filter(([, entry]) => entry.metrics.lines)
    .map(([entity, entry]) => ({ entity, value: entry.metrics.lines!.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
  if (fileLines.length > 0) {
    console.log('Top 10 大文件：')
    for (const item of fileLines) console.log(`  ${item.value.toString().padStart(4)}  ${item.entity}`)
  }

  console.log(
    `重复率：${duplication.total.percentage}%（${duplication.total.duplicatedLines} 行，${Object.keys(duplication.files).length} 个文件）`,
  )

  try {
    const coverage = collectCoverage()
    console.log(
      `覆盖率：lines ${coverage.global.lines.pct}% / branches ${coverage.global.branches.pct}% / functions ${coverage.global.functions.pct}%`,
    )
  } catch {
    console.log('覆盖率：尚未生成，运行 npm run test:coverage')
  }

  console.log(
    `模块边界：${boundaries.edges.length} 条跨模块依赖，新增违规 ${boundaries.violations.length}，新增循环 ${boundaries.cycles.length}，平台越界 ${boundaries.platform.length}`,
  )
  console.log(`测试用例：${countTests()}`)
}

void main()
