import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importsOfFile, resolveSpecifier } from '../../scripts/quality/lib/imports'
import { repoRoot } from '../../scripts/quality/lib/manifest'

const TEST_FILE = resolve(repoRoot, 'tests/domain/exports.test.ts')

describe('quality import resolution', () => {
  it('目录导入解析为规范化路径下的 index.ts', () => {
    expect(resolveSpecifier(TEST_FILE, '../../src/domain')).toBe(
      resolve(repoRoot, 'src/domain/index.ts'),
    )
  })

  it('读取测试文件的相对导入并忽略包名', async () => {
    const imports = await importsOfFile(TEST_FILE)
    expect(imports).toContain('../../src/domain')
    expect(imports).toContain('vitest')
    expect(resolveSpecifier(TEST_FILE, 'vitest')).toBeNull()
  })
})
