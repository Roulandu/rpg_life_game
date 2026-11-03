/**
 * 职责：把 GitHub Actions 的 run 列表折算成一个可判定的 CI 结论，供 `npm run ci:wait` 使用。
 * 边界：本机没有 gh CLI，仓库自己的脚本就是唯一门禁；「没跑完」与「还没登记」都不能算通过。
 * 依赖：只做纯计算，取数与轮询留给 check-ci.ts。
 */

export interface ActionsRun {
  id: number
  name: string
  html_url: string
  status: string
  conclusion: string | null
  head_branch: string
  head_sha?: string
}

export type CiState = 'queued' | 'pending' | 'success' | 'failure'

export interface CiVerdict {
  state: CiState
  passed: boolean
  reason: string
  runIds: number[]
  pendingRunIds: number[]
  failedRunIds: number[]
  runs: ActionsRun[]
}

function verdictOf(
  state: CiState,
  reason: string,
  runs: ActionsRun[],
  pendingRunIds: number[] = [],
  failedRunIds: number[] = [],
): CiVerdict {
  return {
    state,
    passed: state === 'success',
    reason,
    runIds: runs.map((run) => run.id),
    pendingRunIds,
    failedRunIds,
    runs,
  }
}

export function resolveVerdict(runs: ActionsRun[]): CiVerdict {
  if (runs.length === 0) {
    return verdictOf('queued', 'Actions 还没有为这次推送登记 run：可能是刚推完还没触发，也可能是工作流没匹配上分支。', runs)
  }

  const pendingRunIds = runs.filter((run) => run.status !== 'completed').map((run) => run.id)
  if (pendingRunIds.length > 0) {
    return verdictOf('pending', `还有 ${pendingRunIds.length} 个 run 在跑：${pendingRunIds.join(', ')}。`, runs, pendingRunIds)
  }

  const failedRunIds = runs.filter((run) => run.conclusion !== 'success').map((run) => run.id)
  if (failedRunIds.length > 0) {
    const detail = runs
      .filter((run) => failedRunIds.includes(run.id))
      .map((run) => `${run.id}(${run.name}/${run.conclusion ?? 'null'})`)
      .join(' ')
    return verdictOf('failure', `run 没有通过：${detail}。`, runs, [], failedRunIds)
  }

  return verdictOf('success', `${runs.length} 个 run 全部成功。`, runs)
}

export function formatVerdict(verdict: CiVerdict, sha: string): string {
  const short = sha.slice(0, 7)
  const head = `CI ${verdict.state}：${short} → ${verdict.reason}`
  if (verdict.state === 'queued') return `${head}\n下一步：稍后再跑一次 npm run ci:wait -- --sha ${sha}，不要把它当成通过。`

  const lines = verdict.runs.map((run) => `  run ${run.id} · ${run.name} · ${run.status}/${run.conclusion ?? '-'} · ${run.html_url}`)
  return [head, ...lines].join('\n')
}
