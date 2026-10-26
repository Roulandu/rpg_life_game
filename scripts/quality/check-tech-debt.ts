import { baselinePath, loadJson } from './lib/baseline'
import { collectTechDebt, diffTechDebt, type TechDebtBaseline } from './lib/tech-debt'

function main(): void {
  const baseline = loadJson<TechDebtBaseline>(baselinePath('tech-debt'))
  if (!baseline) {
    console.error('缺少 quality/tech-debt-baseline.json，请运行 npm run quality:update')
    process.exitCode = 1
    return
  }

  const current = collectTechDebt()
  const diff = diffTechDebt(current, baseline)
  const violations = [...diff.added, ...diff.worsened]

  if (diff.improved.length > 0) {
    console.log(`技术债已下降 ${diff.improved.length} 项；运行 npm run quality:update 收紧基线。`)
  }
  if (diff.pruned.length > 0) {
    console.log(`基线中有 ${diff.pruned.length} 个实体已消失；运行 npm run quality:update 剪枝。`)
  }

  if (violations.length === 0) {
    console.log(
      `技术债检查通过：${Object.keys(current.entities).length} 个已知超标实体均未恶化。`,
    )
    return
  }

  console.error('技术债检查失败：新增或恶化的指标必须拆分或重构，不能调高基线。')
  for (const item of diff.added) {
    console.error(
      `  新增  ${item.entity}  ${item.metric}=${item.finding.value}（阈值 ${item.finding.max}）`,
    )
  }
  for (const item of diff.worsened) {
    console.error(
      `  恶化  ${item.entity}  ${item.metric} ${item.was.value} → ${item.now.value}（阈值 ${item.now.max}）`,
    )
  }
  process.exitCode = 1
}

main()
