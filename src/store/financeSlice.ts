import { INVESTMENT_KINDS } from '../domain'
import type { InvestmentKind, WorldState } from '../domain'
import { closeInvestment, openInvestment } from '../engine'
import type { InvestResult, InvestmentReject } from '../engine'
import { formatMoney } from '../lib'
import { commitSettled, messageOf } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type FinanceSlice = Pick<GameStore, 'investMoney' | 'redeemInvestment'>

type MoneyMode = 'open' | 'close'

/** 引擎只回一个 reason 码，玩家要的是一句能照着做的话。 */
const REJECT_TEXT: Record<Exclude<InvestmentReject, null>, string> = {
  matchLive: '比赛进行中不能动钱，先把今天踢完。',
  unknownKind: '这个资金去处还不存在。',
  belowMinimum: '还没到这一档的起投额。',
  notEnoughCash: '可用余额不够，先赎回一笔持仓或者少投一些。',
  unknownInvestment: '这笔持仓已经不存在了，刷新一下再试。',
}

/** 起投额被挡下时，光说「不够」没有可执行性，要把这道门槛报出来。 */
function openRejectText(kind: InvestmentKind, reason: InvestmentReject | null): string {
  if (reason === 'belowMinimum') {
    const spec = INVESTMENT_KINDS[kind]
    return `${spec.label}最低起投 ${formatMoney(spec.minPrincipal)}。`
  }
  return REJECT_TEXT[reason ?? 'unknownKind']
}

/** 播报只报已经实现的事实：开仓报扣掉的钱，赎回报到手的钱，锁定期内额外说明吃了罚息。 */
function noticeOf(mode: MoneyMode, next: WorldState, result: InvestResult): string {
  const investment = result.investment
  const balance = formatMoney(next.finance.balance)
  if (mode === 'close' && investment) {
    const gross = investment.value ?? investment.principal
    const verb = gross - result.proceeds > 0 ? '提前赎回' : '赎回'
    return `${verb} ${investment.name} 到手 ${formatMoney(result.proceeds)}，余额 ${balance}`
  }
  return `开仓 ${investment?.name ?? ''} ${formatMoney(investment?.principal ?? 0)}，余额 ${balance}`
}

/** 存取两个动作共用一条流水线：克隆世界、跑引擎、拒绝就报文案，成交才落盘。 */
async function commitMoney(
  set: StoreSet,
  get: StoreGet,
  mode: MoneyMode,
  action: (next: WorldState) => InvestResult,
  rejectText: (reason: InvestmentReject | null) => string,
): Promise<InvestResult | null> {
  const world = get().world
  if (!world || world.retired) return null
  const next = structuredClone(world)
  const result = action(next)
  if (!result.ok) {
    set({ error: rejectText(result.reason) })
    return result
  }

  await commitSettled(set, get, next, noticeOf(mode, next, result))
  return result
}

export const createFinanceSlice: StoreSlice<FinanceSlice> = (set, get) => ({
  investMoney: (kind, principal) =>
    commitMoney(set, get, 'open', (next) => openInvestment(next, kind, principal), (reason) =>
      openRejectText(kind, reason),
    ).catch((error: unknown) => {
      set({ error: `开仓失败：${messageOf(error)}` })
      return null
    }),
  redeemInvestment: (investmentId) =>
    commitMoney(set, get, 'close', (next) => closeInvestment(next, investmentId), (reason) =>
      REJECT_TEXT[reason ?? 'unknownInvestment'],
    ).catch((error: unknown) => {
      set({ error: `赎回失败：${messageOf(error)}` })
      return null
    }),
})
