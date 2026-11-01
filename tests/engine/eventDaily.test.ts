import { describe, expect, it } from 'vitest'
import type { MatchReport, WorldState } from '../../src/domain'
import { absoluteDay } from '../../src/domain'
import { eventTemplateById } from '../../src/domain/eventContent'
import { expireEvents, generateDailyEvents } from '../../src/engine/eventsDaily'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function freshWorld(dayOfWeek: number): WorldState {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.day = dayOfWeek
  return world
}

function report(patch: Partial<MatchReport>): MatchReport {
  return { status: 'final', season: 2026, week: 1, ...patch } as MatchReport
}

describe('每日事件生成', () => {
  it('受伤那天保证出队医建议，并在冷却期内不再重复', () => {
    const world = freshWorld(2)
    const user = world.players[world.playerId]
    user.injury = { kind: '肌肉拉伤', severity: 2, daysLeft: 14 }

    const first = generateDailyEvents(world, null)
    expect(first.map((event) => event.templateId)).toContain('injury_concern')

    const second = generateDailyEvents(world, null)
    expect(second).toHaveLength(0)
    expect(Object.values(world.events).filter((event) => event.templateId === 'injury_concern')).toHaveLength(1)
  })

  it('比赛日高分保证出一条赛后模板，不看每日骰子', () => {
    const world = freshWorld(6)
    const events = generateDailyEvents(world, report({ userRating: 8.1, userPlayed: true, userStarted: true }))
    expect(events).toHaveLength(1)
    expect(['coach_praise', 'media_interview']).toContain(events[0]!.templateId)
    expect(events[0]!.blocking).toBe(true)
    expect(events[0]!.id).toContain(`:${world.week}:${world.day}:`)
  })

  it('同一天重复调用不会再生成，也不会写出两条新闻', () => {
    const world = freshWorld(6)
    const created = generateDailyEvents(world, report({ userRating: 8.1, userPlayed: true }))
    const again = generateDailyEvents(world, report({ userRating: 8.1, userPlayed: true }))
    expect(created).toHaveLength(1)
    expect(again).toHaveLength(0)
    const eventNews = world.news.filter((item) => item.id === `news:event:${created[0]!.id}`)
    expect(eventNews).toHaveLength(1)
  })

  it('同一周七天写出的事件 id 互不相同', () => {
    const world = freshWorld(1)
    const ids = new Set<string>()
    for (let day = 1; day <= 7; day += 1) {
      world.day = day
      for (const event of generateDailyEvents(world, report({ userRating: 8.4, userPlayed: true }))) {
        ids.add(event.id)
      }
    }
    expect(ids.size).toBe(Object.values(world.events).length)
    expect(ids.size).toBeGreaterThan(1)
  })

  it('过期按天判定，expiresDays 到点自动 expired', () => {
    const world = freshWorld(1)
    const event = generateDailyEvents(world, report({ userRating: 8.9, userPlayed: true }))[0]!
    const template = eventTemplateById(event.templateId)!
    expect(event.expiresDay).toBe(absoluteDay(world.week, 1) + template.expiresDays)

    world.day = Math.min(7, template.expiresDays + 1)
    world.week += 1
    expireEvents(world)
    expect(world.events[event.id].status).toBe('expired')
  })
})
