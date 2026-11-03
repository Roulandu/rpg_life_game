import { execFileSync } from 'node:child_process'
import { existsSync, chmodSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot } from './quality/lib/manifest'

const checkOnly = process.argv.includes('--check')
const hooks = ['commit-msg', 'pre-commit']

function configuredPath(): string {
  try {
    return execFileSync('git', ['config', '--get', 'core.hooksPath'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

if (checkOnly) {
  const current = configuredPath()
  const problems: string[] = []
  if (current !== '.githooks') problems.push(`core.hooksPath=${current || '（未设置）'}，期望 .githooks`)
  for (const hook of hooks) {
    if (!existsSync(resolve(repoRoot, '.githooks', hook))) problems.push(`缺少 hook：.githooks/${hook}`)
  }
  if (problems.length > 0) {
    console.error('Git hooks 未就绪：')
    for (const problem of problems) console.error(`  - ${problem}`)
    console.error('运行 `npm run hooks:install` 修复。')
    process.exitCode = 1
  } else {
    console.log('Git hooks 已就绪：.githooks/commit-msg、.githooks/pre-commit')
  }
} else {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  for (const hook of hooks) {
    try {
      chmodSync(resolve(repoRoot, '.githooks', hook), 0o755)
    } catch {
      // Windows 不支持 POSIX 权限；Git 仍会执行 hooks。
    }
  }

  console.log('Git hooks 已启用：.githooks/commit-msg、.githooks/pre-commit')
}
