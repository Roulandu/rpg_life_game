import { INVESTMENT_KINDS, absoluteDay, exitFeeOf, termDaysOf } from '../domain'
import type { Investment, InvestmentKind, WorldState } from '../domain'
import { createRng } from '../lib'
import { dailyId } from './dayContext'
import { pushFinanceLedger } from './financeDaily'

export type InvestReject = 'unknownKind' | 'belowMinimum' | 'notEnoughCash' | 'unknownInvestment'

export interface InvestResult {
  ok: boolean
  reason: InvestReject | null
  investment: Investment | null
  proceeds: number
}

const NEWS_KEEP = 80

function rejected(reason: InvestReject): InvestResult {
  return { ok: false, reason, investment: null, proceeds: 0 }
}

/** 开仓是即刻实现的现金转移：钱当天就离开余额并进流水，之后的涨跌只挂在持仓上。 */
export function openInvestment(world: WorldState, kind: InvestmentKind, principal: number): InvestResult {
  const spec = INVESTMENT_KINDS[kind]
  if (!spec) return rejected('unknownKind')
  const amount = Math.round(principal)
  if (amount < spec.minPrincipal) return rejected('belowMinimum')
  if (amount > world.finance.balance) return rejected('notEnoughCash')

  const investment: Investment = {
    id: dailyId(world, 'inv', kind),
    kind,
    name: spec.label,
    principal: amount,
    rateBps: spec.rateBps,
    openedDay: absoluteDay(world.week, world.day),
    termDays: spec.termDays,
    earlyExitFee: spec.earlyExitFee,
    risk: spec.weeklyVol,
  }
  // 不波动的品种不写现值：读持仓时 `value ?? principal` 就是本金，界面不用区分两条路径。
  if (spec.weeklyVol > 0) investment.value = amount

  world.finance.investments.unshift(investment)
  world.finance.balance -= amount
  pushFinanceLedger(world, 'investment', -amount, `开仓 ${spec.label}`)
  return { ok: true, reason: null, investment, proceeds: 0 }
}

function announceExit(world: WorldState, investment: Investment, gain: number): void {
  if (gain === 0) return
  world.news.unshift({
    id: dailyId(world, 'news:finance:exit', investment.id),
    season: world.season,
    week: world.week,
    day: world.day,
    title: `赎回 ${investment.name}：${gain > 0 ? '赚' : '亏'} £${Math.abs(gain)}`,
    body: gain > 0
      ? '这笔投资在锁定期外卖出，账面收益变成了能花的现金。'
      : '这笔投资卖在了本金之下，落袋的是折价。',
    kind: 'system',
  })
  world.news = world.news.slice(0, NEWS_KEEP)
}

/** 赎回按现值结算：锁定期内还要从现值里再扣一笔罚息。 */
export function closeInvestment(world: WorldState, investmentId: string): InvestResult {
  const index = world.finance.investments.findIndex((item) => item.id === investmentId)
  if (index < 0) return rejected('unknownInvestment')
  const investment = world.finance.investments[index]
  const gross = investment.value ?? investment.principal
  const heldDays = absoluteDay(world.week, world.day) - investment.openedDay
  const fee = heldDays < termDaysOf(investment) ? Math.round(gross * exitFeeOf(investment)) : 0
  const proceeds = gross - fee

  world.finance.investments.splice(index, 1)
  world.finance.balance += proceeds
  pushFinanceLedger(
    world,
    'investment',
    proceeds,
    fee > 0 ? `提前赎回 ${investment.name}（罚息）` : `赎回 ${investment.name}`,
  )
  announceExit(world, investment, proceeds - investment.principal)
  return { ok: true, reason: null, investment, proceeds }
}

function payInterest(world: WorldState, investment: Investment): void {
  const base = investment.value ?? investment.principal
  const interest = Math.round((base * investment.rateBps) / 10000 / 52)
  if (interest <= 0) return
  world.finance.balance += interest
  pushFinanceLedger(world, 'investment', interest, `${investment.name} 利息`)
}

/** 漫步域用 `(season, week)`：同一笔持仓的同一周只有一拍，中途另存的存档接着踢也是同一条轨迹。 */
function walkValue(world: WorldState, investment: Investment): void {
  if (investment.risk <= 0) return
  const current = investment.value ?? investment.principal
  const rng = createRng(world.seed, 'market', investment.id, world.season, world.week)
  investment.value = Math.max(1, Math.round(current * (1 + rng.normal(0, investment.risk))))
}

/** 周日一拍：先把利息结进现金，再给会波动的品种改一次现值。 */
export function settleInvestmentsWeekly(world: WorldState): void {
  for (const investment of world.finance.investments) {
    payInterest(world, investment)
    walkValue(world, investment)
  }
}
