import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, resolveMoveTerms } from '../../src/domain'
import type { Player, WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { v8HalfWorld, v8LiveWorld, v8World } from '../fixtures/saveV8'

const NO_FOES = { keeper: null, marker: null, shooter: null }

function everyPlayerHoldsMoves(world: WorldState): boolean {
  return Object.values(world.players).every(
    (player: Player) => Array.isArray(player.moves) && player.moves.length === 0,
  )
}

describe('存档迁移 v8 -> v9 绝技账本与特训槽', () => {
  it('每个球员拿到空的绝技账本，周计划补上空的特训槽', () => {
    const world = v8World()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(everyPlayerHoldsMoves(migrated)).toBe(true)
    expect(migrated.weekPlan.specialization ?? null).toBeNull()
  })

  it('脏档里已有的绝技不被清空，缺字段的队友照常补齐', () => {
    const world = v8HalfWorld()

    const migrated = migrateWorld(world)
    const user = migrated.players[migrated.playerId]

    expect(user.moves).toEqual([{ moveId: 'mv_rainbow', level: 2, progress: 1 }])
    const teammates = Object.values(migrated.players).filter((player) => player.id !== user.id)
    expect(teammates.every((player) => player.moves?.length === 0)).toBe(true)
  })

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v8World(2026))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(restored.players[restored.playerId].moves).toEqual([])
  })

  it('v8 文件直接导入时一并完成迁移', () => {
    const text = exportWorld(v8World())

    const imported = importWorld(text)

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(imported.players[imported.playerId].moves).toEqual([])
  })

  it('停在开球的旧档迁移后能接着踢完', () => {
    const migrated = migrateWorld(v8LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
    expect(result.world.players[result.world.playerId].moves).toEqual([])
  })

  it('迁移后的存档立刻能把持有的绝技算进关键回合概率', () => {
    const migrated = migrateWorld(v8HalfWorld())
    const user = migrated.players[migrated.playerId]
    user.moves = [{ moveId: 'mv_rainbow', level: 3, progress: 0 }]

    const terms = resolveMoveTerms(user, 'oneOnOne', 'round', NO_FOES)

    expect(terms.map((term) => term.text)).toContain('彩虹过人 Ⅲ +10%')
    expect(terms[0].delta).toBeGreaterThan(0)
  })

  it('新生成的世界自带绝技账本，不需要玩家再手动补', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

    expect(everyPlayerHoldsMoves(world)).toBe(true)
    expect(world.weekPlan.specialization ?? null).toBeNull()
  })
})
