import {
  ATTR_KEYS,
  INVEST_FIRST_COST,
  INVEST_HARD_CAP,
  MOVE_LEVEL_MARKS,
  attributeCap,
  canInvestAttribute,
  clamp,
  displayName,
  fitsPotential,
  investMoveCost,
  investmentSeriesCost,
  moveById,
  moveFitsPosition,
  moveLevelGatePassed,
  moveLevelOf,
  roundAttr,
} from '../domain'
import type { AttrKey, MoveDefinition, Player, WorldState } from '../domain'
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

export type MoveInvestReject =
  | 'noUser'
  | 'unknownMove'
  | 'matchLive'
  | 'wrongPosition'
  | 'maxed'
  | 'overLevel'
  | 'notEnoughExp'

export interface MoveInvestOutcome {
  ok: boolean
  reason: MoveInvestReject | null
  moveId: string
  /** 成交后的等级；被拒时给出当前等级，界面据此决定按钮文案。 */
  level: number
  cost: number
  expLeft: number
}

function moveRejected(
  user: Player | undefined,
  moveId: string,
  level: number,
  reason: MoveInvestReject,
): MoveInvestOutcome {
  return { ok: false, reason, moveId, level, cost: 0, expLeft: user?.exp ?? 0 }
}

function moveInvestBlocker(
  world: WorldState,
  user: Player,
  move: MoveDefinition,
  cost: number,
): MoveInvestReject | null {
  if (matchInProgress(world)) return 'matchLive'
  if (!moveFitsPosition(move, user.position)) return 'wrongPosition'
  if (!moveLevelGatePassed(move, user)) return 'overLevel'
  if (cost > user.exp) return 'notEnoughExp'
  return null
}

/**
 * 花经验解锁或升级一条绝技：位置不符、已经满级、综合分不够、买不起四种情况整笔拒绝，不做部分成交。
 * 和属性投资共用「比赛中不许改」这条刹车——选项的概率在开球时就锁进了战报。
 */
export function investMove(world: WorldState, moveId: string): MoveInvestOutcome {
  const user = world.players[world.playerId]
  if (!user) return moveRejected(undefined, moveId, 0, 'noUser')
  const move = moveById(moveId)
  if (!move) return moveRejected(user, moveId, 0, 'unknownMove')
  const level = moveLevelOf(user, move.id)
  const cost = investMoveCost(move, level)
  if (cost === null) return moveRejected(user, moveId, level, 'maxed')
  const blocker = moveInvestBlocker(world, user, move, cost)
  if (blocker) return moveRejected(user, moveId, level, blocker)

  user.exp -= cost
  const held = (user.moves ??= []).find((item) => item.moveId === move.id)
  if (held) held.level = level + 1
  else user.moves?.push({ moveId: move.id, level: 1, progress: 0 })

  const mark = MOVE_LEVEL_MARKS[level] ?? ''
  world.news.unshift({
    id: dailyId(world, 'news:move', move.id),
    season: world.season,
    week: world.week,
    day: world.day,
    title: level === 0 ? `学会${move.nameZh}` : `${move.nameZh} 练到 ${mark} 级`,
    body: `${displayName(user)} 把 ${move.nameZh} 练成了 ${mark} 级，下次遇到对位球员时这一档会真的写进成功率。`,
    kind: 'club',
  })
  return { ok: true, reason: null, moveId: move.id, level: level + 1, cost, expLeft: user.exp }
}
