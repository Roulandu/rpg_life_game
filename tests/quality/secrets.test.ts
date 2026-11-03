import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isExcludedSecretFile, scanSecretText, scanSecrets } from '../../scripts/quality/lib/secrets'

let root = ''

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rpg-secrets-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('全仓密钥扫描', () => {
  it('命中受控文件中的疑似密钥', () => {
    writeFileSync(join(root, 'config.ts'), 'const token = "' + 'ghp_A'.padEnd(40, 'A') + '"\n')
    const problems = scanSecrets(['config.ts'], root)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('github-token')
    expect(problems[0]).toContain('config.ts')
  })

  it('干净文件不误报', () => {
    writeFileSync(join(root, 'clean.ts'), 'export const name = "绿茵人生"\n')
    expect(scanSecrets(['clean.ts'], root)).toEqual([])
  })

  it('跳过二进制与超大文件', () => {
    writeFileSync(join(root, 'binary.bin'), 'ghp_' + 'B'.repeat(36) + '\u0000')
    writeFileSync(join(root, 'large.txt'), 'ghp_' + 'C'.repeat(36) + '\n' + 'x'.repeat(600 * 1024))
    expect(scanSecrets(['binary.bin', 'large.txt'], root)).toEqual([])
  })

  it('排除构建产物与报告目录，但保留锁文件', () => {
    expect(isExcludedSecretFile('node_modules/pkg/index.js')).toBe(true)
    expect(isExcludedSecretFile('dist/assets/app.js')).toBe(true)
    expect(isExcludedSecretFile('coverage/lcov.info')).toBe(true)
    expect(isExcludedSecretFile('quality\\reports\\verify.json')).toBe(true)
    expect(isExcludedSecretFile('package-lock.json')).toBe(false)
    expect(isExcludedSecretFile('src/app/main.ts')).toBe(false)
  })

  it('识别多种密钥格式', () => {
    expect(scanSecretText('a.ts', 'sk-' + 'a'.repeat(24))).toHaveLength(1)
    expect(scanSecretText('a.ts', 'AKIA' + 'A'.repeat(16))).toHaveLength(1)
    expect(scanSecretText('a.ts', ['-----BEGIN', 'PRIVATE KEY-----'].join(' '))).toHaveLength(1)
    expect(scanSecretText('a.ts', 'const ok = 1')).toEqual([])
  })
})
