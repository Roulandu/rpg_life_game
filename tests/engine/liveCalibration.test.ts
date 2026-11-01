import { describe, expect, it } from 'vitest'
import type { MatchReport } from '../../src/domain'
import { advanceLiveMinute } from '../../src/engine/liveMinute'
import { contextFor } from '../../src/engine/liveSetup'
import { startWeek } from '../../src/engine/turn'
import { PLAN, readyWorld } from '../fixtures/matchday'

function playMatch(seed: number): { report: MatchReport; expected: number } {
  const world = readyWorld(seed)
  const started = startWeek(world, PLAN)
  expect(started.live).toBe(true)
  const report = started.world.lastMatch!
  report.keyMoments = []
  let guard = 0
  while (report.currentMinute < 90 && guard < 120) {
    const result = advanceLiveMinute(started.world)
    if (!result || result.paused) break
    guard += 1
  }
  const context = contextFor(started.world, report)
  expect(context).not.toBeNull()
  return { report, expected: context!.homeXg + context!.awayXg }
}

describe('live calibration', () => {
  it('多场模拟的总进球与 xG 处于同一量级', () => {
    const matches = Array.from({ length: 12 }, (_, index) => playMatch(index + 1))
    const goals = matches.reduce(
      (total, match) => total + match.report.homeGoals + match.report.awayGoals,
      0,
    )
    const expected = matches.reduce((total, match) => total + match.expected, 0)
    const ratio = goals / expected

    expect(ratio).toBeGreaterThanOrEqual(0.6)
    expect(ratio).toBeLessThanOrEqual(1.6)
  })

  it('射门、射正、角球与控球统计保持合理区间', () => {
    const matches = Array.from({ length: 12 }, (_, index) => playMatch(index + 1))
    for (const { report } of matches) {
      const stats = report.stats!
      expect(stats.home.shots).toBeGreaterThanOrEqual(report.homeGoals)
      expect(stats.away.shots).toBeGreaterThanOrEqual(report.awayGoals)
      expect(stats.home.shotsOnTarget).toBeLessThanOrEqual(stats.home.shots)
      expect(stats.away.shotsOnTarget).toBeLessThanOrEqual(stats.away.shots)
      expect(stats.home.corners).toBeLessThanOrEqual(20)
      expect(stats.away.corners).toBeLessThanOrEqual(20)
      expect(stats.home.possession + stats.away.possession).toBe(90)
    }
  })
})
