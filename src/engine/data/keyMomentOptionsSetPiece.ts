import type { KeyMomentOption } from '../../domain'
import { attrBasis, chance, option, type KindContext } from './optionUtils'

export function buildPenalty({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'placed', labelZh: '推射死角', descriptionZh: '稳妥的角度与力量，门将很难够到。',
      successChance: chance(0.68 + attrs.shooting * 0.002, 0.55, 0.88),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 0.9, ratingOnFail: -0.7,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -2 },
    }),
    option({
      id: 'power', labelZh: '大力抽射', descriptionZh: '用力量压制门将，但容错更低。',
      successChance: chance(0.58 + attrs.shooting * 0.002, 0.45, 0.8),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 1, ratingOnFail: -0.8,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -2 },
    }),
    option({
      id: 'panenka', labelZh: '勺子点球', descriptionZh: '如果能骗过门将，这会成为本轮话题。',
      successChance: chance(0.4 + attrs.technique * 0.003, 0.3, 0.7),
      successBasisZh: attrBasis(player, ['technique']),
      ratingOnSuccess: 1.35, ratingOnFail: -1.1,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.2, moraleOnSuccess: 4, moraleOnFail: -3 },
    }),
    option({
      id: 'stutter', labelZh: '停顿助跑', descriptionZh: '用节奏变化观察门将的重心，再决定方向。',
      successChance: chance(0.5 + attrs.mental * 0.002, 0.4, 0.72),
      successBasisZh: attrBasis(player, ['mental']),
      ratingOnSuccess: 0.85, ratingOnFail: -0.75,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 3, moraleOnFail: -2.5 },
    }),
    option({
      id: 'lowCorner', labelZh: '低射下角', descriptionZh: '把球贴地推向角落，力量不大但角度刁钻。',
      successChance: chance(0.62 + attrs.shooting * 0.002, 0.5, 0.82),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 0.8, ratingOnFail: -0.6,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
    }),
  ]
}

export function buildFreeKick({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'curl', labelZh: '弧线球', descriptionZh: '绕过人墙，把球兜进球门远角。',
      successChance: chance(0.24 + attrs.technique * 0.003 + attrs.shooting * 0.002, 0.15, 0.6),
      successBasisZh: attrBasis(player, ['technique', 'shooting']),
      ratingOnSuccess: 1.1, ratingOnFail: -0.4,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -1 },
    }),
    option({
      id: 'power', labelZh: '大力抽射', descriptionZh: '用力量轰开人墙，门将可能来不及反应。',
      successChance: chance(0.2 + attrs.shooting * 0.004, 0.12, 0.58),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 1, ratingOnFail: -0.45,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1 },
    }),
    option({
      id: 'cross', labelZh: '传中找高点', descriptionZh: '把球送到禁区，让高点队友完成争顶。',
      successChance: chance(0.5 + attrs.passing * 0.003, 0.4, 0.82),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.5, ratingOnFail: -0.2,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
    }),
    option({
      id: 'short', labelZh: '短传配合', descriptionZh: '不直接攻门，用一次短传重新组织进攻。',
      successChance: chance(0.7 + attrs.passing * 0.002, 0.6, 0.9),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.2, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.2 },
    }),
    option({
      id: 'layoff', labelZh: '做球给后插上', descriptionZh: '轻轻一拨，让跟进的队友直接起脚。',
      successChance: chance(0.58 + attrs.technique * 0.002, 0.48, 0.84),
      successBasisZh: attrBasis(player, ['technique']),
      ratingOnSuccess: 0.45, ratingOnFail: -0.2,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
    }),
  ]
}
