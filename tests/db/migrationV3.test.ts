import { describe, expect, it } from 'vitest'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { autoResolveKeyMoments, finalizeMatchday, hasPendingKeyMoments } from '../../src/engine'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import { finalV2World, liveV2World } from '../fixtures/saveV2'
import { legacyWorld } from '../fixtures/legacySave'

describe('save migration v2 -> v3', () => {
  it('v2 live 存档迁移到 v3 保留待处理回合并补齐首发与统计', () => {
    const { world } = liveV2World()
    const pending = world.pendingWeekPlan
    expect(world.version).toBe(2)
    expect(pending).toBeTruthy()
    expect(world.lastMatch?.stats).toBeUndefined()

    const migrated = migrateWorld(world)
    const report = migrated.lastMatch!

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.pendingWeekPlan).toEqual(pending)
    expect(report.status).toBe('live')
    expect(report.stats).toBeDefined()
    const stats = report.stats!
    expect(stats.home.possession + stats.away.possession).toBe(report.currentMinute)
    expect(stats.home.shots).toBe(report.homeGoals)
    expect(stats.away.shotsOnTarget).toBe(report.awayGoals)
    expect(report.lineups?.home).toHaveLength(11)
    expect(report.lineups?.away).toHaveLength(11)
  })

  it('v2 live 存档迁移后仍可继续并完成比赛', () => {
    const { world } = liveV2World()
    const migrated = migrateWorld(world)

    autoResolveKeyMoments(migrated)
    expect(hasPendingKeyMoments(migrated)).toBe(false)

    const report = finalizeMatchday(migrated)
    expect(report?.status).toBe('final')
    expect(report?.currentMinute).toBe(90)
    expect(report?.stats?.home.shots).toBeGreaterThanOrEqual(report?.homeGoals ?? 0)
  })

  it('v2 终场存档迁移后统计保持未定义且可深度往返', () => {
    const world = finalV2World()
    expect(world.lastMatch?.status).toBe('final')
    expect(world.lastMatch?.stats).toBeUndefined()

    const migrated = migrateWorld(world)
    expect(migrated.lastMatch?.stats).toBeUndefined()
    expect(migrated.lastMatch?.lineups).toBeUndefined()

    expect(importWorld(exportWorld(migrated))).toEqual(migrated)
  })

  it('v1 存档连续迁移到 v3 且只清空一次待办周计划', () => {
    const legacy = legacyWorld()
    legacy.pendingWeekPlan = { training: 'technical', extra: 'none', fixtureId: null }

    const once = migrateWorld(legacy)
    expect(once.version).toBe(CURRENT_SAVE_VERSION)
    expect(once.pendingWeekPlan ?? null).toBeNull()

    const twice = migrateWorld(once)
    expect(twice).toBe(once)
  })

  it('拒绝高于当前版本的存档', () => {
    const future = finalV2World()
    future.version = CURRENT_SAVE_VERSION + 1
    expect(() => migrateWorld(future)).toThrow(/更新版本/)
  })
})
