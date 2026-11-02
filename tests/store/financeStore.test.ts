import { saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** 世界里的金额一律是「分」，这里用 £10,000 = 1,000,000 分这样的量级摆用例。 */
const CASH = 10000000
const DEPOSIT = 1000000

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
    withCash(CASH)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', DEPOSIT)

    expect(result?.ok).toBe(true)
    expect(state()?.finance.balance).toBe(9000000)
    expect(state()?.finance.investments).toHaveLength(1)
    expect(state()?.finance.ledger[0]).toMatchObject({ type: 'investment', amount: -DEPOSIT, label: '开仓 银行活期存款' })
    expect(useGameStore.getState().notice).toBe('开仓 银行活期存款 £10,000，余额 £90,000')
    expect(useGameStore.getState().error).toBe(null)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('现金不足时整笔拒绝，不写存档也不留流水', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(200000)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', DEPOSIT)

    expect(result?.reason).toBe('notEnoughCash')
    expect(useGameStore.getState().error).toBe('可用余额不够，先赎回一笔持仓或者少投一些。')
    expect(state()?.finance.balance).toBe(200000)
    expect(state()?.finance.ledger).toHaveLength(0)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('低于起投额时报出这道门槛的英镑数', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(CASH)

    const result = await useGameStore.getState().investMoney('property', 500000)

    expect(result?.reason).toBe('belowMinimum')
    expect(useGameStore.getState().error).toBe('城市公寓最低起投 £30,000。')
    expect(state()?.finance.investments).toHaveLength(0)
  })
})

describe('赎回与闸门走 store 通道', () => {
  it('赎回把现值落袋并播报到手金额', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(CASH)
    await useGameStore.getState().investMoney('bond', DEPOSIT)
    const heldId = state()!.finance.investments[0]!.id
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().redeemInvestment(heldId)

    // 锁定期 168 天，第 1 周就卖要按现值吃 2% 罚息。
    expect(result?.proceeds).toBe(980000)
    expect(state()?.finance.balance).toBe(9980000)
    expect(state()?.finance.investments).toHaveLength(0)
    expect(useGameStore.getState().notice).toBe('提前赎回 俱乐部债券 到手 £9,800，余额 £99,800')
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('查不到的持仓报「已经不存在」，不编出一笔赎回', async () => {
    await useGameStore.getState().createCareer(testOptions())
    withCash(CASH)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().redeemInvestment('inv:none')

    expect(result?.reason).toBe('unknownInvestment')
    expect(useGameStore.getState().error).toBe('这笔持仓已经不存在了，刷新一下再试。')
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('停在开球的那天不能动钱', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = withCash(CASH)
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    useGameStore.setState({ world })
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().investMoney('deposit', DEPOSIT)

    expect(result?.reason).toBe('matchLive')
    expect(useGameStore.getState().error).toBe('比赛进行中不能动钱，先把今天踢完。')
    expect(state()?.finance.balance).toBe(CASH)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('没有存档时动钱直接返回空，不编出一个世界', async () => {
    useGameStore.setState({ world: null })

    await expect(useGameStore.getState().investMoney('deposit', DEPOSIT)).resolves.toBeNull()
    await expect(useGameStore.getState().redeemInvestment('inv:any')).resolves.toBeNull()
  })
})
