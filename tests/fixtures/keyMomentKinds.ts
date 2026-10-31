import { ATTR_KEYS } from '../../src/domain/attributes'
import type { KeyMomentKind } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export const KINDS: KeyMomentKind[] = [
  'bigChance',
  'penalty',
  'throughBall',
  'duel',
  'save',
  'clearance',
  'freeKick',
  'headerDuel',
  'oneOnOne',
  'counterAttack',
  'cross',
  'longShot',
]

export function strongPlayer() {
  const world = generateWorld(testOptions({ seed: 7 }), TEST_NOW)
  const player = world.players[world.playerId]!
  for (const key of ATTR_KEYS) player.attributes[key] = 92
  return player
}
