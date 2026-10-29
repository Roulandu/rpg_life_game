import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/db/db'
import {
  buildEnvelope,
  deleteSave,
  exportWorld,
  importWorld,
  listSaves,
  loadWorld,
  saveWorld,
  summarizeWorld,
} from '../../src/db/repository'
import type { SaveRecord } from '../../src/domain'
import { canonicalStringify } from '../../src/lib/json'
import { hashString } from '../../src/lib/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('save persistence', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
  })

  it('round-trips an exported save through JSON', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const imported = importWorld(exportWorld(world))
    expect(imported).toEqual(world)
    expect(imported.players[imported.playerId].name).toBe('测试球员')
  })

  it('persists finite club strength computed from domain', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    for (const club of Object.values(world.clubs)) {
      for (const value of Object.values(club.strength)) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(20)
        expect(value).toBeLessThanOrEqual(99)
      }
    }
  })

  it('keeps the envelope checksum identical after hashString moved to lib', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const envelope = buildEnvelope(world)
    expect(envelope.checksum).toBe(hashString(canonicalStringify(world)))
    expect(envelope.checksum).toMatch(/^[0-9a-f]{8}$/)
  })

  it('rejects a corrupted checksum', () => {
    const text = exportWorld(generateWorld(testOptions(), TEST_NOW))
    const corrupted = text.replace(/"checksum": "[0-9a-f]+"/, '"checksum": "00000000"')
    expect(() => importWorld(corrupted)).toThrow(/校验失败/)
  })

  it('rejects malformed JSON and newer save versions', () => {
    expect(() => importWorld('{not json')).toThrow(/JSON/)
    const text = exportWorld(generateWorld(testOptions(), TEST_NOW))
    const parsed = JSON.parse(text) as { saveVersion: number }
    parsed.saveVersion = 99
    expect(() => importWorld(JSON.stringify(parsed))).toThrow(/更新版本/)
  })

  it('stores, lists, loads and deletes saves', async () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    await saveWorld(world, 'save:test')

    const loaded = await loadWorld('save:test')
    expect(loaded).toEqual(world)

    const saves = await listSaves()
    expect(saves).toHaveLength(1)
    expect(saves[0].playerName).toBe('测试球员')
    expect(saves[0].clubName).toBe('伯明翰联')

    await deleteSave('save:test')
    expect(await loadWorld('save:test')).toBeNull()
    expect(await listSaves()).toHaveLength(0)
  })
})

describe('save list tolerance', () => {
  beforeEach(async () => {
    await db.saves.clear()
    await db.meta.clear()
  })

  it('skips a corrupt save instead of failing the whole list', async () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    await saveWorld(world, 'save:good')
    await saveWorld(world, 'save:good-2')

    const brokenWorld = structuredClone(world)
    ;(brokenWorld.players[brokenWorld.playerId] as unknown as { position: string }).position = 'XX'
    const record: SaveRecord = {
      id: 'save:broken',
      summary: summarizeWorld(world, 'save:broken'),
      world: brokenWorld,
    }
    await db.saves.put(record)

    const saves = await listSaves()

    expect(saves.map((save) => save.id)).toEqual(['save:good', 'save:good-2'])
  })
})
