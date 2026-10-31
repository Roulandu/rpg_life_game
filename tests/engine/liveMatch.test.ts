import { describe, expect, it } from 'vitest'
import type { KeyMoment, KeyMomentOption, MatchReport, WorldState } from '../../src/domain/types'
import { createRng, hashState } from '../../src/lib'
import {
  autoResolveKeyMoments,
  finalizeMatchday,
  resolveKeyMoment,
} from '../../src/engine/keyMoments'
import { advanceLiveMatch } from '../../src/engine/liveMatch'
import { finalizeLiveMatch } from '../../src/engine/matchFinalize'
import { pickScorer } from '../../src/engine/matchGoals'
import { playToKeyMoments, readyWorld } from '../fixtures/matchday'

function scoreFromGoals(report: MatchReport, upTo = report.currentMinute): { home: number; away: number } {
  let home = 0
  let away = 0
  for (const goal of report.goals) {
    if (goal.minute > upTo) continue
    if (goal.side === 'home') home += 1
    else away += 1
  }
  return { home, away }
}

function expectLiveConsistency(report: MatchReport): void {
  const score = scoreFromGoals(report)
  expect(report.homeGoals).toBe(score.home)
  expect(report.awayGoals).toBe(score.away)
  expect(report.goals.every((goal) => goal.minute <= report.currentMinute)).toBe(true)
  expect(report.events.every((event) => event.minute <= report.currentMinute)).toBe(true)
  expect(report.events.some((event) => event.type === 'fulltime')).toBe(false)
  expect(report.userRating).toBeNull()
  expect(report.mediaReaction).toBeUndefined()
}

function scoringOption(moment: KeyMoment): KeyMomentOption | undefined {
  return moment.options.find((option) => option.goalOnSuccess)
}

function liveWithScoringMoment(): { world: WorldState; report: MatchReport; moment: KeyMoment; option: KeyMomentOption } {
  for (let seed = 2026; seed < 2080; seed += 1) {
    const { world, report } = playToKeyMoments(seed)
    for (const moment of report.keyMoments ?? []) {
      if (moment.outcome) continue
      const option = scoringOption(moment)
      if (option) return { world, report, moment, option }
      resolveKeyMoment(world, moment.id, moment.defaultOptionId)
    }
  }
  throw new Error('No scoring key moment found')
}

describe('live match', () => {
  it('回归: 首个关键回合前的比分只含已发生的进球，不是终场比分', () => {
    for (let seed = 2026; seed < 2032; seed += 1) {
      const { report } = playToKeyMoments(seed)
      expect(report.status).toBe('live')
      expect(report.currentMinute).toBe(report.keyMoments?.[0]?.minute)
      expectLiveConsistency(report)
    }
  })

  it('实时比分始终等于截至当前分钟的进球之和', () => {
    const { world, report } = playToKeyMoments()
    expectLiveConsistency(report)
    const first = report.keyMoments?.find((moment) => !moment.outcome)
    expect(first).toBeDefined()
    resolveKeyMoment(world, first!.id, first!.defaultOptionId)
    expectLiveConsistency(report)
    const next = report.keyMoments?.find((moment) => !moment.outcome)
    expect(report.currentMinute).toBe(next ? next.minute : 90)
  })

  it('半场比分在 45 分钟后冻结，且只统计上半场进球', () => {
    const { world, report } = playToKeyMoments()
    autoResolveKeyMoments(world)
    expect(report.halfTimeHomeGoals).toBe(
      report.goals.filter((goal) => goal.side === 'home' && goal.minute <= 45).length,
    )
    expect(report.halfTimeAwayGoals).toBe(
      report.goals.filter((goal) => goal.side === 'away' && goal.minute <= 45).length,
    )
    expect(report.events.some((event) => event.type === 'info' && event.minute === 45)).toBe(true)
    const frozen = [report.halfTimeHomeGoals, report.halfTimeAwayGoals]
    advanceLiveMatch(world)
    expect([report.halfTimeHomeGoals, report.halfTimeAwayGoals]).toEqual(frozen)
  })
})

