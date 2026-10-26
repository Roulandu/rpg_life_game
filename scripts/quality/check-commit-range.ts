import { baselineFiles, validateCommitMessage } from './lib/commit'
import { commitsSince, resolveBase } from './lib/git'

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function main(): void {
  const base = resolveBase(argValue('base'))
  const commits = commitsSince(base)
  if (commits.length === 0) {
    console.log(`提交范围检查通过：${base}..HEAD 没有提交。`)
    return
  }

  const problems: string[] = []
  for (const commit of commits) {
    const result = validateCommitMessage(commit.message, {
      changedFiles: commit.files,
      verifyPaths: false,
      baselineChanged: baselineFiles(commit.files).length > 0,
    })
    for (const error of result.errors) {
      problems.push(`${commit.sha.slice(0, 7)} ${commit.subject}：${error}`)
    }
  }

  if (problems.length > 0) {
    console.error(`提交范围检查失败（${base}..HEAD）：`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`提交范围检查通过：${commits.length} 个提交符合规范。`)
}

main()
