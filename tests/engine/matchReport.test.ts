import { describe, expect, it } from 'vitest'
import { appendGoal } from '../../src/engine/matchReport'
import { startWeek } from '../../src/engine/turn'
import { PLAN, readyWorld } from '../fixtures/matchday'

function started() {
  const result = startWeek(readyWorld(), PLAN)
  const report = result.world.lastMatch!
  return { world: result.world, report }
}

describe('live report stats and lineups', () => {
  it('开球报告包含双方首发与全零统计', () => {
    const { report } = started()

    expect(report.lineups?.home).toHaveLength(11)
    expect(report.lineups?.away).toHaveLength(11)
    expect(report.stats).toEqual({
      home: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
      away: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
    })
  })

  it('进球只累加对应一方的射门与射正', () => {
    const { world, report } = started()
    const fixture = world.fixtures[report.fixtureId]!
    const homePlayer = report.lineups!.home[0]!
    const awayPlayer = report.lineups!.away[0]!

    appendGoal(report, fixture, {
      minute: 10,
      side: 'home',
      scorerId: homePlayer.id,
      scorerName: homePlayer.name,
    })
    expect(report.stats?.home.shots).toBe(1)
    expect(report.stats?.home.shotsOnTarget).toBe(1)
    expect(report.stats?.away.shots).toBe(0)

    appendGoal(report, fixture, {
      minute: 20,
      side: 'away',
      scorerId: awayPlayer.id,
      scorerName: awayPlayer.name,
    })
    expect(report.stats?.away.shots).toBe(1)
    expect(report.stats?.away.shotsOnTarget).toBe(1)
  })
})
