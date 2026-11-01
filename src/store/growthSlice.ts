import { ATTR_LABELS } from '../domain'
import type { AttrKey } from '../domain'
import { investAttribute } from '../engine'
import type { InvestOutcome, InvestReject } from '../engine'
import { messageOf, persist } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type GrowthSlice = Pick<GameStore, 'investExp'>

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

function noticeOf(outcome: InvestOutcome, attrLabel: string): string {
  return `${attrLabel} +${outcome.points}（花 ${outcome.cost} 经验，剩 ${outcome.expLeft}）`
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

  next.updatedAt = new Date().toISOString()
  set({ world: next, error: null, notice: noticeOf(outcome, ATTR_LABELS[attrKey]) })
  const saved = await persist(next, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
  return outcome
}

export const createGrowthSlice: StoreSlice<GrowthSlice> = (set, get) => ({
  investExp: (attrKey, points) =>
    commitInvest(set, get, attrKey, points).catch((error: unknown) => {
      set({ error: `投资失败：${messageOf(error)}` })
      return null
    }),
})
