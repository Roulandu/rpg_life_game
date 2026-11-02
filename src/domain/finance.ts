/**
 * 职责：钱的结构——流水、待入账累计器、投资账本，以及四种资金去处的声明。
 * 边界：只有类型与常量口径，不结算、不读时钟；入账与漫步全部在 `src/engine/financeDaily.ts`。
 * 依赖：不 import 任何其他 domain 模块，`types.ts` 反过来引它。
 */

export interface FinanceLedgerEntry {
  week: number
  season: number
  type: 'wage' | 'bonus' | 'expense' | 'sponsor' | 'transfer' | 'purchase' | 'investment' | 'other'
  amount: number
  label: string
}

/** 四种资金去处：存款与债券只生息，房产与生意吃价值漫步。 */
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
  /** 定期品种的到期天数。 */
  termDays?: number
  value?: number
  /** 每周标准差（小数），0 表示不波动。 */
  risk: number
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
