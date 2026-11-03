import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { repoRoot } from './manifest'

const SECRET_PATTERNS = [
  { id: 'openai-key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'github-token', pattern: /\bghp_[A-Za-z0-9]{36}\b/ },
  { id: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
]

const EXCLUDED_PREFIXES = ['node_modules/', 'dist/', 'coverage/', 'quality/reports/']

export function isExcludedSecretFile(file: string): boolean {
  const normalized = file.split('\\').join('/')
  return EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function scanSecretText(file: string, text: string): string[] {
  const problems: string[] = []
  for (const secret of SECRET_PATTERNS) {
    if (secret.pattern.test(text)) problems.push(`疑似密钥（${secret.id}）：${file}`)
  }
  return problems
}

export function scanSecrets(files: string[], root = repoRoot): string[] {
  const problems: string[] = []
  for (const file of files) {
    const absolute = resolve(root, file)
    if (!existsSync(absolute)) continue
    const stats = statSync(absolute)
    if (!stats.isFile() || stats.size > 512 * 1024) continue
    const text = readFileSync(absolute, 'utf8')
    if (text.includes('\u0000')) continue
    problems.push(...scanSecretText(file, text))
  }
  return problems
}
