import { describe, expect, it } from 'vitest'
import { buildWeekSnapshot, maxTokensForDensity } from '../../src/llm/prompt'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('llm prompt snapshot', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('maps narrative density to a token budget', () => {
    expect(maxTokensForDensity('off')).toBe(0)
    expect(maxTokensForDensity('lean')).toBe(350)
    expect(maxTokensForDensity('standard')).toBe(600)
    expect(maxTokensForDensity('rich')).toBe(900)
  })

  it('builds a week snapshot that reads the league table from domain', () => {
    const snapshot = buildWeekSnapshot(world, null, null)
    const user = world.players[world.playerId]
    const club = world.clubs[world.clubId]

    expect(snapshot).toContain(`赛季第 ${world.week} 周`)
    expect(snapshot).toContain(user.name)
    expect(snapshot).toContain(club.nameZh)
    expect(snapshot).toContain('【上一场】本周没有比赛。')
    expect(snapshot).toContain('本周没有引擎事件。')
    expect(snapshot.includes('NaN')).toBe(false)
    expect(snapshot.includes('undefined')).toBe(false)
  })

  it('is deterministic for identical worlds', () => {
    const again = generateWorld(testOptions(), TEST_NOW)
    expect(buildWeekSnapshot(again, null, null)).toBe(buildWeekSnapshot(world, null, null))
  })
})
