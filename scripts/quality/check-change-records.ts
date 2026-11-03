import { loadGovernance, validateChangeRecords } from './lib/governance'
import { repoRoot } from './lib/manifest'

function main(): void {
  let config
  try {
    config = loadGovernance()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  const { changeRecords, verificationRecords, problems } = validateChangeRecords(repoRoot, config)
  if (problems.length > 0) {
    console.error('变更记录检查失败：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }

  console.log(
    `变更记录检查通过：${changeRecords.length} 份 CHG，${verificationRecords.length} 份 VER。`,
  )
}

main()
