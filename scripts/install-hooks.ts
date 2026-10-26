import { execFileSync } from 'node:child_process'
import { chmodSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot } from './quality/lib/manifest'

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  stdio: 'inherit',
})

for (const hook of ['commit-msg', 'pre-commit']) {
  try {
    chmodSync(resolve(repoRoot, '.githooks', hook), 0o755)
  } catch {
    // Windows 不支持 POSIX 权限；Git 仍会执行 hooks。
  }
}

console.log('Git hooks 已启用：.githooks/commit-msg、.githooks/pre-commit')
