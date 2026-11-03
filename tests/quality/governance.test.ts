import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseChangeRecord,
  parseVerificationRecord,
  validateChangeRecords,
  type GovernanceConfig,
} from '../../scripts/quality/lib/governance'

const config: GovernanceConfig = {
  version: 1,
  effectiveFrom: '2026-11-03',
  changeRecordDir: 'docs/00-项目文档/08-变更与治理/01-变更记录',
  verificationRecordDir: 'docs/00-项目文档/08-变更与治理/02-验证记录',
  requiredTypes: ['feat', 'fix', 'refactor', 'perf'],
  levels: {
    standard: [
      '背景与目标',
      '验收条件',
      '影响范围',
      '方案与取舍',
      '验证证据',
      '防回归',
      '文档影响',
      '兼容与回滚',
      '技术债与例外',
      '验收结论',
    ],
    light: ['背景与目标', '验收条件', '验证证据', '文档影响', '验收结论'],
  },
}

const DEFAULTS = {
  id: 'CHG-20261103-001',
  title: '测试变更',
  type: 'feat',
  status: 'verified',
  level: 'standard',
  created: '2026-11-03',
  updated: '2026-11-03',
  ciRun: '',
}

function sectionText(name: string, empty: boolean): string {
  if (empty) return ''
  return name === '验证证据' ? '`npm test` 通过。' : '内容足够长，说明清楚。'
}

function bodyFor(level: string, emptySections: boolean): string {
  const names = config.levels[level] ?? config.levels.standard!
  return names
    .map((name) => `## ${name}\n\n${sectionText(name, emptySections)}`)
    .join('\n\n')
}

function content(
  overrides: Partial<typeof DEFAULTS> = {},
  options: { emptySections?: boolean; extraBody?: string } = {},
): string {
  const value = { ...DEFAULTS, ...overrides }
  return [
    '---',
    `id: ${value.id}`,
    `title: ${value.title}`,
    `type: ${value.type}`,
    `status: ${value.status}`,
    `level: ${value.level}`,
    `created: ${value.created}`,
    `updated: ${value.updated}`,
    'scope:',
    '  - tests/quality/governance.test.ts',
    'commits: []',
    'verification: []',
    ...(value.ciRun ? [`ciRun: ${value.ciRun}`] : []),
    '---',
    '',
    `# ${value.id} ${value.title}`,
    '',
    bodyFor(value.level, options.emptySections ?? false),
    ...(options.extraBody ? ['', options.extraBody] : []),
    '',
  ].join('\n')
}

describe('change record governance', () => {
  it('接受完整且已验证的标准记录', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const result = parseChangeRecord('/tmp', file, content(), config)
    expect(result.errors).toEqual([])
  })

  it('拒绝文件名前缀与 id 不一致', () => {
    const file = 'CHG-20261103-002-测试变更.md'
    const result = parseChangeRecord('/tmp', file, content(), config)
    expect(result.errors.some((error) => error.includes('文件名前缀'))).toBe(true)
  })

  it('拒绝四类提交使用 light 级别', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const result = parseChangeRecord('/tmp', file, content({ level: 'light' }), config)
    expect(result.errors.some((error) => error.includes('只能使用 level: standard'))).toBe(true)
  })

  it('draft 只要求章节标题存在', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const result = parseChangeRecord(
      '/tmp',
      file,
      content({ status: 'draft' }, { emptySections: true }),
      config,
    )
    expect(result.errors).toEqual([])
  })

  it('verified 要求章节实质内容与可执行证据', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const empty = content({}, { emptySections: true })
    expect(
      parseChangeRecord('/tmp', file, empty, config).errors.some((error) =>
        error.includes('章节内容为空'),
      ),
    ).toBe(true)

    const noCommand = content({}, {}).replace('`npm test` 通过。', '已人工检查。')
    expect(
      parseChangeRecord('/tmp', file, noCommand, config).errors.some((error) =>
        error.includes('至少一条命令'),
      ),
    ).toBe(true)
  })

  it('accepted 必须填写验收结论与 ciRun', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const result = parseChangeRecord('/tmp', file, content({ status: 'accepted' }), config)
    expect(result.errors.some((error) => error.includes('ciRun'))).toBe(true)
  })

  it('拒绝引用不存在的 VER', () => {
    const file = 'CHG-20261103-001-测试变更.md'
    const result = parseChangeRecord(
      '/tmp',
      file,
      content({}, { extraBody: '验证记录：VER-20261103-001' }),
      config,
    )
    expect(result.errors.some((error) => error.includes('VER-20261103-001'))).toBe(true)
  })
})

describe('change record collection', () => {
  it('拒绝重复 CHG id', () => {
    const root = mkdtempSync(join(tmpdir(), 'rpg-governance-'))
    try {
      const dir = join(root, config.changeRecordDir)
      mkdirSync(dir, { recursive: true })
      mkdirSync(join(root, config.verificationRecordDir), { recursive: true })
      writeFileSync(join(dir, 'CHG-20261103-001-甲.md'), content())
      writeFileSync(join(dir, 'CHG-20261103-001-乙.md'), content())
      const result = validateChangeRecords(root, config)
      expect(result.problems.some((problem) => problem.includes('CHG id 重复'))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('VER passed 必须有被验证 SHA 与 CI run', () => {
    const text = [
      '---',
      'id: VER-20261103-001',
      'title: 发布候选验证',
      'status: passed',
      'created: 2026-11-03',
      'updated: 2026-11-03',
      'sha:',
      'ciRun:',
      '---',
      '',
      '## 验证对象',
      '',
      '发布候选。',
      '',
      '## 环境',
      '',
      'Node 24。',
      '',
      '## 命令与结果',
      '',
      '`npm run verify`。',
      '',
      '## CI run',
      '',
      '待补。',
      '',
      '## 未执行项',
      '',
      '无。',
      '',
      '## 结论',
      '',
      '等待结果。',
      '',
    ].join('\n')
    const result = parseVerificationRecord('VER-20261103-001-发布候选验证.md', text)
    expect(result.errors.some((error) => error.includes('sha'))).toBe(true)
    expect(result.errors.some((error) => error.includes('ciRun'))).toBe(true)
  })
})
