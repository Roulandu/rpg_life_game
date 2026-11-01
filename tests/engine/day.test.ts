import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { advanceUntilDecision, hasPendingKeyMoments, startDay } from '../../src/engine'
import { hashState } from '../../src/lib'
import { PLAN, readyWorld } from '../fixtures/matchday'

function atDay(seed: number, day: number, week = 1): WorldState {
  const world = readyWorld(seed)
  world.week = week
  world.day = day
  return world
}

describe('逐日时钟', () => {
  it('一次 startDay 只让日序加一，周次不变', () => {
    const world = atDay(2026, 2)

    const result = startDay(world)

    expect(result.dayPlayed).toBe(2)
    expect(result.world.day).toBe(3)
    expect(result.world.week).toBe(world.week)
    expect(result.live).toBe(false)
  })

  it('第 7 天结束后进入下一周并回到周一', () => {
    // 第 2 周的联赛安排在周中，周日没有场次，正好用来观察跨周边界。
    const world = atDay(2026, 7, 2)

    const result = startDay(world)

    expect(result.world.day).toBe(1)
    expect(result.world.week).toBe(world.week + 1)
  })

  it('停在比赛日时时钟不动并写入 pendingDayPlan', () => {
    const world = atDay(2026, 7)
    world.weekPlan = PLAN

    const result = startDay(world)

    expect(result.live).toBe(true)
    expect(result.stopReason).toBe('matchday')
    expect(result.world.day).toBe(7)
    expect(result.world.week).toBe(world.week)
    expect(result.match?.status).toBe('live')
    expect(result.world.pendingDayPlan?.fixtureId).toBe(result.match?.fixtureId)
    expect(hasPendingKeyMoments(result.world)).toBe(true)
  })

  it('重复 startDay 不会重复训练或生成回合', () => {
    const world = atDay(2026, 7)
    world.weekPlan = PLAN

    const first = startDay(world)
    const second = startDay(first.world)

    expect(second.live).toBe(true)
    expect(hashState(second.world)).toBe(hashState(first.world))
  })

  it('快进在有比赛的一周停在比赛日并统计平静日', () => {
    const world = readyWorld()
    world.weekPlan = PLAN

    // 每日事件同样会让快进停下，所以按玩家的方式一路推到比赛日：中途停点只能是事件。
    let fast = advanceUntilDecision(world, 7)
    const stops = [fast.stopReason]
    let quietDays = fast.quietDays
    for (let round = 0; round < 6 && fast.stopReason !== 'matchday'; round += 1) {
      fast = advanceUntilDecision(fast.days.at(-1)!.world, 7)
      stops.push(fast.stopReason)
      quietDays += fast.quietDays
    }
    const last = fast.days.at(-1)!

    expect(fast.stopReason).toBe('matchday')
    expect(last.live).toBe(true)
    expect(last.world.day).toBe(7)
    expect(quietDays).toBeGreaterThan(0)
    expect(stops.every((reason) => reason === 'matchday' || reason === 'event')).toBe(true)
  })
})
