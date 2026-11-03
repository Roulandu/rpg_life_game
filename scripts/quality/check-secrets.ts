import { execFileSync } from 'node:child_process'
import { isExcludedSecretFile, scanSecrets } from './lib/secrets'
import { repoRoot, toPosix } from './lib/manifest'

function trackedFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return output
    .split('\u0000')
    .filter(Boolean)
    .map(toPosix)
}

function main(): void {
  const files = trackedFiles().filter((file) => !isExcludedSecretFile(file))
  const problems = scanSecrets(files)
  if (problems.length > 0) {
    console.error('全仓密钥扫描失败：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`全仓密钥扫描通过：${files.length} 个受版本控制文件。`)
}

main()
