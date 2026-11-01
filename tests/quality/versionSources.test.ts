import { describe, expect, it } from 'vitest'
import {
  ENGINE_VERSION_SOURCES,
  SAVE_VERSION_SOURCES,
  readEngineVersion,
  readSaveVersion,
  saveVersionProblems,
} from '../../scripts/quality/lib/version-sources'

const SCHEMA_WITH_EXPORT_ONLY = `import { CURRENT_SAVE_VERSION } from '../version'
export { CURRENT_SAVE_VERSION }
export const SAVE_FORMAT = 'pitch-life-save'`

const files = (entries: Record<string, string | null>) => (name: string) => entries[name]

describe('质量门禁的版本常量读取', () => {
  it('回归: 存档版本号定义在 src/domain/version.ts 时能读到真实版本，而不是当作 0', () => {
    const version = readSaveVersion(
      files({
        'src/domain/version.ts': 'export const CURRENT_SAVE_VERSION = 5',
        'src/domain/schema/save.schema.ts': SCHEMA_WITH_EXPORT_ONLY,
      }),
    )

    expect(version).toBe(5)
  })

  it('存档版本号只在 schema 文件里定义时同样能读到', () => {
    const version = readSaveVersion(
      files({
        'src/domain/schema/save.schema.ts': 'export const CURRENT_SAVE_VERSION = 4',
      }),
    )

    expect(version).toBe(4)
  })

  it('两个候选文件都读不到时返回 undefined，让调用方报「无法确认」而不是误判版本未变', () => {
    expect(readSaveVersion(files({}))).toBeUndefined()
    expect(readSaveVersion(files({ 'src/domain/version.ts': null as unknown as string }))).toBeUndefined()
  })

  it('引擎版本号从 src/world/constants.ts 的定义读取', () => {
    const version = readEngineVersion(
      files({
        'src/world/constants.ts': "export const ENGINE_VERSION = '0.5.0'",
        'src/world/generator.ts': "import { ENGINE_VERSION } from './constants'",
      }),
    )

    expect(version).toBe('0.5.0')
  })

  it('候选文件清单覆盖定义处与再导出处，避免版本搬家后门禁失明', () => {
    expect(SAVE_VERSION_SOURCES).toEqual(['src/domain/version.ts', 'src/domain/schema/save.schema.ts'])
    expect(ENGINE_VERSION_SOURCES).toEqual(['src/world/constants.ts', 'src/world/generator.ts'])
  })

  it('版本号从 4 升到 5 放行，停在 4 才报「未变化」', () => {
    expect(saveVersionProblems(4, 5)).toEqual([])
    expect(saveVersionProblems(4, 4)).toEqual([
      '存档结构文件已修改，但 CURRENT_SAVE_VERSION 未变化（仍为 4）；必须升版本并提供迁移。',
    ])
  })

  it('当前工作区读不到版本号时报「无法确认」，不再退化成 0 与 0 相等', () => {
    expect(saveVersionProblems(4, undefined)[0]).toContain('无法确认存档版本已升级')
  })

  it('基线提交读不到版本号时报无法比对', () => {
    expect(saveVersionProblems(undefined, 5)[0]).toContain('无法比对存档版本')
  })
})