describe('live match substitutions', () => {
  it('替补登场前不会成为进球者，登场后可以进球', () => {
    const world = readyWorld(2027)
    const user = world.players[world.playerId]
    const club = world.clubs[world.clubId]
    for (const id of club.squadIds) {
      const player = world.players[id]
      if (!player || player.id === user.id) continue
      player.attributes.shooting = 0
      player.attributes.passing = 0
    }
    user.attributes.shooting = 100
    user.attributes.passing = 100

    const before = Array.from({ length: 40 }, (_, index) =>
      pickScorer({
        world,
        club,
        userClubId: world.clubId,
        minute: 10 + index,
        userEntryMinute: 70,
        userPlayed: true,
        rng: createRng(world.seed, 'sub-before', index),
      }),
    )
    expect(before.some((player) => player.id === user.id)).toBe(false)

    let appeared = false
    for (let index = 0; index < 200 && !appeared; index += 1) {
      const scorer = pickScorer({
        world,
        club,
        userClubId: world.clubId,
        minute: 75,
        userEntryMinute: 70,
        userPlayed: true,
        rng: createRng(world.seed, 'sub-after', index),
      })
      appeared = scorer.id === user.id
    }
    expect(appeared).toBe(true)
  })
})

describe('live key moments', () => {
  it('关键回合成功后立即改写实时比分与 fixture', () => {
    const { world, report, moment, option } = liveWithScoringMoment()
    const fixture = world.fixtures[report.fixtureId]!
    const beforeGoals = report.goals.length
    moment.roll = 0
    const resolved = resolveKeyMoment(world, moment.id, option.id)

    expect(resolved).not.toBeNull()
    expect(moment.outcome?.success).toBe(true)
    expect(moment.outcome?.goal).toBe(true)
    expect(report.goals.length).toBeGreaterThan(beforeGoals)
    const goal = report.goals.find((item) => item.fromKeyMoment && item.minute === moment.minute)
    expect(goal?.isUser).toBe(true)
    expect(fixture.homeGoals).toBe(report.homeGoals)
    expect(fixture.awayGoals).toBe(report.awayGoals)
    expectLiveConsistency(report)
  })

  it('关键回合失败不增加关键回合进球', () => {
    const { world, report, moment, option } = liveWithScoringMoment()
    const before = report.goals.filter(
      (goal) => goal.fromKeyMoment && goal.minute === moment.minute,
    ).length
    moment.roll = 0.9999
    resolveKeyMoment(world, moment.id, option.id)

    expect(moment.outcome?.success).toBe(false)
    expect(moment.outcome?.goal).toBe(false)
    expect(
      report.goals.filter((goal) => goal.fromKeyMoment && goal.minute === moment.minute).length,
    ).toBe(before)
  })
})

describe('live match finalization', () => {
  it('赛季数据与评分只在终场结算一次', () => {
    const { world, report } = playToKeyMoments()
    const user = world.players[world.playerId]
    const before = { ...user.seasonStats }

    autoResolveKeyMoments(world)
    expect(report.status).toBe('live')
    expect(user.seasonStats).toEqual(before)
    expect(report.userRating).toBeNull()

    finalizeMatchday(world)
    expect(report.status).toBe('final')
    expect(report.currentMinute).toBe(90)
    expect(report.userRating).not.toBeNull()
    expect(report.motmName.length).toBeGreaterThan(0)
    expect(user.seasonStats.appearances).toBe(before.appearances + (report.userPlayed ? 1 : 0))
    expect(user.seasonStats.goals).toBe(before.goals + report.userGoals)
    expect(user.seasonStats.assists).toBe(before.assists + report.userAssists)
  })

  it('同一存档暂停后继续与一次性模拟结果一致', () => {
    const { world } = playToKeyMoments()
    const oneShot = structuredClone(world)
    autoResolveKeyMoments(oneShot)
    finalizeMatchday(oneShot)

    const resumed = structuredClone(world)
    advanceLiveMatch(resumed)
    advanceLiveMatch(resumed)
    autoResolveKeyMoments(resumed)
    finalizeMatchday(resumed)

    expect(hashState(resumed.lastMatch)).toBe(hashState(oneShot.lastMatch))
  })

  it('终场结算幂等，不重复统计或发布新闻', () => {
    const { world } = playToKeyMoments()
    autoResolveKeyMoments(world)
    finalizeMatchday(world)
    const report = world.lastMatch!
    const user = world.players[world.playerId]
    const snapshot = {
      goals: report.goals.length,
      events: report.events.length,
      news: world.news.length,
      seasonGoals: user.seasonStats.goals,
      appearances: user.seasonStats.appearances,
    }

    const again = finalizeLiveMatch(world)

    expect(again).toBe(report)
    expect(report.goals.length).toBe(snapshot.goals)
    expect(report.events.length).toBe(snapshot.events)
    expect(world.news.length).toBe(snapshot.news)
    expect(user.seasonStats.goals).toBe(snapshot.seasonGoals)
    expect(user.seasonStats.appearances).toBe(snapshot.appearances)
  })
})
