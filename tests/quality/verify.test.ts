import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FULL_STEPS, FAST_STEPS, parseArgs, runVerify, stepsFor } from '../../scripts/verify'

const now = () => new Date('2026-11-03T00:00:00.000Z')

describe('verify cli', () => {
  it('默认 full，并支持 fast 与 base', () => {
    expect(parseArgs([]).mode).toBe('full')
    expect(parseArgs(['--fast']).mode).toBe('fast')
    expect(parseArgs(['--fast', '--base', 'origin/main']).base).toBe('origin/main')
    expect(parseArgs(['--base=origin/main']).base).toBe('origin/main')
  })

  it('拒绝 fast 与 full 同时使用', () => {
    expect(() => parseArgs(['--fast', '--full'])).toThrow(/不能同时使用/)
  })

  it('full 步骤以 fast 开头并以 build 结尾', () => {
    expect(stepsFor('full').slice(0, FAST_STEPS.length)).toEqual(FAST_STEPS)
    expect(FULL_STEPS[FULL_STEPS.length - 1]?.name).toBe('build')
    expect(stepsFor('full').map((step) => step.name)).toContain('commit-range')
  })
})

describe('verify report', () => {
  it('失败时也写报告，未执行步骤标记 not-run', () => {
    const root = mkdtempSync(join(tmpdir(), 'rpg-verify-'))
    const reportDir = join(root, 'reports')
    try {
      let calls = 0
      const report = runVerify({
        mode: 'fast',
        root,
        reportDir,
        env: {},
        now,
        exec: () => {
          calls += 1
          return { status: calls === 4 ? 1 : 0 }
        },
      })
      expect(report.result).toBe('failed')
      expect(report.steps[3]?.status).toBe('failed')
      expect(report.steps[4]?.status).toBe('not-run')
      expect(existsSync(join(reportDir, 'verify-unknown.json'))).toBe(true)
      const saved = JSON.parse(readFileSync(join(reportDir, 'verify-unknown.json'), 'utf8')) as {
        result: string
      }
      expect(saved.result).toBe('failed')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('verify success and drift', () => {
  it('全部步骤通过时写 passed 报告', () => {
    const root = mkdtempSync(join(tmpdir(), 'rpg-verify-'))
    const reportDir = join(root, 'reports')
    try {
      const report = runVerify({
        mode: 'fast',
        root,
        reportDir,
        env: {},
        now,
        exec: () => ({ status: 0 }),
      })
      expect(report.result).toBe('passed')
      expect(report.steps.every((step) => step.status === 'passed')).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('GITHUB_SHA 与本地 HEAD 不一致时直接失败且不执行步骤', () => {
    const reportDir = mkdtempSync(join(tmpdir(), 'rpg-verify-report-'))
    try {
      let called = false
      const report = runVerify({
        mode: 'fast',
        root: resolve(import.meta.dirname, '..', '..'),
        reportDir,
        env: { GITHUB_SHA: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
        now,
        exec: () => {
          called = true
          return { status: 0 }
        },
      })
      expect(called).toBe(false)
      expect(report.result).toBe('failed')
      expect(report.error).toContain('验证对象漂移')
      expect(report.steps.every((step) => step.status === 'not-run')).toBe(true)
    } finally {
      rmSync(reportDir, { recursive: true, force: true })
    }
  })
})
