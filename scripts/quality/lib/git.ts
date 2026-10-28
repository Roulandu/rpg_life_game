import { execFileSync } from 'node:child_process'

export interface CommitInfo {
  sha: string
  subject: string
  message: string
  files: string[]
}

function run(args: string[], allowFailure: boolean): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    if (allowFailure) return ''
    throw error
  }
}

export function git(args: string[], allowFailure = false): string {
  return run(args, allowFailure)
}

export function hasRef(ref: string): boolean {
  return git(['rev-parse', '--verify', ref], true) !== ''
}

export function resolveBase(explicit?: string): string {
  if (explicit) return explicit
  if (process.env.QUALITY_BASE) return process.env.QUALITY_BASE
  return hasRef('origin/main') ? 'origin/main' : 'HEAD'
}

export function mergeBase(base: string): string {
  const resolved = git(['merge-base', base, 'HEAD'], true)
  return resolved || base
}

export function diffNames(from: string, to: string): string[] {
  const out = git(['diff', '--name-only', from, to], true)
  return out ? out.split('\n').map((line) => line.trim()).filter(Boolean) : []
}

export function stagedFiles(): string[] {
  const out = git(['diff', '--name-only', '--cached', 'HEAD'], true)
  return out ? out.split('\n').map((line) => line.trim()).filter(Boolean) : []
}

export function workingFiles(): string[] {
  const files = new Set<string>()
  for (const line of git(['diff', '--name-only'], true).split('\n')) {
    if (line.trim()) files.add(line.trim())
  }
  for (const line of git(['diff', '--name-only', '--cached'], true).split('\n')) {
    if (line.trim()) files.add(line.trim())
  }
  for (const line of git(['ls-files', '--others', '--exclude-standard'], true).split('\n')) {
    if (line.trim()) files.add(line.trim())
  }
  return [...files].sort()
}

export function changedFiles(base: string): string[] {
  const from = mergeBase(base)
  const files = new Set<string>(diffNames(from, 'HEAD'))
  for (const file of workingFiles()) files.add(file)
  return [...files].sort()
}

export function commitsSince(base: string): CommitInfo[] {
  const from = mergeBase(base)
  const shas = git(['rev-list', '--reverse', `${from}..HEAD`], true)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return shas.map((sha) => {
    const message = git(['show', '-s', '--format=%B', sha], true)
    // -M 检测重命名、--diff-filter=ACMR 排除删除路径，使本函数与 commit-msg 钩子
    // 使用的 rename-aware 暂存 diff 一致：被删除/重命名掉的旧路径无法写进“修改范围”
    // （钩子的存在性校验会拒绝不存在的路径），因此不应要求覆盖它们。
    const files = git(
      ['diff-tree', '--no-commit-id', '--name-only', '-r', '-M', '--diff-filter=ACMR', sha],
      true,
    )
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    return { sha, subject: message.split('\n')[0] ?? '', message, files }
  })
}

export function recentCommits(file: string, count = 5): string[] {
  const out = git(['log', `-${count}`, '--format=%h %s', '--', file], true)
  return out ? out.split('\n').filter(Boolean) : []
}

export function showAt(ref: string, file: string): string | null {
  const out = git(['show', `${ref}:${file}`], true)
  return out === '' ? null : out
}
