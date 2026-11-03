import { describe, expect, it } from 'vitest'
import { formatVerdict, resolveVerdict } from '../../scripts/quality/lib/ci'

/**
 * ci:wait 的判定部分必须是纯函数：本机没有 gh CLI，CI 结论全靠仓库自己的脚本给出，
 * 而「把没跑完当成通过」是最不能容忍的一种错。取数那层（fetch + 轮询）留给真实调用。
 */

function runOf(overrides: Partial<Parameters<typeof resolveVerdict>[0][number]> = {}) {
  return {
    id: 1,
    name: 'CI',
    html_url: 'https://github.com/Roulandu/rpg_life_game/actions/runs/1',
    status: 'completed',
    conclusion: 'success',
    head_branch: 'main',
    ...overrides,
  }
}

describe('CI 结论判定', () => {
  it('Actions 还没登记这次推送时如实报排队，不算通过', () => {
    const verdict = resolveVerdict([])

    expect(verdict.state).toBe('queued')
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toContain('还没有')
  })

  it('有 run 还没跑完时报等待中，不许提前宣布通过', () => {
    const verdict = resolveVerdict([
      runOf(),
      runOf({ id: 2, status: 'in_progress', conclusion: null }),
    ])

    expect(verdict.state).toBe('pending')
    expect(verdict.passed).toBe(false)
    expect(verdict.pendingRunIds).toEqual([2])
  })

  it('任一 workflow 失败就不是绿灯，并把失败的 run 报出来', () => {
    const verdict = resolveVerdict([
      runOf(),
      runOf({ id: 7, conclusion: 'failure', html_url: 'https://x/7' }),
    ])

    expect(verdict.state).toBe('failure')
    expect(verdict.passed).toBe(false)
    expect(verdict.failedRunIds).toEqual([7])
    expect(verdict.reason).toContain('7')
  })

  it('结论既不是 success 也不是失败码时同样不放行', () => {
    const verdict = resolveVerdict([runOf({ conclusion: 'cancelled' })])

    expect(verdict.state).toBe('failure')
    expect(verdict.passed).toBe(false)
  })

  it('全部 run 都成功才算通过，多个 workflow 一起等', () => {
    const verdict = resolveVerdict([
      runOf({ id: 3, name: 'CI' }),
      runOf({ id: 4, name: 'Pages', status: 'completed', conclusion: 'success' }),
    ])

    expect(verdict.state).toBe('success')
    expect(verdict.passed).toBe(true)
    expect(verdict.runIds).toEqual([3, 4])
  })

  it('给人看的结论里带上 sha、run 列表与状态', () => {
    const verdict = resolveVerdict([runOf({ id: 42 })])
    const text = formatVerdict(verdict, 'abc1234')

    expect(text).toContain('abc1234')
    expect(text).toContain('42')
    expect(text).toContain('success')
  })

  it('排队时的文案要能指导下一步，而不是只说没结果', () => {
    const text = formatVerdict(resolveVerdict([]), 'abc1234')

    expect(text).toContain('abc1234')
    expect(text).toContain('推送')
  })
})
