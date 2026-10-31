import { positionGroup } from '../domain'
import type { KeyMoment, KeyMomentKind, KeyMomentOption, Player, WorldState } from '../domain'
import type { Rng } from '../lib'
import {
  KIND_PROMPTS,
  KIND_TITLES,
  KIND_TRIGGERS,
  optionsFor,
} from './data/keyMomentOptions'

function kindPool(player: Player): KeyMomentKind[] {
  switch (positionGroup(player.position)) {
    case 'GK':
      return ['save', 'save', 'clearance', 'headerDuel']
    case 'DEF':
      return ['duel', 'duel', 'clearance', 'headerDuel', 'clearance', 'cross', 'freeKick']
    case 'MID':
      return [
        'throughBall',
        'bigChance',
        'duel',
        'penalty',
        'cross',
        'longShot',
        'freeKick',
        'counterAttack',
      ]
    case 'FWD':
      return [
        'bigChance',
        'bigChance',
        'penalty',
        'throughBall',
        'oneOnOne',
        'counterAttack',
        'headerDuel',
        'longShot',
        'cross',
      ]
  }
}

function countCap(minutes: number): number {
  if (minutes >= 70) return 7
  if (minutes >= 40) return 5
  return 3
}

export function generateKeyMoments(
  player: Player,
  rng: Rng,
  minutes: number,
  isHome: boolean,
  startMinute = 0,
): KeyMoment[] {
  if (minutes <= 0) return []
  const windowStart = Math.max(1, startMinute + 2)
  const windowEnd = Math.min(89, startMinute + minutes - 1)
  if (windowEnd <= windowStart) return []

  const count = Math.min(rng.int(5, 7), countCap(minutes))
  const pool = rng.shuffle(kindPool(player))
  const moments: KeyMoment[] = []
  let lastMinute = windowStart - 1

  for (let index = 0; index < count; index += 1) {
    const kind = pool[index % pool.length] as KeyMomentKind
    const target =
      Math.round(windowStart + ((index + 1) * (windowEnd - windowStart)) / (count + 1)) +
      rng.int(-3, 3)
    const minute = Math.max(lastMinute + 1, Math.min(windowEnd, target))
    if (minute <= lastMinute) break
    lastMinute = minute
    const options = optionsFor(kind, { player, isHome })
    const safest = [...options].sort((a, b) => b.successChance - a.successChance)[0] as KeyMomentOption
    moments.push({
      id: `km:${player.id}:${index}`,
      minute,
      kind,
      titleZh: KIND_TITLES[kind],
      promptZh: KIND_PROMPTS[kind],
      triggerZh: KIND_TRIGGERS[kind],
      options,
      defaultOptionId: safest.id,
      roll: Math.round(rng.next() * 10000) / 10000,
    })
  }
  return moments
}

export function pendingKeyMoments(world: WorldState): KeyMoment[] {
  return (world.lastMatch?.keyMoments ?? []).filter((moment) => !moment.outcome)
}

export function hasPendingKeyMoments(world: WorldState): boolean {
  return pendingKeyMoments(world).length > 0
}
