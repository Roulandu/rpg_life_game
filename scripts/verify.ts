import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type VerifyMode = 'fast' | 'full'
export type StepStatus = 'passed' | 'failed' | 'not-run'

export interface VerifyStep {
  name: string
  script: string
  needsBase?: boolean
}

export const FAST_STEPS: VerifyStep[] = [
  { name: 'typecheck', script: 'typecheck' },
  { name: 'lint', script: 'lint' },
  { name: 'validate-data', script: 'validate:data' },
  { name: 'docs-check', script: 'docs:check' },
  { name: 'tech-debt', script: 'quality:tech-debt' },
  { name: 'boundaries', script: 'quality:boundaries' },
  { name: 'change-records', script: 'quality:change-records' },
  { name: 'secrets', script: 'quality:secrets' },
]

export const FULL_STEPS: VerifyStep[] = [
  ...FAST_STEPS,
  { name: 'duplication', script: 'quality:duplication' },
  { name: 'test-impact', script: 'quality:test-impact', needsBase: true },
  { name: 'doc-sync', script: 'quality:doc-sync', needsBase: true },
  { name: 'test-coverage', script: 'test:coverage' },
  { name: 'coverage', script: 'quality:coverage' },
  { name: 'anti-regression', script: 'quality:anti-regression', needsBase: true },
  { name: 'baseline', script: 'quality:baseline' },
  { name: 'commit-range', script: 'quality:commit-range', needsBase: true },
  { name: 'build', script: 'build' },
]

export interface VerifyCli {
  mode: VerifyMode
  base?: string
  help: boolean
  list: boolean
}

export interface StepResult {
  name: string
  command: string
  exitCode: number | null
  status: StepStatus
  durationMs: number
}

export interface VerifyReport {
  schemaVersion: 1
  gitHead: string
  dirty: boolean
  branch: string
  base: string | null
  node: string
  npm: string
  github: {
    runId: string | null
    ref: string | null
    event: string | null
  }
  mode: VerifyMode
  startedAt: string
  finishedAt: string
  steps: StepResult[]
  result: 'passed' | 'failed'
  error?: string
}

export type ExecFn = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; stdio: 'inherit' },
) => { status: number }

export interface RunVerifyOptions {
  mode: VerifyMode
  base?: string
  root: string
  exec?: ExecFn
  reportDir?: string
  env?: NodeJS.ProcessEnv
  now?: () => Date
}

const USAGE = `用法：npm run verify -- [选项]

模式：
  --fast              快速门禁（类型、Lint、数据、文档、技术债、边界、变更记录、密钥）
  --full              全量门禁（默认；fast + 重复率、测试影响、文档同步、覆盖率、防回归、基线、提交范围、构建）
  --base <ref>        对比基线；未传时由各脚本使用 origin/main 或 main
  --list              只列出当前模式的步骤，不执行
  --help              显示本帮助

示例：
  npm run verify -- --help
  npm run verify -- --fast --base origin/main
  npm run verify -- --full --base origin/main

退出码：0 通过；1 失败或参数错误。
报告：quality/reports/verify-<sha>[-dirty].json（失败也会写）。`

export function parseArgs(argv: string[]): VerifyCli {
  let fast = false
  let full = false
  let base: string | undefined
  let help = false
  let list = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    if (arg === '--fast') fast = true
    else if (arg === '--full') full = true
    else if (arg === '--help' || arg === '-h') help = true
    else if (arg === '--list') list = true
    else if (arg === '--base') {
      base = argv[index + 1]
      index += 1
      if (!base) throw new Error('--base 需要提供 ref。')
    } else if (arg.startsWith('--base=')) base = arg.slice('--base='.length)
    else throw new Error(`未知参数：${arg}\n\n${USAGE}`)
  }

  if (fast && full) throw new Error('--fast 与 --full 不能同时使用。')
  return { mode: fast ? 'fast' : 'full', base, help, list }
}

export function stepsFor(mode: VerifyMode): VerifyStep[] {
  return mode === 'fast' ? FAST_STEPS : FULL_STEPS
}

function commandArgs(step: VerifyStep, base?: string): string[] {
  const args = ['run', step.script]
  if (step.needsBase && base) args.push('--', '--base', base)
  return args
}

function displayCommand(step: VerifyStep, base?: string): string {
  return `npm ${commandArgs(step, base).join(' ')}`
}

