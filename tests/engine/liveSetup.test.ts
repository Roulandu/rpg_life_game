import { describe, expect, it } from 'vitest'
import { prepareUserFixture } from '../../src/engine/liveSetup'
import { getUserMatchFixture } from '../../src/engine/match'
import { readyWorld } from '../fixtures/matchday'

describe('prepareUserFixture', () => {
  it('赛前准备为主客各生成 11 人首发', () => {
    const world = readyWorld()
    const fixture = getUserMatchFixture(world)!
    const setup = prepareUserFixture(world, fixture)

    expect(setup.lineups.home).toHaveLength(11)
    expect(setup.lineups.away).toHaveLength(11)
    expect(setup.lineups[setup.isHome ? 'home' : 'away'].some((player) => player.isUser)).toBe(
      setup.userPlayed,
    )
  })
})
