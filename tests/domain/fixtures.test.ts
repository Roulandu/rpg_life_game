import { describe, expect, it } from 'vitest'
import { generateFixtures } from '../../src/domain/fixtures'
import type { Id, League } from '../../src/domain/types'

function makeLeague(id: Id, clubIds: Id[]): Record<Id, League> {
  return {
    [id]: {
      id,
      nameZh: '测试联赛',
      countryCode: 'ENG',
      tier: 1,
      clubIds,
      promotionSlots: 0,
      relegationSlots: 0,
      reputation: 60,
    },
  }
}

const CLUB_IDS = Array.from({ length: 20 }, (_, index) => `club:${index}` as Id)

describe('generateFixtures', () => {
  it('为 20 队联赛生成双循环共 380 场', () => {
    const fixtures = generateFixtures(makeLeague('league:1', CLUB_IDS), 424242, 2026)
    expect(Object.keys(fixtures)).toHaveLength(380)
  })

  it('每对球队主客各相遇一次', () => {
    const fixtures = generateFixtures(makeLeague('league:1', CLUB_IDS), 424242, 2026)
    const pairCount = new Map<string, number>()
    for (const fixture of Object.values(fixtures)) {
      const key = [fixture.homeId, fixture.awayId].sort().join('|')
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
    }
    expect(pairCount.size).toBe(190)
    for (const count of pairCount.values()) expect(count).toBe(2)
  })

  it('每支球队恰好 19 个主场（第二循环镜像第一循环）', () => {
    const fixtures = generateFixtures(makeLeague('league:1', CLUB_IDS), 424242, 2026)
    const home = new Map<Id, number>()
    for (const fixture of Object.values(fixtures)) {
      home.set(fixture.homeId, (home.get(fixture.homeId) ?? 0) + 1)
    }
    expect(home.size).toBe(20)
    for (const count of home.values()) expect(count).toBe(19)
  })

  it('相同 seed 与赛季生成完全相同的赛程（确定性）', () => {
    const a = generateFixtures(makeLeague('league:1', CLUB_IDS), 424242, 2026)
    const b = generateFixtures(makeLeague('league:1', CLUB_IDS), 424242, 2026)
    expect(a).toEqual(b)
  })
})
