import { describe, expect, it } from 'vitest'
import type { Player, WorldState } from '../../src/domain/types'
import { retirementReason, shouldRetire } from '../../src/engine/retirement'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function withUser(world: WorldState, patch: Partial<Player>): WorldState {
  const user = { ...world.players[world.playerId], ...patch }
  return { ...world, players: { ...world.players, [world.playerId]: user } }
}

function lowAttributes(player: Player): Player {
  const attributes = { ...player.attributes }
  for (const key of Object.keys(attributes) as (keyof typeof attributes)[]) {
    attributes[key] = 20
  }
  return { ...player, attributes }
}

describe('engine retirement', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('does not retire a young player', () => {
    expect(retirementReason(world)).toBeNull()
    expect(shouldRetire(world)).toBe(false)
  })

  it('returns null when the user player is missing', () => {
    const broken: WorldState = { ...world, playerId: 'player:missing' }
    expect(retirementReason(broken)).toBeNull()
  })

  it('retires on age', () => {
    expect(retirementReason(withUser(world, { age: 38 }))).toBe('年龄')
    expect(shouldRetire(withUser(world, { age: 38 }))).toBe(true)
  })

  it('retires on declining form when older and weak', () => {
    const aged = withUser(world, { age: 34 })
    const weak = { ...aged, players: { ...aged.players, [aged.playerId]: lowAttributes(aged.players[aged.playerId]) } }
    expect(retirementReason(weak)).toBe('状态下滑')
  })

  it('retires on a severe injury when older', () => {
    const injured = withUser(world, { age: 32, injury: { kind: 'knee', weeksLeft: 8, severity: 3 } })
    expect(retirementReason(injured)).toBe('伤病')
  })
})
