import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { playDay } from '../../src/engine/day'
import { TEST_NOW, testOptions } from '../fixtures/career'

/** 一整季逐日推进：计数事件条数与「有比赛的那一天是否真的出了赛后事件」。 */
function replaySeason(seed: number): { events: number; quietDays: number; matchDayEvents: number } {
  let world: WorldState = generateWorld(testOptions({ seed }), TEST_NOW)
  let events = 0
  let quietDays = 0
  let matchDayEvents = 0
  for (let index = 0; index < 266; index += 1) {
    const hadMatch = world.day >= 6 && Object.values(world.fixtures).some(
      (fixture) => fixture.week === world.week && (fixture.homeId === world.clubId || fixture.awayId === world.clubId),
    )
    const before = new Set(Object.keys(world.events))
    world = playDay(world, { autoResolve: true }).world
    // 跨季清理会删掉往季事件，所以「新增几条」只能按 id 比，不能拿键数量差值。
    const created = Object.keys(world.events).filter((id) => !before.has(id)).length
    events += created
    if (created === 0) quietDays += 1
    if (hadMatch && created > 0) matchDayEvents += 1
    if (world.retired) break
  }
  return { events, quietDays, matchDayEvents }
}

describe('全季事件节奏', () => {
  it('一季事件数落在 40–80 之间，不会退化成每周必出一条', () => {
    const total = replaySeason(42).events
    expect(total).toBeGreaterThanOrEqual(40)
    expect(total).toBeLessThanOrEqual(80)
  })

  it('存在大量没有任何事件的日子', () => {
    expect(replaySeason(42).quietDays).toBeGreaterThan(180)
  })

  it('种子 7 与种子 42 的节奏相近，不会因为某个种子失衡', () => {
    const a = replaySeason(42).events
    const b = replaySeason(7).events
    expect(Math.abs(a - b)).toBeLessThanOrEqual(25)
  })

  it('踢完比赛的日子会确定性地留下赛后事件', () => {
    expect(replaySeason(42).matchDayEvents).toBeGreaterThan(5)
  })
})
