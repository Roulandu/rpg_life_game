import { saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Player, WorldState } from '../../src/domain/types'
import { attributeCap } from '../../src/domain'
import type { GameStore } from '../../src/store'
import { useGameStore } from '../../src/store/gameStore'
import { createGrowthSlice } from '../../src/store/growthSlice'
import { testOptions } from '../fixtures/career'
import { freshWorld } from '../fixtures/growth'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** 把主角的经验调成指定值，并把累计经验抬到不受单属性上限约束的档位。 */
function setExp(exp: number): WorldState {
  const current = useGameStore.getState().world
  if (!current) throw new Error('career 未创建')
  const world = structuredClone(current)
  const user = world.players[world.playerId]
  user.exp = exp
  user.lifetimeExp = 400
  useGameStore.setState({ world })
  return world
}

function currentUser(): Player | null {
  const world = useGameStore.getState().world
  return world && world.players[world.playerId]
}

describe('经验投资 store 通道', () => {
  it('投资成功时扣经验、涨属性并落盘一条播报', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const before = setExp(50)
    const attrBefore = before.players[before.playerId].attributes.passing
    saveWorldMock.mockClear()

    const outcome = await useGameStore.getState().investExp('passing', 1)

    expect(outcome?.ok).toBe(true)
    expect(outcome?.cost).toBe(6)
    const user = currentUser()
    expect(user?.exp).toBe(44)
    expect(user?.attributes.passing).toBe(attrBefore + 1)
    expect(user?.attrInvestment.passing).toBe(1)
    expect(useGameStore.getState().notice).toBe('传球 +1（花 6 经验，剩 44）')
    expect(useGameStore.getState().error).toBe(null)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('经验不够时整笔拒绝，属性不动也不写存档', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const before = setExp(3)
    const attrBefore = before.players[before.playerId].attributes.passing
    saveWorldMock.mockClear()

    const outcome = await useGameStore.getState().investExp('passing', 1)

    expect(outcome?.ok).toBe(false)
    expect(outcome?.reason).toBe('notEnoughExp')
    expect(useGameStore.getState().error).toBe('经验不够，每一点都随已投点数涨价。')
    const user = currentUser()
    expect(user?.attributes.passing).toBe(attrBefore)
    expect(user?.exp).toBe(3)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('中场投门将属性被位置闸门挡下', async () => {
    await useGameStore.getState().createCareer(testOptions({ position: 'CM' }))
    setExp(80)

    const outcome = await useGameStore.getState().investExp('goalkeeping', 1)

    expect(outcome?.ok).toBe(false)
    expect(outcome?.reason).toBe('notAllowed')
    expect(useGameStore.getState().error).toBe('这项属性不由你的位置决定。')
  })

  it('停在开球的那天不能改属性', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = setExp(80)
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    world.lastMatch = null
    useGameStore.setState({ world })
    const attrBefore = world.players[world.playerId].attributes.passing
    saveWorldMock.mockClear()

    const outcome = await useGameStore.getState().investExp('passing', 1)

    expect(outcome?.ok).toBe(false)
    expect(outcome?.reason).toBe('matchLive')
    expect(useGameStore.getState().error).toBe('比赛进行中不能改属性，先把今天踢完。')
    expect(currentUser()?.attributes.passing).toBe(attrBefore)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('没有存档时投资直接返回空，不编出一个世界', async () => {
    useGameStore.setState({ world: null })

    await expect(useGameStore.getState().investExp('passing', 1)).resolves.toBeNull()
  })
})

describe('成长投资的点数档位与属性天花板', () => {
  /** 直接驱动切片：引擎只回 `overCap`，把码翻成人话的是 growthSlice，这段就该在它自己身上验。 */
  it('切片把 overCap 引擎码翻成点数档位那句人话', async () => {
    const world = freshWorld()
    const user = world.players[world.playerId]
    user.exp = 80
    user.lifetimeExp = 400
    user.attrInvestment.passing = attributeCap(user)
    const patches: Record<string, unknown>[] = []
    const setStub = ((patch: Partial<GameStore>) => patches.push(patch)) as never
    const getStub = (() => ({ ...useGameStore.getState(), world }) as GameStore) as never
    const slice = createGrowthSlice(setStub, getStub, (() => {}) as never)

    const outcome = await slice.investExp('passing', 1)

    expect(outcome?.ok).toBe(false)
    expect(outcome?.reason).toBe('overCap')
    expect(patches.at(-1)).toMatchObject({ error: '这项属性已经投满当前档位，多攒经验解锁更高档位。' })
  })

  it('回归: 起始属性高于点数档位的球员在 store 通道也投得动', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = setExp(80)
    const user = world.players[world.playerId]
    user.attributes.passing = attributeCap(user) + 1
    const attrBefore = user.attributes.passing
    useGameStore.setState({ world })

    const outcome = await useGameStore.getState().investExp('passing', 1)

    expect(outcome?.ok, outcome?.reason ?? undefined).toBe(true)
    expect(currentUser()?.attributes.passing).toBe(attrBefore + 1)
  })
})
