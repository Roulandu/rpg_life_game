import { describe, expect, it } from 'vitest'
import { advanceWeek } from '../../src/engine/turn'
import { endSeason, resolveEvent } from '../../src/engine'
import { EVENT_TEMPLATES } from '../../src/domain'
import type { GameEvent, WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const SEED = 42
const PLAN = { training: 'technical', extra: 'none' } as const
const WEEKS_PER_SEASON = 38
/** 整季逐周推进要几秒，满负荷跑全量时默认 5 秒不够。 */
const REPLAY_TIMEOUT = 25000

const ONCE_IDS = new Set(EVENT_TEMPLATES.filter((tpl) => tpl.once).map((tpl) => tpl.id))

function fixtureCountOfSeason(world: WorldState, season: number): number {
  return Object.values(world.fixtures).filter((fixture) => fixture.season === season).length
}

function eventsOfSeason(world: WorldState, season: number): GameEvent[] {
  return Object.values(world.events).filter((event) => event.season === season)
}

function onceIdsOf(world: WorldState, season: number): string[] {
  return eventsOfSeason(world, season)
    .filter((event) => ONCE_IDS.has(event.templateId))
    .map((event) => event.templateId)
}

interface Switch {
  before: WorldState
  after: WorldState
}

let switchSnapshot: Switch | null = null

/** 第 38 周那一次推进同时完成结算与开新局，前后各留一份快照给断言用。 */
function seasonSwitch(): Switch {
  if (switchSnapshot) return switchSnapshot
  let world = generateWorld(testOptions({ seed: SEED }), TEST_NOW)
  for (let week = 1; week < WEEKS_PER_SEASON; week += 1) {
    world = advanceWeek(world, PLAN).world
  }
  const before = structuredClone(world)
  const after = advanceWeek(world, PLAN).world
  switchSnapshot = { before, after }
  return switchSnapshot
}

let sightings: Map<string, Set<string>> | null = null

/** 连跑两季、逐周记下每个 once 模板生下过哪几条事件（同一条会在存档里留好几周，所以按事件 id 去重）。 */
function onceSightings(): Map<string, Set<string>> {
  if (sightings) return sightings
  let world = generateWorld(testOptions({ seed: SEED }), TEST_NOW)
  const firedByTemplate = new Map<string, Set<string>>()
  for (let week = 1; week <= WEEKS_PER_SEASON * 2; week += 1) {
    world = advanceWeek(world, PLAN).world
    for (const event of Object.values(world.events)) {
      if (!ONCE_IDS.has(event.templateId)) continue
      const ids = firedByTemplate.get(event.templateId) ?? new Set<string>()
      ids.add(event.id)
      firedByTemplate.set(event.templateId, ids)
    }
  }
  sightings = firedByTemplate
  return sightings
}

describe('跨季清理：赛程', () => {
  it('进入新赛季后，上一季的赛程整批不在存档里', () => {
    const { before, after } = seasonSwitch()
    expect(before.season).toBe(after.season - 1)
    expect(fixtureCountOfSeason(before, before.season)).toBeGreaterThan(0)

    expect(fixtureCountOfSeason(after, before.season)).toBe(0)
    expect(Object.values(after.fixtures).every((fixture) => fixture.season === after.season)).toBe(true)
  }, REPLAY_TIMEOUT)

  it('新赛季自己的赛程一条不少', () => {
    const { before, after } = seasonSwitch()

    expect(fixtureCountOfSeason(after, after.season)).toBe(fixtureCountOfSeason(before, before.season))
    expect(fixtureCountOfSeason(after, after.season)).toBeGreaterThan(0)
  }, REPLAY_TIMEOUT)

  it('清理只删赛程，历史与赛季摘要照旧读得到', () => {
    const { before, after } = seasonSwitch()
    const historyEntries = before.players[before.playerId]?.history.length ?? 0

    expect(after.seasonSummaries).toHaveLength(before.seasonSummaries.length + 1)
    expect(after.players[after.playerId]?.history.length).toBeGreaterThan(historyEntries)
  }, REPLAY_TIMEOUT)
})

describe('跨季清理：事件', () => {
  it('上一季已过期的事件不再留在存档里', () => {
    const { before, after } = seasonSwitch()
    const stale = eventsOfSeason(before, before.season).filter((event) => event.status === 'expired')
    expect(stale.length).toBeGreaterThan(0)

    const leftovers = eventsOfSeason(after, before.season).filter((event) => event.status === 'expired')
    expect(leftovers).toHaveLength(0)
  }, REPLAY_TIMEOUT)

  it('玩家亲手处理过的事件不会因为跨季清理而消失', () => {
    const { before } = seasonSwitch()
    const world = structuredClone(before)
    const open = Object.values(world.events).find((event) => event.status === 'open')
    expect(open).toBeDefined()
    const choice = open!.choices[0]
    expect(choice).toBeDefined()
    const resolved = resolveEvent(world, open!.id, choice!.id)
    expect(resolved?.status).toBe('resolved')

    endSeason(world)

    expect(world.events[open!.id]).toMatchObject({ status: 'resolved', season: before.season })
  }, REPLAY_TIMEOUT)

  it('once 模板的事件被清掉后，记忆还在', () => {
    const { before, after } = seasonSwitch()
    const firedOnce = new Set(onceIdsOf(before, before.season))
    expect(firedOnce.size).toBeGreaterThan(0)

    expect(after.eventOnceUsed).toEqual(expect.arrayContaining([...firedOnce]))
  }, REPLAY_TIMEOUT)

  it('同一模板跨两季也不会再发一次', () => {
    // 两季逐周采样约 8 秒，默认 5 秒超时会在满负荷跑全量时不够用。
    const firedByTemplate = onceSightings()
    const repeats = [...firedByTemplate].filter(([, ids]) => ids.size > 1).map(([id]) => id)
    expect(repeats).toEqual([])
  }, REPLAY_TIMEOUT)
})
