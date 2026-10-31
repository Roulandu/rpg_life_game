import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { init, parse } from 'es-module-lexer'

export async function importsOfFile(file: string): Promise<string[]> {
  const source = readFileSync(file, 'utf8')
  if (!file.endsWith('.tsx')) {
    await init
    const [imports] = parse(source)
    return imports.map((item) => item.n).filter((item): item is string => Boolean(item))
  }
  // es-module-lexer 不解析 JSX；TSX 用去注释后的 import/export-from 正则补齐。
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  const found = new Set<string>()
  const pattern = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(withoutComments)) !== null) {
    if (match[1]) found.add(match[1])
  }
  return [...found]
}

export function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const base = resolve(dirname(fromFile), specifier)
  const candidates = [base]
  if (!extname(base)) {
    candidates.push(`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'))
  }
  for (const candidate of candidates) {
    if (existsSync(candidate) && /\.(ts|tsx)$/.test(candidate)) return candidate
  }
  return null
}
