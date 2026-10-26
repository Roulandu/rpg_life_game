import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { stagedFiles } from './lib/git'
import { repoRoot } from './lib/manifest'
import { scanSecrets } from './lib/secrets'
import { scanTestDirectives } from './lib/test-scan'

function runScript(script: string): boolean {
  try {
    execFileSync(process.execPath, ['--import', 'tsx', `scripts/quality/${script}`], {
      cwd: repoRoot,
      stdio: 'inherit',
    })
    return true
  } catch {
    return false
  }
}

function main(): void {
  const staged = stagedFiles()
  if (staged.length === 0) {
    console.log('暂存区为空，跳过快速检查。')
    return
  }

  const problems = [
    ...scanSecrets(staged),
    ...scanTestDirectives(
      staged.filter((file) => file.startsWith('tests/')).map((file) => resolve(repoRoot, file)),
    ),
  ]

  const codeFiles = staged.filter((file) => /^src\/.*\.(ts|tsx)$/.test(file) || /^tests\/.*\.(ts|tsx)$/.test(file))
  if (codeFiles.length > 0) {
    try {
      execFileSync(
        process.execPath,
        [resolve(repoRoot, 'node_modules/oxlint/bin/oxlint'), ...codeFiles],
        { cwd: repoRoot, stdio: 'inherit' },
      )
    } catch {
      problems.push('暂存文件未通过 oxlint。')
    }
  }

  let checksOk = true
  if (staged.some((file) => file.startsWith('src/') || file.startsWith('tests/'))) {
    checksOk = runScript('check-tech-debt.ts') && checksOk
    checksOk = runScript('check-boundaries.ts') && checksOk
    checksOk = runScript('check-duplication.ts') && checksOk
  }

  if (problems.length > 0 || !checksOk) {
    console.error('快速检查失败，提交已阻止：')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`快速检查通过：${staged.length} 个暂存文件。`)
}

main()
