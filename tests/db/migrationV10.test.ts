import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import type { Relationship, WorldState } from '../../src/domain/types'
import { advanceDay, applyEffects } from '../../src/engine'
import { getRelationshipByRole } from '../../src/engine/relationships'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { v9HalfWorld, v9LiveWorld, v9World } from '../fixtures/saveV9'

function legendOf(world: WorldState): Relationship | undefined {
  return getRelationshipByRole(world, 'legend')
}

describe('存档迁移 v9 -> v10 名宿关系', () => {
  it('老档补出俱乐部名宿，id 与新生成的存档同一口径', () => {
    const world = v9World()
    expect(legendOf(world)).toBeUndefined()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(legendOf(migrated)?.role).toBe('legend')
    expect(legendOf(migrated)?.id).toBe(`rel:legend:${migrated.playerId}`)
    expect(legendOf(migrated)?.nameZh).toBe('俱乐部名宿')
  })

  it('已经有名宿的脏档保持原样，迁移不抹掉玩家刷出来的信任', () => {
    const migrated = migrateWorld(v9HalfWorld())

    expect(legendOf(migrated)?.trust).toBe(77)
    expect(legendOf(migrated)?.summary).toBe('他已经把你当成能教的人。')
    expect(Object.values(migrated.relationships).filter((item) => item.role === 'legend')).toHaveLength(1)
  })

  it('迁移后的存档接受名宿一课，legendTrust 真的写进关系里', () => {
    const migrated = migrateWorld(v9World())
    const before = legendOf(migrated)?.trust ?? 0

    applyEffects(migrated, [{ op: 'legendTrust', delta: 6 }], '课后道谢')

    expect(legendOf(migrated)?.trust).toBe(before + 6)
  })

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v9World(2026))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(legendOf(restored)?.role).toBe('legend')
  })

  it('v9 文件直接导入时一并完成迁移', () => {
    const imported = importWorld(exportWorld(v9World()))

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(legendOf(imported)?.role).toBe('legend')
  })

  it('停在开球的旧档迁移后能接着踢完', () => {
    const migrated = migrateWorld(v9LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')
    expect(legendOf(migrated)?.role).toBe('legend')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
    expect(legendOf(result.world)?.role).toBe('legend')
  })

  it('新生成的世界自带名宿，不需要迁移介入', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

    expect(legendOf(world)?.role).toBe('legend')
    expect(legendOf(world)?.trust).toBeGreaterThan(0)
  })
})
