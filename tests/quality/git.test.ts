import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { commitsSince, mergeBase, resolveBase } from '../../scripts/quality/lib/git'

describe('git base resolution', () => {
  it('显式 base 不可达时直接报错，不回退为空范围', () => {
    expect(() => resolveBase('definitely-not-a-real-ref')).toThrow(/不可达/)
    expect(() => mergeBase('definitely-not-a-real-ref')).toThrow(/不可达/)
  })

  it('提交信息包含作者日期', () => {
    const commits = commitsSince('HEAD~1')
    expect(commits.length).toBeGreaterThan(0)
    expect(commits[0]?.authorDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('无共同祖先时抛出明确错误', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rpg-git-'))
    const git = (args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
    try {
      git(['init', '-b', 'main'])
      git(['config', 'user.email', 'test@example.com'])
      git(['config', 'user.name', 'Test'])
      writeFileSync(join(dir, 'a.txt'), 'a')
      git(['add', '.'])
      git(['commit', '-m', 'chore: init'])
      git(['checkout', '--orphan', 'orphan'])
      writeFileSync(join(dir, 'b.txt'), 'b')
      git(['add', '.'])
      git(['commit', '-m', 'chore: orphan'])

      const previousGitDir = process.env.GIT_DIR
      const previousWorkTree = process.env.GIT_WORK_TREE
      process.env.GIT_DIR = join(dir, '.git')
      process.env.GIT_WORK_TREE = dir
      try {
        expect(() => mergeBase('main')).toThrow(/共同祖先/)
      } finally {
        if (previousGitDir === undefined) delete process.env.GIT_DIR
        else process.env.GIT_DIR = previousGitDir
        if (previousWorkTree === undefined) delete process.env.GIT_WORK_TREE
        else process.env.GIT_WORK_TREE = previousWorkTree
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
