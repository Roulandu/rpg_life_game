import { ATTR_KEYS, POSITION_WEIGHTS, clamp, round1 } from '../domain'
import type { AttrKey, Attributes, Position } from '../domain'
import type { Rng } from '../lib'

/**
 * 属性生成口径单独成文件：建号预览（`userDraft`）与球员工厂共用同一套取值规则，
 * 否则「界面上预览的属性」和「真正落进存档的属性」会长成两副样子。
 */

function gkAttributeValue(key: AttrKey, ability: number, rng: Rng): number {
  if (key === 'goalkeeping') return clamp(ability + rng.normal(2, 4), 20, 95)
  if (key === 'pace') return clamp(ability - 25 + rng.normal(0, 5), 20, 70)
  if (key === 'shooting' || key === 'dribbling') {
    return clamp(ability - 30 + rng.normal(0, 5), 15, 60)
  }
  if (key === 'passing' || key === 'technique') {
    return clamp(ability - 12 + rng.normal(0, 5), 20, 85)
  }
  if (key === 'defending') return clamp(ability - 5 + rng.normal(0, 5), 20, 90)
  return clamp(ability + rng.normal(0, 5), 30, 95)
}

function outfieldAttributeValue(
  key: AttrKey,
  position: Position,
  ability: number,
  rng: Rng,
): number {
  if (key === 'goalkeeping') return clamp(12 + rng.normal(0, 5), 5, 35)
  const weight = POSITION_WEIGHTS[position][key] ?? 0
  return clamp(ability + (weight > 0 ? 5 : -5) + rng.normal(0, 5), 20, 95)
}

export function makeAttributes(position: Position, ability: number, rng: Rng): Attributes {
  const attrs = {} as Attributes
  for (const key of ATTR_KEYS) {
    attrs[key] =
      position === 'GK'
        ? gkAttributeValue(key, ability, rng)
        : outfieldAttributeValue(key, position, ability, rng)
    attrs[key] = round1(attrs[key])
  }
  return attrs
}

export function applyBonuses(
  attrs: Attributes,
  position: Position,
  bonuses: Array<Partial<Record<AttrKey, number>>>,
): void {
  for (const bonus of bonuses) {
    for (const key of ATTR_KEYS) {
      const delta = bonus[key]
      if (delta) attrs[key] = clamp(round1(attrs[key] + delta), 10, 96)
    }
  }
  if (position !== 'GK') attrs.goalkeeping = Math.min(attrs.goalkeeping, 35)
}
