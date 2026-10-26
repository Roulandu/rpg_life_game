import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { baselineFiles, validateCommitMessage } from './lib/commit'
import { stagedFiles } from './lib/git'
import { repoRoot } from './lib/manifest'

function messagePath(): string {
  const inline = process.argv.find((arg) => arg.startsWith('--message-file='))
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  const raw = inline?.slice('--message-file='.length) ?? positional
  if (!raw) {
    console.error('用法：npm run quality:commit-msg -- <message-file>')
    process.exit(1)
  }
  return resolve(repoRoot, raw)
}

function main(): void {
  const path = messagePath()
  const message = readFileSync(path, 'utf8')
  const files = stagedFiles()
  const result = validateCommitMessage(message, {
    changedFiles: files,
    verifyPaths: true,
    baselineChanged: baselineFiles(files).length > 0,
  })

  for (const warning of result.warnings) console.warn(`警告：${warning}`)
  if (result.errors.length > 0) {
    console.error('提交信息不符合规范：')
    for (const error of result.errors) console.error(`  - ${error}`)
    console.error('规范见 docs/process/commit.md。')
    process.exitCode = 1
    return
  }
  console.log(`提交信息检查通过：${result.type ?? 'merge/revert'}，${files.length} 个暂存文件。`)
}

main()
