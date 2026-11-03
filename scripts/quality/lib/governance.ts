import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { parseFrontmatter, sections } from './markdown'
import { repoRoot, toPosix } from './manifest'

export const GOVERNANCE_PATH = 'docs/00-项目文档/08-变更与治理/governance.yaml'

export const COMMIT_TYPES = ['feat', 'fix', 'test', 'refactor', 'docs', 'chore', 'perf'] as const
export const CHANGE_STATUSES = ['draft', 'verified', 'accepted', 'superseded'] as const
export const CHANGE_LEVELS = ['standard', 'light'] as const
export const VERIFICATION_STATUSES = ['passed', 'failed', 'partial'] as const

const CHANGE_ID = /^CHG-\d{8}-\d{3}$/
const VERIFICATION_ID = /^VER-\d{8}-\d{3}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const SHA = /^[0-9a-f]{7,40}$/i

export interface GovernanceConfig {
  version: number
  effectiveFrom: string
  changeRecordDir: string
  verificationRecordDir: string
  requiredTypes: string[]
  levels: Record<string, string[]>
}

export interface ParsedChangeRecord {
  id: string
  title: string
  type: string
  status: string
  level: string
  created: string
  updated: string
  ciRun: string
  path: string
  errors: string[]
}

export interface ParsedVerificationRecord {
  id: string
  title: string
  status: string
  created: string
  updated: string
  sha: string
  ciRun: string
  path: string
  errors: string[]
}

