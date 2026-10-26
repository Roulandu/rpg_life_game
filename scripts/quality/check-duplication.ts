import { baselinePath, loadJson } from './lib/baseline'
import { collectDuplication, fileLineCount, type DuplicationBaseline } from './lib/duplication'

const SOURCE_LIMIT = 3
const TEST_LIMIT = 5
const TOTAL_TOLERANCE = 0.2

function ratioLimit(file: string): number {
  return file.startsWith('tests/') ? TEST_LIMIT : SOURCE_LIMIT
}

function main(): void {
  const baseline = loadJson<DuplicationBaseline>(baselinePath('duplication'))
  if (!baseline) {
    console.error('缺少 quality/duplication-baseline.json，请运行 npm run quality:update')
    process.exitCode = 1
    return
  }

  const current = collectDuplication()
  const problems: string[] = []

  if (current.total.percentage > baseline.total.percentage + TOTAL_TOLERANCE) {
    problems.push(
      `整体重复率 ${current.total.percentage}% 高于基线 ${baseline.total.percentage}%（容差 ${TOTAL_TOLERANCE}pp）`,
    )
  }

  for (const [file, duplicated] of Object.entries(current.files)) {
    const previous = baseline.files[file]
    if (previous === undefined) {
      const lines = fileLineCount(file)
      const ratio = lines === 0 ? 0 : (duplicated / lines) * 100
      if (ratio > ratioLimit(file)) {
        problems.push(
          `新文件重复率超标：${file} ${ratio.toFixed(1)}%（上限 ${ratioLimit(file)}%）`,
        )
      }
      continue
    }
    if (duplicated > previous) {
      problems.push(`重复代码增加：${file} ${previous} → ${duplicated} 行`)
    }
  }

  for (const file of Object.keys(baseline.files)) {
    if (!(file in current.files)) {
      console.log(`重复代码已消除：${file}；运行 npm run quality:update 剪枝。`)
    }
  }

  if (problems.length > 0) {
    console.error('重复率检查失败：')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }

  console.log(
    `重复率检查通过：整体 ${current.total.percentage}%（基线 ${baseline.total.percentage}%），${Object.keys(current.files).length} 个文件有重复。`,
  )
}

main()
