import { describe, expect, it } from 'vitest'
import { overall } from '../../src/domain/attributes'
import { computeClubStrength } from '../../src/domain/strength'
import type { Player } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('computeClubStrength', () => {
  const world = generateWorld(testOptions(), TEST_NOW)
  const club = world.clubs[world.clubId]
  const squad = club.squadIds
    .map((id) => world.players[id])
    .filter((player): player is Player => Boolean(player))
  const best = squad.reduce((a, b) => (overall(a) >= overall(b) ? a : b))
  const worst = squad.reduce((a, b) => (overall(a) <= overall(b) ? a : b))

  it('为完整阵容计算有限且落在合理区间的攻防值', () => {
    const strength = computeClubStrength(club, world.players)
    for (const value of Object.values(strength)) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(20)
      expect(value).toBeLessThanOrEqual(99)
    }
  })

  it('对相同输入返回相同结果（确定性）', () => {
    expect(computeClubStrength(club, world.players)).toEqual(computeClubStrength(club, world.players))
  })

  it('空阵容回退到基准 40', () => {
    const empty = { ...club, squadIds: [] }
    expect(computeClubStrength(empty, world.players)).toEqual({
      attack: 40,
      midfield: 40,
      defense: 40,
      overall: 40,
    })
  })

  it('排除队内最强球员会改变强度', () => {
    const natural = computeClubStrength(club, world.players)
    const withoutBest = computeClubStrength(club, world.players, { excludePlayerId: best.id })
    expect(withoutBest).not.toEqual(natural)
  })

  it('强制最弱球员进入阵容会改变强度', () => {
    const natural = computeClubStrength(club, world.players)
    const forced = computeClubStrength(club, world.players, { forcePlayerId: worst.id })
    expect(forced).not.toEqual(natural)
  })
})
