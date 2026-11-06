import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { reserveClubName } from '../../src/world/playerFactory'
import { TEST_NOW, testOptions } from '../fixtures/career'

function duplicates(world: WorldState): string[] {
  const offenders: string[] = []
  for (const club of Object.values(world.clubs)) {
    const seen = new Set<string>()
    for (const id of club.squadIds) {
      const player = world.players[id]
      if (!player) continue
      if (seen.has(player.nameZh)) offenders.push(`${club.nameZh} ${player.nameZh}`)
      seen.add(player.nameZh)
    }
  }
  return offenders
}

describe('俱乐部队内名字', () => {
  it('同一支球队的 20 人名单里不出现重名', () => {
    for (const seed of [42, 7, 99, 2026, 424242]) {
      const world = generateWorld(testOptions({ seed }), TEST_NOW)
      expect(duplicates(world), `seed ${seed}`).toEqual([])
    }
  })

  it('reserveClubName 登记已用名字，撞名时重抽原名', () => {
    const world = generateWorld(testOptions({ seed: 42 }), TEST_NOW)
    const club = world.clubs[world.clubId]!
    const [first, second] = club.squadIds.map((id) => world.players[id]!)
    const taken = new Set<string>()

    reserveClubName(first, club.id, 0, world.seed, taken)
    expect(taken).toEqual(new Set([first.nameZh]))

    taken.add(second.nameZh)
    reserveClubName(second, club.id, 1, world.seed, taken)
    expect(second.nameZh).not.toBe(first.nameZh)
    expect(taken.has(second.nameZh)).toBe(true)
  })
})
