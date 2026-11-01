import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, DEFAULT_WEEK_PLAN, dayForRound, fixtureDayOf } from '../../src/domain'
import { advanceDay, hasPendingKeyMoments } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { PLAN } from '../fixtures/matchday'
import { v4World } from '../fixtures/saveV4'

describe('存档迁移 v4 -> v5 日时钟', () => {
  it('补齐日时钟、周模板与每一场比赛的周内日', () => {
    const world = v4World()

    const migrated = migrateWorld(world)

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.day).toBe(1)
    expect(migrated.weekPlan).toEqual(DEFAULT_WEEK_PLAN)
    expect(migrated.pendingDayPlan).toBeNull()
    for (const fixture of Object.values(migrated.fixtures)) {
      expect(fixture.day).toBe(dayForRound(fixture.round))
    }
  })

  it('伤停从按周换算成按天', () => {
    const world = v4World(2026, { injuryWeeks: 3 })

    const migrated = migrateWorld(world)
    const injury = migrated.players[migrated.playerId]!.injury!

    expect(injury.daysLeft).toBe(21)
    expect((injury as { weeksLeft?: number }).weeksLeft).toBeUndefined()
  })

  it('停在开球的 live 存档迁移后能接着踢完这一天', () => {
    const world = v4World(2026, { live: true })
    const report = world.lastMatch!

    const migrated = migrateWorld(world)

    expect(migrated.day).toBe(fixtureDayOf(migrated.fixtures[report.fixtureId]!))
    expect(migrated.week).toBe(report.week)
    expect(migrated.pendingDayPlan?.fixtureId).toBe(report.fixtureId)
    expect(hasPendingKeyMoments(migrated)).toBe(true)

    const played = advanceDay(migrated)
    expect(played.match?.status).toBe('final')
    expect(played.world.day).toBe(1)
    expect(played.world.week).toBe(report.week + 1)
    expect(played.world.pendingDayPlan).toBeNull()
  })

  it('迁移结果导出后可原样导入，且再次迁移不产生新状态', () => {
    const migrated = migrateWorld(v4World(2026, { live: true }))
    const restored = importWorld(exportWorld(migrated))
    const twice = migrateWorld(migrated)

    expect(restored).toEqual(migrated)
    expect(twice).toBe(migrated)
    expect(restored.pendingDayPlan?.training).toBe(PLAN.training)
  })
})
