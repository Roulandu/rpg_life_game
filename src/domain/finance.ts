/**
 * 职责：钱的结构——流水、待入账累计器、投资账本，以及四种资金去处的条款表。
 * 边界：只有类型、常量与纯估值算术，不结算、不读时钟；日累计与周日入账在 `src/engine/financeDaily.ts`，开仓赎回与价值漫步在 `src/engine/investments.ts`。
 * 依赖：不 import 任何其他 domain 模块，`types.ts` 反过来引它。
 */

export interface FinanceLedgerEntry {
  week: number
  season: number
  type: 'wage' | 'bonus' | 'expense' | 'sponsor' | 'transfer' | 'purchase' | 'investment' | 'other'
  amount: number
  label: string
}

/** 四种资金去处：活期不波动，债券、房产与生意都要吃价值漫步。 */
export type InvestmentKind = 'deposit' | 'bond' | 'property' | 'business'

/**
 * 一笔投资：`principal` 是投出去的本金，`value` 是漫步后的现值（无波动品种不写）。
 * 未卖出的涨跌不进 `balance`，所以它也不进流水——`balance ↔ ledger` 的不变式只认已实现的现金。
 */
export interface Investment {
  id: string
  kind: InvestmentKind
  name: string
  principal: number
  /** 年化利率，按基点计：180 = 1.8%。 */
  rateBps: number
  /** 开仓那一天的绝对日序。 */
  openedDay: number
  /** 锁定期天数；v10 及更早的存档没写这项，读出来按「活期」处理。 */
  termDays?: number
  /** 提前赎回按现值收取的罚金比例（小数），同样可能来自没有这个字段的旧档。 */
  earlyExitFee?: number
  value?: number
  /** 每周标准差（小数），0 表示不波动。 */
  risk: number
}

/** 一种资金去处的公开条款：界面卡片、引擎结算与流水标签都只从这张表取数。 */
export interface InvestmentKindSpec {
  kind: InvestmentKind
  label: string
  /** 一句中文说明，直接进界面与开仓流水。 */
  blurb: string
  rateBps: number
  /** 每周标准差（小数），0 表示这个品种不做漫步。 */
  weeklyVol: number
  minPrincipal: number
  /** 锁定期天数，0 表示随时可取。 */
  termDays: number
  /** 锁定期内赎回要付的罚息比例。 */
  earlyExitFee: number
}

export const INVESTMENT_KIND_ORDER: InvestmentKind[] = ['deposit', 'bond', 'property', 'business']

export const INVESTMENT_KINDS: Record<InvestmentKind, InvestmentKindSpec> = {
  deposit: {
    kind: 'deposit',
    label: '银行活期存款',
    blurb: '随取随用，利息按年化 1.2% 每周结算，不波动。',
    rateBps: 120,
    weeklyVol: 0,
    minPrincipal: 100000,
    termDays: 0,
    earlyExitFee: 0,
  },
  bond: {
    kind: 'bond',
    label: '俱乐部债券',
    blurb: '年化 4.3%，价格随评级小幅波动，锁定 168 天。',
    rateBps: 430,
    weeklyVol: 0.012,
    minPrincipal: 400000,
    termDays: 168,
    earlyExitFee: 0.02,
  },
  property: {
    kind: 'property',
    label: '城市公寓',
    blurb: '租金年化 1.9%，房价每周按 3.5% 标准差漫步，锁定 252 天。',
    rateBps: 190,
    weeklyVol: 0.035,
    minPrincipal: 3000000,
    termDays: 252,
    earlyExitFee: 0.05,
  },
  business: {
    kind: 'business',
    label: '球迷文创小店',
    blurb: '分红年化 5.6%，生意好坏每周摆动 8%，锁定 168 天。',
    rateBps: 560,
    weeklyVol: 0.08,
    minPrincipal: 800000,
    termDays: 168,
    earlyExitFee: 0.08,
  },
}

/** 锁定期口径的唯一出口：旧档没写就当活期，绝不另起一套判断。 */
export function termDaysOf(investment: Investment): number {
  return investment.termDays ?? 0
}

/** 罚息口径的唯一出口。 */
export function exitFeeOf(investment: Investment): number {
  return investment.earlyExitFee ?? 0
}

/** 持仓现值合计：没有漫步过的品种按本金计，这就是「投出去还没收回来的钱」。 */
export function holdingsValue(investments: Investment[]): number {
  return investments.reduce((sum, item) => sum + (item.value ?? item.principal), 0)
}

/** 未实现盈亏：只统计带现值的持仓，卖出那一下的盈亏走流水，不落在这里。 */
export function unrealizedGain(investments: Investment[]): number {
  return investments.reduce(
    (sum, item) => (item.value === undefined ? sum : sum + item.value - item.principal),
    0,
  )
}

export interface Finance {
  balance: number
  weeklyWage: number
  weeklyExpenses: number
  /** 本周已挣但尚未入账的钱，周日结算时清零。 */
  pendingIncome: number
  /** 本周已花但尚未入账的钱，周日结算时清零。 */
  pendingExpenses: number
  investments: Investment[]
  ledger: FinanceLedgerEntry[]
  assets: string[]
  sponsorships: { name: string; weekly: number; endSeason: number }[]
}
