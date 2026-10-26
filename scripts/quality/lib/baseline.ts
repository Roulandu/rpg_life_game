import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { repoRoot } from './manifest'

export function baselinePath(name: string): string {
  return resolve(repoRoot, 'quality', `${name}-baseline.json`)
}

export function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const key of Object.keys(record).sort()) result[key] = record[key]!
  return result
}
