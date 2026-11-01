import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain'
import { applyDailyAction } from '../../src/engine/training'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function worldAtDay(day: number): WorldState {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.day = day
  return world
}

function user(world: WorldState) {
  return world.players[world.playerId]
}

describe('每日额外活动', () => {
  it('none 不写新闻也不改任何状态', () => {
    const world = worldAtDay(5)
    const before = { rep: user(world).reputation.media, balance: world.finance.balance, news: world.news.length }

    applyDailyAction(world, 'none')

    expect(user(world).reputation.media).toBe(before.rep)
    expect(world.finance.balance).toBe(before.balance)
    expect(world.news.length).toBe(before.news)
  })

  it('媒体活动写日 scoped 新闻并提升媒体名声', () => {
    const world = worldAtDay(5)
    const before = user(world).reputation.media

    applyDailyAction(world, 'media')

    expect(user(world).reputation.media).toBeGreaterThan(before)
    const news = world.news.find((item) => item.id === `news:extra:media:${world.season}:${world.week}:5`)
    expect(news?.day).toBe(5)
    expect(news?.kind).toBe('media')
  })

  it('商业活动加经纪人信任并进账，聚会掉体能，恢复涨体能，陪伴家人涨家庭信任', () => {
    const agent = worldAtDay(6)
    const balanceBefore = agent.finance.balance
    applyDailyAction(agent, 'agent')
    expect(agent.finance.balance).toBeGreaterThan(balanceBefore)

    const social = worldAtDay(2)
    const socialFitness = user(social).fitness
    applyDailyAction(social, 'social')
    expect(user(social).fitness).toBeLessThan(socialFitness)

    const rest = worldAtDay(2)
    const restFitness = user(rest).fitness
    applyDailyAction(rest, 'rest')
    expect(user(rest).fitness).toBeGreaterThan(restFitness)

    const family = worldAtDay(3)
    const familyTrust = Object.values(family.relationships).find((item) => item.role === 'family')?.trust ?? 0
    applyDailyAction(family, 'family')
    expect(Object.values(family.relationships).find((item) => item.role === 'family')?.trust ?? 0).toBeGreaterThan(
      familyTrust,
    )
  })

  it('同一活动在不同天各写一条新闻，不会因为 id 撞车而丢消息', () => {
    const world = worldAtDay(1)
    for (let day = 1; day <= 5; day += 1) {
      world.day = day
      applyDailyAction(world, 'media')
    }

    const ids = world.news.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter((id) => id.startsWith('news:extra:media:'))).toHaveLength(5)
  })
})
