import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, eventTemplateById } from '../../src/domain'
import type { GameEvent, WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { MIGRATION_STEPS } from '../../src/db/migrateSteps'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { v12CleanWorld, v12CrossSeasonWorld, v12LiveWorld } from '../fixtures/saveV12'

/** 夹具要整季逐周推进，满负荷跑全量时默认 5 秒不够。 */
const REPLAY_TIMEOUT = 25000

function eventsOfSeason(world: WorldState, season: number): GameEvent[] {
  return Object.values(world.events).filter((event) => event.season === season)
}

function fixturesOfSeason(world: WorldState, season: number): number {
  return Object.values(world.fixtures).filter((fixture) => fixture.season === season).length
}

function onceMemoryOf(world: WorldState | { eventOnceUsed?: string[] }): string[] | undefined {
  return (world as { eventOnceUsed?: string[] }).eventOnceUsed
}

/** 直接再跑一次清理步骤，用来证明重复执行不产生差异。 */
function runPrune(world: WorldState): void {
  const step = MIGRATION_STEPS.find((item) => item.from === 13)
  expect(step).toBeDefined()
  step!.run(world)
}

describe('存档迁移 v12 -> v13 跨季清理', () => {
  it('压着上一季数据的旧档迁移后只剩当季赛程', () => {
    const world = v12CrossSeasonWorld()
    const previous = world.season - 1
    expect(fixturesOfSeason(world, previous)).toBeGreaterThan(0)

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(CURRENT_SAVE_VERSION).toBe(13)
    expect(fixturesOfSeason(migrated, previous)).toBe(0)
    expect(fixturesOfSeason(migrated, migrated.season)).toBe(fixturesOfSeason(world, world.season))
  }, REPLAY_TIMEOUT)

  it('上一季的过期与未处理事件被清掉，玩家处理过的留着', () => {
    const world = v12CrossSeasonWorld()
    const previous = world.season - 1
    const stale = eventsOfSeason(world, previous).filter((event) => event.status !== 'resolved')
    const handled = eventsOfSeason(world, previous).filter((event) => event.status === 'resolved')
    expect(stale.length).toBeGreaterThan(0)
    expect(handled.length).toBeGreaterThan(0)

    const migrated = migrateWorld(world)

    for (const event of stale) expect(migrated.events[event.id]).toBeUndefined()
    for (const event of handled) expect(migrated.events[event.id]).toBeDefined()
    expect(eventsOfSeason(migrated, migrated.season)).toHaveLength(eventsOfSeason(world, world.season).length)
  }, REPLAY_TIMEOUT)

  it('once 模板的记忆在事件被删掉之前先记下来', () => {
    const world = v12CrossSeasonWorld()
    const previous = world.season - 1
    const expiredOnce = eventsOfSeason(world, previous)
      .filter((event) => event.status === 'expired' && eventTemplateById(event.templateId)?.once)
      .map((event) => event.templateId)
    expect(expiredOnce.length).toBeGreaterThan(0)

    const migrated = migrateWorld(world)

    expect(onceMemoryOf(migrated)).toEqual(expect.arrayContaining(expiredOnce))
  }, REPLAY_TIMEOUT)
})

describe('v13 迁移不动干净的存档，也不会重复改变', () => {
  it('只有当季数据的存档迁移后一字未改', () => {
    const world = v12CleanWorld()
    const snapshot = structuredClone(world)

    const migrated = migrateWorld(world)

    expect(migrated.events).toEqual(snapshot.events)
    expect(migrated.fixtures).toEqual(snapshot.fixtures)
    expect(migrated.players[snapshot.playerId]).toEqual(snapshot.players[snapshot.playerId])
    expect(migrated.seasonSummaries).toEqual(snapshot.seasonSummaries)
  }, REPLAY_TIMEOUT)

  it('重复迁移不产生差异，导出导入往返等值', () => {
    const migrated = migrateWorld(v12CrossSeasonWorld())
    const again = migrateWorld(migrated)
    expect(again).toBe(migrated)

    const copy = structuredClone(migrated)
    runPrune(copy)
    expect(copy).toEqual(migrated)

    expect(importWorld(exportWorld(migrated))).toEqual(migrated)
  }, REPLAY_TIMEOUT)

  it('停在开球的旧档迁移后能接着踢完', () => {
    const migrated = migrateWorld(v12LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
  }, REPLAY_TIMEOUT)

  it('清理掉的赛程让存档瘦身一半以上', () => {
    const world = v12CrossSeasonWorld()
    const migrated = migrateWorld(world)
    const before = JSON.stringify(world.fixtures).length
    const after = JSON.stringify(migrated.fixtures).length

    expect(after).toBeLessThan(before / 2)
  }, REPLAY_TIMEOUT)
})
