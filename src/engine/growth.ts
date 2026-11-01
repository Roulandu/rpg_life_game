import {
  ATTR_KEYS,
  INVEST_FIRST_COST,
  INVEST_HARD_CAP,
  attributeCap,
  canInvestAttribute,
  clamp,
  displayName,
  fitsPotential,
  investmentSeriesCost,
  roundAttr,
} from '../domain'
import type { AttrKey, Player, WorldState } from '../domain'
import { dailyId } from './dayContext'

/** 经验的五个来源，写新闻与后续统计要靠它区分「谁给的」。 */
export type ExpReason = 'training' | 'match' | 'event' | 'staff' | 'specialization'

/** 一次训练课的经验产出：恢复课强度低，产出也少。 */
export const TRAINING_EXP = { physical: 2, technical: 2, tactical: 2, recovery: 1 } as const

export const MATCH_EXP_BASE_RATING = 6.5
export const MATCH_EXP_RATING_COEF = 8
export const MATCH_EXP_PER_GOAL = 6
export const MATCH_EXP_PER_ASSIST = 4
export const MATCH_EXP_BONUS_FROM = 7.8
export const MATCH_EXP_BONUS = 4

export interface RatingExpInput {
  rating: number | null
  minutes: number
  goals: number
  assists: number
}

/** 比赛表现换经验：评分要越过 6.5 才开始有产出，出场时间按比例折算，进球助攻另计。 */
export function ratingToExp(input: RatingExpInput): number {
  if (input.rating == null || input.minutes <= 0) return 0
  const play = ((input.rating - MATCH_EXP_BASE_RATING) * MATCH_EXP_RATING_COEF * input.minutes) / 90
  const contribution = input.goals * MATCH_EXP_PER_GOAL + input.assists * MATCH_EXP_PER_ASSIST
  const bonus = input.rating >= MATCH_EXP_BONUS_FROM ? MATCH_EXP_BONUS : 0
  return Math.max(0, Math.round(play + contribution + bonus))
}

function hasInvested(user: Player): boolean {
  return ATTR_KEYS.some((key) => (user.attrInvestment[key] ?? 0) > 0)
}

/**
 * 经验发放的唯一入口：`exp` 会随花费减少，`lifetimeExp` 只增不减，
 * 后者用来解锁单属性上限，所以任何来源都不能绕过这里直接改字段。
 */
export function grantExp(world: WorldState, amount: number, reason: ExpReason): number {
  const user = world.players[world.playerId]
  if (!user) return 0
  const gain = Math.max(0, Math.round(amount))
  if (gain === 0) return 0

  const before = user.exp
  user.exp = before + gain
  user.lifetimeExp += gain
  if (before >= INVEST_FIRST_COST || user.exp < INVEST_FIRST_COST || hasInvested(user)) return gain

  world.news.unshift({
    id: dailyId(world, 'news:exp', reason),
    season: world.season,
    week: world.week,
    day: world.day,
    title: '经验可以花出去了',
    body: `${displayName(user)} 攒下了第一笔够投资属性的经验（${user.exp} 点）。在训练基地把成长投到自己选定的技术上。`,
    kind: 'club',
  })
  return gain
}

export type InvestReject =
  | 'noUser'
  | 'invalidPoints'
  | 'matchLive'
  | 'notAllowed'
  | 'overCap'
  | 'overPotential'
  | 'notEnoughExp'

export interface InvestOutcome {
  ok: boolean
  reason: InvestReject | null
  attrKey: AttrKey
  points: number
  cost: number
  value: number
  expLeft: number
}

/**
 * 比赛中禁止改属性：关键回合的成功率在开球时就锁进选项，中途抬高属性会让已预抽的 roll 与文案对不上。
 * 只读 `pendingDayPlan` 与战报状态，不 import day.ts，免得走出 day → training → growth → day 的环。
 */
function matchInProgress(world: WorldState): boolean {
  return Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live'
}

function rejected(world: WorldState, attrKey: AttrKey, reason: InvestReject): InvestOutcome {
  const user = world.players[world.playerId]
  return {
    ok: false,
    reason,
    attrKey,
    points: 0,
    cost: 0,
    value: user?.attributes[attrKey] ?? 0,
    expLeft: user?.exp ?? 0,
  }
}

/** 把经验投进一项属性：买不起、练不到上限、越过潜力三种情况一律整笔拒绝，不做部分成交。 */
export function investAttribute(world: WorldState, attrKey: AttrKey, points: number): InvestOutcome {
  const user = world.players[world.playerId]
  if (!user) return rejected(world, attrKey, 'noUser')
  if (!Number.isInteger(points) || points <= 0) return rejected(world, attrKey, 'invalidPoints')
  if (matchInProgress(world)) return rejected(world, attrKey, 'matchLive')
  if (!canInvestAttribute(attrKey, user.position)) return rejected(world, attrKey, 'notAllowed')
  if (user.attributes[attrKey] + points > attributeCap(user)) return rejected(world, attrKey, 'overCap')
  if (!fitsPotential(user, attrKey, points)) return rejected(world, attrKey, 'overPotential')

  const invested = user.attrInvestment[attrKey] ?? 0
  const cost = investmentSeriesCost(invested, points)
  if (cost > user.exp) return rejected(world, attrKey, 'notEnoughExp')

  user.exp -= cost
  user.attrInvestment[attrKey] = invested + points
  user.attributes[attrKey] = clamp(roundAttr(user.attributes[attrKey] + points), 10, INVEST_HARD_CAP)
  return { ok: true, reason: null, attrKey, points, cost, value: user.attributes[attrKey], expLeft: user.exp }
}
