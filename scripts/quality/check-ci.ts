/**
 * 职责：本机没有 gh CLI 时，用 GitHub Actions 的 REST API 等到某个 commit 的 CI 结论。
 * 边界：拿不到结论一律退出码 1，绝不把「没结果」当成通过。
 * 依赖：只用 Node 全局 fetch，不新增依赖；GITHUB_TOKEN / GH_TOKEN 可选，用来抬高限流。
 */
import { formatVerdict, resolveVerdict, type ActionsRun, type CiVerdict } from './lib/ci'
import { git } from './lib/git'

const API = 'https://api.github.com'
const DEFAULT_REPO = 'Roulandu/rpg_life_game'
const DEFAULT_TIMEOUT_SECONDS = 900
const DEFAULT_INTERVAL_SECONDS = 20

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value && !value.startsWith('--') ? value : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function positiveNumber(name: string, fallback: number): number {
  const raw = argValue(name)
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function repoFromRemote(): string | null {
  const url = git(['remote', 'get-url', 'origin'], true)
  const matched = url.match(/github\.com[:/]([^/]+\/[^/.]+)/i)
  return matched ? matched[1] : null
}

function currentSha(): string | null {
  const sha = git(['rev-parse', 'HEAD'], true)
  return /^[0-9a-f]{40}$/.test(sha) ? sha : null
}

async function fetchRuns(repo: string, sha: string, token: string | undefined): Promise<ActionsRun[]> {
  const url = `${API}/repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'rpg-life-game-ci-wait',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`GET ${url} 返回 ${response.status} ${response.statusText}`)

  const body = (await response.json()) as { workflow_runs?: ActionsRun[] }
  return (body.workflow_runs ?? []).filter((run) => run.head_sha === sha)
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

function output(verdict: CiVerdict, sha: string, asJson: boolean, extra: Record<string, unknown> = {}): void {
  if (asJson) {
    console.log(JSON.stringify({ sha, ...verdict, ...extra }, null, 2))
    return
  }
  console.log(formatVerdict(verdict, sha))
}

function reportFetchFailure(sha: string, asJson: boolean): void {
  if (asJson) {
    const runs: ActionsRun[] = []
    output({ state: 'failure', passed: false, reason: 'REST 取数连续失败，CI 未出结果。', runIds: [], pendingRunIds: [], failedRunIds: [], runs }, sha, true, { kind: 'fetch-failed' })
    return
  }
  console.error('CI 未出结果：连续 3 次取不到 Actions 状态，不做通过判定。')
}

async function main(): Promise<void> {
  const sha = argValue('sha') ?? currentSha()
  if (!sha) {
    console.error('拿不到当前 commit 的 sha，请用 --sha=<40位> 指定。')
    process.exitCode = 1
    return
  }

  const repo = argValue('repo') ?? repoFromRemote() ?? DEFAULT_REPO
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  const timeoutSeconds = positiveNumber('timeout', DEFAULT_TIMEOUT_SECONDS)
  const intervalSeconds = positiveNumber('interval', DEFAULT_INTERVAL_SECONDS)
  const asJson = hasFlag('json')

  console.log(`轮询 ${repo} 的 Actions：${sha.slice(0, 7)}（上限 ${timeoutSeconds}s，间隔 ${intervalSeconds}s）`)

  const deadline = Date.now() + timeoutSeconds * 1000
  let last: CiVerdict = resolveVerdict([])
  let failures = 0

  while (Date.now() < deadline) {
    try {
      const runs = await fetchRuns(repo, sha, token)
      failures = 0
      last = resolveVerdict(runs)
      if (last.state !== 'queued' && last.state !== 'pending') break
      if (last.state === 'queued') console.log(formatVerdict(last, sha))
      else console.log(`等待中：${last.reason}`)
    } catch (error) {
      failures += 1
      console.error(`取 CI 状态失败（第 ${failures} 次）：${(error as Error).message}`)
      if (failures >= 3) {
        reportFetchFailure(sha, asJson)
        process.exitCode = 1
        return
      }
    }
    await sleep(intervalSeconds)
  }

  output(last, sha, asJson, { repo, timeoutSeconds })
  if (last.passed) return

  if (last.state === 'queued') {
    console.error(`CI 未出结果：${timeoutSeconds}s 内 Actions 没有为 ${sha.slice(0, 7)} 登记 run，不判定为通过。`)
  } else {
    console.error(`CI 未通过：${last.reason}`)
  }
  process.exitCode = 1
}

main()