function readGit(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

function npmVersion(env: NodeJS.ProcessEnv): string {
  const agent = env.npm_config_user_agent ?? ''
  const match = agent.match(/\bnpm\/[^\s]+/)
  return match ? match[0].replace('npm/', '') : 'unknown'
}

const defaultExec: ExecFn = (command, args, options) => {
  try {
    const npmCli = process.env.npm_execpath
    if (npmCli && existsSync(npmCli)) {
      execFileSync(process.execPath, [npmCli, ...args], { ...options, stdio: 'inherit' })
    } else {
      execFileSync(command, args, {
        ...options,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      })
    }
    return { status: 0 }
  } catch (error) {
    const status = (error as { status?: number }).status
    return { status: typeof status === 'number' ? status : 1 }
  }
}

export function reportPath(reportDir: string, sha: string, dirty: boolean): string {
  const safe = /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 12) : 'unknown'
  return resolve(reportDir, `verify-${safe}${dirty ? '-dirty' : ''}.json`)
}

export function runVerify(options: RunVerifyOptions): VerifyReport {
  const env = options.env ?? process.env
  const exec = options.exec ?? defaultExec
  const now = options.now ?? (() => new Date())
  const root = options.root
  const reportDir = options.reportDir ?? resolve(root, 'quality/reports')
  const startedAt = now().toISOString()
  const gitHead = readGit(root, ['rev-parse', 'HEAD']) || 'unknown'
  const dirty = readGit(root, ['status', '--porcelain']).length > 0
  const branch = readGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown'
  const base = options.base ?? env.QUALITY_BASE ?? null
  const github = {
    runId: env.GITHUB_RUN_ID ?? null,
    ref: env.GITHUB_REF ?? env.GITHUB_REF_NAME ?? null,
    event: env.GITHUB_EVENT_NAME ?? null,
  }

  const steps: StepResult[] = stepsFor(options.mode).map((step) => ({
    name: step.name,
    command: displayCommand(step, options.base),
    exitCode: null,
    status: 'not-run',
    durationMs: 0,
  }))

  const finish = (result: 'passed' | 'failed', error?: string): VerifyReport => {
    const report: VerifyReport = {
      schemaVersion: 1,
      gitHead,
      dirty,
      branch,
      base,
      node: process.version,
      npm: npmVersion(env),
      github,
      mode: options.mode,
      startedAt,
      finishedAt: now().toISOString(),
      steps,
      result,
      ...(error ? { error } : {}),
    }
    mkdirSync(reportDir, { recursive: true })
    writeFileSync(reportPath(reportDir, gitHead, dirty), `${JSON.stringify(report, null, 2)}\n`)
    return report
  }

  if (env.GITHUB_SHA && gitHead !== 'unknown' && env.GITHUB_SHA !== gitHead) {
    return finish(
      'failed',
      `验证对象漂移：GITHUB_SHA=${env.GITHUB_SHA} 与本地 HEAD=${gitHead} 不一致。`,
    )
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  for (let index = 0; index < steps.length; index += 1) {
    const step = stepsFor(options.mode)[index]!
    const started = Date.now()
    const result = exec(npmCommand, commandArgs(step, options.base), {
      cwd: root,
      env,
      stdio: 'inherit',
    })
    steps[index]!.durationMs = Date.now() - started
    steps[index]!.exitCode = result.status
    steps[index]!.status = result.status === 0 ? 'passed' : 'failed'
    if (result.status !== 0) return finish('failed')
  }

  return finish('passed')
}

function main(): void {
  let cli: VerifyCli
  try {
    cli = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  if (cli.help) {
    console.log(USAGE)
    return
  }

  if (cli.list) {
    for (const step of stepsFor(cli.mode)) {
      console.log(`${step.name}\tnpm run ${step.script}${step.needsBase ? ' [--base <ref>]' : ''}`)
    }
    return
  }

  const report = runVerify({
    mode: cli.mode,
    base: cli.base,
    root: resolve(import.meta.dirname, '..'),
  })

  if (report.result !== 'passed') {
    if (report.error) console.error(report.error)
    console.error(`验证失败：${report.steps.filter((step) => step.status === 'failed').map((step) => step.name).join(', ') || '参数/对象'}`)
    process.exitCode = 1
    return
  }
  console.log(`验证通过：${report.mode} 模式，${report.steps.length} 个步骤。`)
}

if (process.argv[1] && process.argv[1].endsWith('verify.ts')) main()
