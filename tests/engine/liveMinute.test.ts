import { describe, expect, it } from 'vitest'
import type { MatchReport } from '../../src/domain'
import { advanceLiveMatch } from '../../src/engine/liveMatch'
import { advanceLiveMinute } from '../../src/engine/liveMinute'
import { startWeek } from '../../src/engine/turn'
import { hashState } from '../../src/lib'
import { PLAN, readyWorld } from '../fixtures/matchday'

function startAtZero(seed = 2026) {
  const started = startWeek(readyWorld(seed), PLAN)
  expect(started.live).toBe(true)
  return started.world
}

function advanceTo(world: ReturnType<typeof startAtZero>, minute: number) {
  let result = null
  while ((world.lastMatch?.currentMinute ?? 0) < minute) {
    result = advanceLiveMinute(world)
    expect(result).not.toBeNull()
    if (result?.paused || result?.finished) break
  }
  return result
}

describe('live minute kickoff', () => {
  it('startWeek 停在开球 0 分钟并保留全部关键回合', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport

    expect(report.currentMinute).toBe(0)
    expect(report.status).toBe('live')
    expect(report.keyMoments?.length ?? 0).toBeGreaterThan(0)
    expect(report.keyMoments?.every((moment) => moment.outcome === undefined)).toBe(true)
    expect(report.homeGoals).toBe(0)
    expect(report.awayGoals).toBe(0)
  })

  it('advanceLiveMinute 每次只推进一分钟并返回球权与球位', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport

    const first = advanceLiveMinute(world)
    expect(first).not.toBeNull()
    expect(report.currentMinute).toBe(1)
    expect(first!.minute).toBe(1)
    expect(['home', 'away']).toContain(first!.possession)
    expect(first!.ballX).toBeGreaterThanOrEqual(0)
    expect(first!.ballX).toBeLessThanOrEqual(1)

    advanceLiveMinute(world)
    expect(report.currentMinute).toBe(2)
  })
})

describe('live minute pause and batch parity', () => {
  it('关键回合分钟暂停，不自动进球也不生成攻防事件', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    const pauseMinute = report.keyMoments![0]!.minute

    advanceTo(world, pauseMinute)
    const paused = advanceLiveMinute(world)

    expect(paused?.paused).toBe(true)
    expect(report.currentMinute).toBe(pauseMinute)
    expect(report.events.filter((event) => event.minute === pauseMinute)).toHaveLength(0)
    expect(report.goals.some((goal) => goal.minute === pauseMinute)).toBe(false)
  })

  it('逐分钟推进与批量推进得到相同的终场报告', () => {
    const base = startAtZero()
    base.lastMatch!.keyMoments = []

    const batch = structuredClone(base)
    advanceLiveMatch(batch)

    const minute = structuredClone(base)
    let guard = 0
    while (minute.lastMatch!.currentMinute < 90 && guard < 120) {
      const result = advanceLiveMinute(minute)
      if (!result || result.paused) break
      guard += 1
    }

    expect(minute.lastMatch!.currentMinute).toBe(90)
    expect(hashState(minute.lastMatch)).toBe(hashState(batch.lastMatch))
  })
})

function completedReport(seed: number): MatchReport {
  const world = startAtZero(seed)
  const report = world.lastMatch as MatchReport
  report.keyMoments = []
  let guard = 0
  while (report.currentMinute < 90 && guard < 120) {
    const result = advanceLiveMinute(world)
    if (!result || result.paused) break
    guard += 1
  }
  return report
}

describe('live minute goal coherence', () => {
  it('每个进球分钟都有同侧射门事件，且进球数不超过射门数', () => {
    const reports = Array.from({ length: 10 }, (_, index) => completedReport(index + 1))
    const scored = reports.filter((report) => report.goals.length > 0)

    expect(scored.length).toBeGreaterThan(0)
    for (const report of scored) {
      for (const goal of report.goals) {
        const shot = report.events.find(
          (event) =>
            event.minute === goal.minute && event.type === 'shot' && event.side === goal.side,
        )
        expect(shot).toBeDefined()
      }
      expect(report.homeGoals).toBeLessThanOrEqual(report.stats!.home.shots)
      expect(report.awayGoals).toBeLessThanOrEqual(report.stats!.away.shots)
    }
  })

  it('每分钟推进后都写回 liveState，控球分钟总和等于已进行分钟数', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    report.keyMoments = []
    advanceTo(world, 30)

    expect(report.liveState).toBeDefined()
    expect(['home', 'away']).toContain(report.liveState!.possession)
    expect(report.liveState!.ballX).toBeGreaterThanOrEqual(0)
    expect(report.liveState!.ballX).toBeLessThanOrEqual(1)
    expect(report.stats!.home.possession + report.stats!.away.possession).toBe(
      report.currentMinute,
    )
  })

  it('关键回合暂停时球在进攻三区并立即持久化 liveState', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    const pauseMinute = report.keyMoments![0]!.minute

    advanceTo(world, pauseMinute)
    const paused = advanceLiveMinute(world)

    expect(paused?.paused).toBe(true)
    expect(report.liveState?.possession).toBe(paused!.possession)
    expect(report.liveState?.ballX).toBe(paused!.ballX)
    if (paused!.possession === 'home') expect(paused!.ballX).toBeGreaterThan(0.7)
    else expect(paused!.ballX).toBeLessThan(0.3)
  })
})

describe('live minute half time and full time', () => {
  it('45 分钟冻结半场比分，46 分钟后开始下半场', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    report.keyMoments = []

    advanceTo(world, 45)
    expect(report.halfTimeHomeGoals).toBeDefined()
    expect(report.halfTimeAwayGoals).toBeDefined()
    expect(report.events.some((event) => event.minute === 45 && event.type === 'info')).toBe(true)

    const frozen = [report.halfTimeHomeGoals, report.halfTimeAwayGoals]
    advanceLiveMinute(world)
    expect([report.halfTimeHomeGoals, report.halfTimeAwayGoals]).toEqual(frozen)
  })

  it('90 分钟返回 finished 且不自动终场', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    report.keyMoments = []

    let result = null
    while (report.currentMinute < 90) result = advanceLiveMinute(world)

    expect(result?.finished).toBe(true)
    expect(report.currentMinute).toBe(90)
    expect(report.status).toBe('live')
    expect(report.events.some((event) => event.type === 'fulltime')).toBe(false)
  })

  it('重复推进不会重复写事件、进球或统计', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    report.keyMoments = []
    advanceTo(world, 90)
    const snapshot = hashState(report)

    advanceLiveMinute(world)
    advanceLiveMinute(world)

    expect(hashState(report)).toBe(snapshot)
  })

  it('双方控球分钟之和等于已模拟分钟数，射正不超过射门', () => {
    const world = startAtZero()
    const report = world.lastMatch as MatchReport
    report.keyMoments = []
    advanceTo(world, 60)

    const stats = report.stats!
    expect(stats.home.possession + stats.away.possession).toBe(report.currentMinute)
    expect(stats.home.shotsOnTarget).toBeLessThanOrEqual(stats.home.shots)
    expect(stats.away.shotsOnTarget).toBeLessThanOrEqual(stats.away.shots)
  })
})
