import { readFileSync } from 'node:fs'
import { repoRoot, toPosix } from './manifest'
import { resolve } from 'node:path'

export function countTests(text: string): number {
  return (text.match(/\b(?:it|test)\s*(?:\.\w+)?\s*\(/g) ?? []).length
}

export function scanTestDirectives(files: string[]): string[] {
  const problems: string[] = []
  for (const absolute of files) {
    const relative = toPosix(absolute).slice(repoRoot.length + 1)
    const lines = readFileSync(absolute, 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      if (/\.only\s*\(/.test(line)) {
        problems.push(`禁止 .only：${relative}:${index + 1}`)
      }
      if (/(?:\.skip\s*\(|\bxit\s*\(|\bxdescribe\s*\()/.test(line) && !/skip-reason:/.test(line)) {
        problems.push(`.skip 必须同行写 skip-reason: 理由：${relative}:${index + 1}`)
      }
    }
  }
  return problems
}

export function testFileAbsolute(relative: string): string {
  return resolve(repoRoot, relative)
}
