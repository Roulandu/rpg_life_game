import { saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** 把可用余额与账本摆成用例需要的样子，其余世界事实不动。 */
function withCash(balance: number): WorldState {
  const current = useGameStore.getState().world
  if (!current) throw new Error('career 未创建')
  const world = structuredClone(current)
  world.finance.balance = balance
  world.finance.ledger = []
  world.finance.investments = []
  useGameStore.setState({ world })
  return world
}

function state(): WorldState | null {
  return useGameStore.getState().world
}

describe('开仓走 store 通道', () => {
  it('开仓扣现金、挂持仓并落盘一次', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(500000)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', 20000)

    expect(result?.ok).toBe(true)
    expect(state()?.finance.balance).toBe(480000)
    expect(state()?.finance.investments).toHaveLength(1)
    expect(state()?.finance.ledger[0]).toMatchObject({ type: 'investment', amount: -20000, label: '开仓 银行活期存款' })
    expect(useGameStore.getState().notice).toBe('开仓 银行活期存款 £20000，余额 £480000')
    expect(useGameStore.getState().error).toBe(null)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('现金不足时整笔拒绝，不写存档也不留流水', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(5000)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', 20000)

    expect(result?.reason).toBe('notEnoughCash')
    expect(useGameStore.getState().error).toBe('可用余额不够，先赎回一笔持仓或者少投一些。')
    expect(state()?.finance.balance).toBe(5000)
    expect(state()?.finance.ledger).toHaveLength(0)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('低于起投额时报出这道门槛', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(500000)

    const result = await useGameStore.getState().investMoney('property', 20000)

    expect(result?.reason).toBe('belowMinimum')
    expect(useGameStore.getState().error).toContain('城市公寓最低起投 £150000')
    expect(state()?.finance.investments).toHaveLength(0)
  })
})

describe('赎回与闸门走 store 通道', () => {
  it('赎回把现值落袋并播报到手金额', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(500000)
    await useGameStore.getState().investMoney('bond', 100000)
    const heldId = state()!.finance.investments[0]!.id
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().redeemInvestment(heldId)

    // 锁定期 168 天，第 1 周就卖要按现值吃 2% 罚息。
    expect(result?.proceeds).toBe(98000)
    expect(state()?.finance.balance).toBe(498000)
    expect(state()?.finance.investments).toHaveLength(0)
    expect(useGameStore.getState().notice).toBe('提前赎回 俱乐部债券 到手 £98000，余额 £498000')
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('查不到的持仓报「已经不存在」，不编出一笔赎回', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(500000)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().redeemInvestment('inv:none')

    expect(result?.reason).toBe('unknownInvestment')
    expect(useGameStore.getState().error).toBe('这笔持仓已经不存在了，刷新一下再试。')
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('停在开球的那天不能动钱', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = withCash(500000)
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    useGameStore.setState({ world })
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', 20000)

    expect(result?.reason).toBe('matchLive')
    expect(useGameStore.getState().error).toBe('比赛进行中不能动钱，先把今天踢完。')
    expect(state()?.finance.balance).toBe(500000)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('没有存档时动钱直接返回空，不编出一个世界', async () => {
    useGameStore.setState({ world: null })

    await expect(useGameStore.getState().investMoney('deposit', 20000)).resolves.toBeNull()
    await expect(useGameStore.getState().redeemInvestment('inv:any')).resolves.toBeNull()
  })
})
