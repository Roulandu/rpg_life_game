import { ATTR_LABELS, clamp, round1 } from '../../domain'
import type { AttrKey, KeyMomentOption, Player } from '../../domain'

export interface KindContext {
  player: Player
  isHome: boolean
}

export interface OptionSpec {
  id: string
  labelZh: string
  descriptionZh: string
  successChance: number
  successBasisZh: string
  ratingOnSuccess: number
  ratingOnFail: number
  extra?: Partial<KeyMomentOption>
}

export function chance(value: number, low: number, high: number): number {
  return round1(clamp(value, low, high) * 100) / 100
}

export function attrBasis(player: Player, keys: AttrKey[]): string {
  return keys.map((key) => `${ATTR_LABELS[key]} ${player.attributes[key]}`).join('、')
}

export function option(spec: OptionSpec): KeyMomentOption {
  const { extra, ...base } = spec
  return { ...base, ...extra }
}
