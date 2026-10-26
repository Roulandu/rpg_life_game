import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

export interface KnownViolation {
  from: string
  to: string
  reason: string
}

export interface ModuleDef {
  path: string
  publicEntry: string | null
  allowedDeps: string[]
  tests: string[]
  docs: string[]
  testImpact: 'strict' | 'via-module' | 'exempt'
  platformCapabilities: string[]
  knownViolations: KnownViolation[]
  knownCycles?: string[][]
}

export interface PlatformViolation {
  file: string
  pattern: string
  reason: string
}

export interface Manifest {
  version: number
  rootModule: string
  rootFiles: string[]
  modules: Record<string, ModuleDef>
  knownPlatformViolations?: PlatformViolation[]
}

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export function toPosix(path: string): string {
  return path.split('\\').join('/')
}

export function relativeToRoot(absolute: string): string {
  return toPosix(relative(repoRoot, absolute))
}

export function loadManifest(root = repoRoot): Manifest {
  const text = readFileSync(resolve(root, 'docs/modules.yaml'), 'utf8')
  return parseYaml(text) as Manifest
}

export function moduleForFile(manifest: Manifest, file: string): string | null {
  const normalized = toPosix(file)
  if (manifest.rootFiles.includes(normalized)) return manifest.rootModule
  let best: { name: string; length: number } | null = null
  for (const [name, def] of Object.entries(manifest.modules)) {
    const prefix = `${def.path.replace(/\/$/, '')}/`
    if (normalized.startsWith(prefix)) {
      if (!best || prefix.length > best.length) best = { name, length: prefix.length }
    }
  }
  return best?.name ?? null
}

export function globToRegExp(glob: string): RegExp {
  let pattern = ''
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index]!
    if (char === '*') {
      if (glob[index + 1] === '*') {
        pattern += '.*'
        index += 1
        if (glob[index + 1] === '/') index += 1
      } else {
        pattern += '[^/]*'
      }
    } else if (char === '?') {
      pattern += '[^/]'
    } else if ('\\^$+.()|{}[]'.includes(char)) {
      pattern += `\\${char}`
    } else {
      pattern += char
    }
  }
  return new RegExp(`^${pattern}$`)
}

export function matchesGlob(file: string, glob: string): boolean {
  return globToRegExp(toPosix(glob)).test(toPosix(file))
}

export function matchesAnyGlob(file: string, globs: string[]): boolean {
  return globs.some((glob) => matchesGlob(file, glob))
}

export function isTestFile(file: string): boolean {
  return /(^|\/)tests\//.test(toPosix(file))
}

export function isSourceFile(file: string): boolean {
  return toPosix(file).startsWith('src/')
}
