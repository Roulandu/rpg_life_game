import { collectBoundaries } from './lib/boundaries'

async function main(): Promise<void> {
  const report = await collectBoundaries()
  const problems: string[] = []

  for (const violation of report.violations) {
    problems.push(`新增跨模块依赖：${violation.file}（${violation.from} → ${violation.to}）`)
  }
  for (const item of report.deepImports) {
    problems.push(`跨模块深引：${item.file} → ${item.target}（应使用 ${item.entry}）`)
  }
  for (const item of report.selfBarrels) {
    problems.push(`模块内文件自引公共入口：${item.file}（${item.module}）`)
  }
  for (const cycle of report.cycles) {
    problems.push(`新增模块循环依赖：${cycle.modules.join(' ↔ ')}`)
  }
  for (const finding of report.platform) {
    problems.push(
      `平台 API 绕过 src/platform：${finding.file}:${finding.line}（${finding.pattern}）`,
    )
  }

  for (const resolved of report.resolvedKnown) {
    console.log(`已知违规已消除：${resolved.file} → ${resolved.to}；请从 docs/modules.yaml 移除。`)
  }
  for (const finding of report.resolvedPlatform) {
    console.log(
      `已知平台违规仍存在：${finding.file}:${finding.line}（${finding.pattern}），后续触碰时迁移到端口。`,
    )
  }

  if (problems.length > 0) {
    console.error('模块边界检查失败：')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }

  console.log(
    `模块边界检查通过：${report.edges.length} 条跨模块依赖，均为允许依赖或已登记违规。`,
  )
}

void main()
