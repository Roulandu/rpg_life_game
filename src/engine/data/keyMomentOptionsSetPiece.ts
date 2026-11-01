import type { KeyMomentOption } from '../../domain'
import { buildOptionTable, type KindContext, type OptionRow } from './scoreChance'

const penaltyRows: OptionRow[] = [
  {
    id: 'placed', labelZh: '推射死角', descriptionZh: '稳妥的角度与力量，门将很难够到。',
    base: 0.68, actor: { shooting: 0.002 }, opponent: { keeper: { goalkeeping: 0.0012 } },
    low: 0.55, high: 0.88, ratingOnSuccess: 0.9, ratingOnFail: -0.7,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -2 },
  },
  {
    id: 'power', labelZh: '大力抽射', descriptionZh: '用力量压制门将，但容错更低。',
    base: 0.58, actor: { shooting: 0.002 },
    opponent: { keeper: { goalkeeping: 0.0016, physical: 0.0004 } },
    low: 0.45, high: 0.8, ratingOnSuccess: 1, ratingOnFail: -0.8,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -2 },
  },
  {
    id: 'panenka', labelZh: '勺子点球', descriptionZh: '如果能骗过门将，这会成为本轮话题。',
    base: 0.4, actor: { technique: 0.003 },
    opponent: { keeper: { mental: 0.0016, goalkeeping: 0.0008 } },
    low: 0.3, high: 0.7, ratingOnSuccess: 1.35, ratingOnFail: -1.1,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.2, moraleOnSuccess: 4, moraleOnFail: -3 },
  },
  {
    id: 'stutter', labelZh: '停顿助跑', descriptionZh: '用节奏变化观察门将的重心，再决定方向。',
    base: 0.5, actor: { mental: 0.002 }, opponent: { keeper: { mental: 0.0014 } },
    low: 0.4, high: 0.72, ratingOnSuccess: 0.85, ratingOnFail: -0.75,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 3, moraleOnFail: -2.5 },
  },
  {
    id: 'lowCorner', labelZh: '低射下角', descriptionZh: '把球贴地推向角落，力量不大但角度刁钻。',
    base: 0.62, actor: { shooting: 0.002 },
    opponent: { keeper: { goalkeeping: 0.001, pace: 0.0006 } },
    low: 0.5, high: 0.82, ratingOnSuccess: 0.8, ratingOnFail: -0.6,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
  },
]

const freeKickRows: OptionRow[] = [
  {
    id: 'curl', labelZh: '弧线球', descriptionZh: '绕过人墙，把球兜进球门远角。',
    base: 0.24, actor: { technique: 0.003, shooting: 0.002 },
    opponent: { keeper: { goalkeeping: 0.0012 }, marker: { physical: 0.0008 } },
    low: 0.15, high: 0.6, ratingOnSuccess: 1.1, ratingOnFail: -0.4,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -1 },
  },
  {
    id: 'power', labelZh: '大力抽射', descriptionZh: '用力量轰开人墙，门将可能来不及反应。',
    base: 0.2, actor: { shooting: 0.004 },
    opponent: { keeper: { goalkeeping: 0.0014 }, marker: { physical: 0.0012 } },
    low: 0.12, high: 0.58, ratingOnSuccess: 1, ratingOnFail: -0.45,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1 },
  },
  {
    id: 'cross', labelZh: '传中找高点', descriptionZh: '把球送到禁区，让高点队友完成争顶。',
    base: 0.5, actor: { passing: 0.003 }, opponent: { marker: { defending: 0.001 } },
    low: 0.4, high: 0.82, ratingOnSuccess: 0.5, ratingOnFail: -0.2,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
  },
  {
    id: 'short', labelZh: '短传配合', descriptionZh: '不直接攻门，用一次短传重新组织进攻。',
    base: 0.7, actor: { passing: 0.002 }, low: 0.6, high: 0.9,
    ratingOnSuccess: 0.2, ratingOnFail: -0.1, extra: { coachOnSuccess: 0.2 },
  },
  {
    id: 'layoff', labelZh: '做球给后插上', descriptionZh: '轻轻一拨，让跟进的队友直接起脚。',
    base: 0.58, actor: { technique: 0.002 }, opponent: { marker: { pace: 0.0008 } },
    low: 0.48, high: 0.84, ratingOnSuccess: 0.45, ratingOnFail: -0.2,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
  },
]

export function buildPenalty(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(penaltyRows, context)
}

export function buildFreeKick(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(freeKickRows, context)
}
