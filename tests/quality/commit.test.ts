import { describe, expect, it } from 'vitest'
import { parseTrailers, validateCommitMessage } from '../../scripts/quality/lib/commit'
import type { GovernanceConfig } from '../../scripts/quality/lib/governance'

const governance: GovernanceConfig = {
  version: 1,
  effectiveFrom: '2026-11-03',
  changeRecordDir: 'docs/00-项目文档/08-变更与治理/01-变更记录',
  verificationRecordDir: 'docs/00-项目文档/08-变更与治理/02-验证记录',
  requiredTypes: ['feat', 'fix', 'refactor', 'perf'],
  levels: { standard: [], light: [] },
}

function featMessage(trailers: string): string {
  return [
    'feat(ui): 新增测试功能',
    '',
    '变更内容：',
    '新增一个可验证的行为。',
    '',
    '修改范围：',
    '- src/ui/index.ts',
    '- tests/quality/commit.test.ts',
    '',
    '修改点：',
    '补测试与实现。',
    '',
    '验证情况：',
    '- RED: npm test -- tests/quality/commit.test.ts 失败（expected 1 received 0）',
    '- GREEN: npm test -- tests/quality/commit.test.ts 通过',
    '',
    '回归风险与验证：',
    '低；跑该测试文件。',
    '',
    '文档影响：',
    '无。',
    '',
    'Docs-Impact: none: 仅测试逻辑',
    'Test-Impact: updated',
    trailers,
  ].join('\n')
}

function message(scope: string[], trailers = 'Docs-Impact: none: 仅校验逻辑\nTest-Impact: updated'): string {
  return [
    'chore(quality): 校验暂存删除路径',
    '',
    '变更内容：',
    '仅调整提交信息校验。',
    '',
    '修改范围：',
    ...scope.map((path) => `- ${path}`),
    '',
    '修改点：',
    '无。',
    '',
    '验证情况：',
    '无。',
    '',
    '回归风险与验证：',
    '无。',
    '',
    '文档影响：',
    '无。',
    '',
    trailers,
  ].join('\n')
}

describe('commit message validation', () => {
  it('允许修改范围列出已暂存删除的路径', () => {
    const deleted = 'src/ui/screens/matchday/KeyMomentStage.tsx'
    const result = validateCommitMessage(
      message(['scripts/quality/lib/commit.ts', 'tests/quality/commit.test.ts', deleted]),
      {
        changedFiles: ['scripts/quality/lib/commit.ts', 'tests/quality/commit.test.ts', deleted],
        verifyPaths: true,
      },
    )
    expect(result.errors).toEqual([])
  })

  it('仍拒绝既不在磁盘也不在暂存区的路径', () => {
    const result = validateCommitMessage(
      message(['scripts/quality/lib/commit.ts', 'tests/quality/commit.test.ts', 'src/nowhere.ts']),
      {
        changedFiles: ['scripts/quality/lib/commit.ts', 'tests/quality/commit.test.ts'],
        verifyPaths: true,
      },
    )
    expect(result.errors).toContain('修改范围中的路径不存在：src/nowhere.ts')
  })

  it('拒绝未覆盖暂存文件的修改范围', () => {
    const result = validateCommitMessage(message(['scripts/quality/lib/commit.ts']), {
      changedFiles: ['scripts/quality/lib/commit.ts', 'tests/quality/commit.test.ts'],
      verifyPaths: true,
    })
    expect(result.errors).toContain('修改范围未覆盖实际改动文件：tests/quality/commit.test.ts')
  })
})

describe('change record trailer enforcement', () => {
  it('解析中文与英文变更记录 Trailer', () => {
    expect(parseTrailers('变更记录: CHG-20261103-001').get('变更记录')).toBe('CHG-20261103-001')
    expect(parseTrailers('变更记录：CHG-20261103-001').get('变更记录')).toBe('CHG-20261103-001')
  })

  it('feat 缺少变更记录时失败', () => {
    const result = validateCommitMessage(featMessage(''), {
      changedFiles: ['src/ui/index.ts', 'tests/quality/commit.test.ts'],
      verifyPaths: false,
      governance,
    })
    expect(result.errors.some((error) => error.includes('变更记录'))).toBe(true)
  })
})

describe('change record exemptions', () => {
  it('feat 带合法变更记录且记录存在时通过', () => {
    const result = validateCommitMessage(featMessage('变更记录: CHG-20261103-001'), {
      changedFiles: ['src/ui/index.ts', 'tests/quality/commit.test.ts'],
      verifyPaths: false,
      governance,
      recordExists: () => true,
    })
    expect(result.errors).toEqual([])
  })

  it('引用不存在的变更记录时失败', () => {
    const result = validateCommitMessage(featMessage('变更记录: CHG-20261103-999'), {
      changedFiles: ['src/ui/index.ts', 'tests/quality/commit.test.ts'],
      verifyPaths: false,
      governance,
      recordExists: () => false,
    })
    expect(result.errors.some((error) => error.includes('变更记录不存在'))).toBe(true)
  })
})

describe('non-required commit types', () => {
  it('docs 提交可以豁免变更记录', () => {
    const docsMessage = [
      'docs(quality): 更新文档导航',
      '',
      '变更内容：',
      '更新文档路径。',
      '',
      '修改范围：',
      '- docs/00-项目文档/00-文档导航.md',
      '',
      '修改点：',
      '同步链接。',
      '',
      '验证情况：',
      '运行文档检查。',
      '',
      '回归风险与验证：',
      '无。',
      '',
      '文档影响：',
      '已更新。',
      '',
      'Docs-Impact: updated',
      'Test-Impact: none: 仅文档更新',
    ].join('\n')
    const result = validateCommitMessage(docsMessage, {
      changedFiles: ['docs/00-项目文档/00-文档导航.md'],
      verifyPaths: false,
      governance,
    })
    expect(result.errors).toEqual([])
  })

  it('生效日期之前的旧提交不追溯要求变更记录', () => {
    const result = validateCommitMessage(featMessage(''), {
      changedFiles: ['src/ui/index.ts', 'tests/quality/commit.test.ts'],
      verifyPaths: false,
      governance,
      authorDate: '2026-11-02T10:00:00+08:00',
    })
    expect(result.errors.some((error) => error.includes('变更记录'))).toBe(false)
  })
})
