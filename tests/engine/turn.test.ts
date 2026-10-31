import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { autoResolveKeyMoments, hasPendingKeyMoments } from '../../src/engine/keyMoments'
import { advanceWeek, completeWeek, startWeek, type TurnResult } from '../../src/engine/turn'
import { hashState } from '../../src/lib'
import { PLAN, readyWorld } from '../fixtures/matchday'

function weekFixtures(world: WorldState, week: number) {
  return Object.values(world.fixtures).filter(
    (fixture) => fixture.season === world.season && fixture.week === week,
  )
}

describe('two-phase week', () => {
  it('startWeek 停在第一个关键回合前，周次不变且比赛进入 live', () => {
    const world = readyWorld()
    const result = startWeek(world, PLAN)

    expect(result.live).toBe(true)
    expect(result.world.week).toBe(world.week)
    expect(result.match?.status).toBe('live')
    expect(hasPendingKeyMoments(result.world)).toBe(true)
    expect(result.world.pendingWeekPlan?.fixtureId).toBe(result.match?.fixtureId)
    const fixture = result.world.fixtures[result.match!.fixtureId]!
    expect(fixture.status).toBe('live')
    expect(fixture.homeGoals).toBe(result.match?.homeGoals)
    expect(fixture.awayGoals).toBe(result.match?.awayGoals)
  })

  it('重复 startWeek 不会重复训练、恢复或生成回合', () => {
    const first = startWeek(readyWorld(), PLAN)
    const snapshot = structuredClone(first.world)

    const second = startWeek(first.world, { training: 'physical', extra: 'rest' })

    expect(second.live).toBe(true)
    expect(hashState(second.world)).toBe(hashState(snapshot))
    expect(second.match?.keyMoments?.map((moment) => moment.id)).toEqual(
      first.match?.keyMoments?.map((moment) => moment.id),
    )
  })

  it('关键回合未完成时 completeWeek 拒绝结算', () => {
    const started = startWeek(readyWorld(), PLAN)

    const rejected = completeWeek(started.world)

    expect(rejected.live).toBe(true)
    expect(rejected.world.week).toBe(started.world.week)
    expect(rejected.world.pendingWeekPlan).not.toBeNull()
    expect(rejected.world.lastMatch?.status).toBe('live')
  })
})

describe('week completion', () => {
  it('completeWeek 结算终场、背景比赛、财务与周事件并推进周次', () => {
    let completed: TurnResult | null = null
    let week = 0
    let financeBefore = 0
    for (let seed = 2026; seed < 2060 && !completed; seed += 1) {
      const started = startWeek(readyWorld(seed), PLAN)
      const live = structuredClone(started.world)
      autoResolveKeyMoments(live)
      week = live.week
      financeBefore = live.finance.ledger.length
      const result = completeWeek(live)
      if (result.event) completed = result
    }

    expect(completed).not.toBeNull()
    expect(completed!.live).toBe(false)
    expect(completed!.world.week).toBe(week + 1)
    expect(completed!.world.pendingWeekPlan).toBeNull()
    expect(completed!.match?.status).toBe('final')
    expect(completed!.world.lastMatch?.status).toBe('final')
    expect(completed!.world.fixtures[completed!.match!.fixtureId]!.status).toBe('played')
    expect(weekFixtures(completed!.world, week).every((fixture) => fixture.status === 'played')).toBe(true)
    expect(completed!.world.finance.ledger.length).toBeGreaterThan(financeBefore)
  })

  it('advanceWeek 保持一次推进一周的兼容语义', () => {
    const world = readyWorld()
    const result = advanceWeek(world, PLAN)

    expect(result.live).toBe(false)
    expect(result.world.week).toBe(world.week + 1)
    expect(result.match?.status).toBe('final')
    expect(result.world.pendingWeekPlan).toBeNull()
    expect(hasPendingKeyMoments(result.world)).toBe(false)
  })

  it('没有 pendingWeekPlan 的旧档完成回合后不会多推一周', () => {
    const started = startWeek(readyWorld(), PLAN)
    const legacy = structuredClone(started.world)
    legacy.pendingWeekPlan = null

    const result = completeWeek(legacy)

    expect(result.live).toBe(true)
    expect(result.world.week).toBe(started.world.week)
  })
})

describe('season rollover', () => {
  it('赛季最后一周在比赛完成后才触发赛季结算', () => {
    let world = readyWorld()
    let last: TurnResult | null = null
    for (let index = 0; index <= world.totalWeeks; index += 1) {
      last = advanceWeek(world, PLAN)
      world = last.world
      if (last.seasonTransition) break
    }

    expect(last?.seasonTransition).not.toBeNull()
    expect(last?.match?.status).toBe('final')
    expect(last?.match?.currentMinute).toBe(90)
    expect(last?.world.season).toBe(last!.seasonTransition!.newSeason)
  })
})
