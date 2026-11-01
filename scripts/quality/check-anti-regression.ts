import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { changedFiles, commitsSince, mergeBase, resolveBase, showAt } from './lib/git'
import { repoRoot } from './lib/manifest'
import { scanSecrets } from './lib/secrets'
import { countTests, hasAddedTestCases, isTestSourceFile, scanTestDirectives } from './lib/test-scan'
import {
  ENGINE_VERSION_SOURCES,
  readEngineVersion,
  readSaveVersion,
  saveVersionProblems,
  type FileRead,
} from './lib/version-sources'

const SAVE_SCHEMA = 'src/domain/schema/save.schema.ts'
const GOLDEN_FIXTURE = 'quality/golden/season-seed-42.json'

function worktreeRead(): FileRead {
  return (file) => {
    const path = resolve(repoRoot, file)
    return existsSync(path) ? readFileSync(path, 'utf8') : null
  }
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function walkTests(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkTests(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

function main(): void {
  const base = resolveBase(argValue('base'))
  const baseCommit = mergeBase(base)
  const changed = changedFiles(base)
  const commits = commitsSince(base)
  const messages = commits.map((commit) => commit.message).join('\n')
  const problems: string[] = []

  if (changed.includes(SAVE_SCHEMA)) {
    if (!existsSync(resolve(repoRoot, SAVE_SCHEMA))) {
      problems.push('存档结构文件被删除；如确需删除必须提供迁移方案与基线说明。')
    } else {
      const before = readSaveVersion((file) => showAt(baseCommit, file))
      problems.push(...saveVersionProblems(before, readSaveVersion(worktreeRead())))
    }
    if (!changed.some((file) => file.startsWith('tests/'))) {
      problems.push('存档结构变化必须同时更新测试（旧版本 fixture + 导出/导入往返）。')
    }
  }

  if (changed.includes(GOLDEN_FIXTURE)) {
    const before = showAt(baseCommit, GOLDEN_FIXTURE)
    const afterPath = resolve(repoRoot, GOLDEN_FIXTURE)
    if (before && existsSync(afterPath)) {
      const beforeHash = (JSON.parse(before) as { hash?: string }).hash
      const afterHash = (JSON.parse(readFileSync(afterPath, 'utf8')) as { hash?: string }).hash
      if (beforeHash !== afterHash) {
        const beforeVersion = readEngineVersion((file) => showAt(baseCommit, file))
        const afterVersion = readEngineVersion(worktreeRead())
        const engineTouched = ENGINE_VERSION_SOURCES.some((file) => changed.includes(file))
        if (!engineTouched || beforeVersion === afterVersion) {
          problems.push(
            `golden 哈希已变化，但 ENGINE_VERSION 未升级（${afterVersion ?? '未知'}）；引擎输出变化必须升版本并说明。`,
          )
        }
      }
    }
  }

  const removalWaived = /^Test-Impact:\s*(?:removed|none):\s*\S{4,}/m.test(messages)
  const featOrFix = commits.some((commit) => /^(feat|fix)(\(|:)/.test(commit.subject))
  if (featOrFix) {
    const testSources = changed.filter(isTestSourceFile).flatMap((file) => {
      const afterPath = resolve(repoRoot, file)
      if (!existsSync(afterPath)) return []
      return [{ file, before: showAt(baseCommit, file), after: readFileSync(afterPath, 'utf8') }]
    })
    if (!hasAddedTestCases(testSources)) {
      problems.push('feat/fix 提交必须新增测试用例，不能只改实现或只改已有断言。')
    }
  }

  for (const file of changed.filter(isTestSourceFile)) {
    const before = showAt(baseCommit, file)
    const afterPath = resolve(repoRoot, file)
    if (!before || !existsSync(afterPath)) continue
    const beforeCount = countTests(before)
    const afterCount = countTests(readFileSync(afterPath, 'utf8'))
    if (afterCount < beforeCount && !removalWaived) {
      problems.push(
        `测试用例数下降：${file} ${beforeCount} → ${afterCount}；需 Test-Impact: removed: <理由>。`,
      )
    }
  }

  problems.push(...scanTestDirectives(walkTests(resolve(repoRoot, 'tests'))))
  problems.push(...scanSecrets(changed))

  if (problems.length > 0) {
    console.error('防回归检查失败：')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }
  console.log('防回归检查通过：存档版本、测试数量、skip/only、密钥扫描均正常。')
}

main()
