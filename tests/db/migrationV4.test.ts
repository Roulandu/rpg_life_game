import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine/keyMoments'
import { finalV3World, liveV3World } from '../fixtures/saveV3'

describe('save migration v3 -> v4', () => {
  it('v3 live 存档补齐 liveState 并保留原有统计与首发', () => {
    const world = liveV3World()
    const stats = structuredClone(world.lastMatch!.stats)
    expect(world.version).toBe(3)
    expect(world.lastMatch?.liveState).toBeUndefined()

    const migrated = migrateWorld(world)
    const report = migrated.lastMatch!

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(report.liveState).toBeDefined()
    expect(['home', 'away']).toContain(report.liveState!.possession)
    expect(report.liveState!.ballX).toBeGreaterThanOrEqual(0)
    expect(report.liveState!.ballX).toBeLessThanOrEqual(1)
    expect(report.stats).toEqual(stats)
    expect(report.lineups?.home).toHaveLength(11)
  })

  it('v3 live 存档迁移后可以继续并完成比赛', () => {
    const migrated = migrateWorld(liveV3World())

    autoResolveKeyMoments(migrated)
    const report = finalizeMatchday(migrated)

    expect(report?.status).toBe('final')
    expect(report?.currentMinute).toBe(90)
    expect(report?.liveState).toBeUndefined()
  })

  it('v3 live 存档迁移后可导出导入深度往返', () => {
    const migrated = migrateWorld(liveV3World())
    expect(importWorld(exportWorld(migrated))).toEqual(migrated)
  })

  it('v3 终场存档不会凭空补 liveState，且可深度往返', () => {
    const world = finalV3World()
    expect(world.lastMatch?.status).toBe('final')

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.lastMatch?.liveState).toBeUndefined()
    expect(importWorld(exportWorld(migrated))).toEqual(migrated)
  })
})
