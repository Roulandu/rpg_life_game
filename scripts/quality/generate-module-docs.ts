import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

interface KnownViolation {
  from: string
  to: string
  reason: string
}

interface ModuleEntry {
  path: string
  publicEntry: string | null
  allowedDeps: string[]
  tests?: string[]
  docs?: string[]
  testImpact: string
  platformCapabilities?: string[]
  knownViolations?: KnownViolation[]
  knownCycles?: string[][]
}

interface PlatformViolation {
  file: string
  pattern: string
  reason: string
}

interface Manifest {
  version: number
  rootModule?: string
  rootFiles?: string[]
  knownPlatformViolations?: PlatformViolation[]
  modules: Record<string, ModuleEntry>
}

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const manifestPath = resolve(root, 'docs/modules.yaml')
const outputPath = resolve(root, 'docs/architecture/modules.md')
const checkOnly = process.argv.includes('--check')

function fail(message: string): never {
  console.error(`generate-module-docs: ${message}`)
  process.exit(1)
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function codeList(values: string[] | undefined): string {
  if (!values || values.length === 0) return '—'
  return values.map((value) => `\`${cell(value)}\``).join('<br>')
}

function plainList(values: string[] | undefined): string {
  if (!values || values.length === 0) return '—'
  return values.map((value) => cell(value)).join(', ')
}

function render(manifest: Manifest): string {
  const names = Object.keys(manifest.modules).sort()
  const lines: string[] = [
    '# 模块索引（生成文件）',
    '',
    '> 本文件由 `scripts/quality/generate-module-docs.ts` 从 `docs/modules.yaml` 生成。',
    '> 不要手改；运行 `npm run docs:build` 重新生成。',
    '',
    `清单版本：\`${manifest.version}\``,
    '',
    '## 模块清单',
    '',
    '| 模块 | 路径 | 公共入口 | 允许依赖 | 测试影响 | 平台能力 | 测试 | 文档 |',
    '|---|---|---|---|---|---|---|---|',
  ]

  for (const name of names) {
    const module = manifest.modules[name]
    lines.push(
      `| \`${name}\` | \`${cell(module.path)}\` | ${
        module.publicEntry ? `\`${cell(module.publicEntry)}\`` : '—'
      } | ${plainList(module.allowedDeps)} | \`${cell(module.testImpact)}\` | ${plainList(
        module.platformCapabilities,
      )} | ${codeList(module.tests)} | ${codeList(module.docs)} |`,
    )
  }

  lines.push('', '## 允许依赖矩阵', '', '✓ 允许，· 不允许，— 自身。', '')
  lines.push(`| from \\ to | ${names.map((name) => `\`${name}\``).join(' | ')} |`)
  lines.push(`|---|${names.map(() => '---').join('|')}|`)
  for (const name of names) {
    const allowed = new Set(manifest.modules[name].allowedDeps)
    const cells = names.map((target) =>
      target === name ? '—' : allowed.has(target) ? '✓' : '·',
    )
    lines.push(`| \`${name}\` | ${cells.join(' | ')} |`)
  }

  const violations: Array<{ module: string } & KnownViolation> = []
  for (const name of names) {
    for (const violation of manifest.modules[name].knownViolations ?? []) {
      violations.push({ module: name, ...violation })
    }
  }
  violations.sort(
    (a, b) =>
      a.module.localeCompare(b.module) ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  )

  lines.push('', '## 已知违规', '')
  if (violations.length === 0) {
    lines.push('无。')
  } else {
    lines.push('| 模块 | 文件 | 指向 | 原因 |', '|---|---|---|---|')
    for (const violation of violations) {
      lines.push(
        `| \`${violation.module}\` | \`${cell(violation.from)}\` | \`${cell(
          violation.to,
        )}\` | ${cell(violation.reason)} |`,
      )
    }
  }

  const cycles = new Set<string>()
  for (const name of names) {
    for (const cycle of manifest.modules[name].knownCycles ?? []) {
      cycles.add([...cycle].sort().join(' ↔ '))
    }
  }

  lines.push('', '## 已知循环', '')
  if (cycles.size === 0) {
    lines.push('无。')
  } else {
    for (const cycle of [...cycles].sort()) lines.push(`- ${cycle}`)
  }

  const platformViolations = [...(manifest.knownPlatformViolations ?? [])].sort(
    (a, b) => a.file.localeCompare(b.file) || a.pattern.localeCompare(b.pattern),
  )

  lines.push('', '## 已知平台违规', '')
  if (platformViolations.length === 0) {
    lines.push('无。')
  } else {
    lines.push('| 文件 | 模式 | 原因 |', '|---|---|---|')
    for (const violation of platformViolations) {
      lines.push(
        `| \`${cell(violation.file)}\` | \`${cell(violation.pattern)}\` | ${cell(
          violation.reason,
        )} |`,
      )
    }
  }

  lines.push('', '## 组合根文件', '')
  if (!manifest.rootFiles || manifest.rootFiles.length === 0) {
    lines.push('无。')
  } else {
    lines.push('| 文件 | 归属模块 |', '|---|---|')
    for (const file of manifest.rootFiles) {
      lines.push(`| \`${cell(file)}\` | \`${manifest.rootModule ?? 'app'}\` |`)
    }
  }

  return `${lines.join('\n')}\n`
}

if (!existsSync(manifestPath)) fail(`找不到 ${manifestPath}`)

let manifest: Manifest
try {
  manifest = parse(readFileSync(manifestPath, 'utf8')) as Manifest
} catch (error) {
  fail(`解析 modules.yaml 失败：${error instanceof Error ? error.message : String(error)}`)
}

if (!manifest || typeof manifest !== 'object' || !manifest.modules) {
  fail('modules.yaml 缺少 modules')
}

const content = render(manifest)

if (checkOnly) {
  if (!existsSync(outputPath)) fail(`缺少生成文件 ${outputPath}`)
  const current = readFileSync(outputPath, 'utf8')
  if (current !== content) {
    fail('docs/architecture/modules.md 与 modules.yaml 不一致，请运行 npm run docs:build')
  }
  console.log('模块索引已是最新。')
} else {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, content, 'utf8')
  console.log(`已生成 ${outputPath}`)
}
