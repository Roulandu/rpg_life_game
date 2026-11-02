import { saveWorldMock } from '../fixtures/liveStore'
import { beforeEach, describe, expect, it } from 'vitest'
import type { StaffCandidate, StaffRole, WorldState } from '../../src/domain'
import { STAFF_ROLE_SPECS } from '../../src/domain'
import { staffCandidatesOf } from '../../src/engine'
import { formatMoney } from '../../src/lib'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { resetStore } from '../fixtures/storeHarness'

beforeEach(() => resetStore(saveWorldMock, true))

/** 把余额、名册与比赛闸门摆成用例需要的样子，其余世界事实不动。 */
function ready(mutate: (world: WorldState) => void): void {
  const current = useGameStore.getState().world
  if (!current) throw new Error('career 未创建')
  const world = structuredClone(current)
  world.finance.balance = 1_000_000
  world.staff = []
  mutate(world)
  useGameStore.setState({ world })
  saveWorldMock.mockClear()
}

function state(): WorldState | null {
  return useGameStore.getState().world
}

function offerOf(role: StaffRole): StaffCandidate {
  const world = state()
  if (!world) throw new Error('career 未创建')
  const candidate = staffCandidatesOf(world).find((item) => item.role === role)
  if (!candidate) throw new Error(`${role} 的招聘池是空的`)
  return candidate
}

function label(role: StaffRole): string {
  return STAFF_ROLE_SPECS[role].label
}

describe('雇佣成交走 store 通道', () => {
  it('钱够时把人请进名册，播报周薪并落盘一次', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const offer = offerOf('doctor')
    ready(() => {})

    const result = await useGameStore.getState().hireTeamMember(offer.id)

    expect(result?.ok).toBe(true)
    expect(state()?.staff).toHaveLength(1)
    expect(useGameStore.getState().notice).toBe(
      `已签下 ${offer.nameZh}（${label('doctor')}），周薪 ${formatMoney(offer.weeklyCost)}`,
    )
    expect(useGameStore.getState().error).toBe(null)
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('没有存档时人事动作直接返回空，不编出一个世界', async () => {
    useGameStore.setState({ world: null })

    await expect(useGameStore.getState().hireTeamMember('staff:doctor:any')).resolves.toBeNull()
    await expect(useGameStore.getState().releaseTeamMember('staff:doctor:any')).resolves.toBe(false)
    expect(useGameStore.getState().world).toBeNull()
  })
})

describe('雇佣被拒走 store 通道', () => {
  it('同一角色已有现任时拒绝第二次，并指名是哪个位置', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const offer = offerOf('doctor')
    ready(() => {})
    await useGameStore.getState().hireTeamMember(offer.id)
    saveWorldMock.mockClear()

    const result = await useGameStore.getState().hireTeamMember(offer.id)

    expect(result?.reason).toBe('roleTaken')
    expect(useGameStore.getState().error).toBe('队医这个位置已经有了人，先解雇现任再换。')
    expect(state()?.staff).toHaveLength(1)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('余额不够时报出这道周薪门槛，不写存档', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const offer = offerOf('trainer')
    ready((world) => {
      world.finance.balance = offer.weeklyCost - 1
    })

    const result = await useGameStore.getState().hireTeamMember(offer.id)

    expect(result?.reason).toBe('notEnoughBalance')
    expect(useGameStore.getState().error).toBe(
      `余额不够付 ${formatMoney(offer.weeklyCost)} 的第一周周薪。`,
    )
    expect(state()?.finance.balance).toBe(offer.weeklyCost - 1)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })

  it('招聘池里查不到的 id 报「不在本赛季」，不凭空造一个人', async () => {
    await useGameStore.getState().createCareer(testOptions())
    ready(() => {})

    const result = await useGameStore.getState().hireTeamMember('staff:doctor:nobody')

    expect(result?.reason).toBe('unknownCandidate')
    expect(useGameStore.getState().error).toContain('不在本赛季的招聘池')
    expect(state()?.staff).toEqual([])
    expect(saveWorldMock).not.toHaveBeenCalled()
  })
})

describe('解雇走 store 通道', () => {
  it('解雇把成员移出名册并播报省下的周薪', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const offer = offerOf('psychologist')
    ready(() => {})
    await useGameStore.getState().hireTeamMember(offer.id)
    saveWorldMock.mockClear()

    const released = await useGameStore.getState().releaseTeamMember(offer.id)

    expect(released).toBe(true)
    expect(state()?.staff).toEqual([])
    expect(useGameStore.getState().notice).toBe(
      `已解雇 ${offer.nameZh}（${label('psychologist')}），每周省下 ${formatMoney(offer.weeklyCost)}`,
    )
    expect(saveWorldMock).toHaveBeenCalledTimes(1)
  })

  it('不在名册里的人返回 false，报「已经不在团队」', async () => {
    await useGameStore.getState().createCareer(testOptions())
    ready(() => {})

    const released = await useGameStore.getState().releaseTeamMember('staff:doctor:none')

    expect(released).toBe(false)
    expect(useGameStore.getState().error).toBe('这个人已经不在团队里了，刷新一下再试。')
    expect(saveWorldMock).not.toHaveBeenCalled()
  })
})

describe('人事闸门走 store 通道', () => {
  it('停在开球的那天既不能进人也不能走人', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const offer = offerOf('doctor')
    ready((world) => {
      world.staff = [{ ...offer, hiredDay: 1 }]
      world.pendingDayPlan = { ...world.weekPlan, fixtureId: 'fixture:test' }
    })

    const hire = await useGameStore.getState().hireTeamMember(offer.id)
    const release = await useGameStore.getState().releaseTeamMember(offer.id)

    expect(hire?.reason).toBe('matchLive')
    expect(release).toBe(false)
    expect(useGameStore.getState().error).toBe('比赛进行中不能改人事，先把今天踢完。')
    expect(state()?.staff).toHaveLength(1)
    expect(saveWorldMock).not.toHaveBeenCalled()
  })
})
