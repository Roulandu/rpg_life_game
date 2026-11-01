export type FileRead = (file: string) => string | null | undefined

const SAVE_VERSION_PATTERN = /CURRENT_SAVE_VERSION\s*=\s*(\d+)/
const ENGINE_VERSION_PATTERN = /ENGINE_VERSION\s*=\s*['"]([^'"]+)['"]/

export const SAVE_VERSION_SOURCES = ['src/domain/version.ts', 'src/domain/schema/save.schema.ts']
export const ENGINE_VERSION_SOURCES = ['src/world/constants.ts', 'src/world/generator.ts']

function firstValue(names: string[], read: FileRead, pattern: RegExp): string | undefined {
  for (const name of names) {
    const value = read(name)?.match(pattern)?.[1]
    if (value) return value
  }
  return undefined
}

export function readSaveVersion(read: FileRead): number | undefined {
  const raw = firstValue(SAVE_VERSION_SOURCES, read, SAVE_VERSION_PATTERN)
  return raw ? Number(raw) : undefined
}

export function readEngineVersion(read: FileRead): string | undefined {
  return firstValue(ENGINE_VERSION_SOURCES, read, ENGINE_VERSION_PATTERN)
}

export function saveVersionProblems(before: number | undefined, after: number | undefined): string[] {
  const where = SAVE_VERSION_SOURCES.join(' 或 ')
  if (after === undefined) {
    return [`在 ${where} 中都找不到 CURRENT_SAVE_VERSION 的字面量定义；门禁无法确认存档版本已升级。`]
  }
  if (before === undefined) {
    return [`基线提交里找不到 CURRENT_SAVE_VERSION 定义（应在 ${where}）；无法比对存档版本。`]
  }
  if (before === after) {
    return [`存档结构文件已修改，但 CURRENT_SAVE_VERSION 未变化（仍为 ${after}）；必须升版本并提供迁移。`]
  }
  return []
}
