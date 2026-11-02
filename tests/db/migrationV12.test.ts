import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import type { StaffCandidate, StaffMember } from '../../src/domain'
import type { WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { MIGRATION_STEPS } from '../../src/db/migrateSteps'
import { exportWorld, importWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { v11HiredWorld, v11LiveWorld, v11World } from '../fixtures/saveV11'

/** v11 的存档还没有名册字段，断言时按「可能缺失」的旧形状来看。 */
type StaffView = Partial<WorldState>

function staffOf(world: WorldState | StaffView): StaffMember[] | undefined {
  return world.staff
}

describe('存档迁移 v11 -> v12 个人团队名册', () => {
  it('老档补出空的团队名册，余额与球员一分不动', () => {
    const world = v11World()
    expect(staffOf(world)).toBeUndefined()
    const balance = world.finance.balance
    const ledger = world.finance.ledger.slice()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(staffOf(migrated)).toEqual([])
    expect(migrated.finance.balance).toBe(balance)
    expect(migrated.finance.ledger).toEqual(ledger)
    expect(migrated.players[migrated.playerId]).toEqual(world.players[world.playerId])
  })

  it('已经带着在职成员的脏档原样保留，迁移不清空名册', () => {
    const world = v11HiredWorld()
    const hired = staffOf(world)!.slice()

    const migrated = migrateWorld(world)

    expect(staffOf(migrated)).toEqual(hired)
    expect(staffOf(migrated)?.[0]?.id).toBe('staff:doctor:hayes')
  })

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v11World(2026))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(staffOf(restored)).toEqual([])
  })

  it('v11 文件直接导入时一并完成迁移', () => {
    const imported = importWorld(exportWorld(v11World()))

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(staffOf(imported)).toEqual([])
  })

  it('停在开球的旧档迁移后能接着踢完，名册保持空', () => {
    const migrated = migrateWorld(v11LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
    expect(staffOf(result.world)).toEqual([])
  })

  it('新生成的世界自带空名册，不需要迁移介入', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

    expect(world.version).toBe(CURRENT_SAVE_VERSION)
    expect(staffOf(world)).toEqual([])
  })

  it('名册成员与候选池同形：雇进来的人一定能在池里找到出处', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
    const candidate: StaffCandidate = {
      id: 'staff:trainer:vance',
      role: 'trainer',
      name: 'Marcus Vance',
      nameZh: '马库斯·万斯',
      quality: 91,
      weeklyCost: 12690,
    }

    world.staff.push({ ...candidate, hiredDay: 2 })

    expect(staffOf(world)).toHaveLength(1)
    expect(staffOf(world)?.[0]).toMatchObject({ id: candidate.id, weeklyCost: candidate.weeklyCost })
  })
})

describe('v12 迁移步骤在表里的登记', () => {
  it('迁移表里挂着 v11→v12 这一步：从表尾删掉它，老档就没有名册', () => {
    const step = MIGRATION_STEPS.find((item) => item.from === CURRENT_SAVE_VERSION)
    expect(step).toBeDefined()

    const legacy = v11World() as StaffView
    expect(legacy.staff).toBeUndefined()
    step!.run(legacy as WorldState)
    expect(legacy.staff).toEqual([])

    // 已带在职成员的脏档不能被这一步清空。
    const hired = v11HiredWorld()
    step!.run(hired)
    expect(hired.staff).toHaveLength(1)
  })
})
