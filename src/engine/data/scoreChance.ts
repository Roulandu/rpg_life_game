import { ATTR_LABELS, clamp, resolveMoveTerms, round1 } from '../../domain'
import type { AttrKey, KeyMomentKind, KeyMomentOption, MoveBonusTerm, Player } from '../../domain'

/** 属性权重：`系数 × 属性值` 直接进概率，所以 0.004 表示每 1 点属性 +0.4%。 */
export type AttrWeights = Partial<Record<AttrKey, number>>

/** 对手里的三个对位角色：门将、盯人后卫、出手前锋。 */
export type OpponentRole = 'keeper' | 'marker' | 'shooter'

export interface OpponentPair {
  keeper: Player | null
  marker: Player | null
  shooter: Player | null
}

export interface OpponentWeights {
  keeper?: AttrWeights
  marker?: AttrWeights
  shooter?: AttrWeights
}

/** 绝技与对手压制折算好的概率条目，文本直接进依据行。 */
export interface ScoreChanceInput {
  base: number
  actor?: AttrWeights
  opponent?: OpponentWeights
  terms?: MoveBonusTerm[]
  low: number
  high: number
  /** 常量选项（不吃任何属性）自带一句依据。 */
  flatBasisZh?: string
}

/** 一类关键回合的选项表：一行一个选项，概率全部由公式给出。 */
export interface OptionRow extends ScoreChanceInput {
  id: string
  labelZh: string
  descriptionZh: string
  ratingOnSuccess: number
  ratingOnFail: number
  extra?: Partial<KeyMomentOption>
}

export interface KindContext {
  player: Player
  isHome: boolean
  opponents?: OpponentPair | null
}

const ROLES: OpponentRole[] = ['keeper', 'marker', 'shooter']
const ROLE_LABELS: Record<OpponentRole, string> = { keeper: '门将', marker: '后卫', shooter: '前锋' }

function signed(percent: number): string {
  return percent >= 0 ? `+${percent}%` : `-${Math.abs(percent)}%`
}

function percent(delta: number): string {
  return signed(round1(delta * 100))
}

interface Term {
  text: string
  delta: number
}

function actorTerms(player: Player, weights: AttrWeights): Term[] {
  const terms: Term[] = []
  for (const [key, coefficient] of Object.entries(weights)) {
    const attrKey = key as AttrKey
    const value = player.attributes[attrKey]
    const delta = (coefficient ?? 0) * value
    terms.push({ text: `${ATTR_LABELS[attrKey]} ${value} ${percent(delta)}`, delta })
  }
  return terms
}

function opponentTerms(opponents: OpponentPair, weights: OpponentWeights): Term[] {
  const terms: Term[] = []
  for (const role of ROLES) {
    const foeWeights = weights[role]
    const foe = opponents[role]
    if (!foeWeights || !foe) continue
    const roleLabel = ROLE_LABELS[role]
    for (const [key, coefficient] of Object.entries(foeWeights)) {
      const attrKey = key as AttrKey
      const value = foe.attributes[attrKey]
      const delta = -(coefficient ?? 0) * value
      const attrLabel = ATTR_LABELS[attrKey] === roleLabel ? '' : ` ${ATTR_LABELS[attrKey]}`
      terms.push({ text: `对手${roleLabel}${attrLabel} ${value} ${percent(delta)}`, delta })
    }
  }
  return terms
}

function collectTerms(player: Player, input: ScoreChanceInput, opponents: OpponentPair | null): Term[] {
  const terms = input.actor ? actorTerms(player, input.actor) : []
  if (input.opponent && opponents) terms.push(...opponentTerms(opponents, input.opponent))
  for (const move of input.terms ?? []) {
    terms.push({ text: move.text, delta: move.delta })
  }
  return terms
}

/**
 * 概率 = 基线 + 我的属性加成 + 绝技加成 − 对手对位属性压制，最后夹进上下界。
 * 返回的依据文本把每一项都写成「属性 值 ±百分比」，玩家能看懂这次为什么是这个数。
 */
export function scoreChance(
  player: Player,
  input: ScoreChanceInput,
  opponents?: OpponentPair | null,
): { successChance: number; successBasisZh: string } {
  const terms = collectTerms(player, input, opponents ?? null)
  const value = terms.reduce((sum, term) => sum + term.delta, input.base)
  const basis = terms.length > 0 ? terms.map((term) => term.text).join('、') : (input.flatBasisZh ?? '')
  return {
    successChance: Math.round(clamp(value, input.low, input.high) * 1000) / 1000,
    successBasisZh: basis,
  }
}

const NO_OPPONENT: OpponentPair = { keeper: null, marker: null, shooter: null }

/**
 * 把选项表算成一组带概率的选项。绝技与对手压制必须在这里全部就位：
 * 关键回合的 roll 在生成阶段就抽完了，结算阶段不能再改概率。
 * 常量选项（`low === high`）不吃属性，也不给绝技让路，依据仍是自带的那句话。
 */
export function buildOptionTable(
  rows: OptionRow[],
  context: KindContext,
  kind: KeyMomentKind,
): KeyMomentOption[] {
  return rows.map((row) => {
    const isConstant = row.low === row.high
    const withMoves: OptionRow = isConstant
      ? row
      : {
          ...row,
          terms: [
            ...(row.terms ?? []),
            ...resolveMoveTerms(context.player, kind, row.id, context.opponents ?? NO_OPPONENT),
          ],
        }
    const { successChance, successBasisZh } = scoreChance(context.player, withMoves, context.opponents)
    const { id, labelZh, descriptionZh, ratingOnSuccess, ratingOnFail, extra } = row
    return { id, labelZh, descriptionZh, successChance, successBasisZh, ratingOnSuccess, ratingOnFail, ...extra }
  })
}
