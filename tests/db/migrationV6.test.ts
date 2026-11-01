import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../../src/domain'
import type { MatchReport, WorldState } from '../../src/domain/types'
import { advanceDay, hasPendingKeyMoments } from '../../src/engine'
import { migrateWorld } from '../../src/db/migrate'
import { exportWorld, importWorld } from '../../src/db/repository'
import { LATIN, latinPlayerNames, leaks, reportTexts } from '../fixtures/naming'
import { v4World } from '../fixtures/saveV4'
import { latinNameOf, v5GoalWorld, v5LiveWorld, v5World } from '../fixtures/saveV5'

function everyNamed(world: WorldState): Array<{ name: string; nameZh: string }> {
  return [
    ...Object.values(world.players),
    ...Object.values(world.clubs).map((club) => club.coach),
    ...Object.values(world.relationships),
  ]
}

/** 战报里点名过的人：迁移后这些拉丁原名必须从文本里彻底消失。 */
function latinRosterOf(migrated: WorldState, report: MatchReport): string[] {
  const entries = [...(report.lineups?.home ?? []), ...(report.lineups?.away ?? [])]
  return entries
    .map((entry) => migrated.players[entry.id]?.name ?? entry.name)
    .filter((name) => LATIN.test(name))
}

function latinPlayerId(world: WorldState, latin: string): string {
  const player = Object.values(world.players).find((item) => item.name === latin)
  if (!player) throw new Error('找不到拉丁原名球员')
  return player.id
}

describe('存档迁移 v5 -> v6 中文人名', () => {
  it('每个球员、教练与关系人物都拿到不含拉丁字母的中文名', () => {
    const migrated = migrateWorld(v5World())

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    for (const entity of everyNamed(migrated)) {
      expect(entity.nameZh, entity.name).toBeTruthy()
      if (LATIN.test(entity.name)) expect(entity.nameZh).not.toMatch(LATIN)
    }
  })

  it('新闻与事件正文里的拉丁原名被换成中文名', () => {
    const world = v5World()
    const latin = latinNameOf(world)

    const migrated = migrateWorld(world)
    const news = migrated.news[0]!
    const event = migrated.events['event:2026:fixture']!
    const localized = migrated.players[latinPlayerId(migrated, latin)].nameZh

    expect(news.body).not.toContain(latin)
    expect(news.body).toContain(localized)
    expect(event.body).not.toMatch(LATIN)
  })

  it('战报文本、进球人、助攻人与全场最佳全部汉化，首发名单补回中文名', () => {
    const migrated = migrateWorld(v5LiveWorld())
    const report = migrated.lastMatch!

    expect(report.lineups).toBeDefined()
    for (const entry of [...report.lineups!.home, ...report.lineups!.away]) {
      expect(entry.nameZh).toBe(migrated.players[entry.id]?.nameZh)
    }
    for (const goal of report.goals) {
      expect(goal.scorerName).toBe(migrated.players[goal.scorerId]?.nameZh)
      if (goal.assistName) expect(goal.assistName).toBe(migrated.players[goal.assistId!]?.nameZh)
    }
    expect(report.motmName).not.toMatch(LATIN)
    expect(leaks(reportTexts(report), latinRosterOf(migrated, report))).toEqual([])
  })

  it('无助攻进球不会被补上假助攻，有助攻的进球一并汉化', () => {
    const migrated = migrateWorld(v5GoalWorld())
    const goals = migrated.lastMatch!.goals

    expect(goals).toHaveLength(2)
    expect(goals[0].assistName).toBeUndefined()
    expect(goals[0].scorerName).toBe(migrated.players[goals[0].scorerId].nameZh)
    expect(goals[1].assistName).toBe(migrated.players[goals[1].assistId!].nameZh)
    expect(goals[1].assistName).not.toMatch(LATIN)
  })

  it('关系摘要里的队友名字也被汉化', () => {
    const migrated = migrateWorld(v5LiveWorld())
    const latinNames = latinPlayerNames(migrated)

    expect(leaks(Object.values(migrated.relationships).map((item) => item.summary), latinNames)).toEqual([])
  })
})

describe('存档迁移 v5 -> v6 后的可玩性', () => {
  it('迁移后的 live 存档能接着把关键回合踢完，终场文本仍是中文', () => {
    const migrated = migrateWorld(v5LiveWorld())
    expect(hasPendingKeyMoments(migrated)).toBe(true)

    const played = advanceDay(migrated)
    const report = played.match!

    expect(report.status).toBe('final')
    expect(played.world.pendingDayPlan).toBeNull()
    expect(leaks(reportTexts(report), latinRosterOf(played.world, report))).toEqual([])
  })

  it('v4 存档沿链迁移后同样拿到中文名', () => {
    const migrated = migrateWorld(v4World())

    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    for (const entity of everyNamed(migrated)) {
      if (LATIN.test(entity.name)) expect(entity.nameZh, entity.name).not.toMatch(LATIN)
    }
  })

  it('迁移结果导出后可原样导入，再次迁移不改动状态', () => {
    const migrated = migrateWorld(v5LiveWorld())
    const restored = importWorld(exportWorld(migrated))

    expect(restored).toEqual(migrated)
    expect(migrateWorld(migrated)).toBe(migrated)
  })
})
