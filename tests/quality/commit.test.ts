import { describe, expect, it } from 'vitest'
import { validateCommitMessage } from '../../scripts/quality/lib/commit'

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
