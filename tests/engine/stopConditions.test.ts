import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import {
  advanceDay,
  advanceUntilDecision,
  hasPendingKeyMoments,
  startDay,
} from '../../src/engine'
import { PLAN, readyWorld } from '../fixtures/matchday'

function stoppedOnMatchDay(seed = 2026): WorldState {
  const world = readyWorld(seed)
  world.day = 7
  world.weekPlan = PLAN
  const stopped = startDay(world)
  expect(stopped.live).toBe(true)
  return stopped.world
}

describe('日推进的停止条件', () => {
  it('有未完成关键回合时 startDay 直接返回 live 且不动时钟', () => {
    const world = stoppedOnMatchDay()

    const result = startDay(world)

    expect(result.live).toBe(true)
    expect(result.world.day).toBe(7)
    expect(result.world.pendingDayPlan).not.toBeNull()
    expect(hasPendingKeyMoments(result.world)).toBe(true)
  })

  it('advanceDay 自动处理关键回合并踢完这一天', () => {
    const world = stoppedOnMatchDay()

    const result = advanceDay(world)

    expect(result.live).toBe(false)
    expect(result.match?.status).toBe('final')
    expect(result.world.day).toBe(1)
    expect(result.world.pendingDayPlan).toBeNull()
    expect(hasPendingKeyMoments(result.world)).toBe(false)
  })

  it('快进遇到 live 比赛立即停止而不是自动踢完', () => {
    const world = readyWorld()
    world.weekPlan = PLAN

    // 每日事件也会成为停点：像玩家那样一路处理，直到停在比赛日。
    let fast = advanceUntilDecision(world, 7)
    for (let round = 0; round < 6 && fast.stopReason !== 'matchday'; round += 1) {
      fast = advanceUntilDecision(fast.days.at(-1)!.world, 7)
    }
    const pending = fast.days.at(-1)!.world

    expect(fast.stopReason).toBe('matchday')
    expect(hasPendingKeyMoments(pending)).toBe(true)
    expect(pending.lastMatch?.status).toBe('live')
  })
})

describe('日粒度伤停', () => {
  it('伤愈当天作为里程碑停下并播报复出', () => {
    const world = readyWorld()
    world.day = 2
    world.weekPlan = PLAN
    world.players[world.playerId]!.injury = { kind: '脚踝扭伤', daysLeft: 1, severity: 2 }

    const result = startDay(world)

    expect(result.stopReason).toBe('milestone')
    expect(result.world.players[result.world.playerId]!.injury).toBeNull()
    expect(result.world.news[0]?.title).toBe('伤愈复出')
  })

  it('伤停按天递减，三天伤停三天后复出', () => {
    let world = readyWorld()
    world.day = 1
    world.weekPlan = { training: 'recovery', extra: 'none' }
    world.players[world.playerId]!.injury = { kind: '膝盖不适', daysLeft: 3, severity: 1 }

    world = startDay(world).world
    expect(world.players[world.playerId]!.injury?.daysLeft).toBe(2)

    world = startDay(world).world
    expect(world.players[world.playerId]!.injury?.daysLeft).toBe(1)

    const healed = startDay(world).world
    expect(healed.players[healed.playerId]!.injury).toBeNull()
  })
})
