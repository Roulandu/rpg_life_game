import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { baselinePath, loadJson } from './lib/baseline'
import { collectOxlintMetrics } from './lib/lint-report'
import { loadManifest, moduleForFile, repoRoot, toPosix } from './lib/manifest'
import { recentCommits } from './lib/git'
import type { TechDebtBaseline } from './lib/tech-debt'

function targetPath(): string {
  const inline = process.argv.find((arg) => arg.startsWith('--file='))
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  const raw = inline?.slice('--file='.length) ?? positional
  if (!raw) {
    console.error('用法：npm run quality:file -- <path>')
    process.exit(1)
  }
  return toPosix(relative(repoRoot, resolve(repoRoot, raw)))
}

function main(): void {
  const file = targetPath()
  if (!existsSync(resolve(repoRoot, file))) {
    console.error(`文件不存在：${file}`)
    process.exit(1)
  }

  const manifest = loadManifest()
  const module = moduleForFile(manifest, file)
  const definition = module ? manifest.modules[module] : undefined
  const baseline = loadJson<TechDebtBaseline>(baselinePath('tech-debt'))
  const metrics = collectOxlintMetrics().filter((finding) => finding.file === file)

  console.log(`文件：${file}`)
  console.log(`模块：${module ?? '未登记（请检查 docs/modules.yaml）'}`)
  console.log(`允许依赖：${definition?.allowedDeps.join(', ') ?? '—'}`)
  console.log(`测试影响：${definition?.testImpact ?? '—'}`)
  console.log(`相关文档：${definition?.docs.join(' | ') ?? '—'}`)
  console.log(`相关测试：${definition?.tests.join(' | ') ?? '—'}`)

  if (metrics.length === 0) {
    console.log('当前指标：未超过阈值。')
  } else {
    console.log('当前超阈值指标：')
    for (const finding of metrics) {
      console.log(`  ${finding.metric}=${finding.value}（阈值 ${finding.max}）${finding.message}`)
    }
  }

  const entity = baseline?.entities[file]
  if (entity) {
    console.log('基线冻结：')
    for (const [metric, value] of Object.entries(entity.metrics)) {
      console.log(`  ${metric}=${value.value}（阈值 ${value.max}）`)
    }
  }

  const commits = recentCommits(file, 5)
  console.log(commits.length > 0 ? '最近提交：' : '最近提交：无')
  for (const commit of commits) console.log(`  ${commit}`)

  console.log('修改前检查清单：')
  console.log('  1. 读功能文档与映射测试，确认不变量：确定性 / 存档结构 / 原子回合 / LLM 降级 / 平台边界。')
  console.log('  2. 先跑该模块最小测试集，再跑 npm run check。')
  console.log('  3. 指标只能持平或下降；新增超标必须拆分。')
  console.log('  4. bug fix 先写能复现问题的回归测试，测试名以「回归:」开头。')
  console.log('  5. 提交信息写明回归风险与对应验证命令。')
}

main()
