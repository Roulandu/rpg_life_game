import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { changedFiles, commitsSince, resolveBase } from './lib/git'
import { hasMermaid, parseFrontmatter, relativeLinks, resolveLink, sections, stringList } from './lib/markdown'
import { loadManifest, repoRoot, toPosix } from './lib/manifest'

const REQUIRED_SECTIONS = [
  '业务目标',
  '用户流程',
  '关键时序',
  '规则与边界',
  '数据与接口',
  '失败与降级',
  '平台差异',
  '验收与测试映射',
  '变更记录',
]

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function walkMarkdown(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkMarkdown(full))
    else if (entry.name.endsWith('.md')) files.push(full)
  }
  return files
}

function checkGenerated(problems: string[]): void {
  try {
    execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/quality/generate-module-docs.ts', '--check'],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string }
    problems.push(
      `docs/architecture/modules.md 与 docs/modules.yaml 不一致：${(failure.stdout ?? failure.stderr ?? '').trim()}`,
    )
  }
}

function main(): void {
  const problems: string[] = []
  const manifest = loadManifest()
  const docsFiles = walkMarkdown(resolve(repoRoot, 'docs')).map((file) =>
    toPosix(file).slice(repoRoot.length + 1),
  )

  for (const [name, module] of Object.entries(manifest.modules)) {
    if (module.docs.length === 0) problems.push(`模块 ${name} 没有关联文档`)
    for (const doc of module.docs) {
      if (!existsSync(resolve(repoRoot, doc))) problems.push(`模块 ${name} 的文档不存在：${doc}`)
    }
  }

  for (const doc of docsFiles) {
    const absolute = resolve(repoRoot, doc)
    const text = readFileSync(absolute, 'utf8')
    const { data, body } = parseFrontmatter(text)
    const headings = sections(body)

    for (const link of relativeLinks(body)) {
      if (!existsSync(resolveLink(absolute, link))) {
        problems.push(`无法解析链接：${doc} → ${link}`)
      }
    }

    if (typeof data.feature === 'string') {
      for (const section of REQUIRED_SECTIONS) {
        if (!headings.has(section)) problems.push(`${doc} 缺少章节：${section}`)
      }
      if (!hasMermaid(body, 'sequenceDiagram')) {
        problems.push(`${doc} 缺少 mermaid sequenceDiagram 时序图`)
      }
      const code = stringList(data.code)
      const tests = stringList(data.tests)
      if (data.status !== 'planned') {
        for (const path of [...code, ...tests]) {
          if (path.startsWith('planned:')) continue
          if (!existsSync(resolve(repoRoot, path))) problems.push(`${doc} 引用的路径不存在：${path}`)
        }
      }
      const reviewed = typeof data.last_reviewed === 'string' ? Date.parse(data.last_reviewed) : NaN
      if (Number.isFinite(reviewed)) {
        const days = (Date.now() - reviewed) / (1000 * 60 * 60 * 24)
        if (days > 180) {
          console.log(`文档超过 180 天未复核：${doc}（last_reviewed: ${data.last_reviewed}）`)
        }
      }
    }

    if (doc.endsWith('architecture/overview.md') && !hasMermaid(body, 'flowchart')) {
      problems.push(`${doc} 缺少 mermaid flowchart 架构图`)
    }
  }

  checkGenerated(problems)

  const base = resolveBase(argValue('base'))
  const changed = changedFiles(base).filter((file) => existsSync(resolve(repoRoot, file)))
  const changedSource = changed.filter((file) => file.startsWith('src/'))
  if (changedSource.length > 0) {
    const changedDocs = new Set(
      changed.filter(
        (file) => file.startsWith('docs/') && !file.endsWith('architecture/modules.md'),
      ),
    )
    const modules = new Set<string>()
    for (const file of changedSource) {
      for (const [name, module] of Object.entries(manifest.modules)) {
        if (file.startsWith(`${module.path}/`)) modules.add(name)
      }
    }
    const waivers = commitsSince(base)
      .map((commit) => commit.message.match(/^Docs-Impact:\s*none:\s*(.+)$/m)?.[1]?.trim())
      .filter((reason): reason is string => Boolean(reason && reason.length >= 4))

    for (const module of modules) {
      const definition = manifest.modules[module]
      if (!definition) continue
      const hasDocChange = definition.docs.some((doc) => changedDocs.has(doc))
      if (!hasDocChange) {
        if (waivers.length > 0) {
          console.log(`模块 ${module} 未同步文档，使用 Docs-Impact 豁免：${waivers.join('；')}`)
        } else {
          problems.push(
            `模块 ${module} 的代码已改动，但同一次变更没有更新其文档：${definition.docs.join(' 或 ')}`,
          )
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error('文档同步检查失败：')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }
  console.log(`文档同步检查通过：${docsFiles.length} 份文档，结构与代码映射一致。`)
}

void main()
