import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, CURRENT_SAVE_VERSION, emptyAttrInvestment } from '../../src/domain'
import type { Player, WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { investAttribute } from '../../src/engine/growth'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { v7HalfWorld, v7LiveWorld, v7World } from '../fixtures/saveV7'

function everyPlayerHasLedger(world: WorldState): boolean {
  return Object.values(world.players).every(
    (player: Player) =>
      typeof player.exp === 'number' &&
      typeof player.lifetimeExp === 'number' &&
      ATTR_KEYS.every((key) => player.attrInvestment[key] === 0),
  )
}

describe('存档迁移 v7 -> v8 成长账本', () => {
  it('每个球员都拿到从零起步的经验与投资记录', () => {
    const world = v7World()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(everyPlayerHasLedger(migrated)).toBe(true)
  })

  it('脏档里已有的经验不被清零，缺字段的队友照常补齐', () => {
    const world = v7HalfWorld()

    const migrated = migrateWorld(world)
    const user = migrated.players[migrated.playerId]

    expect(user.exp).toBe(12)
    expect(user.lifetimeExp).toBe(30)
    expect(user.attrInvestment).toEqual(emptyAttrInvestment())
    const teammates = Object.values(migrated.players).filter((player) => player.id !== user.id)
    expect(teammates.every((player) => player.exp === 0 && player.lifetimeExp === 0)).toBe(true)
  })

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v7World(2026))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(restored.players[restored.playerId].attrInvestment).toEqual(emptyAttrInvestment())
  })

  it('v7 文件直接导入时一并完成迁移', () => {
    const text = exportWorld(v7World())

    const imported = importWorld(text)

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(imported.players[imported.playerId].exp).toBe(0)
  })

  it('停在开球的旧档迁移后能踢完，并按表现拿到经验', () => {
    const migrated = migrateWorld(v7LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
    const user = result.world.players[result.world.playerId]
    expect(user.exp).toBeGreaterThan(0)
    expect(user.lifetimeExp).toBe(user.exp)
  })

  it('迁移后的存档可以直接开始投资属性', () => {
    const migrated = migrateWorld(v7HalfWorld())
    const user = migrated.players[migrated.playerId]
    for (const key of ATTR_KEYS) user.attributes[key] = 30
    user.potential = 96
    user.lifetimeExp = 400

    const outcome = investAttribute(migrated, 'passing', 1)

    expect(outcome.ok).toBe(true)
    expect(user.exp).toBe(6)
    expect(user.attrInvestment.passing).toBe(1)
  })
})