export interface GovernanceValidation {
  changeRecords: ParsedChangeRecord[]
  verificationRecords: ParsedVerificationRecord[]
  problems: string[]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function present(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

function hasSubstance(value: string): boolean {
  const cleaned = value.replace(/\s+/g, '').replace(/[-*|:：]/g, '')
  return cleaned.length >= 4
}

function isDate(value: string): boolean {
  return DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function idDate(id: string): string {
  return `${id.slice(4, 8)}-${id.slice(8, 10)}-${id.slice(10, 12)}`
}

export function loadGovernance(root = repoRoot): GovernanceConfig {
  const path = resolve(root, GOVERNANCE_PATH)
  if (!existsSync(path)) {
    throw new Error(
      `治理配置缺失：${GOVERNANCE_PATH}。请先 rebase/合入 main，再重新执行检查；不会跳过变更记录校验。`,
    )
  }
  const raw = parseYaml(readFileSync(path, 'utf8')) as Partial<GovernanceConfig> | null
  if (!raw || typeof raw !== 'object') {
    throw new Error('治理配置不合法：governance.yaml 必须是 YAML 对象')
  }
  const problems: string[] = []
  if (raw.version !== 1) problems.push('governance.yaml 的 version 必须为 1')
  if (!text(raw?.effectiveFrom) || !isDate(text(raw?.effectiveFrom))) {
    problems.push('governance.yaml 的 effectiveFrom 必须是 YYYY-MM-DD')
  }
  if (!text(raw?.changeRecordDir)) problems.push('governance.yaml 缺少 changeRecordDir')
  if (!text(raw?.verificationRecordDir)) problems.push('governance.yaml 缺少 verificationRecordDir')
  if (!Array.isArray(raw?.requiredTypes) || raw.requiredTypes.length === 0) {
    problems.push('governance.yaml 缺少 requiredTypes')
  } else {
    for (const type of raw.requiredTypes) {
      if (!(COMMIT_TYPES as readonly string[]).includes(type)) {
        problems.push(`requiredTypes 含非法类型：${type}`)
      }
    }
  }
  if (!raw?.levels || !Array.isArray(raw.levels.standard) || raw.levels.standard.length === 0) {
    problems.push('governance.yaml 缺少 levels.standard')
  }
  if (!raw?.levels || !Array.isArray(raw.levels.light) || raw.levels.light.length === 0) {
    problems.push('governance.yaml 缺少 levels.light')
  }
  if (problems.length > 0) throw new Error(`治理配置不合法：\n  - ${problems.join('\n  - ')}`)
  return {
    version: 1,
    effectiveFrom: text(raw.effectiveFrom),
    changeRecordDir: toPosix(text(raw.changeRecordDir)),
    verificationRecordDir: toPosix(text(raw.verificationRecordDir)),
    requiredTypes: raw.requiredTypes!.map(String),
    levels: {
      standard: raw.levels!.standard.map(String),
      light: raw.levels!.light.map(String),
    },
  }
}

export function authorDatePart(value?: string): string {
  if (value && DATE.test(value.slice(0, 10))) return value.slice(0, 10)
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

export function shouldRequireChangeRecord(
  config: GovernanceConfig,
  type: string | undefined,
  authorDate?: string,
): boolean {
  if (!type || !config.requiredTypes.includes(type)) return false
  return authorDatePart(authorDate) >= config.effectiveFrom
}

function recordFiles(root: string, directory: string): string[] {
  const absolute = resolve(root, directory)
  if (!existsSync(absolute)) return []
  const files: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = resolve(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md') && !entry.name.startsWith('00-')) files.push(full)
    }
  }
  walk(absolute)
  return files
}

function repoPath(root: string, absolute: string): string {
  return toPosix(relative(root, absolute))
}

export function findChangeRecordFile(
  root: string,
  config: GovernanceConfig,
  id: string,
): string | null {
  return (
    recordFiles(root, config.changeRecordDir).find((file) =>
      basename(file).startsWith(`${id}-`),
    ) ?? null
  )
}

export function findVerificationRecordFile(
  root: string,
  config: GovernanceConfig,
  id: string,
): string | null {
  return (
    recordFiles(root, config.verificationRecordDir).find((file) =>
      basename(file).startsWith(`${id}-`),
    ) ?? null
  )
}

export function recordExists(root: string, config: GovernanceConfig, id: string): boolean {
  return findChangeRecordFile(root, config, id) !== null
}

export function parseChangeRecord(
  root: string,
  file: string,
  content: string,
  config: GovernanceConfig,
): ParsedChangeRecord {
  const { data, body } = parseFrontmatter(content)
  const headings = sections(body)
  const id = text(data.id)
  const title = text(data.title)
  const type = text(data.type)
  const status = text(data.status)
  const level = text(data.level)
  const created = text(data.created)
  const updated = text(data.updated)
  const ciRun = text(data.ciRun)
  const errors: string[] = []
  const match = basename(file).match(/^(CHG-\d{8}-\d{3})-(.+)\.md$/)

  if (!match) errors.push('文件名必须是 CHG-YYYYMMDD-NNN-中文标题.md')
  else if (match[1] !== id) {
    errors.push(`文件名前缀 ${match[1]} 与 frontmatter id ${id || '（空）'} 不一致`)
  }
  if (!CHANGE_ID.test(id)) errors.push('id 必须是 CHG-YYYYMMDD-NNN')
  if (!title) errors.push('frontmatter 缺少 title')
  if (!(COMMIT_TYPES as readonly string[]).includes(type)) {
    errors.push('type 必须是 feat|fix|test|refactor|docs|chore|perf')
  }
  if (!(CHANGE_LEVELS as readonly string[]).includes(level)) {
    errors.push('level 必须是 standard 或 light')
  }
  if (!(CHANGE_STATUSES as readonly string[]).includes(status)) {
    errors.push('status 必须是 draft|verified|accepted|superseded')
  }
  if (!isDate(created)) errors.push('created 必须是 YYYY-MM-DD')
  if (!isDate(updated)) errors.push('updated 必须是 YYYY-MM-DD')
  if (CHANGE_ID.test(id) && isDate(created) && created !== idDate(id)) {
    errors.push('created 日期必须与 id 中的日期一致')
  }
  if (config.requiredTypes.includes(type) && level !== 'standard') {
    errors.push(`${type} 只能使用 level: standard`)
  }
  if (!present(data.scope)) errors.push('frontmatter 缺少 scope')
  if (data.commits === undefined) errors.push('frontmatter 缺少 commits')
  if (data.verification === undefined) errors.push('frontmatter 缺少 verification')

  const requiredSections = config.levels[level] ?? config.levels.standard ?? []
  for (const name of requiredSections) {
    if (!headings.has(name)) errors.push(`缺少章节：${name}`)
  }

  if (status !== 'draft') {
    for (const name of requiredSections) {
      if (headings.has(name) && !hasSubstance(headings.get(name) ?? '')) {
        errors.push(`章节内容为空或过短：${name}`)
      }
    }
    const evidence = headings.get('验证证据') ?? ''
    if (!/`[^`]+`|npm|npx|pnpm|git|node|vitest|tsx|不适用/.test(evidence)) {
      errors.push('验证证据必须包含至少一条命令，或写明“不适用”及理由')
    }
  }

  if (status === 'accepted') {
    if (!hasSubstance(headings.get('验收结论') ?? '')) errors.push('accepted 必须写明验收结论')
    if (!ciRun) errors.push('accepted 必须填写 ciRun')
  }

  for (const ref of new Set(body.match(/VER-\d{8}-\d{3}/g) ?? [])) {
    if (!findVerificationRecordFile(root, config, ref)) {
      errors.push(`引用的验证记录不存在：${ref}`)
    }
  }

  return { id, title, type, status, level, created, updated, ciRun, path: file, errors }
}

export function parseVerificationRecord(
  file: string,
  content: string,
): ParsedVerificationRecord {
  const { data, body } = parseFrontmatter(content)
  const headings = sections(body)
  const id = text(data.id)
  const title = text(data.title)
  const status = text(data.status)
  const created = text(data.created)
  const updated = text(data.updated)
  const sha = text(data.sha)
  const ciRun = text(data.ciRun)
  const errors: string[] = []
  const match = basename(file).match(/^(VER-\d{8}-\d{3})-(.+)\.md$/)

  if (!match) errors.push('文件名必须是 VER-YYYYMMDD-NNN-中文标题.md')
  else if (match[1] !== id) {
    errors.push(`文件名前缀 ${match[1]} 与 frontmatter id ${id || '（空）'} 不一致`)
  }
  if (!VERIFICATION_ID.test(id)) errors.push('id 必须是 VER-YYYYMMDD-NNN')
  if (!title) errors.push('frontmatter 缺少 title')
  if (!(VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    errors.push('status 必须是 passed|failed|partial')
  }
  if (!isDate(created)) errors.push('created 必须是 YYYY-MM-DD')
  if (!isDate(updated)) errors.push('updated 必须是 YYYY-MM-DD')
  if (VERIFICATION_ID.test(id) && isDate(created) && created !== idDate(id)) {
    errors.push('created 日期必须与 id 中的日期一致')
  }
  for (const name of ['验证对象', '环境', '命令与结果', 'CI run', '未执行项', '结论']) {
    if (!headings.has(name)) errors.push(`缺少章节：${name}`)
    else if (!hasSubstance(headings.get(name) ?? '')) errors.push(`章节内容为空或过短：${name}`)
  }
  if (status === 'passed') {
    if (!SHA.test(sha)) errors.push('passed 必须填写被验证的 sha（7-40 位十六进制）')
    if (!ciRun) errors.push('passed 必须填写 ciRun')
  }

  return { id, title, status, created, updated, sha, ciRun, path: file, errors }
}

export function validateChangeRecords(
  root: string,
  config: GovernanceConfig,
): GovernanceValidation {
  const problems: string[] = []
  const changeRecords: ParsedChangeRecord[] = []
  const verificationRecords: ParsedVerificationRecord[] = []
  const changeIds = new Map<string, string>()
  const verificationIds = new Map<string, string>()

  const changeFiles = recordFiles(root, config.changeRecordDir)
  if (!existsSync(resolve(root, config.changeRecordDir))) {
    problems.push(`变更记录目录不存在：${config.changeRecordDir}`)
  }
  for (const absolute of changeFiles) {
    const file = repoPath(root, absolute)
    const record = parseChangeRecord(root, file, readFileSync(absolute, 'utf8'), config)
    changeRecords.push(record)
    if (record.id) {
      const existing = changeIds.get(record.id)
      if (existing) problems.push(`CHG id 重复：${record.id}（${existing} 与 ${file}）`)
      else changeIds.set(record.id, file)
    }
    for (const error of record.errors) problems.push(`${file}：${error}`)
  }

  const verificationFiles = recordFiles(root, config.verificationRecordDir)
  if (!existsSync(resolve(root, config.verificationRecordDir))) {
    problems.push(`验证记录目录不存在：${config.verificationRecordDir}`)
  }
  for (const absolute of verificationFiles) {
    const file = repoPath(root, absolute)
    const record = parseVerificationRecord(file, readFileSync(absolute, 'utf8'))
    verificationRecords.push(record)
    if (record.id) {
      const existing = verificationIds.get(record.id)
      if (existing) problems.push(`VER id 重复：${record.id}（${existing} 与 ${file}）`)
      else verificationIds.set(record.id, file)
    }
    for (const error of record.errors) problems.push(`${file}：${error}`)
  }

  return { changeRecords, verificationRecords, problems }
}
