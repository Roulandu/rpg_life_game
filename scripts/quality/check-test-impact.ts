import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { changedFiles, commitsSince, resolveBase } from './lib/git'
import { importsOfFile, resolveSpecifier } from './lib/imports'
import {
  isSourceFile,
  isTestFile,
  loadManifest,
  matchesAnyGlob,
  moduleForFile,
  repoRoot,
  toPosix,
} from './lib/manifest'

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<void> {
  const base = resolveBase(argValue('base'))
  const manifest = loadManifest()
  const changed = changedFiles(base).filter((file) => existsSync(resolve(repoRoot, file)))
  const sourceFiles = changed.filter(isSourceFile)
  const testFiles = changed.filter(isTestFile)

  if (sourceFiles.length === 0) {
    console.log('测试影响检查通过：本次改动没有触及 src/。')
    return
  }

  const waivers = commitsSince(base)
    .map((commit) => commit.message.match(/^Test-Impact:\s*none:\s*(.+)$/m)?.[1]?.trim())
    .filter((reason): reason is string => Boolean(reason && reason.length >= 4))

  const affected = new Map<string, string[]>()
  for (const file of sourceFiles) {
    const module = moduleForFile(manifest, file)
    if (!module) continue
    const list = affected.get(module) ?? []
    list.push(file)
    affected.set(module, list)
  }

  const problems: string[] = []
  for (const [module, files] of affected) {
    const definition = manifest.modules[module]
    if (!definition) continue
    if (definition.testImpact === 'exempt') continue
    if (definition.tests.length === 0) {
      problems.push(`模块 ${module} 没有配置测试，但改了 ${files.join(', ')}`)
      continue
    }
    const relatedTests = testFiles.filter((file) => matchesAnyGlob(file, definition.tests))
    if (relatedTests.length === 0) {
      problems.push(
        `模块 ${module} 改动缺少测试变化：需要修改 ${definition.tests.join(' 或 ')} 中的至少一个文件`,
      )
      continue
    }
    if (definition.testImpact !== 'strict') continue

    const changedAbsolute = new Set(files.map((file) => resolve(repoRoot, file)))
    let importsChanged = false
    for (const test of relatedTests) {
      for (const specifier of await importsOfFile(resolve(repoRoot, test))) {
        const target = resolveSpecifier(resolve(repoRoot, test), specifier)
        if (target && changedAbsolute.has(target)) {
          importsChanged = true
          break
        }
      }
      if (importsChanged) break
    }
    if (!importsChanged) {
      problems.push(
        `模块 ${module} 的测试没有 import 本次改动的实现文件：${files.map(toPosix).join(', ')}`,
      )
    }
  }

  if (problems.length > 0) {
    if (waivers.length > 0) {
      console.log(`检测到 Test-Impact 豁免：${waivers.join('；')}`)
      console.log('测试影响检查未通过，但因提交声明豁免而放行（CI 会保留此记录）：')
      for (const problem of problems) console.log(`  ${problem}`)
      return
    }
    console.error('测试影响检查失败：改动源码必须同时更新对应测试。')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }

  console.log(`测试影响检查通过：${sourceFiles.length} 个源码文件对应 ${testFiles.length} 个测试文件。`)
}

void main()
