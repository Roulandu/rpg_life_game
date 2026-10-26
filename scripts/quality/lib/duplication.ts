import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot, toPosix } from './manifest'

export interface DuplicationBaseline {
  version: number
  total: {
    lines: number
    duplicatedLines: number
    percentage: number
  }
  files: Record<string, number>
}

interface JscpdDuplicate {
  lines: number
  firstFile: { name: string }
  secondFile: { name: string }
}

interface JscpdReport {
  statistics?: {
    total?: {
      lines?: number
      duplicatedLines?: number
      percentage?: number
    }
  }
  duplicates?: JscpdDuplicate[]
}

const reportDir = resolve(repoRoot, 'quality/.cache/jscpd')
const reportPath = resolve(reportDir, 'jscpd-report.json')

export function collectDuplication(): DuplicationBaseline {
  rmSync(reportDir, { recursive: true, force: true })
  execFileSync(
    process.execPath,
    [
      resolve(repoRoot, 'node_modules/jscpd/bin/jscpd'),
      'src',
      'tests',
      '--config',
      'quality/jscpd.json',
    ],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (!existsSync(reportPath)) {
    throw new Error('jscpd 未生成 quality/.cache/jscpd/jscpd-report.json，拒绝静默通过')
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as JscpdReport
  if (!report.statistics?.total) {
    throw new Error('jscpd 报告缺少 statistics.total，升级 jscpd 后请先回归 check-duplication')
  }

  const files: Record<string, number> = {}
  for (const duplicate of report.duplicates ?? []) {
    for (const file of [duplicate.firstFile.name, duplicate.secondFile.name]) {
      const relative = toPosix(file).startsWith(repoRoot.replace(/\\/g, '/'))
        ? toPosix(file).slice(repoRoot.length + 1)
        : toPosix(file)
      files[relative] = (files[relative] ?? 0) + duplicate.lines
    }
  }
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(files).sort()) sorted[key] = files[key]!

  const lines = report.statistics.total.lines ?? 0
  const duplicatedLines = report.statistics.total.duplicatedLines ?? 0
  const percentage =
    report.statistics.total.percentage ??
    (lines === 0 ? 0 : Math.round((duplicatedLines / lines) * 10000) / 100)

  return { version: 1, total: { lines, duplicatedLines, percentage }, files: sorted }
}

export function fileLineCount(file: string): number {
  const text = readFileSync(resolve(repoRoot, file), 'utf8')
  const lines = text.split('\n')
  return text.endsWith('\n') ? lines.length - 1 : lines.length
}
