import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db/db'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld, loadWorld, summarizeWorld } from '../../src/db/repository'
import type { SaveRecord, WorldState } from '../../src/domain'
import { SAVE_FORMAT } from '../../src/domain/schema/save.schema'
import { canonicalStringify } from '../../src/lib/json'
import { hashString } from '../../src/lib/rng'
import { legacyWorld } from '../fixtures/legacySave'
import { TEST_NOW } from '../fixtures/career'

function v1Envelope(world: WorldState): string {
  return JSON.stringify({
    format: SAVE_FORMAT,
    saveVersion: 1,
    engineVersion: world.engineVersion,
    exportedAt: TEST_NOW,
    checksum: hashString(canonicalStringify(world)),
    world,
  })
}

describe('save migration v1 -> v2', () => {
  it('回归: v1 存档导入后报告变为终场，未完成关键回合仍保留', () => {
    const legacy = legacyWorld()
    const migrated = importWorld(v1Envelope(legacy))

    expect(migrated.version).toBe(2)
    expect(migrated.lastMatch?.status).toBe('final')
    expect(migrated.lastMatch?.currentMinute).toBe(90)
    expect(migrated.lastMatch?.goals).toEqual([])
    expect(migrated.lastMatch?.keyMoments?.[0]?.outcome).toBeUndefined()
    expect(migrated.pendingWeekPlan ?? null).toBeNull()
    expect(legacy.version).toBe(1)
  })

  it('迁移幂等，且 v1 校验和在实际迁移前核对', () => {
    const legacy = legacyWorld()
    const once = migrateWorld(legacy)
    const twice = migrateWorld(once)

    expect(twice).toBe(once)
    expect(legacy.lastMatch?.status).toBeUndefined()

    const broken = JSON.parse(v1Envelope(legacy)) as { checksum: string }
    broken.checksum = '00000000'
    expect(() => importWorld(JSON.stringify(broken))).toThrow(/校验失败/)
  })

  it('迁移后 v2 世界可深度往返', () => {
    const migrated = migrateWorld(legacyWorld())
    const roundTripped = importWorld(exportWorld(migrated))

    expect(migrated.version).toBe(2)
    expect(roundTripped).toEqual(migrated)
  })
})

describe('save migration on load', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
  })

  it('loadWorld 迁移数据库中的 v1 存档并回写', async () => {
    const legacy = legacyWorld()
    const record: SaveRecord = {
      id: 'save:legacy',
      summary: summarizeWorld(legacy, 'save:legacy'),
      world: legacy,
    }
    await db.saves.put(record)

    const loaded = await loadWorld('save:legacy')
    const stored = await db.saves.get('save:legacy')

    expect(loaded?.version).toBe(2)
    expect(stored?.world.version).toBe(2)
  })

  it('拒绝来自更新版本的世界数据', async () => {
    const future = legacyWorld()
    future.version = 3
    const record: SaveRecord = {
      id: 'save:future',
      summary: summarizeWorld(future, 'save:future'),
      world: future,
    }
    await db.saves.put(record)

    await expect(loadWorld('save:future')).rejects.toThrow(/更新版本/)
  })
})
