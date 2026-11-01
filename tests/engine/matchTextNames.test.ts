import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { advanceDay } from '../../src/engine'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine/keyMoments'
import { LATIN, latinPlayerNames, leaks, reportTexts } from '../fixtures/naming'
import { playToKeyMoments, readyWorld } from '../fixtures/matchday'

function relationshipLatinNames(world: WorldState): string[] {
  const related = new Set(Object.values(world.relationships).map((relationship) => relationship.name))
  return latinPlayerNames(world).filter((name) => related.has(name))
}

function dayTexts(world: WorldState): string[] {
  return [
    ...world.news.map((item) => `${item.title} ${item.body}`),
    ...Object.values(world.events).map((event) => `${event.title} ${event.body}`),
  ]
}

describe('引擎文本使用中文人名', () => {
  it('终场战报的进球人、助攻人与全场最佳都是中文名', () => {
    const world = playToKeyMoments(2026).world
    autoResolveKeyMoments(world)

    const report = finalizeMatchday(world)!
    const nameZhSet = new Set(Object.values(world.players).map((player) => player.nameZh))

    expect(report.status).toBe('final')
    for (const goal of report.goals) {
      expect(goal.scorerName).toBe(world.players[goal.scorerId]?.nameZh)
      if (goal.assistName) expect(goal.assistName).toBe(world.players[goal.assistId!]?.nameZh)
    }
    expect(nameZhSet.has(report.motmName)).toBe(true)
    expect(report.motmName).not.toMatch(LATIN)
  })

  it('逐分钟直播文本与关键回合文案不残留阵容里的拉丁原名', () => {
    const world = playToKeyMoments(2026).world
    autoResolveKeyMoments(world)

    const report = finalizeMatchday(world)!

    expect(leaks(reportTexts(report), latinPlayerNames(world))).toEqual([])
  })

  it('连续推进的日子，新闻与事件正文只出现中文名，教练点名用的是中文名', () => {
    let world = readyWorld(2026)
    for (let index = 0; index < 8; index += 1) world = advanceDay(world).world

    const coach = world.clubs[world.clubId]!.coach
    const texts = dayTexts(world)
    const suspects = relationshipLatinNames(world)

    expect(suspects.length, '样本里应有拉丁原名的关系人物').toBeGreaterThan(0)
    expect(texts.join('\n')).toContain(coach.nameZh)
    expect(leaks(texts, suspects)).toEqual([])
  })
})
