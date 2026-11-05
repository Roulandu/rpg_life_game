import { describe, expect, it } from 'vitest'
import type { BeatInput } from '../../src/engine/matchBeats'
import type { Id, MatchLiveState, MatchReport } from '../../src/domain'
import { buildPitchFrame, computeClubStrength, displayName } from '../../src/domain'
import { createRng } from '../../src/lib'
import { startUserMatch } from '../../src/engine/liveMatch'
import { advanceLiveMinute } from '../../src/engine/liveMinute'
import { buildBeats } from '../../src/engine/matchBeats'
import { contextFor } from '../../src/engine/liveSetup'
import { rollUserMatchEvents } from '../../src/engine/matchUser'
import { playToKeyMoments } from '../fixtures/matchday'
import { soleAttackerLineups, subMatchCase, type SubMatchCase } from '../fixtures/substituteMatch'

function runBeats(input: BeatInput, minutes: number, userName: string) {
  let previous: MatchLiveState = { possession: 'home', ballX: 0.5 }
  const result = { carriers: [] as Id[], userEvents: 0, userNamed: 0 }
  for (let minute = 1; minute <= minutes; minute += 1) {
    const beats = buildBeats({ ...input, minute, previous })
    for (const step of beats.steps) if (step.carrierId) result.carriers.push(step.carrierId)
    if (beats.carrierId) result.carriers.push(beats.carrierId)
    for (const event of beats.events) {
      if (event.isUser) result.userEvents += 1
      if (event.text.includes(userName)) result.userNamed += 1
    }
    previous = beats.liveState
  }
  return result
}

function beatsInput(case_: ReturnType<typeof subMatchCase>): BeatInput {
  const homeClub = case_.world.clubs[case_.fixture.homeId]!
  const awayClub = case_.world.clubs[case_.fixture.awayId]!
  return {
    seed: case_.world.seed,
    fixtureId: case_.fixture.id,
    minute: 1,
    homeStrength: computeClubStrength(homeClub, case_.world.players),
    awayStrength: computeClubStrength(awayClub, case_.world.players),
    homeName: homeClub.nameZh,
    awayName: awayClub.nameZh,
    lineups: soleAttackerLineups(case_.world, case_.fixture, { userPlayed: true }),
    userEntryMinute: case_.entryMinute,
  }
}

describe('替补登场前的分钟闸门', () => {
  it('回归: 替补登场前的分钟里出现主角持球与射门文本', () => {
    const case_ = subMatchCase()
    const user = case_.world.players[case_.world.playerId]
    const name = displayName(user)

    // 对照组：不加分钟闸门时，主角作为唯一前场球员必然拿到球权并出现在事件文案里 —— 这就是真机现象
    const leak = runBeats({ ...beatsInput(case_), userEntryMinute: 0 }, case_.entryMinute - 1, name)
    expect(leak.carriers).toContain(user.id)
    expect(leak.userEvents).toBeGreaterThan(0)

    const gated = runBeats(beatsInput(case_), case_.entryMinute - 1, name)
    expect(gated.carriers).not.toContain(user.id)
    expect(gated.userEvents).toBe(0)
    expect(gated.userNamed).toBe(0)
  })

  it('回归: 球场帧在主角登场前把球画在他脚下', () => {
    const case_ = subMatchCase()
    const user = case_.world.players[case_.world.playerId]
    const input = {
      seed: case_.world.seed,
      fixtureId: case_.fixture.id,
      minute: 30,
      lineups: soleAttackerLineups(case_.world, case_.fixture, { userPlayed: true }),
      possession: case_.userSide,
      ballX: 0.62,
      userEntryMinute: case_.entryMinute,
    }

    // 对照组：唯一前场球员就是主角时，旧行为把他画成持球人
    expect(buildPitchFrame({ ...input, userEntryMinute: 0 }).carrierId).toBe(user.id)
    expect(buildPitchFrame({ ...input, userEntryMinute: 0, carrierId: user.id }).carrierId).toBe(user.id)

    expect(buildPitchFrame(input).carrierId).not.toBe(user.id)
    expect(buildPitchFrame({ ...input, carrierId: user.id }).carrierId).not.toBe(user.id)
  })

  it('回归: 主角的黄牌与受伤事件落在登场窗口内', () => {
    const case_ = subMatchCase()
    const world = case_.world
    const user = { ...world.players[world.playerId] }
    const report = {
      userPlayed: true,
      userStarted: false,
      userMinutes: case_.userMinutes,
      userGoals: 0,
      userAssists: 0,
    } as MatchReport

    let total = 0
    for (let index = 0; index < 300; index += 1) {
      const rolled = rollUserMatchEvents(world, user, report, createRng(world.seed, 'user-events', index))
      total += rolled.events.length
      for (const event of rolled.events) {
        expect(event.minute).toBeGreaterThanOrEqual(case_.entryMinute)
      }
    }
    expect(total).toBeGreaterThan(0)
  })
})

