import { dirname, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'

export interface Frontmatter {
  data: Record<string, unknown>
  body: string
}

export function parseFrontmatter(text: string): Frontmatter {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { data: {}, body: text }
  }
  const normalized = text.replace(/\r\n/g, '\n')
  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) return { data: {}, body: text }
  const yamlText = normalized.slice(4, end)
  const body = normalized.slice(end + 5)
  return { data: (parseYaml(yamlText) ?? {}) as Record<string, unknown>, body }
}

export function sections(body: string): Map<string, string> {
  const result = new Map<string, string>()
  const lines = body.split('\n')
  let current: string | null = null
  let buffer: string[] = []
  const flush = () => {
    if (current) result.set(current, buffer.join('\n'))
  }
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      flush()
      current = heading[1] ?? ''
      buffer = []
    } else if (current) {
      buffer.push(line)
    }
  }
  flush()
  return result
}

export function relativeLinks(markdown: string): string[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, '')
  const links: string[] = []
  const pattern = /\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(withoutCode)) !== null) {
    const target = match[1] ?? ''
    if (!target) continue
    if (/^(https?:|mailto:|#)/.test(target)) continue
    if (target.startsWith('planned:')) continue
    links.push(target)
  }
  return links
}

export function resolveLink(markdownFile: string, target: string): string {
  const clean = target.split('#')[0] ?? ''
  return resolve(dirname(markdownFile), decodeURI(clean))
}

export function hasMermaid(body: string, kind: 'sequenceDiagram' | 'flowchart'): boolean {
  const blocks = body.match(/```mermaid\n([\s\S]*?)```/g) ?? []
  return blocks.some((block) => {
    const content = block.replace(/```mermaid\n?/, '').replace(/```$/, '').trimStart()
    return kind === 'flowchart'
      ? content.startsWith('flowchart') || content.startsWith('graph')
      : content.startsWith('sequenceDiagram')
  })
}

export function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string') return [value]
  return []
}
