import { describe, expect, it } from 'vitest'
import { applyDailyTraining } from '../../src/engine/training'
import { dailyId, dayRng } from '../../src/engine/dayContext'
import { roundAttr } from '../../src/domain'
import { PLAN, readyWorld } from '../fixtures/matchday'

describe('日维度的随机域与 id', () => {
  it('同一周内七天生成的 id 互不相同', () => {
    const world = readyWorld()

    const ids = new Set<string>()
    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      ids.add(dailyId(world, 'news', 'recover'))
    }

    expect(ids.size).toBe(7)
    expect([...ids][0]).toContain(':2026:1:1:recover')
  })

  it('同一标签在七天走出不同的随机数，而不是把一结果重复七次', () => {
    const world = readyWorld()

    const draws = new Set<number>()
    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      draws.add(dayRng(world, 'training').int(1, 1_000_000))
    }

    expect(draws.size).toBe(7)
  })

  it('五天训练累积出可见成长，且每日成长量不是一串重复', () => {
    const world = readyWorld()
    world.weekPlan = PLAN
    const user = world.players[world.playerId]!
    user.potential = 96
    user.attributes.technique = 60
    const growth: number[] = []

    for (const day of [1, 2, 3, 4, 5]) {
      const before = user.attributes.technique
      world.day = day
      applyDailyTraining(world, 'technical')
      growth.push(roundAttr(user.attributes.technique - before))
    }

    expect(growth.every((value) => value > 0)).toBe(true)
    expect(growth.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0.01)
    expect(new Set(growth).size).toBeGreaterThan(1)
  })
})
