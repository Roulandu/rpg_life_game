import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { commitsSince, mergeBase, resolveBase, stagedFiles } from '../../scripts/quality/lib/git'

interface TempRepo {
  dir: string
  git: (args: string[]) => string
}

const repos: string[] = []

function createRepo(): TempRepo {
  const dir = mkdtempSync(join(tmpdir(), 'rpg-git-'))
  repos.push(dir)
  const git = (args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  git(['init', '-b', 'main'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  return { dir, git }
}

afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true })
})

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
})

describe('git path reading', () => {
  it('暂存中文路径保持原文，不被 quotePath 转义', () => {
    const { dir, git } = createRepo()
    writeFileSync(join(dir, '中文文档.md'), '初稿')
    git(['add', '.'])
    git(['commit', '-m', 'chore: init'])
    writeFileSync(join(dir, '中文文档.md'), '更新')
    git(['add', '.'])
    expect(stagedFiles(dir)).toContain('中文文档.md')
  })
})

describe('git repository topology', () => {
  it('无共同祖先时抛出明确错误', () => {
    const { dir, git } = createRepo()
    writeFileSync(join(dir, 'a.txt'), 'a')
    git(['add', '.'])
    git(['commit', '-m', 'chore: init'])
    git(['checkout', '--orphan', 'orphan'])
    writeFileSync(join(dir, 'b.txt'), 'b')
    git(['add', '.'])
    git(['commit', '-m', 'chore: orphan'])
    expect(() => mergeBase('main', dir)).toThrow(/共同祖先/)
  })
})
