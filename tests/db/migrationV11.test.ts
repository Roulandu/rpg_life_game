import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import type { Finance, WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { v10HalfWorld, v10LiveWorld, v10World } from '../fixtures/saveV10'

/** 结构检查只在测试里做一次窄断言：pending 与 investments 都在这个形状里。 */
type FinanceView = Finance & { pendingIncome?: number; pendingExpenses?: number; investments?: unknown[] }

function financeOf(world: WorldState): FinanceView {
  return world.finance as FinanceView
}

describe('存档迁移 v10 -> v11 待入账与投资账本', () => {
  it('老档补出零待入账与空投资账本，余额一分不动', () => {
    const world = v10World()
    const balance = world.finance.balance
    expect(financeOf(world).pendingIncome).toBeUndefined()
    expect(financeOf(world).investments).toBeUndefined()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(financeOf(migrated).pendingIncome).toBe(0)
    expect(financeOf(migrated).pendingExpenses).toBe(0)
    expect(financeOf(migrated).investments).toEqual([])
    expect(migrated.finance.balance).toBe(balance)
  })

  it('迁移不折现也不重复入账：补结构不额外产生流水', () => {
    const world = v10World()
    const ledgerBefore = world.finance.ledger.slice()

    const migrated = migrateWorld(world)

    expect(financeOf(migrated).pendingIncome).toBe(0)
    expect(migrated.finance.ledger).toHaveLength(ledgerBefore.length)
    // 建号那一刻余额与流水对得上：待入账是「还没进余额的钱」，迁移不得把它折进余额。
    expect(migrated.finance.balance).toBe(
      ledgerBefore.reduce((sum, entry) => sum + entry.amount, 0),
    )
    expect(migrated.finance.weeklyWage).toBeGreaterThan(0)
  })

  it('已经带投资与待入账的脏档原样保留，迁移不重开仓也不清仓', () => {
    const world = v10HalfWorld()
    const principal = world.finance.investments?.[0]?.principal ?? 0

    const migrated = migrateWorld(world)

    expect(migrated.finance.investments).toHaveLength(1)
    expect(migrated.finance.investments[0]?.id).toBe('inv:v10:saving')
    expect(migrated.finance.investments[0]?.principal).toBe(principal)
    expect(financeOf(migrated).pendingIncome).toBe(9000)
    expect(migrated.finance.ledger[0]?.type).toBe('investment')
  })
})

describe('v11 财务结构的导出导入与新世界', () => {

  it('导出再导入等值，重复迁移不再改变存档', () => {
    const migrated = migrateWorld(v10World(2026))

    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(financeOf(restored).investments).toEqual([])
  })

  it('v10 文件直接导入时一并完成迁移', () => {
    const imported = importWorld(exportWorld(v10World()))

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(financeOf(imported).pendingExpenses).toBe(0)
  })

  it('停在开球的旧档迁移后能接着踢完', () => {
    const migrated = migrateWorld(v10LiveWorld())
    expect(migrated.lastMatch?.status).toBe('live')

    const result = advanceDay(migrated)

    expect(result.world.lastMatch?.status).toBe('final')
    expect(financeOf(result.world).investments).toEqual([])
  })

  it('新生成的世界自带待入账与投资账本，不需要迁移介入', () => {
    const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

    expect(world.version).toBe(CURRENT_SAVE_VERSION)
    expect(financeOf(world).pendingIncome).toBe(0)
    expect(financeOf(world).pendingExpenses).toBe(0)
    expect(world.finance.investments).toEqual([])
  })
})
