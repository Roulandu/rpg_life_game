import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { changedFiles, commitsSince, mergeBase, resolveBase, showAt } from './lib/git'
import { repoRoot } from './lib/manifest'
import { scanSecrets } from './lib/secrets'
import { countTests, scanTestDirectives } from './lib/test-scan'

const SAVE_SCHEMA = 'src/domain/schema/save.schema.ts'
const VERSION_PATTERN = /CURRENT_SAVE_VERSION\s*=\s*(\d+)/
const GOLDEN_FIXTURE = 'quality/golden/season-seed-42.json'
const GENERATOR = 'src/world/generator.ts'
const CONSTANTS = 'src/world/constants.ts'
const ENGINE_SOURCES = [GENERATOR, CONSTANTS]
const ENGINE_VERSION_PATTERN = /ENGINE_VERSION\s*=\s*['"]([^'"]+)['"]/

function engineVersion(read: (file: string) => string | null | undefined): string | undefined {
  for (const file of ENGINE_SOURCES) {
    const version = read(file)?.match(ENGINE_VERSION_PATTERN)?.[1]
    if (version) return version
  }
  return undefined
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
    const before = showAt(baseCommit, SAVE_SCHEMA)
    const afterPath = resolve(repoRoot, SAVE_SCHEMA)
    if (before && existsSync(afterPath)) {
      const beforeVersion = Number(before.match(VERSION_PATTERN)?.[1] ?? 0)
      const afterVersion = Number(readFileSync(afterPath, 'utf8').match(VERSION_PATTERN)?.[1] ?? 0)
      if (beforeVersion === afterVersion) {
        problems.push(
          `存档结构文件已修改，但 CURRENT_SAVE_VERSION 未变化（仍为 ${afterVersion}）；必须升版本并提供迁移。`,
        )
      }
    } else if (!existsSync(afterPath)) {
      problems.push('存档结构文件被删除；如确需删除必须提供迁移方案与基线说明。')
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
        const beforeVersion = engineVersion((file) => showAt(baseCommit, file))
        const afterVersion = engineVersion((file) => {
          const path = resolve(repoRoot, file)
          return existsSync(path) ? readFileSync(path, 'utf8') : undefined
        })
        const engineTouched = ENGINE_SOURCES.some((file) => changed.includes(file))
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
    const added = changed.some((file) => {
      if (!file.startsWith('tests/') || !file.endsWith('.ts')) return false
      const afterPath = resolve(repoRoot, file)
      if (!existsSync(afterPath)) return false
      const before = showAt(baseCommit, file)
      const after = countTests(readFileSync(afterPath, 'utf8'))
      return before ? after > countTests(before) : after > 0
    })
    if (!added) {
      problems.push('feat/fix 提交必须新增测试用例，不能只改实现或只改已有断言。')
    }
  }

  for (const file of changed.filter((item) => item.startsWith('tests/') && item.endsWith('.ts'))) {
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