describe('替补场次从登场分钟开始播', () => {
  it('回归: 实时比赛从主角登场分钟开始播，而不是从 0 分钟空转', () => {
    const case_ = subMatchCase()
    const report = startUserMatch(case_.world, case_.fixture)

    expect(report.userPlayed).toBe(true)
    expect(report.userStarted).toBe(false)
    expect(report.currentMinute).toBe(case_.entryMinute)
    expect(report.events.filter((event) => event.isUser && event.minute < case_.entryMinute)).toEqual([])
  })

  it('回归: 快进到登场分钟与逐分钟模拟的累计统计完全一致', () => {
    const case_ = subMatchCase()
    const report = startUserMatch(case_.world, case_.fixture)
    const replayed = replayStatsTo(case_, report)

    expect(report.currentMinute).toBe(case_.entryMinute)
    expect(report.stats!.home.possession + report.stats!.away.possession).toBe(case_.entryMinute)
    expect(report.stats!.home.possession).toBe(replayed.home)
    expect(report.stats!.away.possession).toBe(replayed.away)
  })
})

describe('替补登场事件', () => {
  it('回归: 替补登场时战报里有一条且只有一条登场事件', () => {
    const case_ = subMatchCase()
    const report = startUserMatch(case_.world, case_.fixture)

    const subs = report.events.filter((event) => event.type === 'sub')
    expect(subs).toHaveLength(1)
    expect(subs[0]!.minute).toBe(case_.entryMinute)
    expect(subs[0]!.isUser).toBe(true)
    expect(subs[0]!.side).toBe(case_.userSide)
    expect(subs[0]!.text.includes(displayName(case_.world.players[case_.world.playerId]))).toBe(true)

    advanceLiveMinute(case_.world)
    advanceLiveMinute(case_.world)
    expect(report.events.filter((event) => event.type === 'sub')).toHaveLength(1)
  })

  it('首发与未出场都不产生登场事件', () => {
    const { report } = playToKeyMoments()
    expect(report.userStarted).toBe(true)
    expect(report.events.some((event) => event.type === 'sub')).toBe(false)
  })
})

function replayStatsTo(case_: SubMatchCase, report: MatchReport): { home: number; away: number } {
  const context = contextFor(case_.world, report)!
  let previous: MatchLiveState = { possession: 'home', ballX: 0.5 }
  let home = 0
  let away = 0
  for (let minute = 1; minute <= case_.entryMinute; minute += 1) {
    const beats = buildBeats({
      seed: case_.world.seed,
      fixtureId: report.fixtureId,
      minute,
      homeStrength: context.homeStrength,
      awayStrength: context.awayStrength,
      homeName: report.homeName,
      awayName: report.awayName,
      lineups: context.lineups,
      homeXg: context.homeXg,
      awayXg: context.awayXg,
      previous,
      momentum: { home: 1, away: 1 },
      userEntryMinute: case_.entryMinute,
    })
    home += beats.stats.home.possession ?? 0
    away += beats.stats.away.possession ?? 0
    previous = beats.liveState
  }
  return { home, away }
}
