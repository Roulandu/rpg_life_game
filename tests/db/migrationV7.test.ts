import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, absoluteDay } from '../../src/domain'
import type { WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { v6BusySundayWorld, v6World } from '../fixtures/saveV6'

function eventCount(world: WorldState): number {
  return Object.keys(world.events).length
}

describe('存档迁移 v6 -> v7 每日事件', () => {
  it('老式周事件补齐日序、过期日、发件人与拦截性', () => {
    const world = v6World()

    const migrated = migrateWorld(world)
    const event = migrated.events['event:2026:6:coach_praise']!

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(event.day).toBe(7)
    expect(event.createdAtDay).toBe(absoluteDay(event.createdAtWeek, 7))
    expect(event.expiresDay).toBe(absoluteDay(event.expiresWeek, 7))
    expect(event.sender).toBe('教练')
    expect(event.blocking).toBe(true)
  })

  it('冷却表按模板建起来，未知模板落到兜底发件人', () => {
    const migrated = migrateWorld(v6World())
    const praise = migrated.events['event:2026:6:coach_praise']!
    const custom = migrated.events['event:2026:6:custom_talk']!

    expect(migrated.eventMemory.coach_praise).toBe(praise.createdAtDay)
    expect(migrated.eventMemory['legacy:coach_talk']).toBe(custom.createdAtDay)
    expect(custom.sender).toBe('俱乐部')
  })

  it('迁移后继续推进不会在同一天再生成事件', () => {
    const migrated = migrateWorld(v6BusySundayWorld())
    const before = eventCount(migrated)

    const result = advanceDay(migrated)

    expect(result.world.day).toBe(1)
    expect(eventCount(result.world)).toBe(before)
  })

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v6World(2026, 3))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(restored.eventMemory).toEqual(migrated.eventMemory)
  })

  it('v6 文件直接导入时一并完成迁移', () => {
    const text = exportWorld(v6World())

    const imported = importWorld(text)

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(imported.eventMemory).toEqual(expect.objectContaining({ coach_praise: expect.any(Number) }))
  })
})
