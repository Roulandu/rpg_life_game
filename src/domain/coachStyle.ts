import type { AttrKey, Club, Player, TrainingFocus } from './types'

export type ClubStyle = Club['style']

export const STYLE_LABELS: Record<ClubStyle, string> = {
  possession: '控球推进',
  counter: '防守反击',
  highPress: '高位压迫',
  direct: '长传冲吊',
}

/** 每种风格在看什么：权重合计为 1，用来算 0–1 的契合度。 */
export const STYLE_ATTRS: Record<ClubStyle, Partial<Record<AttrKey, number>>> = {
  possession: { passing: 0.28, technique: 0.24, dribbling: 0.18, mental: 0.16, stamina: 0.14 },
  counter: { pace: 0.24, defending: 0.2, stamina: 0.18, mental: 0.16, shooting: 0.12, physical: 0.1 },
  highPress: { stamina: 0.26, pace: 0.2, physical: 0.18, mental: 0.16, defending: 0.12, shooting: 0.08 },
  direct: { physical: 0.26, shooting: 0.2, pace: 0.18, mental: 0.14, stamina: 0.12, defending: 0.1 },
}

/** 教练最愿意在训练课里加码的重点。 */
export const STYLE_TRAINING_BONUS: Record<ClubStyle, TrainingFocus> = {
  possession: 'technical',
  counter: 'tactical',
  highPress: 'physical',
  direct: 'physical',
}

const FIT_MATCH = 0.62
const FIT_NEUTRAL = 0.45

/** 球员与球队打法的契合度：加权属性 / 100，属性区间 10–96 决定结果天然落在 0–1。纯函数，不消耗随机数。 */
export function styleFit(player: Player, style: ClubStyle): number {
  const entries = Object.entries(STYLE_ATTRS[style]) as [AttrKey, number][]

  let total = 0
  let sum = 0
  for (const [key, weight] of entries) {
    sum += player.attributes[key] * weight
    total += weight
  }
  return sum / total / 100
}

export function styleFitLabel(fit: number): '风格契合' | '风格中性' | '风格不合' {
  if (fit >= FIT_MATCH) return '风格契合'
  if (fit >= FIT_NEUTRAL) return '风格中性'
  return '风格不合'
}

/** 最看重的两项属性，用来把"为什么不合"讲成人话。 */
export function styleTopAttrs(style: ClubStyle, count = 2): AttrKey[] {
  const entries = Object.entries(STYLE_ATTRS[style]) as [AttrKey, number][]
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key)
}

/** 一句话讲清风格对出场的实际影响，避免变成看不见的黑箱惩罚。 */
export function styleAdvice(style: ClubStyle, fit: number): string {
  const label = STYLE_LABELS[style]
  if (fit >= FIT_MATCH) return `打法契合：教练踢${label}，你的特点正合他意，入选机会更稳。`
  if (fit >= FIT_NEUTRAL) return `打法中性：教练踢${label}，位置竞争主要看状态与训练。`
  return `打法不合：教练踢${label}，更看重别的东西，你需要明显更高的水平才能挤进首发。`
}

/** 训练重点命中教练偏好时的成长加成。 */
export function styleSynergy(focus: TrainingFocus, style: ClubStyle): number {
  return focus === STYLE_TRAINING_BONUS[style] ? 1.12 : 1
}
