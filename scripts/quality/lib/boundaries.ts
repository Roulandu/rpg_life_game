import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { importsOfFile, resolveSpecifier } from './imports'
import {
  loadManifest,
  moduleForFile,
  repoRoot,
  toPosix,
  type Manifest,
  type ModuleDef,
} from './manifest'

export interface ModuleEdge {
  from: string
  to: string
  file: string
}

export interface BoundaryViolation {
  file: string
  from: string
  to: string
}

export interface Cycle {
  modules: string[]
}

export interface PlatformFinding {
  file: string
  pattern: string
  line: number
}

export interface BoundaryReport {
  edges: ModuleEdge[]
  violations: BoundaryViolation[]
  cycles: Cycle[]
  platform: PlatformFinding[]
  resolvedKnown: { file: string; to: string }[]
  resolvedPlatform: PlatformFinding[]
}

const PLATFORM_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'capacitor-import', pattern: /from\s+['"]@capacitor\// },
  { id: 'local-storage', pattern: /\blocalStorage\b/ },
  { id: 'dom-file-export', pattern: /URL\.createObjectURL|document\.createElement\(['"]a['"]\)/ },
]

function walk(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

function detectCycles(edges: ModuleEdge[], knownCycles: string[][]): Cycle[] {
  const adjacency = new Map<string, Set<string>>()
  for (const edge of edges) {
    const set = adjacency.get(edge.from) ?? new Set<string>()
    set.add(edge.to)
    adjacency.set(edge.from, set)
  }
  const known = new Set(knownCycles.map((cycle) => [...cycle].sort().join(',')))

  let index = 0
  const indices = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const found: Cycle[] = []

  const visit = (node: string) => {
    indices.set(node, index)
    low.set(node, index)
    index += 1
    stack.push(node)
    onStack.add(node)
    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next)
        low.set(node, Math.min(low.get(node)!, low.get(next)!))
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node)!, indices.get(next)!))
      }
    }
    if (low.get(node) === indices.get(node)) {
      const component: string[] = []
      let item = ''
      do {
        item = stack.pop()!
        onStack.delete(item)
        component.push(item)
      } while (item !== node)
      if (component.length > 1) {
        const modules = component.sort()
        if (!known.has(modules.join(','))) found.push({ modules })
      }
    }
  }

  for (const node of adjacency.keys()) {
    if (!indices.has(node)) visit(node)
  }
  return found
}

function scanPlatform(relativeFile: string, absoluteFile: string): PlatformFinding[] {
  const findings: PlatformFinding[] = []
  const lines = readFileSync(absoluteFile, 'utf8').split('\n')
  for (const [offset, line] of lines.entries()) {
    for (const rule of PLATFORM_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({ file: toPosix(relativeFile), pattern: rule.id, line: offset + 1 })
      }
    }
  }
  return findings
}

export async function collectBoundaries(manifest: Manifest = loadManifest()): Promise<BoundaryReport> {
  const srcFiles = walk(resolve(repoRoot, 'src'))
  const edges: ModuleEdge[] = []
  const violations: BoundaryViolation[] = []
  const platform: PlatformFinding[] = []
  const usedKnown = new Set<string>()

  for (const absolute of srcFiles) {
    const file = toPosix(absolute).slice(repoRoot.length + 1)
    if (!file.startsWith('src/platform/')) platform.push(...scanPlatform(file, absolute))

    const from = moduleForFile(manifest, file)
    if (!from) continue
    const definition: ModuleDef | undefined = manifest.modules[from]
    if (!definition) continue

    for (const specifier of await importsOfFile(absolute)) {
      const targetFile = resolveSpecifier(absolute, specifier)
      if (!targetFile) continue
      const to = moduleForFile(manifest, toPosix(targetFile).slice(repoRoot.length + 1))
      if (!to || to === from) continue
      edges.push({ from, to, file })
      if (definition.allowedDeps.includes(to)) continue
      const known = definition.knownViolations.find(
        (item) => item.from === file && item.to === to,
      )
      if (known) usedKnown.add(`${file}->${to}`)
      else violations.push({ file, from, to })
    }
  }

  const knownCycles = Object.values(manifest.modules).flatMap((module) => module.knownCycles ?? [])
  const cycles = detectCycles(edges, knownCycles)
  const knownPlatform = manifest.knownPlatformViolations ?? []
  const resolvedPlatform = platform.filter((finding) =>
    knownPlatform.some((item) => item.file === finding.file && item.pattern === finding.pattern),
  )
  const newPlatform = platform.filter(
    (finding) =>
      !knownPlatform.some((item) => item.file === finding.file && item.pattern === finding.pattern),
  )

  const resolvedKnown: { file: string; to: string }[] = []
  for (const [name, module] of Object.entries(manifest.modules)) {
    for (const item of module.knownViolations) {
      if (!usedKnown.has(`${item.from}->${item.to}`)) resolvedKnown.push({ file: item.from, to: item.to })
      void name
    }
  }

  return {
    edges,
    violations: violations.sort((a, b) => a.file.localeCompare(b.file)),
    cycles,
    platform: newPlatform,
    resolvedKnown,
    resolvedPlatform,
  }
}
