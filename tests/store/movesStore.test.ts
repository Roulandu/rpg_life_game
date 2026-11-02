import { saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import { ATTR_KEYS } from '../../src/domain'
import type { Player, WorldState } from '../../src/domain/types'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** 把主角摆成「身体够门槛、经验随便花」的样本：门槛与价格各测各的，不受生成时的随机属性影响。 */
function ready(patch: { exp?: number; position?: Player['position'] } = {}): WorldState {
  const current = useGameStore.getState().world
  if (!current) throw new Error('career 未创建')
  const world = structuredClone(current)
  const user = world.players[world.playerId]!
  for (const key of ATTR_KEYS) user.attributes[key] = 80
  user.exp = patch.exp ?? 200
  user.lifetimeExp = 400
  if (patch.position) user.position = patch.position
  useGameStore.setState({ world })
  return world
}

function holdMove(world: WorldState, level: number): WorldState {
  const user = world.players[world.playerId]!
  user.moves = [{ moveId: 'mv_rainbow', level, progress: 0 }]
  useGameStore.setState({ world })
  return world
}

function stored(): Player {
  const world = useGameStore.getState().world
  if (!world) throw new Error('世界未写入')
  return world.players[world.playerId]!
}

async function invest() {
  saveWorldMock.mockClear()
  return useGameStore.getState().investMoveExp('mv_rainbow')
}

describe('绝技解锁 store 的成交路径', () => {
  it('解锁成功时扣经验、写入 Ⅰ 级并落盘一条播报', async () => {
    await useGameStore.getState().createCareer(testOptions())
    ready()

    const outcome = await invest()

    expect(outcome?.ok).toBe(true)
    expect(outcome?.cost).toBe(62)
    expect(outcome?.level).toBe(1)
    const user = stored()
    expect(user.exp).toBe(138)
    expect(user.moves).toEqual([{ moveId: 'mv_rainbow', level: 1, progress: 0 }])
    expect(useGameStore.getState().notice).toBe('彩虹过人 练到 Ⅰ 级（花 62 经验，剩 138）')
    expect(useGameStore.getState().error).toBe(null)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('升级按下一级价格收费，而不是继续收 Ⅰ 级的钱', async () => {
    await useGameStore.getState().createCareer(testOptions())
    holdMove(ready(), 1)

    const outcome = await invest()

    expect(outcome?.ok).toBe(true)
    expect(outcome?.cost).toBe(130)
    const user = stored()
    expect(user.exp).toBe(70)
    expect(user.moves?.[0]?.level).toBe(2)
    expect(useGameStore.getState().notice).toBe('彩虹过人 练到 Ⅱ 级（花 130 经验，剩 70）')
  })
})

describe('绝技解锁 store 的整笔拒绝', () => {
  it('经验不够时绝技账本不动也不写存档', async () => {
    await useGameStore.getState().createCareer(testOptions())
    ready({ exp: 10 })

    const outcome = await invest()

    expect(outcome?.ok).toBe(false)
    expect(outcome?.reason).toBe('notEnoughExp')
    expect(useGameStore.getState().error).toBe('经验不够，这一级的价钱比上一级更贵。')
    expect(stored().exp).toBe(10)
    expect(stored().moves).toEqual([])
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('门将被拒绝买彩虹过人，一条经验都不扣', async () => {
    await useGameStore.getState().createCareer(testOptions())
    ready({ position: 'GK' })

    const outcome = await invest()

    expect(outcome?.reason).toBe('wrongPosition')
    expect(useGameStore.getState().error).toBe('你的位置用不上这门绝技。')
    expect(stored().exp).toBe(200)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })
})

describe('绝技解锁 store 的刹车', () => {
  it('停在开球的那天拒绝改绝技', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const world = ready()
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    world.lastMatch = null
    useGameStore.setState({ world })

    const outcome = await invest()

    expect(outcome?.reason).toBe('matchLive')
    expect(useGameStore.getState().error).toBe('比赛进行中不能改绝技，先把今天踢完。')
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('满级后再点只说练到尽头，不扣经验', async () => {
    await useGameStore.getState().createCareer(testOptions())
    holdMove(ready(), 3)

    const outcome = await invest()

    expect(outcome?.reason).toBe('maxed')
    expect(useGameStore.getState().error).toBe('这门绝技已经练到尽头。')
    expect(stored().exp).toBe(200)
  })
})
