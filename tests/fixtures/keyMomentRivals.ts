import { ATTR_KEYS } from '../../src/domain/attributes'
import type { AttrKey, KeyMomentKind, KeyMomentOption, Player } from '../../src/domain'
import { optionsFor, type KindContext } from '../../src/engine/data/keyMomentOptions'
import type { OpponentPair } from '../../src/engine/data/scoreChance'
import { strongPlayer } from './keyMomentKinds'

/** 对手球员：整体按轮换级别打底，再按角色点亮该亮的属性，避免「全员 92」把对抗抹平。 */
export function rival(strengths: Partial<Record<AttrKey, number>>): Player {
  const base = strongPlayer()
  const attributes = { ...base.attributes }
  for (const key of ATTR_KEYS) attributes[key] = 40
  for (const [key, value] of Object.entries(strengths)) attributes[key as AttrKey] = value
  return { ...base, attributes }
}

export function foes(keeper: Player, shooter: Player, marker: Player): OpponentPair {
  return { keeper, marker, shooter }
}

const softKeeper = rival({ goalkeeping: 60 })
const eliteKeeper = rival({ goalkeeping: 90, mental: 78, pace: 62 })
const softShooter = rival({ shooting: 58 })
const eliteShooter = rival({ shooting: 90, dribbling: 84, physical: 76 })
const softMarker = rival({ defending: 58 })
const eliteMarker = rival({ defending: 88, pace: 78 })

const player = strongPlayer()

export const softAll = foes(softKeeper, softShooter, softMarker)
export const toughAll = foes(eliteKeeper, eliteShooter, eliteMarker)
export const toughKeeperOnly = foes(eliteKeeper, softShooter, softMarker)
export const toughShooterOnly = foes(softKeeper, eliteShooter, softMarker)
export const toughMarkerOnly = foes(softKeeper, softShooter, eliteMarker)

export function contextFor(opponents: OpponentPair | null): KindContext {
  return { player, isHome: true, opponents }
}

export function pick(options: KeyMomentOption[], id: string): KeyMomentOption {
  const found = options.find((option) => option.id === id)
  if (!found) throw new Error(`选项不存在：${id}`)
  return found
}

export function chanceOf(kind: KeyMomentKind, opponents: OpponentPair | null, id: string): number {
  return pick(optionsFor(kind, contextFor(opponents)), id).successChance
}

export function basisOf(kind: KeyMomentKind, opponents: OpponentPair, id: string): string {
  return pick(optionsFor(kind, contextFor(opponents)), id).successBasisZh ?? ''
}
