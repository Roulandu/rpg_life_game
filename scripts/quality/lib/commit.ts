import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot, toPosix } from './manifest'

export const COMMIT_SECTIONS = [
  '变更内容',
  '修改范围',
  '修改点',
  '验证情况',
  '回归风险与验证',
  '文档影响',
] as const

export type CommitType = 'feat' | 'fix' | 'test' | 'refactor' | 'docs' | 'chore' | 'perf'

export interface CommitValidationOptions {
  changedFiles: string[]
  verifyPaths?: boolean
  baselineChanged?: boolean
}

export interface CommitValidationResult {
  errors: string[]
  warnings: string[]
  type?: CommitType
}

const HEADER_PATTERN = /^(feat|fix|test|refactor|docs|chore|perf)(\([a-z0-9-]+\))?: .{4,72}$/
const SKIP_PATTERN = /^(Merge |Revert "|fixup! |squash! |amend! )/

function parseSections(message: string): Map<string, string> {
  const normalized = message.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const result = new Map<string, string>()
  let current: string | null = null
  let buffer: string[] = []
  const flush = () => {
    if (current) result.set(current, buffer.join('\n').trim())
  }
  for (const line of lines.slice(1)) {
    const match = line.match(/^(变更内容|修改范围|修改点|验证情况|回归风险与验证|文档影响)[:：]\s*(.*)$/)
    if (match) {
      flush()
      current = match[1] ?? null
      buffer = match[2] ? [match[2]] : []
    } else if (current) {
      buffer.push(line)
    }
  }
  flush()
  return result
}

function parseTrailers(message: string): Map<string, string> {
  const trailers = new Map<string, string>()
  for (const line of message.replace(/\r\n/g, '\n').split('\n')) {
    const match = line.match(/^([A-Z][A-Za-z-]+):\s*(.+)$/)
    if (match?.[1] && match[2]) trailers.set(match[1], match[2].trim())
  }
  return trailers
}

function scopePaths(scope: string): string[] {
  const paths: string[] = []
  for (const raw of scope.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('-')) continue
    const value = line.replace(/^-\s*/, '').replace(/`/g, '').trim()
    if (!value || value.startsWith('—') || value === '-') continue
    const path = value.split(/\s+/)[0] ?? ''
    if (path) paths.push(toPosix(path))
  }
  return paths
}

function isImportantFile(file: string): boolean {
  const normalized = toPosix(file)
  return (
    normalized.startsWith('src/') ||
    normalized.startsWith('tests/') ||
    normalized.startsWith('docs/') ||
    normalized.startsWith('quality/') ||
    normalized.startsWith('scripts/') ||
    normalized === 'package.json' ||
    normalized === 'vitest.config.ts' ||
    normalized.startsWith('.githooks/')
  )
}

export function baselineFiles(files: string[]): string[] {
  return files.filter(
    (file) =>
      /^quality\/.*baseline\.json$/.test(toPosix(file)) || toPosix(file) === 'docs/modules.yaml',
  )
}

export function validateCommitMessage(
  message: string,
  options: CommitValidationOptions,
): CommitValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const normalized = message.replace(/\r\n/g, '\n').trim()
  const subject = normalized.split('\n')[0] ?? ''
  if (SKIP_PATTERN.test(subject)) return { errors, warnings }

  const header = subject.match(HEADER_PATTERN)
  if (!header) {
    errors.push(
      '标题必须匹配 `type(scope): 中文摘要`，type 为 feat|fix|test|refactor|docs|chore|perf，摘要 4-72 字符。',
    )
  }
  const type = (header?.[1] as CommitType | undefined) ?? undefined

  const sections = parseSections(normalized)
  for (const name of COMMIT_SECTIONS) {
    if (!sections.get(name)?.trim()) errors.push(`缺少段落或内容为空：${name}`)
  }

  const changed = [...new Set(options.changedFiles.map(toPosix))]
  const scope = sections.get('修改范围') ?? ''
  const listed = [...new Set(scopePaths(scope))]

  if (listed.length === 0) {
    errors.push('修改范围必须至少列出一个受控路径。')
  }
  if (options.verifyPaths !== false) {
    for (const path of listed) {
      // 已暂存的删除/重命名旧路径不在磁盘上，但仍属于本次改动的合法描述对象
      if (!existsSync(resolve(repoRoot, path)) && !changed.includes(path)) {
        errors.push(`修改范围中的路径不存在：${path}`)
      }
    }
  }
  const important = changed.filter(isImportantFile)
  for (const file of important) {
    if (!listed.includes(file)) errors.push(`修改范围未覆盖实际改动文件：${file}`)
  }

  const verification = sections.get('验证情况') ?? ''
  const redLine = verification.split('\n').find((line) => /^\s*[-*]?\s*RED[:：]/.test(line))
  const greenLine = verification.split('\n').find((line) => /^\s*[-*]?\s*GREEN[:：]/.test(line))

  if (type === 'feat' || type === 'fix') {
    if (!redLine) {
      errors.push('feat/fix 提交的验证情况必须包含 RED: 失败测试证据。')
    } else {
      if (!redLine.includes('tests/')) errors.push('RED 必须包含具体测试文件路径（tests/...）。')
      const detail = redLine.replace(/^.*?RED[:：]\s*/, '').trim()
      if (detail.length < 20) errors.push('RED 必须写清失败信息（至少 20 字符）。')
      if (!/失败|expected|Error|FAIL|Received|AssertionError/i.test(detail)) {
        errors.push('RED 必须包含真实的失败信息。')
      }
    }
    if (!greenLine) {
      errors.push('feat/fix 提交的验证情况必须包含 GREEN: 通过证据。')
    } else if (!/npm|npx|pnpm|vitest|tsx|通过|passed/i.test(greenLine)) {
      errors.push('GREEN 必须写明执行的命令与结果。')
    }
    if (!important.some((file) => file.startsWith('tests/'))) {
      errors.push('feat/fix 提交必须包含测试文件改动；没有测试变化的改动不能证明 TDD。')
    }
  }

  if (type === 'refactor' || type === 'perf') {
    if (!greenLine) errors.push('refactor/perf 提交必须包含 GREEN: 通过证据。')
  }

  const trailers = parseTrailers(normalized)
  const docsImpact = trailers.get('Docs-Impact') ?? ''
  if (!docsImpact) {
    errors.push('缺少 Docs-Impact 标记：updated 或 none: <理由>。')
  } else if (docsImpact.startsWith('none:')) {
    if (docsImpact.replace('none:', '').trim().length < 4) {
      errors.push('Docs-Impact: none 必须写明理由。')
    }
  } else if (docsImpact !== 'updated') {
    errors.push('Docs-Impact 只能是 updated 或 none: <理由>。')
  } else if (!important.some((file) => file.startsWith('docs/'))) {
    errors.push('Docs-Impact: updated 但修改范围中没有 docs/ 文件。')
  }

  const testImpact = trailers.get('Test-Impact') ?? ''
  if (!testImpact) {
    errors.push('缺少 Test-Impact 标记：updated / none: <理由> / removed: <理由>。')
  } else if (/^(none|removed):/.test(testImpact)) {
    if (testImpact.replace(/^(none|removed):/, '').trim().length < 4) {
      errors.push('Test-Impact 的 none/removed 必须写明理由。')
    }
  } else if (testImpact !== 'updated') {
    errors.push('Test-Impact 只能是 updated / none: <理由> / removed: <理由>。')
  } else if (!important.some((file) => file.startsWith('tests/'))) {
    errors.push('Test-Impact: updated 但修改范围中没有测试文件。')
  }

  if (options.baselineChanged && !trailers.get('Baseline-Update')) {
    errors.push('修改了质量基线或 docs/modules.yaml 时必须提供 Baseline-Update: <说明>。')
  }

  if (normalized.split('\n').length > 120) warnings.push('提交信息较长，确认没有粘贴无关日志。')

  return { errors, warnings, type }
}
