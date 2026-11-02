import { ATTR_LABELS, MOVE_LEVEL_MARKS, moveById } from '../domain'
import type { AttrKey, WorldState } from '../domain'
import { investAttribute, investMove } from '../engine'
import type { InvestOutcome, InvestReject, MoveInvestOutcome, MoveInvestReject } from '../engine'
import { messageOf, persist } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type GrowthSlice = Pick<GameStore, 'investExp' | 'investMoveExp'>

/** 引擎只回一个 reason 码，玩家要的是一句能照着做的话。 */
const REJECT_TEXT: Record<Exclude<InvestReject, null>, string> = {
  noUser: '还没有球员，先创建一段生涯。',
  invalidPoints: '投资点数必须是正整数。',
  matchLive: '比赛进行中不能改属性，先把今天踢完。',
  notAllowed: '这项属性不由你的位置决定。',
  overCap: '这项属性练到了当前上限，多攒点经验再来。',
  overPotential: '再投就越过你的潜力了，先踢比赛涨经验。',
  notEnoughExp: '经验不够，每一点都随已投点数涨价。',
}

/** 绝技的七种拒绝码同样各配一句能照着做的话。 */
const MOVE_REJECT_TEXT: Record<Exclude<MoveInvestReject, null>, string> = {
  noUser: '还没有球员，先创建一段生涯。',
  unknownMove: '这门绝技不在数据包里。',
  matchLive: '比赛进行中不能改绝技，先把今天踢完。',
  wrongPosition: '你的位置用不上这门绝技。',
  maxed: '这门绝技已经练到尽头。',
  overLevel: '综合分还没到这一级的门槛，先把身体练上去。',
  notEnoughExp: '经验不够，这一级的价钱比上一级更贵。',
}

function noticeOf(outcome: InvestOutcome, attrLabel: string): string {
  return `${attrLabel} +${outcome.points}（花 ${outcome.cost} 经验，剩 ${outcome.expLeft}）`
}

/** 绝技的播报要报出招名与级数：玩家关心的是「哪一招练到了第几级」。 */
function moveNoticeOf(outcome: MoveInvestOutcome): string {
  const name = moveById(outcome.moveId)?.nameZh ?? '这门绝技'
  const mark = MOVE_LEVEL_MARKS[outcome.level - 1] ?? ''
  return `${name} 练到 ${mark} 级（花 ${outcome.cost} 经验，剩 ${outcome.expLeft}）`
}

/** 成交后的写入只有一条路径：换世界、清错误、给播报、落盘。 */
async function commitSettled(set: StoreSet, get: StoreGet, next: WorldState, notice: string) {
  next.updatedAt = new Date().toISOString()
  set({ world: next, error: null, notice })
  const saved = await persist(next, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
}

async function commitInvest(
  set: StoreSet,
  get: StoreGet,
  attrKey: AttrKey,
  points: number,
): Promise<InvestOutcome | null> {
  const world = get().world
  if (!world || world.retired) return null
  const next = structuredClone(world)
  const outcome = investAttribute(next, attrKey, points)
  if (!outcome.ok) {
    set({ error: REJECT_TEXT[outcome.reason ?? 'invalidPoints'] })
    return outcome
  }

  await commitSettled(set, get, next, noticeOf(outcome, ATTR_LABELS[attrKey]))
  return outcome
}

async function commitMoveInvest(
  set: StoreSet,
  get: StoreGet,
  moveId: string,
): Promise<MoveInvestOutcome | null> {
  const world = get().world
  if (!world || world.retired) return null
  const next = structuredClone(world)
  const outcome = investMove(next, moveId)
  if (!outcome.ok) {
    set({ error: MOVE_REJECT_TEXT[outcome.reason ?? 'unknownMove'] })
    return outcome
  }

  await commitSettled(set, get, next, moveNoticeOf(outcome))
  return outcome
}

export const createGrowthSlice: StoreSlice<GrowthSlice> = (set, get) => ({
  investExp: (attrKey, points) =>
    commitInvest(set, get, attrKey, points).catch((error: unknown) => {
      set({ error: `投资失败：${messageOf(error)}` })
      return null
    }),
  investMoveExp: (moveId) =>
    commitMoveInvest(set, get, moveId).catch((error: unknown) => {
      set({ error: `解锁失败：${messageOf(error)}` })
      return null
    }),
})
