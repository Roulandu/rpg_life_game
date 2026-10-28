import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'src')
const GUARDED = ['engine', 'world', 'lib']

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : []
  })
}

describe('deterministic engine sources', () => {
  it('never reads wall-clock time or unseeded randomness', () => {
    const files = GUARDED.flatMap((name) => walk(join(ROOT, name)))
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const label = relative(process.cwd(), file)
      expect(source, `${label} must not use Math.random`).not.toMatch(/Math\.random/)
      expect(source, `${label} must not use Date.now`).not.toMatch(/Date\.now/)
      expect(source, `${label} must not construct the current date`).not.toMatch(/new Date\(\s*\)/)
      expect(source, `${label} must not use performance.now`).not.toMatch(/performance\.now/)
    }
  })
})
